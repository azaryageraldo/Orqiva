<?php

namespace Tests\Unit;

use App\Services\Workflows\ConditionRule;
use App\Services\Workflows\WorkflowGraphValidator;
use PHPUnit\Framework\TestCase;
use RuntimeException;
use Tests\Concerns\BuildsWorkflowDefinitions;

class WorkflowGraphValidatorTest extends TestCase
{
    use BuildsWorkflowDefinitions;

    private WorkflowGraphValidator $validator;

    protected function setUp(): void
    {
        parent::setUp();

        $this->validator = new WorkflowGraphValidator(new ConditionRule);
    }

    public function test_valid_graph_is_accepted(): void
    {
        $graph = $this->validator->validateDefinition(
            $this->singleAgentDefinition()
        );

        $this->assertSame('trigger-1', $graph['trigger_id']);
        $this->assertArrayHasKey('trigger-1:default', $graph['next']);
        $this->assertSame('ai_agent', $graph['nodes']['ai-1']['type']);
    }

    public function test_cycle_is_rejected(): void
    {
        $definition = $this->singleAgentDefinition();
        $definition['edges'][] = [
            'id' => 'e3',
            'source' => 'send-1',
            'target' => 'ai-1',
        ];

        $this->expectException(RuntimeException::class);

        $this->validator->validateDefinition($definition);
    }

    public function test_cycle_is_rejected_for_incomplete_draft(): void
    {
        $definition = [
            'nodes' => [
                $this->aiNode('ai-1'),
                $this->sendNode('send-1'),
            ],
            'edges' => [
                ['source' => 'ai-1', 'target' => 'send-1'],
                ['source' => 'send-1', 'target' => 'ai-1'],
            ],
        ];

        $this->expectException(RuntimeException::class);

        $this->validator->validateDefinition($definition, null, false);
    }

    public function test_duplicate_node_id_is_rejected(): void
    {
        $definition = $this->singleAgentDefinition();
        $definition['nodes'][] = $this->aiNode('ai-1');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('ID node duplikat');

        $this->validator->validateDefinition($definition);
    }

    public function test_unsupported_node_type_is_rejected(): void
    {
        $definition = $this->singleAgentDefinition();
        $definition['nodes'][1]['type'] = 'Database Query';

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Tipe node belum didukung');

        $this->validator->validateDefinition($definition);
    }

    public function test_missing_trigger_is_rejected_when_runnable(): void
    {
        $definition = [
            'nodes' => [
                $this->aiNode('ai-1'),
                $this->sendNode('send-1'),
            ],
            'edges' => [
                ['source' => 'ai-1', 'target' => 'send-1'],
            ],
        ];

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('tepat satu Trigger');

        $this->validator->validateDefinition($definition, null, true);
    }

    public function test_condition_requires_true_and_false_edges(): void
    {
        $condition = [
            'id' => 'condition-1',
            'type' => 'Condition',
            'position' => ['x' => 0, 'y' => 0],
            'data' => [
                'label' => 'Condition',
                'conditionVariable' => 'customer_message',
                'conditionOperator' => 'contains',
                'conditionValue' => 'harga',
            ],
        ];

        $definition = [
            'nodes' => [
                $this->triggerNode(),
                $this->aiNode('ai-1'),
                $condition,
                $this->sendNode('send-1'),
            ],
            'edges' => [
                ['source' => 'trigger-1', 'target' => 'ai-1'],
                ['source' => 'ai-1', 'target' => 'condition-1'],
                [
                    'source' => 'condition-1',
                    'target' => 'send-1',
                    'sourceHandle' => 'true',
                ],
            ],
        ];

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Condition harus memiliki koneksi true dan false');

        $this->validator->validateDefinition($definition);
    }

    public function test_condition_requires_valid_config(): void
    {
        $condition = [
            'id' => 'condition-1',
            'type' => 'Condition',
            'position' => ['x' => 0, 'y' => 0],
            'data' => [
                'label' => 'Condition',
                'conditionVariable' => null,
                'conditionOperator' => 'equals',
                'conditionValue' => 'true',
            ],
        ];

        $definition = [
            'nodes' => [
                $this->triggerNode(),
                $this->aiNode('ai-1'),
                $condition,
                $this->sendNode('send-1'),
                $this->sendNode('send-2'),
            ],
            'edges' => [
                ['source' => 'trigger-1', 'target' => 'ai-1'],
                ['source' => 'ai-1', 'target' => 'condition-1'],
                ['source' => 'condition-1', 'target' => 'send-1', 'sourceHandle' => 'true'],
                ['source' => 'condition-1', 'target' => 'send-2', 'sourceHandle' => 'false'],
            ],
        ];

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Konfigurasi Condition tidak valid');

        $this->validator->validateDefinition($definition);
    }

    public function test_output_cannot_have_outgoing_edge(): void
    {
        $definition = $this->singleAgentDefinition();
        $definition['nodes'][] = $this->sendNode('send-2');
        $definition['edges'][] = [
            'id' => 'e3',
            'source' => 'send-1',
            'target' => 'send-2',
        ];

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('tidak boleh memiliki koneksi keluar');

        $this->validator->validateDefinition($definition);
    }

    public function test_source_handle_only_allowed_on_condition(): void
    {
        $definition = $this->singleAgentDefinition();
        $definition['edges'][1]['sourceHandle'] = 'true';

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('sourceHandle hanya didukung');

        $this->validator->validateDefinition($definition);
    }

    public function test_unreachable_node_is_rejected(): void
    {
        $definition = $this->singleAgentDefinition();
        $definition['nodes'][] = $this->sendNode('send-orphan');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('tidak terhubung ke Trigger');

        $this->validator->validateDefinition($definition);
    }
}
