<?php

namespace App\Services\Workflows\Executors;

interface NodeExecutorInterface
{
    /**
     * @param  array<string, mixed>  $node
     * @param  array<string, mixed>  $context
     * @param  array<string, string>  $next
     * @param  array<string, mixed>|null  $currentStep
     */
    public function execute(
        array $node,
        array &$context,
        int $ownerId,
        int $currentWorkflowId,
        string $currentWorkflowName,
        array $next,
        ?array &$currentStep = null
    ): NodeExecutionResult;
}

