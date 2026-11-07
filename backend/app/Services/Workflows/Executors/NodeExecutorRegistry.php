<?php

namespace App\Services\Workflows\Executors;

class NodeExecutorRegistry
{
    public function __construct(
        private readonly TriggerNodeExecutor $trigger,
        private readonly AiAgentNodeExecutor $aiAgent,
        private readonly ConditionNodeExecutor $condition,
        private readonly OutputNodeExecutor $output,
        private readonly RelocateNodeExecutor $relocate,
        private readonly GoToNodeExecutor $goTo,
        private readonly StopperNodeExecutor $stopper
    ) {}

    public function get(string $type): NodeExecutorInterface
    {
        return match ($type) {
            'trigger' => $this->trigger,
            'ai_agent' => $this->aiAgent,
            'if_else' => $this->condition,
            'output' => $this->output,
            'relocate' => $this->relocate,
            'go_to' => $this->goTo,
            default => $this->stopper,
        };
    }
}

