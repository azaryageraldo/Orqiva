<?php

namespace App\Services\Workflows\Executors;

class NodeExecutionResult
{
    /**
     * @param array<string, mixed>|null $input
     * @param array<string, mixed>|null $output
     * @param array<string, mixed>|null $variables
     * @param array<int, string>|null $messages
     * @param array<string, mixed> $logContext
     * @param array<int, string> $replyMessages
     * @param array<string, array<string, mixed>>|null $newNodeMap
     * @param array<string, string>|null $newNext
     */
    public function __construct(
        public ?array $input = null,
        public ?array $output = null,
        public ?array $variables = null,
        public ?string $branch = null,
        public ?array $messages = null,
        public int $promptTokens = 0,
        public int $completionTokens = 0,
        public int $totalTokens = 0,
        public string $message = '',
        public array $logContext = [],
        public string $handle = 'default',
        public ?string $jumpTo = null,
        public ?int $targetWorkflowId = null,
        public ?string $targetWorkflowName = null,
        public bool $paused = false,
        public bool $escalated = false,
        public ?string $resumeAtNodeId = null,
        public ?int $resumeAtWorkflowId = null,
        public array $replyMessages = [],
        public ?array $newNodeMap = null,
        public ?array $newNext = null,
    ) {}
}

