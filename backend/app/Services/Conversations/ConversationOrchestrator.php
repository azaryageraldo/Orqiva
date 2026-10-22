<?php

namespace App\Services\Conversations;

use App\Jobs\ProcessChatMessage;
use App\Models\Channel;
use App\Models\ChatMessage;
use App\Models\ChatSession;
use App\Models\Contact;
use App\Models\ContactChannel;
use App\Models\WorkflowExecution;
use App\Services\Channels\MessageDelivery;
use App\Services\Workflows\WorkflowRunner;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class ConversationOrchestrator
{
    private const PROCESSING_TTL_MINUTES = 5;

    public function __construct(
        private readonly WorkflowRunner $runner,
        private readonly MessageDelivery $delivery
    ) {}

    /**
     * @return array{contact: Contact, session: ChatSession}
     */
    public function startSession(Channel $channel, ?string $contactId = null): array
    {
        if (! $channel->is_active) {
            throw ValidationException::withMessages([
                'channel' => 'Chat widget sedang tidak aktif.',
            ]);
        }

        if ($channel->workflow === null) {
            throw ValidationException::withMessages([
                'channel' => 'Workflow entry belum dipilih pada halaman Channel.',
            ]);
        }

        $contact = $this->resolveContact($channel, $contactId);

        $this->closePreviousSessions($contact, $channel);

        $session = ChatSession::create([
            'user_id' => $channel->user_id,
            'channel_id' => $channel->id,
            'contact_id' => $contact->id,
            'workflow_id' => $channel->workflow->id,
            'public_token' => Str::random(48),
            'status' => ChatSession::STATUS_ACTIVE,
            'last_activity_at' => now(),
        ]);

        return [
            'contact' => $contact,
            'session' => $session,
        ];
    }

    public function resolveContact(Channel $channel, ?string $contactId = null): Contact
    {
        $contact = null;

        if (is_string($contactId) && trim($contactId) !== '') {
            $contact = Contact::query()
                ->where('user_id', $channel->user_id)
                ->where('public_id', trim($contactId))
                ->first();
        }

        if ($contact === null) {
            $contact = Contact::create([
                'user_id' => $channel->user_id,
                'public_id' => $this->contactId(),
                'name' => 'Pengunjung',
                'last_seen_at' => now(),
            ]);
        } else {
            $contact->update(['last_seen_at' => now()]);
        }

        $this->linkContactChannel($channel, $contact, $contact->public_id);

        return $contact;
    }

    public function contactForExternalId(
        Channel $channel,
        string $externalId,
        ?string $name = null
    ): Contact {
        $externalId = trim($externalId);

        if ($externalId === '') {
            throw ValidationException::withMessages([
                'contact' => 'ID kontak channel tidak valid.',
            ]);
        }

        $contact = $this->contactByExternalId($channel, $externalId);

        if ($contact !== null) {
            $updates = ['last_seen_at' => now()];

            if ($this->shouldAdoptName($contact, $name)) {
                $updates['name'] = $this->normalizeContactName($name);
            }

            $contact->update($updates);

            return $contact;
        }

        try {
            return DB::transaction(function () use ($channel, $externalId, $name): Contact {
                $contact = Contact::create([
                    'user_id' => $channel->user_id,
                    'public_id' => $this->contactId(),
                    'name' => $this->normalizeContactName($name),
                    'last_seen_at' => now(),
                ]);

                $this->linkContactChannel($channel, $contact, $externalId);

                return $contact;
            });
        } catch (UniqueConstraintViolationException) {
            $contact = $this->contactByExternalId($channel, $externalId);

            if ($contact === null) {
                throw ValidationException::withMessages([
                    'contact' => 'Kontak channel gagal disimpan. Coba lagi.',
                ]);
            }

            return $contact;
        }
    }

    /**
     * Reuse one conversation per contact and channel so transports such as
     * Telegram can keep a long-lived thread instead of opening a session per
     * message.
     */
    public function ensureSession(Channel $channel, Contact $contact): ChatSession
    {
        if ($channel->workflow === null) {
            throw ValidationException::withMessages([
                'channel' => 'Workflow entry belum dipilih pada channel ini.',
            ]);
        }

        $session = ChatSession::query()
            ->where('user_id', $channel->user_id)
            ->where('channel_id', $channel->id)
            ->where('contact_id', $contact->id)
            ->whereIn('status', [
                ChatSession::STATUS_ACTIVE,
                ChatSession::STATUS_HUMAN,
            ])
            ->latest('id')
            ->first();

        if ($session !== null) {
            $session->update(['last_activity_at' => now()]);

            return $session;
        }

        return ChatSession::create([
            'user_id' => $channel->user_id,
            'channel_id' => $channel->id,
            'contact_id' => $contact->id,
            'workflow_id' => $channel->workflow->id,
            'public_token' => Str::random(48),
            'status' => ChatSession::STATUS_ACTIVE,
            'last_activity_at' => now(),
        ]);
    }

    /**
     * @return array{state: array<string, mixed>, queued: bool}
     */
    public function enqueueMessage(
        ChatSession $session,
        string $text,
        ?string $clientMessageId = null,
        ?string $externalMessageId = null
    ): array {
        $lock = Cache::lock('public-chat-send:'.$session->id, 30);

        try {
            return $lock->block(
                10,
                fn (): array => $this->createMessage(
                    $session,
                    $text,
                    $clientMessageId,
                    $externalMessageId
                )
            );
        } catch (LockTimeoutException) {
            throw ValidationException::withMessages([
                'message' => 'Pesan sebelumnya masih diproses. Tunggu sebentar lalu coba lagi.',
            ]);
        }
    }

    public function processMessage(int $messageId): void
    {
        $claimed = DB::transaction(function () use ($messageId): ?array {
            $message = ChatMessage::query()
                ->lockForUpdate()
                ->find($messageId);

            if ($message === null) {
                return null;
            }

            $metadata = $message->metadata ?? [];

            if (data_get($metadata, 'job_status') === 'processed') {
                return null;
            }

            $session = ChatSession::query()
                ->with(['channel.workflow', 'contact', 'workflow', 'user'])
                ->find($message->chat_session_id);

            if ($session === null) {
                $this->setJobStatus($message, 'failed');

                return null;
            }

            $metadata['job_status'] = 'processing';
            $metadata['job_attempts'] = (int) data_get($metadata, 'job_attempts', 0) + 1;
            $metadata['job_started_at'] = now()->toISOString();
            unset($metadata['job_error']);

            $message->update(['metadata' => $metadata]);
            $session->update(['last_activity_at' => now()]);

            return ['message' => $message, 'session' => $session];
        });

        if ($claimed === null) {
            return;
        }

        /** @var ChatMessage $message */
        $message = $claimed['message'];
        /** @var ChatSession $session */
        $session = $claimed['session'];

        try {
            if ($session->status !== ChatSession::STATUS_ACTIVE) {
                $this->setJobStatus($message, 'processed');

                return;
            }

            $workflow = $session->workflow;

            if ($workflow === null) {
                $this->setJobStatus($message, 'failed');

                return;
            }

            $delayMs = max(
                0,
                min(5000, (int) ($session->user?->ai_reply_debounce_ms ?? 0))
            );

            if ($delayMs > 0) {
                usleep($delayMs * 1000);
            }

            $input = [
                'message' => $message->content,
                'customer_message' => $message->content,
                'customer_name' => $session->contact?->name ?? 'Pengunjung',
                'conversation_id' => $session->contact?->public_id,
                'conversation_history' => $this->history($session, $message->id),
                'client_message_id' => $message->client_message_id,
            ];

            $result = $this->runner->execute($workflow, $input, $session);
            $execution = $result['execution'];

            if ($result['status'] >= 400 || $execution?->status === 'failed') {
                $this->setJobStatus($message, 'failed');

                return;
            }

            $execution = $execution?->fresh();
            $context = $execution?->context ?? [];
            $contactName = data_get($context, 'nama');

            if (
                is_string($contactName)
                && trim($contactName) !== ''
                && mb_strlen(trim($contactName)) <= 100
            ) {
                $session->contact?->update(['name' => trim($contactName)]);
            }

            $messages = data_get($execution?->output, 'messages', []);

            if (! is_array($messages)) {
                $messages = [];
            }

            foreach ($messages as $reply) {
                if (! is_string($reply) || trim($reply) === '') {
                    continue;
                }

                $replyMessage = ChatMessage::create([
                    'chat_session_id' => $session->id,
                    'contact_id' => $session->contact_id,
                    'workflow_execution_id' => $execution?->id,
                    'role' => 'assistant',
                    'content' => trim($reply),
                    'metadata' => ['node' => 'workflow'],
                ]);

                $this->delivery->send($replyMessage);
            }

            $session->refresh();

            if ($session->status === ChatSession::STATUS_HUMAN) {
                $alreadyNotified = $session->messages()
                    ->where('role', 'system')
                    ->where('metadata->variant', 'escalated')
                    ->exists();

                if (! $alreadyNotified) {
                    ChatMessage::create([
                        'chat_session_id' => $session->id,
                        'contact_id' => $session->contact_id,
                        'workflow_execution_id' => $execution?->id,
                        'role' => 'system',
                        'content' => 'Percakapan dialihkan ke admin.',
                        'metadata' => ['variant' => 'escalated'],
                    ]);
                }
            }

            $session->update(['last_activity_at' => now()]);
            $this->setJobStatus($message, 'processed', $execution?->id);
        } catch (Throwable $exception) {
            $this->setJobStatus($message, 'failed');

            Log::error('Chat message processing failed', [
                'message_id' => $message->id,
                'chat_session_id' => $session->id,
                'error' => $exception->getMessage(),
            ]);

            throw $exception;
        }
    }

    public function failMessage(int $messageId, Throwable $exception): void
    {
        $message = ChatMessage::query()->find($messageId);

        if ($message === null) {
            return;
        }

        $this->setJobStatus($message, 'failed', null, $exception);
    }

    /**
     * @return array<string, mixed>
     */
    public function state(ChatSession $session): array
    {
        $session->refresh();

        $latestCustomer = $session->messages()
            ->where('role', 'customer')
            ->latest('id')
            ->first();

        $jobStatus = data_get($latestCustomer?->metadata, 'job_status');
        $processing = in_array($jobStatus, ['pending', 'processing'], true)
            && $latestCustomer?->updated_at?->gt(
                now()->subMinutes(self::PROCESSING_TTL_MINUTES)
            ) === true;

        $notice = null;

        if ($session->status === ChatSession::STATUS_HUMAN) {
            $notice = 'Admin akan membalas percakapan ini.';
        } elseif ($jobStatus === 'failed') {
            $notice = 'Maaf, sedang ada kendala teknis. Tim kami akan segera memeriksa.';
        }

        return [
            'status' => $session->execution?->status,
            'session_status' => $session->status,
            'messages' => $this->messagesPayload($session),
            'notice' => $notice,
            'processing' => $processing,
        ];
    }

    private function createMessage(
        ChatSession $session,
        string $text,
        ?string $clientMessageId,
        ?string $externalMessageId = null
    ): array {
        $session->refresh()->loadMissing([
            'channel.workflow',
            'contact',
            'workflow',
            'user',
        ]);

        if ($session->status === ChatSession::STATUS_ENDED) {
            throw ValidationException::withMessages([
                'message' => 'Sesi sudah berakhir. Muat ulang widget untuk memulai sesi baru.',
            ]);
        }

        $existing = null;

        if ($clientMessageId !== null) {
            $existing = ChatMessage::query()
                ->where('chat_session_id', $session->id)
                ->where('client_message_id', $clientMessageId)
                ->first();
        }

        if ($existing === null && $externalMessageId !== null) {
            $existing = ChatMessage::query()
                ->where('chat_session_id', $session->id)
                ->where('external_message_id', $externalMessageId)
                ->first();
        }

        if ($existing !== null) {
            return [
                'state' => $this->state($session),
                'queued' => data_get($existing->metadata, 'job_status') === 'pending',
            ];
        }

        $channel = $session->channel;

        if ($channel === null || ! $channel->is_active) {
            throw ValidationException::withMessages([
                'channel' => 'Chat widget sedang tidak aktif.',
            ]);
        }

        $workflow = $session->workflow;

        if ($workflow === null) {
            throw ValidationException::withMessages([
                'message' => 'Workflow entry belum dikonfigurasi pada channel ini.',
            ]);
        }

        $humanHandling = $session->status === ChatSession::STATUS_HUMAN;

        $message = ChatMessage::create([
            'chat_session_id' => $session->id,
            'contact_id' => $session->contact_id,
            'role' => 'customer',
            'content' => $text,
            'external_message_id' => $externalMessageId,
            'client_message_id' => $clientMessageId,
            'metadata' => [
                'job_status' => $humanHandling ? 'processed' : 'pending',
            ],
        ]);

        $session->update(['last_activity_at' => now()]);

        if ($humanHandling) {
            return [
                'state' => $this->state($session),
                'queued' => false,
            ];
        }

        ProcessChatMessage::dispatch($message->id, $session->id);

        return [
            'state' => $this->state($session->fresh()),
            'queued' => true,
        ];
    }

    private function closePreviousSessions(Contact $contact, Channel $channel): void
    {
        $oldSessionIds = ChatSession::query()
            ->where('contact_id', $contact->id)
            ->where('channel_id', $channel->id)
            ->whereIn('status', [ChatSession::STATUS_ACTIVE, ChatSession::STATUS_HUMAN])
            ->pluck('id');

        if ($oldSessionIds->isEmpty()) {
            return;
        }

        ChatSession::query()
            ->whereIn('id', $oldSessionIds)
            ->update([
                'status' => ChatSession::STATUS_ENDED,
                'ended_at' => now(),
                'current_workflow_id' => null,
                'current_node_id' => null,
            ]);

        WorkflowExecution::query()
            ->whereIn('chat_session_id', $oldSessionIds)
            ->whereIn('status', ['running', 'waiting', 'escalated'])
            ->update([
                'status' => 'success',
                'current_workflow_id' => null,
                'current_node_id' => null,
                'waiting_since' => null,
                'finished_at' => now(),
            ]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function messagesPayload(ChatSession $session): array
    {
        return $session->messages()
            ->orderBy('id')
            ->limit(300)
            ->get()
            ->map(fn (ChatMessage $message) => [
                'id' => $message->id,
                'role' => $message->role,
                'content' => $message->content,
                'variant' => data_get($message->metadata, 'variant'),
                'delivery_status' => $message->delivery_status,
                'created_at' => $message->created_at?->toISOString(),
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, array{role: string, content: string}>
     */
    private function history(ChatSession $session, ?int $beforeMessageId = null): array
    {
        $query = $session->messages()
            ->orderByDesc('id')
            ->limit(40);

        if ($beforeMessageId !== null) {
            $query->where('id', '<', $beforeMessageId);
        }

        return $query
            ->get()
            ->reverse()
            ->map(fn (ChatMessage $message): array => [
                'role' => $message->role,
                'content' => $message->content,
            ])
            ->values()
            ->all();
    }

    private function setJobStatus(
        ChatMessage $message,
        string $status,
        ?int $executionId = null,
        ?Throwable $exception = null
    ): void {
        $metadata = $message->metadata ?? [];

        if (data_get($metadata, 'job_status') === 'processed' && $status !== 'processed') {
            return;
        }

        $metadata['job_status'] = $status;

        if ($status === 'processed') {
            $metadata['job_finished_at'] = now()->toISOString();
            unset($metadata['job_error']);
        } elseif ($status === 'failed') {
            $metadata['job_finished_at'] = now()->toISOString();
            $metadata['job_error'] = $exception?->getMessage();
        }

        $updates = ['metadata' => $metadata];

        if ($executionId !== null) {
            $updates['workflow_execution_id'] = $executionId;
        }

        $message->update($updates);
    }

    private function shouldAdoptName(Contact $contact, ?string $name): bool
    {
        if ($name === null || trim($name) === '') {
            return false;
        }

        return in_array(trim((string) $contact->name), ['', 'Pengunjung'], true);
    }

    private function normalizeContactName(?string $name): string
    {
        $name = trim((string) $name);

        return $name !== '' ? Str::limit($name, 100, '') : 'Pengunjung';
    }

    private function contactByExternalId(Channel $channel, string $externalId): ?Contact
    {
        return ContactChannel::query()
            ->with('contact')
            ->where('channel_id', $channel->id)
            ->where('external_id', $externalId)
            ->first()
            ?->contact;
    }

    private function linkContactChannel(
        Channel $channel,
        Contact $contact,
        string $externalId
    ): void {
        ContactChannel::query()->firstOrCreate(
            [
                'channel_id' => $channel->id,
                'external_id' => $externalId,
            ],
            ['contact_id' => $contact->id]
        );
    }

    private function contactId(): string
    {
        do {
            $id = 'ct_'.Str::lower(Str::random(18));
        } while (Contact::query()->where('public_id', $id)->exists());

        return $id;
    }
}
