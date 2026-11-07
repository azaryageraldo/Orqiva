<?php

namespace App\Services\Workflows\Executors;

use App\Services\Workflows\ConditionRule;
use App\Services\Workflows\WorkflowContext;
use RuntimeException;

class ConditionNodeExecutor implements NodeExecutorInterface
{
    public function __construct(
        private readonly ConditionRule $conditionRule,
        private readonly WorkflowContext $context
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
        $field = $this->conditionRule->validatedField($data);

        if (! $this->context->has($context, $field)) {
            throw new RuntimeException(
                'Variabel Condition "'.$field.'" tidak ditemukan. Perbaikan: pakai format {{nama-agent.variabel}} dari AI Agent sebelumnya, contoh: rekomendasi-penawaran.mau_beli.'
            );
        }

        $actual = $this->context->resolve($context, $field);
        $handle = $this->conditionRule->isTruthy($actual)
            ? 'true'
            : 'false';

        $stepInput = ['variable' => $field, 'value' => $actual];
        $stepOutput = ['branch' => $handle];
        $message = 'Condition {{'.$field.'}} → '
            .($handle === 'true' ? 'If match.' : 'Else.');

        $logContext = [
            'variable' => $field,
            'value' => $actual,
            'branch' => $handle,
        ];

        return new NodeExecutionResult(
            input: $stepInput,
            output: $stepOutput,
            branch: $handle,
            message: $message,
            logContext: $logContext,
            handle: $handle,
        );
    }
}

