<?php

namespace App\Services\Workflows\Executors;

use App\Services\Workflows\MessageRenderer;
use RuntimeException;

class OutputNodeExecutor implements NodeExecutorInterface
{
    public function __construct(
        private readonly MessageRenderer $messageRenderer
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
        $template = (string) ($data['messageTemplate'] ?? '');

        $stepInput = [
            'template' => $template,
        ];

        if ($currentStep !== null) {
            $currentStep['input'] = $stepInput;
        }

        $messages = $this->messageRenderer->render($template, $context);

        if ($messages === []) {
            throw new RuntimeException(
                'Send Message tidak menghasilkan pesan. Periksa variabel yang dipakai.'
            );
        }

        $context['messages'] = $messages;
        $context['message'] = implode("\n", $messages);

        $message = count($messages) > 1
            ? 'Send Message menghasilkan '.count($messages).' bubble.'
            : 'Send Message menghasilkan 1 bubble.';

        return new NodeExecutionResult(
            input: $stepInput,
            output: ['messages' => $messages],
            messages: $messages,
            message: $message,
            logContext: ['messages' => $messages],
            replyMessages: $messages,
        );
    }
}

