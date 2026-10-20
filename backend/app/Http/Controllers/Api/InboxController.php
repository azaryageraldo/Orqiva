<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WorkflowExecution;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class InboxController extends Controller
{
    /**
     * Daftar percakapan terbaru dari seluruh workflow milik pengguna.
     */
    public function index(Request $request): JsonResponse
    {
        $executions = WorkflowExecution::query()
            ->whereHas(
                'workflow',
                fn ($query) => $query->where('user_id', $request->user()->id)
            )
            ->with('workflow:id,name,user_id')
            ->orderByDesc('id')
            ->limit(500)
            ->get();

        $conversations = [];

        foreach ($executions as $execution) {
            $conversationId = $this->conversationId($execution);

            if ($conversationId === null) {
                continue;
            }

            $key = $execution->workflow_id.'|'.$conversationId;

            if (isset($conversations[$key])) {
                $conversations[$key]['execution_count']++;

                continue;
            }

            $customerName = data_get($execution->input, 'customer_name');
            $lastActivity = $execution->finished_at
                ?? $execution->started_at
                ?? $execution->created_at;

            $conversations[$key] = [
                'conversation_id' => $conversationId,
                'execution_id' => $execution->id,
                'workflow_id' => $execution->workflow_id,
                'workflow_name' => $execution->workflow?->name,
                'customer_name' => is_string($customerName)
                    && trim($customerName) !== ''
                    ? trim($customerName)
                    : 'Pengunjung',
                'last_message' => $this->lastMessagePreview($execution),
                'last_status' => $execution->status,
                'last_activity_at' => $lastActivity?->toISOString(),
                'execution_count' => 1,
            ];
        }

        return response()->json([
            'data' => array_values($conversations),
            'meta' => [
                'total' => count($conversations),
            ],
        ]);
    }

    /**
     * Riwayat pesan untuk satu percakapan.
     */
    public function show(
        Request $request,
        WorkflowExecution $execution
    ): JsonResponse {
        $execution->loadMissing('workflow');

        abort_unless(
            $execution->workflow !== null
            && $execution->workflow->user_id === $request->user()->id,
            404
        );

        $conversationId = $this->conversationId($execution);

        abort_if($conversationId === null, 404);

        $executions = WorkflowExecution::query()
            ->where('workflow_id', $execution->workflow_id)
            ->with('steps')
            ->orderBy('id')
            ->get()
            ->filter(
                fn (WorkflowExecution $item) => $this->conversationId($item)
                    === $conversationId
            )
            ->values();

        $messages = [];

        foreach ($executions as $item) {
            $messages = array_merge(
                $messages,
                $this->messagesFor($item)
            );
        }

        $latest = $executions->last() ?? $execution;
        $customerName = data_get($latest->input, 'customer_name');

        return response()->json([
            'data' => [
                'conversation_id' => $conversationId,
                'execution_id' => $latest->id,
                'workflow_id' => $latest->workflow_id,
                'workflow_name' => $latest->workflow?->name
                    ?? $execution->workflow?->name,
                'customer_name' => is_string($customerName)
                    && trim($customerName) !== ''
                    ? trim($customerName)
                    : 'Pengunjung',
                'status' => $latest->status,
                'started_at' => $executions->first()?->started_at?->toISOString(),
                'last_activity_at' => (
                    $latest->finished_at
                    ?? $latest->started_at
                    ?? $latest->created_at
                )?->toISOString(),
                'messages' => $messages,
            ],
        ]);
    }

    private function conversationId(WorkflowExecution $execution): ?string
    {
        $conversationId = data_get($execution->input, 'conversation_id');

        if (! is_string($conversationId) || trim($conversationId) === '') {
            return null;
        }

        return trim($conversationId);
    }

    private function lastMessagePreview(WorkflowExecution $execution): string
    {
        $messages = data_get($execution->output, 'messages');

        if (is_array($messages)) {
            $assistant = collect($messages)
                ->filter(fn ($message) => is_string($message) && trim($message) !== '')
                ->last();

            if (is_string($assistant)) {
                return Str::limit(trim($assistant), 140);
            }
        }

        $customer = data_get($execution->input, 'customer_message')
            ?? data_get($execution->input, 'message');

        return is_string($customer) && trim($customer) !== ''
            ? Str::limit(trim($customer), 140)
            : 'Tidak ada pesan';
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function messagesFor(WorkflowExecution $execution): array
    {
        $messages = [];
        $hasSteps = $execution->steps->isNotEmpty();
        $hasRelocateStep = false;

        if ($hasSteps) {
            foreach ($execution->steps as $step) {
                $createdAt = (
                    $step->executed_at
                    ?? $execution->started_at
                    ?? $execution->created_at
                )?->toISOString();

                if ($step->node_type === 'trigger') {
                    $text = data_get($step->input, 'customer_message');

                    if (is_string($text) && trim($text) !== '') {
                        $messages[] = $this->message(
                            "step-{$step->id}-customer",
                            'customer',
                            trim($text),
                            $createdAt
                        );
                    }

                    continue;
                }

                if ($step->node_type === 'output') {
                    foreach ($step->messages ?? [] as $index => $text) {
                        if (! is_string($text) || trim($text) === '') {
                            continue;
                        }

                        $messages[] = $this->message(
                            "step-{$step->id}-assistant-{$index}",
                            'assistant',
                            trim($text),
                            $createdAt
                        );
                    }

                    continue;
                }

                if ($step->node_type === 'relocate') {
                    $hasRelocateStep = true;
                    $messages[] = $this->message(
                        "step-{$step->id}-handoff",
                        'system',
                        'Percakapan dialihkan ke admin manusia.',
                        $createdAt,
                        'escalated'
                    );
                }
            }
        } else {
            $customer = data_get($execution->input, 'customer_message')
                ?? data_get($execution->input, 'message');

            if (is_string($customer) && trim($customer) !== '') {
                $messages[] = $this->message(
                    "execution-{$execution->id}-customer",
                    'customer',
                    trim($customer),
                    ($execution->started_at ?? $execution->created_at)?->toISOString()
                );
            }

            $replies = data_get($execution->output, 'messages');

            if (is_array($replies)) {
                foreach ($replies as $index => $text) {
                    if (! is_string($text) || trim($text) === '') {
                        continue;
                    }

                    $messages[] = $this->message(
                        "execution-{$execution->id}-assistant-{$index}",
                        'assistant',
                        trim($text),
                        ($execution->finished_at ?? $execution->started_at)?->toISOString()
                    );
                }
            }
        }

        if ($execution->status === 'escalated' && ! $hasRelocateStep) {
            $messages[] = $this->message(
                "execution-{$execution->id}-handoff",
                'system',
                'Percakapan dialihkan ke admin manusia.',
                ($execution->finished_at ?? $execution->started_at)?->toISOString(),
                'escalated'
            );
        }

        if ($execution->status === 'failed' && is_string($execution->error)) {
            $messages[] = $this->message(
                "execution-{$execution->id}-error",
                'system',
                'Workflow gagal: '.$execution->error,
                ($execution->finished_at ?? $execution->started_at)?->toISOString(),
                'error'
            );
        }

        return $messages;
    }

    /**
     * @return array<string, mixed>
     */
    private function message(
        string $id,
        string $role,
        string $content,
        ?string $createdAt,
        ?string $variant = null
    ): array {
        return [
            'id' => $id,
            'role' => $role,
            'content' => $content,
            'variant' => $variant,
            'created_at' => $createdAt,
        ];
    }
}
