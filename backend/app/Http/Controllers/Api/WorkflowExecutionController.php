<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Workflow;
use App\Models\WorkflowExecution;
use App\Services\Workflows\WorkflowDiagnostics;
use App\Services\Workflows\WorkflowRunner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkflowExecutionController extends Controller
{
    public function __construct(
        private readonly WorkflowDiagnostics $diagnostics,
        private readonly WorkflowRunner $runner
    ) {}

    public function index(Workflow $workflow): JsonResponse
    {
        return response()->json([
            'data' => $workflow->executions()
                ->latest()
                ->paginate(10),
        ]);
    }

    public function show(
        Workflow $workflow,
        WorkflowExecution $execution
    ): JsonResponse {
        abort_unless($execution->workflow_id === $workflow->id, 404);

        $execution->load(['steps', 'chatSession', 'contact', 'currentWorkflow']);

        $errorStep = $execution->steps->firstWhere('status', 'error');

        return response()->json([
            'data' => [
                'id' => $execution->id,
                'workflow_id' => $execution->workflow_id,
                'workflow_name' => $workflow->name,
                'current_workflow_id' => $execution->current_workflow_id,
                'current_workflow_name' => $execution->currentWorkflow?->name,
                'chat_session_id' => $execution->chat_session_id,
                'session_status' => $execution->chatSession?->status,
                'contact_public_id' => $execution->contact?->public_id,
                'contact_name' => $execution->contact?->name,
                'status' => $execution->status,
                'input' => $execution->input,
                'output' => $execution->output,
                'logs' => $execution->logs,
                'error' => $execution->error,
                'diagnostic' => $this->diagnostics->diagnose(
                    $execution->error,
                    $errorStep
                ),
                'context' => $execution->context,
                'prompt_tokens' => (int) $execution->prompt_tokens,
                'completion_tokens' => (int) $execution->completion_tokens,
                'total_tokens' => (int) $execution->total_tokens,
                'started_at' => $execution->started_at?->toISOString(),
                'finished_at' => $execution->finished_at?->toISOString(),
                'waiting_since' => $execution->waiting_since?->toISOString(),
                'steps' => $execution->steps
                    ->map(fn ($step) => [
                        'id' => $step->id,
                        'step' => $step->step,
                        'workflow_id' => $step->workflow_id,
                        'workflow_name' => $step->workflow_name,
                        'node_id' => $step->node_id,
                        'node_type' => $step->node_type,
                        'node_name' => $step->node_name,
                        'status' => $step->status,
                        'input' => $step->input,
                        'output' => $step->output,
                        'variables' => $step->variables,
                        'branch' => $step->branch,
                        'messages' => $step->messages,
                        'duration_ms' => $step->duration_ms,
                        'prompt_tokens' => $step->prompt_tokens,
                        'completion_tokens' => $step->completion_tokens,
                        'total_tokens' => $step->total_tokens,
                        'error' => $step->error,
                        'executed_at' => $step->executed_at?->toISOString(),
                    ])
                    ->values(),
            ],
        ]);
    }

    public function execute(Request $request, Workflow $workflow): JsonResponse
    {
        $validated = $request->validate([
            'input' => ['sometimes', 'array'],
        ]);

        $result = $this->runner->execute(
            $workflow,
            $validated['input'] ?? []
        );

        return response()->json([
            'message' => $result['message'],
            'data' => $result['execution'],
        ], $result['status']);
    }
}
