<?php

namespace App\Services\Workflows\Executors;

class StopperNodeExecutor implements NodeExecutorInterface
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
        $resumeAtNodeId = $next[$nodeId.':default'] ?? null;

        return new NodeExecutionResult(
            output: ['resume_node_id' => $resumeAtNodeId],
            message: 'Workflow menunggu pesan pelanggan berikutnya.',
            paused: true,
            resumeAtNodeId: $resumeAtNodeId,
            resumeAtWorkflowId: $currentWorkflowId,
        );
    }
}

