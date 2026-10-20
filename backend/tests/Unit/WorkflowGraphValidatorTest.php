<?php

namespace Tests\Unit;

use App\Services\Workflows\AiAgentVariables;
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

        $this->validator = new WorkflowGraphValidator(
            new ConditionRule,
            new AiAgentVariables
        );
    }

    public function test_valid_graph_is_accepted(): void
    {
        $graph = $this->validator->validateDefinition(
            $this->singleAgentDefinition()
        );

        $this->assertSame('trigger-1', $graph['trigger_id']);
        $this->assertSame('trigger-1', $graph['entry_id']);
        $this->assertNull($graph['starting_point_id']);
        $this->assertSame('ai_agent', $graph['nodes']['ai-1']['type']);
    }

    public function test_go_to_loop_is_allowed(): void
    {
        $definition = [
            'nodes' => [
                $this->triggerNode(),
                $this->aiNode('ai-1'),
                $this->conditionNode(),
                $this->aiNode('ai-2', 'Menu'),
                $this->sendNode('send-1', 'Halo'),
                $this->goToNode('goto-1', 'ai-1'),
            ],
            'edges' => [
                ['source' => 'trigger-1', 'target' => 'ai-1'],
                ['source' => 'ai-1', 'target' => 'condition-1'],
                ['source' => 'condition-1', 'target' => 'ai-2', 'sourceHandle' => 'true'],
                ['source' => 'condition-1', 'target' => 'send-1', 'sourceHandle' => 'false'],
                ['source' => 'ai-2', 'target' => 'goto-1'],
            ],
        ];

        $graph = $this->validator->validateDefinition($definition);

        // Loop lewat Go To diizinkan; runtime dibatasi MAX_STEPS.
        $this->assertSame('ai-1', $graph['nodes']['goto-1']['data']['targetNodeId']);
    }

    public function test_fan_in_is_allowed(): void
    {
        $definition = [
            'nodes' => [
                $this->triggerNode(),
                $this->aiNode('ai-1'),
                $this->conditionNode(),
                $this->aiNode('ai-2', 'Second reply'),
                $this->sendNode('send-1', 'Halo'),
            ],
            'edges' => [
                ['source' => 'trigger-1', 'target' => 'ai-1'],
                ['source' => 'ai-1', 'target' => 'condition-1'],
                ['source' => 'condition-1', 'target' => 'ai-2', 'sourceHandle' => 'true'],
                ['source' => 'condition-1', 'target' => 'ai-2', 'sourceHandle' => 'false'],
                ['source' => 'ai-2', 'target' => 'send-1'],
            ],
        ];

        $graph = $this->validator->validateDefinition($definition);

        $this->assertSame('ai-2', $graph['next']['condition-1:true']);
        $this->assertSame('ai-2', $graph['next']['condition-1:false']);
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

    public function test_condition_requires_match_and_else_edges(): void
    {
        $definition = [
            'nodes' => [
                $this->triggerNode(),
                $this->aiNode('ai-1'),
                $this->conditionNode(),
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
        $this->expectExceptionMessage('If match dan Else');

        $this->validator->validateDefinition($definition);
    }

    public function test_condition_requires_boolean_variable(): void
    {
        $definition = [
            'nodes' => [
                $this->triggerNode(),
                $this->aiNode('ai-1'),
                $this->conditionNode('condition-1', null),
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
        $this->expectExceptionMessage('belum memilih variabel boolean');

        $this->validator->validateDefinition($definition);
    }

    public function test_output_can_have_outgoing_edge(): void
    {
        $definition = $this->singleAgentDefinition();
        $definition['nodes'][] = $this->sendNode('send-2');
        $definition['edges'][] = [
            'source' => 'send-1',
            'target' => 'send-2',
        ];

        $graph = $this->validator->validateDefinition($definition);

        $this->assertSame('send-2', $graph['next']['send-1:default']);
    }

    public function test_relocate_cannot_have_outgoing_edge(): void
    {
        $definition = [
            'nodes' => [
                $this->triggerNode(),
                $this->relocateNode(),
                $this->sendNode('send-1'),
            ],
            'edges' => [
                ['source' => 'trigger-1', 'target' => 'relocate-1'],
                ['source' => 'relocate-1', 'target' => 'send-1'],
            ],
        ];

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Relocate tidak boleh memiliki koneksi keluar');

        $this->validator->validateDefinition($definition);
    }

    public function test_source_handle_only_allowed_on_condition(): void
    {
        $definition = $this->singleAgentDefinition();
        $definition['edges'][1]['sourceHandle'] = 'true';

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('If match/Else hanya didukung');

        $this->validator->validateDefinition($definition);
    }

    public function test_unreachable_node_is_rejected(): void
    {
        $definition = $this->singleAgentDefinition();
        $definition['nodes'][] = $this->sendNode('send-orphan');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('tidak terhubung ke alur');

        $this->validator->validateDefinition($definition);
    }

    public function test_go_to_requires_target_when_runnable(): void
    {
        $definition = [
            'nodes' => [
                $this->triggerNode(),
                $this->goToNode('goto-1', ''),
                $this->relocateNode(),
            ],
            'edges' => [
                ['source' => 'trigger-1', 'target' => 'goto-1'],
            ],
        ];

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('harus memilih node tujuan');

        $this->validator->validateDefinition($definition);
    }

    public function test_go_to_rejects_self_target(): void
    {
        $definition = [
            'nodes' => [
                $this->triggerNode(),
                $this->goToNode('goto-1', 'goto-1'),
                $this->relocateNode(),
            ],
            'edges' => [
                ['source' => 'trigger-1', 'target' => 'goto-1'],
            ],
        ];

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('tidak boleh mengarah ke dirinya sendiri');

        $this->validator->validateDefinition($definition);
    }

    public function test_go_to_starting_point_changes_entry(): void
    {
        $definition = [
            'nodes' => [
                $this->triggerNode(),
                $this->aiNode('ai-1'),
                $this->sendNode('send-1', 'Halo'),
                $this->aiNode('ai-2', 'Menu'),
                $this->goToNode('goto-1', 'ai-2', true, true),
            ],
            'edges' => [
                ['source' => 'trigger-1', 'target' => 'ai-1'],
                ['source' => 'ai-1', 'target' => 'goto-1'],
                ['source' => 'ai-2', 'target' => 'send-1'],
            ],
        ];

        $graph = $this->validator->validateDefinition($definition);

        $this->assertSame('ai-2', $graph['entry_id']);
        $this->assertSame('ai-2', $graph['starting_point_id']);
    }

    public function test_only_one_starting_point_is_allowed(): void
    {
        $definition = [
            'nodes' => [
                $this->triggerNode(),
                $this->aiNode('ai-1'),
                $this->sendNode('send-1', 'Halo'),
                $this->goToNode('goto-1', 'ai-1', false, true),
                $this->goToNode('goto-2', 'send-1', false, true),
            ],
            'edges' => [
                ['source' => 'trigger-1', 'target' => 'goto-1'],
                ['source' => 'ai-1', 'target' => 'send-1'],
            ],
        ];

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Hanya boleh ada satu');

        $this->validator->validateDefinition($definition);
    }

    public function test_ai_agent_variables_are_validated(): void
    {
        $definition = $this->singleAgentDefinition();
        $definition['nodes'][1]['data']['outputVariables'] = [
            ['name' => 'respond', 'type' => 'string'],
            ['name' => 'respond', 'type' => 'boolean'],
        ];

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('duplikat');

        $this->validator->validateDefinition($definition, null, false);
    }

    public function test_ai_agent_rejects_unknown_variable_type(): void
    {
        $definition = $this->singleAgentDefinition();
        $definition['nodes'][1]['data']['outputVariables'] = [
            ['name' => 'respond', 'type' => 'object'],
        ];

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Tipe variabel tidak didukung');

        $this->validator->validateDefinition($definition, null, false);
    }
}
