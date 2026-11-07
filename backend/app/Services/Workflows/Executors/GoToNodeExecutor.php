<?php

namespace App\Services\Workflows\Executors;

use App\Models\Workflow;
use App\Services\Workflows\WorkflowGraphValidator;
use RuntimeException;

class GoToNodeExecutor implements NodeExecutorInterface
{
    public function __construct(
        private readonly WorkflowGraphValidator $graphValidator
    ) {}

    public function execute(
        array $node,
        array &$context,
        int $ownerId,
        int $currentWorkflowId,
        string $currentWorkflowName,
        array $next,
        ?array &$currentStep = null
    ): NodeExecutionResult {
        $data = $node['data'] ?? [];
        $jumpTo = (string) ($data['targetNodeId'] ?? '');
        $endFlow = (bool) ($data['endFlow'] ?? false);
        $targetWorkflowId = $data['targetWorkflowId'] ?? null;
        $targetWorkflowId = is_numeric($targetWorkflowId)
            ? (int) $targetWorkflowId
            : null;

        if ($jumpTo === '') {
            throw new RuntimeException(
                'Node Go To belum memilih node tujuan. Perbaikan: buka node Go To lalu pilih node tujuan.'
            );
        }

        $message = 'Go To → '.$jumpTo;

        $logContext = [
            'target_node_id' => $jumpTo,
            'end_flow' => $endFlow,
        ];

        $stepInput = [
            'target_node_id' => $jumpTo,
            'target_workflow_id' => $targetWorkflowId,
            'end_flow' => $endFlow,
        ];

        $newNodeMap = null;
        $newNext = null;
        $newWorkflowId = null;
        $newWorkflowName = null;

        if (
            $targetWorkflowId !== null
            && $targetWorkflowId !== $currentWorkflowId
        ) {
            $targetWorkflow = Workflow::query()
                ->whereKey($targetWorkflowId)
                ->where('user_id', $ownerId)
                ->first();

            if ($targetWorkflow === null) {
                throw new RuntimeException(
                    'Workflow tujuan Go To tidak ditemukan. Perbaikan: pilih ulang workflow tujuan yang masih ada.'
                );
            }

            $targetGraph = $this->graphValidator->validateDefinition(
                $targetWorkflow->definition ?? [],
                $jumpTo,
                false
            );

            $newNodeMap = $targetGraph['nodes'];
            $newNext = $targetGraph['next'];
            $newWorkflowId = (int) $targetWorkflow->id;
            $newWorkflowName = (string) $targetWorkflow->name;

            $logContext['target_workflow_id'] = $newWorkflowId;
            $logContext['target_workflow_name'] = $newWorkflowName;
        }

        $paused = false;
        $resumeAtNodeId = null;
        $resumeAtWorkflowId = null;

        if ($endFlow) {
            $paused = true;
            $resumeAtNodeId = $jumpTo;
            $resumeAtWorkflowId = $newWorkflowId ?? $currentWorkflowId;
            $message .= ' (End flow)';
        }

        $stepOutput = [
            'paused' => $paused && $endFlow,
            'resume_node_id' => $resumeAtNodeId,
            'resume_workflow_id' => $resumeAtWorkflowId,
        ];

        return new NodeExecutionResult(
            input: $stepInput,
            output: $stepOutput,
            message: $message,
            logContext: $logContext,
            jumpTo: $jumpTo,
            targetWorkflowId: $newWorkflowId,
            targetWorkflowName: $newWorkflowName,
            paused: $paused,
            resumeAtNodeId: $resumeAtNodeId,
            resumeAtWorkflowId: $resumeAtWorkflowId,
            newNodeMap: $newNodeMap,
            newNext: $newNext,
        );
    }
}

