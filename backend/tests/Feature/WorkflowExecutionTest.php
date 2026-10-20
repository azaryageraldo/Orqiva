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

    /**
     * @param  array<string, mixed>  $payload
     */
    private function fakeGeminiJson(array $payload): void
    {
        $this->fakeGemini((string) json_encode($payload));
    }

    private function booleanAgent(string $id = 'ai-1'): array
    {
        return $this->aiNode($id, 'AI response', [
            [
                'name' => 'respond',
                'type' => 'string',
                'description' => 'Jawaban untuk pelanggan',
            ],
            [
                'name' => 'beli',
                'type' => 'boolean',
                'description' => 'True jika pelanggan ingin membeli',
            ],
        ]);
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
            ->assertJsonPath('data.total_tokens', 15)
            ->assertJsonPath('data.output.messages', ['Halo, ada yang bisa dibantu?']);

        $execution = WorkflowExecution::query()->firstOrFail();

        $this->assertSame(
            'Halo, ada yang bisa dibantu?',
            data_get($execution->output, 'output')
        );
    }

    public function test_array_variable_produces_multiple_bubbles(): void
    {
        $this->fakeGeminiJson([
            'respond' => [
                ['replies' => 'Halo!'],
                ['replies' => 'Ada yang bisa dibantu?'],
            ],
        ]);

        $user = $this->user();
        $definition = [
            'nodes' => [
                $this->triggerNode(),
                $this->aiNode('ai-1', 'AI response', [
                    [
                        'name' => 'respond',
                        'type' => 'array',
                        'itemField' => 'replies',
                        'description' => 'Daftar balasan',
                    ],
                ]),
                $this->sendNode('send-1', '{{respond.replies}}'),
            ],
            'edges' => [
                ['source' => 'trigger-1', 'target' => 'ai-1'],
                ['source' => 'ai-1', 'target' => 'send-1'],
            ],
        ];

        $workflow = $this->workflow($user, $definition);

        $this->actingAs($user)
            ->postJson('/api/v1/workflows/'.$workflow->id.'/execute', [
                'input' => ['message' => 'Halo'],
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'success')
            ->assertJsonPath('data.output.messages', [
                'Halo!',
                'Ada yang bisa dibantu?',
            ]);
    }

    public function test_node_scoped_smart_values_send_multiple_bubbles_and_conditions(): void
    {
        $this->fakeGeminiJson([
            'respond' => [
                ['replies' => 'Rekomendasi untuk Anda.'],
                ['replies' => 'Mau saya proses?'],
            ],
            'mau_beli' => true,
        ]);

        $user = $this->user();
        $definition = [
            'nodes' => [
                $this->triggerNode(),
                $this->aiNode('ai-offer', 'Rekomendasi & Penawaran', [
                    [
                        'name' => 'respond',
                        'type' => 'array',
                        'itemField' => 'replies',
                        'description' => 'Balasan untuk pelanggan',
                    ],
                    [
                        'name' => 'mau_beli',
                        'type' => 'boolean',
                        'description' => 'True jika pelanggan ingin membeli',
                    ],
                ]),
                $this->sendNode('send-offer', '{{rekomendasi-penawaran.respond.replies}}'),
                $this->conditionNode(
                    'condition-1',
                    'rekomendasi-penawaran.mau_beli'
                ),
                $this->sendNode('send-yes', 'Siap, pesanan diproses.'),
                $this->sendNode('send-no', 'Boleh saya bantu pertimbangkan lagi?'),
            ],
            'edges' => [
                ['source' => 'trigger-1', 'target' => 'ai-offer'],
                ['source' => 'ai-offer', 'target' => 'send-offer'],
                ['source' => 'send-offer', 'target' => 'condition-1'],
                [
                    'source' => 'condition-1',
                    'target' => 'send-yes',
                    'sourceHandle' => 'true',
                ],
                [
                    'source' => 'condition-1',
                    'target' => 'send-no',
                    'sourceHandle' => 'false',
                ],
            ],
        ];

        $workflow = $this->workflow($user, $definition);

        $this->actingAs($user)
            ->postJson('/api/v1/workflows/'.$workflow->id.'/execute', [
                'input' => ['message' => 'Saya mau beli PS5'],
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'success')
            ->assertJsonPath('data.output.messages', [
                'Rekomendasi untuk Anda.',
                'Mau saya proses?',
                'Siap, pesanan diproses.',
            ]);
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

    public function test_condition_routes_to_if_match_branch(): void
    {
        $this->fakeGeminiJson([
            'respond' => 'Boleh, saya bantu.',
            'beli' => true,
        ]);

        $user = $this->user();
        $workflow = $this->workflow($user, $this->branchingDefinition());

        $this->actingAs($user)
            ->postJson('/api/v1/workflows/'.$workflow->id.'/execute', [
                'input' => ['message' => 'Saya mau beli produk ini'],
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'success')
            ->assertJsonPath('data.output.messages', ['Siap, pesanan Anda kami proses.']);
    }

    public function test_condition_routes_to_else_branch(): void
    {
        $this->fakeGeminiJson([
            'respond' => 'Baik, terima kasih.',
            'beli' => false,
        ]);

        $user = $this->user();
        $workflow = $this->workflow($user, $this->branchingDefinition());

        $this->actingAs($user)
            ->postJson('/api/v1/workflows/'.$workflow->id.'/execute', [
                'input' => ['message' => 'Saya hanya bertanya'],
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'success')
            ->assertJsonPath('data.output.messages', ['Baik, sampai jumpa.']);
    }

    public function test_relocate_escalates_without_ai_reply(): void
    {
        $user = $this->user();
        $definition = [
            'nodes' => [
                $this->triggerNode(),
                $this->relocateNode(),
            ],
            'edges' => [
                ['source' => 'trigger-1', 'target' => 'relocate-1'],
            ],
        ];

        $workflow = $this->workflow($user, $definition);

        $this->actingAs($user)
            ->postJson('/api/v1/workflows/'.$workflow->id.'/execute', [
                'input' => [
                    'message' => 'Saya mau bicara dengan admin',
                    'conversation_id' => 'conv-admin',
                ],
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'escalated')
            ->assertJsonPath('data.output.messages', []);

        $this->assertSame(1, WorkflowExecution::query()->count());
    }

    public function test_escalated_conversation_is_not_answered_again(): void
    {
        $user = $this->user();
        $definition = [
            'nodes' => [
                $this->triggerNode(),
                $this->relocateNode(),
            ],
            'edges' => [
                ['source' => 'trigger-1', 'target' => 'relocate-1'],
            ],
        ];

        $workflow = $this->workflow($user, $definition);

        $this->actingAs($user)
            ->postJson('/api/v1/workflows/'.$workflow->id.'/execute', [
                'input' => [
                    'message' => 'Halo admin',
                    'conversation_id' => 'conv-admin',
                ],
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'escalated');

        $this->actingAs($user)
            ->postJson('/api/v1/workflows/'.$workflow->id.'/execute', [
                'input' => [
                    'message' => 'Halo?',
                    'conversation_id' => 'conv-admin',
                ],
            ])
            ->assertOk()
            ->assertJsonPath('message', 'Percakapan sedang ditangani admin.')
            ->assertJsonPath('data.status', 'escalated');

        $this->assertSame(1, WorkflowExecution::query()->count());
    }

    public function test_go_to_jumps_and_end_flow_resumes_at_target(): void
    {
        $this->fakeGemini('Menu utama');

        $user = $this->user();
        $definition = [
            'nodes' => [
                $this->triggerNode(),
                $this->aiNode('ai-1', 'Sapaan'),
                $this->goToNode('goto-1', 'ai-2', true),
                $this->aiNode('ai-2', 'Menu'),
                $this->sendNode('send-1', '{{ai_response}}'),
            ],
            'edges' => [
                ['source' => 'trigger-1', 'target' => 'ai-1'],
                ['source' => 'ai-1', 'target' => 'goto-1'],
                ['source' => 'ai-2', 'target' => 'send-1'],
            ],
        ];

        $workflow = $this->workflow($user, $definition);

        $this->actingAs($user)
            ->postJson('/api/v1/workflows/'.$workflow->id.'/execute', [
                'input' => [
                    'message' => 'Halo',
                    'conversation_id' => 'conv-menu',
                ],
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'waiting')
            ->assertJsonPath('data.current_node_id', 'ai-2');

        $this->actingAs($user)
            ->postJson('/api/v1/workflows/'.$workflow->id.'/execute', [
                'input' => [
                    'message' => 'Tampilkan menu',
                    'conversation_id' => 'conv-menu',
                ],
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'success')
            ->assertJsonPath('data.output.messages', ['Menu utama']);
    }

    public function test_starting_point_is_used_for_new_conversations(): void
    {
        $user = $this->user();
        $definition = [
            'nodes' => [
                $this->triggerNode(),
                $this->aiNode('ai-1', 'Sapaan'),
                $this->goToNode('goto-1', 'send-menu', false, true),
                $this->sendNode('send-menu', 'Menu utama'),
            ],
            'edges' => [
                ['source' => 'trigger-1', 'target' => 'ai-1'],
                ['source' => 'ai-1', 'target' => 'goto-1'],
            ],
        ];

        $workflow = $this->workflow($user, $definition);

        $this->actingAs($user)
            ->postJson('/api/v1/workflows/'.$workflow->id.'/execute', [
                'input' => [
                    'message' => 'Halo',
                    'conversation_id' => 'conv-new',
                ],
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'success')
            ->assertJsonPath('data.output.messages', ['Menu utama'])
            ->assertJsonPath('data.output.executed_steps', 1);
    }

    public function test_execution_records_audit_steps_with_details(): void
    {
        $this->fakeGeminiJson(['respond' => 'Halo!', 'beli' => true]);

        $user = $this->user();
        $definition = [
            'nodes' => [
                $this->triggerNode(),
                $this->booleanAgent(),
                $this->sendNode('send-1', '{{respond}}'),
            ],
            'edges' => [
                ['source' => 'trigger-1', 'target' => 'ai-1'],
                ['source' => 'ai-1', 'target' => 'send-1'],
            ],
        ];
        $workflow = $this->workflow($user, $definition);

        $this->actingAs($user)
            ->postJson('/api/v1/workflows/'.$workflow->id.'/execute', [
                'input' => ['message' => 'Saya mau beli', 'conversation_id' => 'conv-1'],
            ])
            ->assertOk();

        $execution = WorkflowExecution::query()->firstOrFail();
        $steps = $execution->steps()->get();

        $this->assertSame([1, 2, 3], $steps->pluck('step')->all());
        $this->assertSame(
            ['trigger', 'ai_agent', 'output'],
            $steps->pluck('node_type')->all()
        );
        $this->assertSame('conv-1', $steps[0]->input['conversation_id']);
        $this->assertSame('Saya mau beli', $steps[0]->input['customer_message']);

        $this->assertSame(['respond' => 'Halo!', 'beli' => true], $steps[1]->variables);
        $this->assertSame('Halo!', $steps[1]->output['text']);
        $this->assertSame(15, $steps[1]->total_tokens);
        $this->assertSame('AI response', $steps[1]->node_name);

        $this->assertSame(['Halo!'], $steps[2]->messages);
        $this->assertSame(['Halo!'], $steps[2]->output['messages']);
    }

    public function test_audit_steps_continue_after_resume(): void
    {
        $this->fakeGemini('Halo!');

        $user = $this->user();
        $workflow = $this->workflow($user, $this->resumableDefinition());

        $this->actingAs($user)
            ->postJson('/api/v1/workflows/'.$workflow->id.'/execute', [
                'input' => ['message' => 'Halo', 'conversation_id' => 'conv-resume'],
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'waiting');

        $execution = WorkflowExecution::query()->firstOrFail();
        $this->assertSame([1, 2, 3], $execution->steps()->pluck('step')->all());

        $this->actingAs($user)
            ->postJson('/api/v1/workflows/'.$workflow->id.'/execute', [
                'input' => ['message' => 'Lanjut', 'conversation_id' => 'conv-resume'],
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'success')
            ->assertJsonPath('data.id', $execution->id);

        $this->assertSame(
            [1, 2, 3, 4, 5],
            $execution->steps()->pluck('step')->all()
        );
        $this->assertSame(
            ['trigger', 'ai_agent', 'stopper', 'ai_agent', 'output'],
            $execution->steps()->pluck('node_type')->all()
        );
    }

    public function test_audit_step_records_error_when_node_fails(): void
    {
        $this->mock(GeminiService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('generate')->andThrow(
                new RuntimeException('Gemini timeout')
            );
        });

        $user = $this->user();
        $workflow = $this->workflow($user, $this->singleAgentDefinition());

        $this->actingAs($user)
            ->postJson('/api/v1/workflows/'.$workflow->id.'/execute', [
                'input' => ['message' => 'Halo'],
            ])
            ->assertStatus(422);

        $execution = WorkflowExecution::query()->firstOrFail();
        $step = $execution->steps()->where('status', 'error')->firstOrFail();

        $this->assertSame('ai_agent', $step->node_type);
        $this->assertSame('Gemini timeout', $step->error);
        $this->assertSame('Halo', $step->input['user_message'] ?? null);
    }

    public function test_execution_detail_returns_steps_for_owner_only(): void
    {
        $this->fakeGemini('Halo!');

        $owner = $this->user();
        $workflow = $this->workflow($owner, $this->singleAgentDefinition());

        $this->actingAs($owner)
            ->postJson('/api/v1/workflows/'.$workflow->id.'/execute', [
                'input' => ['message' => 'Halo'],
            ])
            ->assertOk();

        $execution = WorkflowExecution::query()->firstOrFail();

        $this->actingAs($owner)
            ->getJson('/api/v1/workflows/'.$workflow->id.'/executions/'.$execution->id)
            ->assertOk()
            ->assertJsonPath('data.id', $execution->id)
            ->assertJsonPath('data.workflow_name', 'Test workflow')
            ->assertJsonCount(3, 'data.steps')
            ->assertJsonPath('data.steps.1.node_type', 'ai_agent');

        $this->actingAs($this->user('other@example.com'))
            ->getJson('/api/v1/workflows/'.$workflow->id.'/executions/'.$execution->id)
            ->assertNotFound();

        $secondWorkflow = $this->workflow($owner, $this->singleAgentDefinition());

        $this->actingAs($owner)
            ->getJson('/api/v1/workflows/'.$secondWorkflow->id.'/executions/'.$execution->id)
            ->assertNotFound();
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

    /**
     * Trigger → AI (respond + beli) → Condition →
     * If match: Send Message, Else: Send Message.
     */
    private function branchingDefinition(): array
    {
        return [
            'nodes' => [
                $this->triggerNode(),
                $this->booleanAgent(),
                $this->conditionNode(),
                $this->sendNode('send-match', 'Siap, pesanan Anda kami proses.'),
                $this->sendNode('send-else', 'Baik, sampai jumpa.'),
            ],
            'edges' => [
                ['source' => 'trigger-1', 'target' => 'ai-1'],
                ['source' => 'ai-1', 'target' => 'condition-1'],
                ['source' => 'condition-1', 'target' => 'send-match', 'sourceHandle' => 'true'],
                ['source' => 'condition-1', 'target' => 'send-else', 'sourceHandle' => 'false'],
            ],
        ];
    }
}
