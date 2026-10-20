<?php

namespace Tests\Concerns;

/**
 * Definisi workflow untuk pengujian API.
 */
trait BuildsWorkflowDefinitions
{
    protected function aiNode(
        string $id,
        string $name = 'AI response',
        array $outputVariables = []
    ): array {
        return [
            'id' => $id,
            'type' => 'AI Agent',
            'position' => ['x' => 0, 'y' => 0],
            'data' => [
                'label' => 'AI Agent',
                'nodeName' => $name,
                'systemMessage' => 'You are a helpful assistant.',
                'outputVariables' => $outputVariables,
                'variableDefinitions' => [
                    [
                        'name' => 'customer_message',
                        'type' => 'string',
                        'description' => 'Message from the visitor',
                        'sourceValue' => 'input.message',
                    ],
                ],
            ],
        ];
    }

    protected function conditionNode(
        string $id = 'condition-1',
        ?string $variable = 'beli'
    ): array {
        return [
            'id' => $id,
            'type' => 'Condition',
            'position' => ['x' => 0, 'y' => 0],
            'data' => [
                'label' => 'Condition',
                'conditionVariable' => $variable,
            ],
        ];
    }

    protected function relocateNode(string $id = 'relocate-1'): array
    {
        return [
            'id' => $id,
            'type' => 'Relocate',
            'position' => ['x' => 0, 'y' => 0],
            'data' => [
                'label' => 'Relocate',
                'nodeName' => 'Handoff to admin',
            ],
        ];
    }

    protected function goToNode(
        string $id,
        string $target,
        bool $endFlow = false,
        bool $setStartingPoint = false,
        ?int $targetWorkflowId = null
    ): array {
        return [
            'id' => $id,
            'type' => 'Go To',
            'position' => ['x' => 0, 'y' => 0],
            'data' => [
                'label' => 'Go To',
                'targetNodeId' => $target,
                'targetWorkflowId' => $targetWorkflowId,
                'endFlow' => $endFlow,
                'setStartingPoint' => $setStartingPoint,
            ],
        ];
    }

    protected function sendNode(string $id, string $template = '{{ai_response}}'): array
    {
        return [
            'id' => $id,
            'type' => 'Send Message',
            'position' => ['x' => 0, 'y' => 0],
            'data' => [
                'label' => 'Send Message',
                'messageMode' => 'smart_value',
                'messageTemplate' => $template,
            ],
        ];
    }

    protected function triggerNode(string $id = 'trigger-1'): array
    {
        return [
            'id' => $id,
            'type' => 'Trigger',
            'position' => ['x' => 0, 'y' => 0],
            'data' => [
                'label' => 'Trigger',
                'triggerType' => 'chat_message',
            ],
        ];
    }

    protected function stopperNode(string $id = 'stopper-1'): array
    {
        return [
            'id' => $id,
            'type' => 'Stopper',
            'position' => ['x' => 0, 'y' => 0],
            'data' => [
                'label' => 'Stopper',
            ],
        ];
    }

    /**
     * Trigger -> AI Agent -> Send Message.
     */
    protected function singleAgentDefinition(): array
    {
        return [
            'nodes' => [
                $this->triggerNode(),
                $this->aiNode('ai-1'),
                $this->sendNode('send-1'),
            ],
            'edges' => [
                ['id' => 'e1', 'source' => 'trigger-1', 'target' => 'ai-1'],
                ['id' => 'e2', 'source' => 'ai-1', 'target' => 'send-1'],
            ],
        ];
    }

    /**
     * Trigger -> AI Agent -> AI Agent -> Send Message.
     */
    protected function chainedAgentsDefinition(): array
    {
        return [
            'nodes' => [
                $this->triggerNode(),
                $this->aiNode('ai-1', 'First reply'),
                $this->aiNode('ai-2', 'Second reply'),
                $this->sendNode('send-1'),
            ],
            'edges' => [
                ['id' => 'e1', 'source' => 'trigger-1', 'target' => 'ai-1'],
                ['id' => 'e2', 'source' => 'ai-1', 'target' => 'ai-2'],
                ['id' => 'e3', 'source' => 'ai-2', 'target' => 'send-1'],
            ],
        ];
    }

    /**
     * Trigger -> AI Agent -> Stopper -> AI Agent -> Send Message.
     */
    protected function resumableDefinition(): array
    {
        return [
            'nodes' => [
                $this->triggerNode(),
                $this->aiNode('ai-1', 'First reply'),
                $this->stopperNode(),
                $this->aiNode('ai-2', 'Second reply'),
                $this->sendNode('send-1'),
            ],
            'edges' => [
                ['id' => 'e1', 'source' => 'trigger-1', 'target' => 'ai-1'],
                ['id' => 'e2', 'source' => 'ai-1', 'target' => 'stopper-1'],
                ['id' => 'e3', 'source' => 'stopper-1', 'target' => 'ai-2'],
                ['id' => 'e4', 'source' => 'ai-2', 'target' => 'send-1'],
            ],
        ];
    }
}
