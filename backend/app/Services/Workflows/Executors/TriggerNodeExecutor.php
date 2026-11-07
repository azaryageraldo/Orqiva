<?php

namespace App\Services\Workflows\Executors;

class TriggerNodeExecutor implements NodeExecutorInterface
{
    public function execute(
        array $node,
        array &$context,
        int $ownerId,
        int $currentWorkflowId,
        string $currentWorkflowName,
        array $next,
        ?array &$currentStep = null
    ): NodeExecutionResult {
        $nodeId = (string) ($node['id'] ?? '');
        $stepInput = [
            'conversation_id' => $context['conversation_id'] ?? null,
            'customer_message' => $context['customer_message']
                ?? $context['message']
                ?? null,
        ];
        $stepOutput = ['node_id' => $nodeId];

        return new NodeExecutionResult(
            input: $stepInput,
            output: $stepOutput,
            message: 'Workflow dimulai dari Trigger.',
        );
    }
}

