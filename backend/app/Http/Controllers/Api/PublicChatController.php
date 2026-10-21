<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Channel;
use App\Models\ChatMessage;
use App\Models\ChatSession;
use App\Models\Contact;
use App\Models\WorkflowExecution;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PublicChatController extends Controller
{
    private const DEFAULT_APPEARANCE = [
        'header_color' => '#17212b',
        'background_color' => '#0e1621',
        'outgoing_color' => '#2b5278',
        'accent_color' => '#64b5ef',
    ];

    public function showChannel(string $token): JsonResponse
    {
        $channel = $this->resolveChannel($token);

        return response()->json([
            'data' => $this->channelPayload($channel),
        ]);
    }

    public function embedConfig(string $token)
    {
        $channel = $this->resolveChannel($token);
        $settings = $this->publicSettings($channel);
        $config = [
            'mode' => $settings['open_mode'],
            'name' => $channel->name,
            'accent' => $settings['appearance']['accent_color'],
            'icon' => $this->iconUrl($channel, 'launcher'),
            'active' => (bool) $channel->is_active,
        ];

        $json = json_encode(
            $config,
            JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
        ) ?: '{}';
        $key = json_encode($token) ?: '""';
        $script = 'window.OrqivaEmbedConfig=window.OrqivaEmbedConfig||{};'
            .'window.OrqivaEmbedConfig['.$key.']='.$json.';';

        return response($script, 200, [
            'Content-Type' => 'application/javascript; charset=utf-8',
            'Cache-Control' => 'public, max-age=60',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function icon(string $token, string $kind)
    {
        abort_unless(in_array($kind, ['chat', 'launcher'], true), 404);

        $channel = Channel::query()
            ->where('public_token', $token)
            ->first();

        abort_if($channel === null, 404);

        $settings = $this->normalizeSettings($channel->settings ?? []);
        $path = $settings['icons'][$kind] ?? null;

        abort_unless(is_string($path) && $path !== '', 404);

        $disk = Storage::disk('public');

        abort_unless($disk->exists($path), 404);

        return response()->file($disk->path($path), [
            'Content-Type' => 'image/png',
            'Cache-Control' => 'public, max-age=86400',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function start(Request $request, string $token): JsonResponse
    {
        $channel = $this->resolveChannel($token);
        $this->assertAvailable($channel);
        $workflow = $channel->workflow;

        $validated = $request->validate([
            'contact_id' => ['nullable', 'string', 'max:100'],
        ]);

        $contact = null;

        if (is_string($validated['contact_id'] ?? null) && trim($validated['contact_id']) !== '') {
            $contact = Contact::query()
                ->where('user_id', $channel->user_id)
                ->where('public_id', trim($validated['contact_id']))
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

        /*
         * Refresh widget berarti sesi lama berakhir. Takeover admin juga
         * berakhir agar sesi baru kembali ditangani AI.
         */
        $oldSessionIds = ChatSession::query()
            ->where('contact_id', $contact->id)
            ->where('channel_id', $channel->id)
            ->whereIn('status', [ChatSession::STATUS_ACTIVE, ChatSession::STATUS_HUMAN])
            ->pluck('id');

        if ($oldSessionIds->isNotEmpty()) {
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

        $session = ChatSession::create([
            'user_id' => $channel->user_id,
            'channel_id' => $channel->id,
            'contact_id' => $contact->id,
            'workflow_id' => $workflow->id,
            'public_token' => Str::random(48),
            'status' => ChatSession::STATUS_ACTIVE,
            'last_activity_at' => now(),
        ]);

        return response()->json([
            'data' => [
                'contact_id' => $contact->public_id,
                'session_token' => $session->public_token,
                'status' => $session->status,
                'channel' => $this->channelPayload($channel),
                'messages' => [],
            ],
        ], 201);
    }

    public function messages(string $sessionToken): JsonResponse
    {
        $session = $this->session($sessionToken);

        return response()->json([
            'data' => [
                'contact_id' => $session->contact?->public_id,
                'session_token' => $session->public_token,
                'status' => $session->status,
                'channel' => $this->channelPayload($session->channel),
                'messages' => $this->messagesPayload($session),
            ],
        ]);
    }

    public function send(Request $request, string $sessionToken): JsonResponse
    {
        $session = $this->session($sessionToken);

        if ($session->status === ChatSession::STATUS_ENDED) {
            throw ValidationException::withMessages([
                'message' => 'Sesi sudah berakhir. Muat ulang widget untuk memulai sesi baru.',
            ]);
        }

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:4000'],
            'client_message_id' => ['sometimes', 'nullable', 'string', 'max:100'],
        ]);

        $text = trim($validated['message']);

        if ($text === '') {
            throw ValidationException::withMessages([
                'message' => 'Pesan tidak boleh kosong.',
            ]);
        }

        $clientMessageId = trim((string) ($validated['client_message_id'] ?? ''));
        $lock = Cache::lock('public-chat-send:'.$session->id, 120);

        try {
            return $lock->block(
                20,
                fn (): JsonResponse => $this->processSend(
                    $session->fresh(['channel.workflow', 'contact', 'workflow', 'user']),
                    $text,
                    $clientMessageId !== '' ? $clientMessageId : null
                )
            );
        } catch (LockTimeoutException) {
            throw ValidationException::withMessages([
                'message' => 'Pesan sebelumnya masih diproses. Tunggu sebentar lalu coba lagi.',
            ]);
        }
    }

    private function processSend(
        ChatSession $session,
        string $text,
        ?string $clientMessageId
    ): JsonResponse {
        if ($session->status === ChatSession::STATUS_ENDED) {
            throw ValidationException::withMessages([
                'message' => 'Sesi sudah berakhir. Muat ulang widget untuk memulai sesi baru.',
            ]);
        }

        if ($clientMessageId !== null) {
            $existing = ChatMessage::query()
                ->where('chat_session_id', $session->id)
                ->where('client_message_id', $clientMessageId)
                ->first();

            if ($existing !== null) {
                return $this->stateResponse($session);
            }
        }

        $channel = $session->channel;
        $this->assertAvailable($channel);

        $history = $this->history($session);

        ChatMessage::create([
            'chat_session_id' => $session->id,
            'contact_id' => $session->contact_id,
            'role' => 'customer',
            'content' => $text,
            'client_message_id' => $clientMessageId,
        ]);

        $session->update(['last_activity_at' => now()]);

        if ($session->status === ChatSession::STATUS_HUMAN) {
            return $this->stateResponse($session);
        }

        $workflow = $session->workflow;

        if ($workflow === null) {
            throw ValidationException::withMessages([
                'message' => 'Workflow entry belum dikonfigurasi pada channel ini.',
            ]);
        }

        $delayMs = max(0, min(5000, (int) ($session->user?->ai_reply_debounce_ms ?? 0)));

        if ($delayMs > 0) {
            usleep($delayMs * 1000);
        }

        $executionRequest = Request::create(
            '/api/v1/workflows/'.$workflow->id.'/execute',
            'POST',
            [
                'input' => [
                    'message' => $text,
                    'customer_message' => $text,
                    'customer_name' => $session->contact?->name ?? 'Pengunjung',
                    'conversation_id' => $session->contact?->public_id,
                    'conversation_history' => $history,
                    'client_message_id' => $clientMessageId,
                ],
            ]
        );

        $response = app(WorkflowExecutionController::class)
            ->execute($executionRequest, $workflow, $session);
        $payload = $response->getData(true);
        $execution = $session->execution()->first();

        if ($response->getStatusCode() >= 400) {
            $session->update(['last_activity_at' => now()]);

            return response()->json([
                'data' => [
                    'status' => 'failed',
                    'session_status' => $session->fresh()->status,
                    'messages' => $this->messagesPayload($session->fresh()),
                    'notice' => 'Maaf, sedang ada kendala teknis. Tim kami akan segera memeriksa.',
                ],
            ]);
        }

        $context = $execution?->fresh()?->context ?? [];
        $contactName = data_get($context, 'nama');

        if (
            is_string($contactName)
            && trim($contactName) !== ''
            && mb_strlen(trim($contactName)) <= 100
        ) {
            $session->contact?->update(['name' => trim($contactName)]);
        }

        $messages = data_get($payload, 'data.output.messages', []);

        if (! is_array($messages)) {
            $messages = [];
        }

        foreach ($messages as $message) {
            if (! is_string($message) || trim($message) === '') {
                continue;
            }

            ChatMessage::create([
                'chat_session_id' => $session->id,
                'contact_id' => $session->contact_id,
                'workflow_execution_id' => $execution?->id,
                'role' => 'assistant',
                'content' => trim($message),
                'metadata' => ['node' => 'workflow'],
            ]);
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

        return $this->stateResponse($session, $execution?->status);
    }

    private function stateResponse(ChatSession $session, ?string $executionStatus = null): JsonResponse
    {
        $session->refresh();

        return response()->json([
            'data' => [
                'status' => $executionStatus ?? $session->execution?->status,
                'session_status' => $session->status,
                'messages' => $this->messagesPayload($session->fresh()),
                'notice' => $session->status === ChatSession::STATUS_HUMAN
                    ? 'Admin akan membalas percakapan ini.'
                    : null,
            ],
        ]);
    }

    private function resolveChannel(string $token): Channel
    {
        $channel = Channel::query()
            ->where('public_token', $token)
            ->with('workflow:id,name,status,definition')
            ->first();

        abort_if($channel === null, 404);

        return $channel;
    }

    private function session(string $token): ChatSession
    {
        $session = ChatSession::query()
            ->where('public_token', $token)
            ->with(['channel.workflow:id,name,status', 'contact', 'workflow'])
            ->first();

        abort_if($session === null, 404);

        return $session;
    }

    private function assertAvailable(Channel $channel): void
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
    }

    /**
     * @return array<string, mixed>
     */
    private function channelPayload(?Channel $channel): array
    {
        if ($channel === null) {
            return [];
        }

        return [
            'name' => $channel->name,
            'is_active' => (bool) $channel->is_active,
            'settings' => $this->publicSettings($channel),
            'icon_urls' => [
                'chat' => $this->iconUrl($channel, 'chat'),
                'launcher' => $this->iconUrl($channel, 'launcher'),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function publicSettings(Channel $channel): array
    {
        $settings = $this->normalizeSettings($channel->settings ?? []);

        return [
            'welcome_message' => $settings['welcome_message'],
            'placeholder' => $settings['placeholder'],
            'open_mode' => $settings['open_mode'],
            'appearance' => $settings['appearance'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function normalizeSettings(array $settings): array
    {
        $appearance = is_array($settings['appearance'] ?? null)
            ? $settings['appearance']
            : [];
        $icons = is_array($settings['icons'] ?? null)
            ? $settings['icons']
            : [];

        foreach (self::DEFAULT_APPEARANCE as $key => $default) {
            if (
                ! isset($appearance[$key])
                || ! is_string($appearance[$key])
                || preg_match('/^#[0-9a-fA-F]{6}$/', $appearance[$key]) !== 1
            ) {
                $appearance[$key] = $default;
            }
        }

        return [
            'welcome_message' => (string) ($settings['welcome_message'] ?? ''),
            'placeholder' => (string) ($settings['placeholder'] ?? ''),
            'open_mode' => in_array(
                $settings['open_mode'] ?? null,
                ['manual', 'always'],
                true
            ) ? $settings['open_mode'] : 'manual',
            'appearance' => $appearance,
            'icons' => [
                'chat' => is_string($icons['chat'] ?? null)
                    ? $icons['chat']
                    : null,
                'launcher' => is_string($icons['launcher'] ?? null)
                    ? $icons['launcher']
                    : null,
            ],
        ];
    }

    private function iconUrl(Channel $channel, string $kind): ?string
    {
        $settings = $this->normalizeSettings($channel->settings ?? []);
        $path = $settings['icons'][$kind] ?? null;

        if (! is_string($path) || $path === '') {
            return null;
        }

        return '/api/v1/public/channels/'
            .$channel->public_token
            .'/icon/'
            .$kind
            .'?v='
            .($channel->updated_at?->timestamp ?? time());
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
                'created_at' => $message->created_at?->toISOString(),
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, array{role: string, content: string}>
     */
    private function history(ChatSession $session): array
    {
        return $session->messages()
            ->orderByDesc('id')
            ->limit(40)
            ->get()
            ->reverse()
            ->map(fn (ChatMessage $message): array => [
                'role' => $message->role,
                'content' => $message->content,
            ])
            ->values()
            ->all();
    }

    private function contactId(): string
    {
        do {
            $id = 'ct_'.Str::lower(Str::random(18));
        } while (Contact::query()->where('public_id', $id)->exists());

        return $id;
    }
}
