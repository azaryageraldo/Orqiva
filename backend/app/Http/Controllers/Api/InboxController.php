<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChatMessage;
use App\Models\ChatSession;
use App\Models\Contact;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class InboxController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $contacts = Contact::query()
            ->where('user_id', $request->user()->id)
            ->with([
                'sessions' => fn ($query) => $query
                    ->with(['workflow:id,name', 'execution:id,chat_session_id,status'])
                    ->latest('id'),
            ])
            ->get();

        $data = $contacts
            ->map(function (Contact $contact): array {
                $latestSession = $contact->sessions->first();
                $lastMessage = $contact->messages()->latest('id')->first();
                $lastActivity = $lastMessage?->created_at
                    ?? $latestSession?->last_activity_at
                    ?? $contact->last_seen_at
                    ?? $contact->created_at;

                return [
                    'id' => $contact->id,
                    'contact_id' => $contact->public_id,
                    'name' => $contact->name ?: 'Pengunjung',
                    'last_message' => $lastMessage?->content,
                    'last_activity_at' => $lastActivity?->toISOString(),
                    'session_status' => $latestSession?->status ?? 'ended',
                    'workflow_name' => $latestSession?->workflow?->name,
                    'session_count' => $contact->sessions->count(),
                    'latest_session_id' => $latestSession?->id,
                    'latest_execution_id' => $latestSession?->execution?->id,
                    'latest_status' => $latestSession?->execution?->status,
                ];
            })
            ->sortByDesc(fn (array $item) => $item['last_activity_at'] ?? '')
            ->values();

        return response()->json([
            'data' => $data,
            'meta' => ['total' => $data->count()],
        ]);
    }

    public function show(Request $request, Contact $contact): JsonResponse
    {
        abort_unless($contact->user_id === $request->user()->id, 404);

        $contact->load([
            'sessions' => fn ($query) => $query
                ->with([
                    'workflow:id,name',
                    'execution:id,chat_session_id,status,started_at,finished_at',
                    'messages' => fn ($messages) => $messages->orderBy('id'),
                ])
                ->orderBy('id'),
        ]);

        $sessions = $contact->sessions->map(fn (ChatSession $session) => [
            'id' => $session->id,
            'status' => $session->status,
            'workflow_name' => $session->workflow?->name,
            'execution_id' => $session->execution?->id,
            'execution_status' => $session->execution?->status,
            'started_at' => $session->created_at?->toISOString(),
            'ended_at' => $session->ended_at?->toISOString(),
            'takeover_at' => $session->takeover_at?->toISOString(),
            'last_activity_at' => $session->last_activity_at?->toISOString(),
            'messages' => $session->messages->map(
                fn (ChatMessage $message) => $this->messagePayload($message)
            )->values()->all(),
        ])->values();

        $latest = $contact->sessions->last();

        return response()->json([
            'data' => [
                'id' => $contact->id,
                'contact_id' => $contact->public_id,
                'name' => $contact->name ?: 'Pengunjung',
                'latest_session' => $latest === null ? null : [
                    'id' => $latest->id,
                    'status' => $latest->status,
                    'execution_id' => $latest->execution?->id,
                    'execution_status' => $latest->execution?->status,
                    'workflow_name' => $latest->workflow?->name,
                    'takeover_at' => $latest->takeover_at?->toISOString(),
                ],
                'sessions' => $sessions,
            ],
        ]);
    }

    public function takeover(Request $request, ChatSession $session): JsonResponse
    {
        $this->authorizeSession($request, $session);

        if ($session->status === ChatSession::STATUS_ENDED) {
            throw ValidationException::withMessages([
                'session' => 'Sesi ini sudah berakhir. Pelanggan perlu membuka widget baru.',
            ]);
        }

        $session->update([
            'status' => ChatSession::STATUS_HUMAN,
            'takeover_at' => now(),
            'last_activity_at' => now(),
        ]);

        $session->execution?->update([
            'status' => 'escalated',
            'current_workflow_id' => null,
            'current_node_id' => null,
            'waiting_since' => null,
            'finished_at' => now(),
        ]);

        ChatMessage::create([
            'chat_session_id' => $session->id,
            'contact_id' => $session->contact_id,
            'role' => 'system',
            'content' => 'Admin mengambil alih percakapan. AI berhenti membalas.',
            'metadata' => ['variant' => 'escalated'],
        ]);

        return response()->json([
            'data' => $this->sessionPayload($session->fresh(['workflow', 'execution'])),
        ]);
    }

    public function release(Request $request, ChatSession $session): JsonResponse
    {
        $this->authorizeSession($request, $session);

        if ($session->status === ChatSession::STATUS_ENDED) {
            throw ValidationException::withMessages([
                'session' => 'Sesi ini sudah berakhir.',
            ]);
        }

        $session->update([
            'status' => ChatSession::STATUS_ACTIVE,
            'takeover_at' => null,
            'current_workflow_id' => null,
            'current_node_id' => null,
            'last_activity_at' => now(),
        ]);

        $session->execution?->update([
            'status' => 'success',
            'current_workflow_id' => null,
            'current_node_id' => null,
            'waiting_since' => null,
            'finished_at' => now(),
        ]);

        ChatMessage::create([
            'chat_session_id' => $session->id,
            'contact_id' => $session->contact_id,
            'role' => 'system',
            'content' => 'Percakapan dikembalikan ke AI. Pesan berikutnya akan dijawab AI.',
            'metadata' => ['variant' => null],
        ]);

        return response()->json([
            'data' => $this->sessionPayload($session->fresh(['workflow', 'execution'])),
        ]);
    }

    public function reply(Request $request, ChatSession $session): JsonResponse
    {
        $this->authorizeSession($request, $session);

        if ($session->status !== ChatSession::STATUS_HUMAN) {
            throw ValidationException::withMessages([
                'session' => 'Ambil alih percakapan terlebih dahulu sebelum membalas sebagai admin.',
            ]);
        }

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:4000'],
        ]);

        $text = trim($validated['message']);

        if ($text === '') {
            throw ValidationException::withMessages([
                'message' => 'Pesan tidak boleh kosong.',
            ]);
        }

        $message = ChatMessage::create([
            'chat_session_id' => $session->id,
            'contact_id' => $session->contact_id,
            'role' => 'admin',
            'content' => $text,
        ]);

        $session->update(['last_activity_at' => now()]);

        return response()->json([
            'data' => $this->messagePayload($message),
        ], 201);
    }

    private function authorizeSession(Request $request, ChatSession $session): void
    {
        abort_unless($session->user_id === $request->user()->id, 404);
    }

    /**
     * @return array<string, mixed>
     */
    private function messagePayload(ChatMessage $message): array
    {
        return [
            'id' => $message->id,
            'role' => $message->role,
            'content' => $message->content,
            'variant' => data_get($message->metadata, 'variant'),
            'created_at' => $message->created_at?->toISOString(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function sessionPayload(ChatSession $session): array
    {
        return [
            'id' => $session->id,
            'status' => $session->status,
            'workflow_name' => $session->workflow?->name,
            'execution_id' => $session->execution?->id,
            'execution_status' => $session->execution?->status,
            'takeover_at' => $session->takeover_at?->toISOString(),
            'ended_at' => $session->ended_at?->toISOString(),
            'last_activity_at' => $session->last_activity_at?->toISOString(),
        ];
    }
}
