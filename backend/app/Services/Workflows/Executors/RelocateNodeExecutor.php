<?php

namespace App\Services\Workflows\Executors;

class RelocateNodeExecutor implements NodeExecutorInterface
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
        return new NodeExecutionResult(
            output: ['escalated' => true],
            message: 'Percakapan dialihkan ke admin. AI tidak membalas.',
            logContext: ['escalated' => true],
            escalated: true,
        );
    }
}

