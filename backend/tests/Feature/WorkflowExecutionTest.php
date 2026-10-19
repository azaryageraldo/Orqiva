<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Workflow;
use App\Models\WorkflowExecution;
use App\Services\GeminiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery\MockInterface;
use RuntimeException;
use Tests\Concerns\BuildsWorkflowDefinitions;
use Tests\TestCase;

class WorkflowExecutionTest extends TestCase
{
    use BuildsWorkflowDefinitions;
    use RefreshDatabase;

    private function user(string $email = 'owner@example.com'): User
    {
        return User::create([
            'name' => 'Owner',
            'email' => $email,
            'password' => 'password',
        ]);
    }

    private function workflow(User $user, array $definition): Workflow
    {
        return Workflow::create([
            'user_id' => $user->id,
            'name' => 'Test workflow',
            'definition' => $definition,
        ]);
    }

    private function fakeGemini(string $text = 'Halo, ada yang bisa dibantu?'): void
    {
        $this->mock(GeminiService::class, function (MockInterface $mock) use ($text): void {
            $mock->shouldReceive('generate')->andReturn([
                'text' => $text,
                'usage' => [
                    'prompt_tokens' => 10,
                    'completion_tokens' => 5,
                    'total_tokens' => 15,
                ],
            ]);
        });
    }

    public function test_guests_cannot_execute_workflows(): void
    {
        $user = $this->user();
        $workflow = $this->workflow($user, $this->singleAgentDefinition());

        $this->postJson('/api/v1/workflows/'.$workflow->id.'/execute')
            ->assertUnauthorized();
    }

    public function test_users_cannot_execute_other_users_workflow(): void
    {
        $other = $this->user('other@example.com');
        $workflow = $this->workflow($other, $this->singleAgentDefinition());

        $this->actingAs($this->user())
            ->postJson('/api/v1/workflows/'.$workflow->id.'/execute', [
                'input' => ['message' => 'Halo'],
            ])
            ->assertNotFound();
    }

    public function test_workflow_produces_reply_and_records_tokens(): void
    {
        $this->fakeGemini('Halo, ada yang bisa dibantu?');

        $user = $this->user();
        $workflow = $this->workflow($user, $this->singleAgentDefinition());

        $response = $this->actingAs($user)
            ->postJson('/api/v1/workflows/'.$workflow->id.'/execute', [
                'input' => ['message' => 'Halo', 'customer_name' => 'Budi'],
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.status', 'success')
            ->assertJsonPath('data.total_tokens', 15);

        $execution = WorkflowExecution::query()->firstOrFail();

        $this->assertSame(
            'Halo, ada yang bisa dibantu?',
            data_get($execution->output, 'output')
        );
    }

    public function test_resumed_execution_accumulates_tokens(): void
    {
        $this->fakeGemini();

        $user = $this->user();
        $workflow = $this->workflow($user, $this->resumableDefinition());

        $first = $this->actingAs($user)
            ->postJson('/api/v1/workflows/'.$workflow->id.'/execute', [
                'input' => [
                    'message' => 'Halo',
                    'conversation_id' => 'conv-1',
                ],
            ]);

        $first
            ->assertOk()
            ->assertJsonPath('data.status', 'waiting')
            ->assertJsonPath('data.total_tokens', 15)
            ->assertJsonPath('data.current_node_id', 'ai-2');

        $second = $this->actingAs($user)
            ->postJson('/api/v1/workflows/'.$workflow->id.'/execute', [
                'input' => [
                    'message' => 'Masih ada?',
                    'conversation_id' => 'conv-1',
                ],
            ]);

        $second
            ->assertOk()
            ->assertJsonPath('data.status', 'success')
            ->assertJsonPath('data.total_tokens', 30);

        $this->assertSame(1, WorkflowExecution::query()->count());
    }

    public function test_failed_execution_keeps_tokens_already_spent(): void
    {
        $calls = 0;

        $this->mock(GeminiService::class, function (MockInterface $mock) use (&$calls): void {
            $mock->shouldReceive('generate')->andReturnUsing(function () use (&$calls) {
                $calls++;

                if ($calls > 1) {
                    throw new RuntimeException('Gemini API gagal (HTTP 500).');
                }

                return [
                    'text' => 'Jawaban pertama',
                    'usage' => [
                        'prompt_tokens' => 10,
                        'completion_tokens' => 5,
                        'total_tokens' => 15,
                    ],
                ];
            });
        });

        $user = $this->user();
        $workflow = $this->workflow($user, $this->chainedAgentsDefinition());

        $this->actingAs($user)
            ->postJson('/api/v1/workflows/'.$workflow->id.'/execute', [
                'input' => ['message' => 'Halo'],
            ])
            ->assertStatus(422)
            ->assertJsonPath('data.status', 'failed');

        $execution = WorkflowExecution::query()->firstOrFail();

        $this->assertSame(15, $execution->total_tokens);
    }

    public function test_condition_routes_to_matching_branch(): void
    {
        $this->fakeGemini();

        $condition = [
            'id' => 'condition-1',
            'type' => 'Condition',
            'position' => ['x' => 0, 'y' => 0],
            'data' => [
                'label' => 'Condition',
                'conditionVariable' => 'ai_response',
                'conditionOperator' => 'contains',
                'conditionValue' => 'harga',
            ],
        ];

        $definition = [
            'nodes' => [
                $this->triggerNode(),
                $this->aiNode('ai-1'),
                $condition,
                $this->sendNode('send-true', 'Branch true: {{ai_response}}'),
                $this->sendNode('send-false', 'Branch false: {{ai_response}}'),
            ],
            'edges' => [
                ['source' => 'trigger-1', 'target' => 'ai-1'],
                ['source' => 'ai-1', 'target' => 'condition-1'],
                ['source' => 'condition-1', 'target' => 'send-true', 'sourceHandle' => 'true'],
                ['source' => 'condition-1', 'target' => 'send-false', 'sourceHandle' => 'false'],
            ],
        ];

        $user = $this->user();
        $workflow = $this->workflow($user, $definition);

        $this->actingAs($user)
            ->postJson('/api/v1/workflows/'.$workflow->id.'/execute', [
                'input' => ['message' => 'Berapa harga produk ini?'],
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'success');
    }

    public function test_invalid_workflow_returns_error(): void
    {
        $user = $this->user();
        $workflow = $this->workflow($user, [
            'nodes' => [$this->triggerNode()],
            'edges' => [],
        ]);

        $this->actingAs($user)
            ->postJson('/api/v1/workflows/'.$workflow->id.'/execute', [
                'input' => ['message' => 'Halo'],
            ])
            ->assertStatus(422);

        $this->assertSame('failed', WorkflowExecution::query()->first()?->status);
    }
}
