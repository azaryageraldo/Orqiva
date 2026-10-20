<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Workflow;
use App\Models\WorkflowExecution;
use App\Services\GeminiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery\MockInterface;
use Tests\Concerns\BuildsWorkflowDefinitions;
use Tests\TestCase;

class CrossWorkflowExecutionTest extends TestCase
{
    use BuildsWorkflowDefinitions;
    use RefreshDatabase;

    private function user(): User
    {
        return User::create([
            'name' => 'Owner',
            'email' => 'owner@example.com',
            'password' => 'password',
        ]);
    }

    private function fakeGemini(string $text = 'Halo!'): void
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

    public function test_go_to_can_end_flow_in_another_workflow_and_resume_there(): void
    {
        $this->fakeGemini('Halo dari workflow kedua.');

        $user = $this->user();

        $second = Workflow::create([
            'user_id' => $user->id,
            'name' => 'Follow up',
            'definition' => [
                'nodes' => [
                    $this->aiNode('follow-ai', 'Follow up agent'),
                    $this->sendNode('follow-send'),
                ],
                'edges' => [
                    ['source' => 'follow-ai', 'target' => 'follow-send'],
                ],
            ],
        ]);

        $first = Workflow::create([
            'user_id' => $user->id,
            'name' => 'Entry workflow',
            'definition' => [
                'nodes' => [
                    $this->triggerNode(),
                    $this->aiNode('entry-ai', 'Entry agent'),
                    $this->sendNode('entry-send'),
                    $this->goToNode('entry-goto', 'follow-ai', true, false, $second->id),
                ],
                'edges' => [
                    ['source' => 'trigger-1', 'target' => 'entry-ai'],
                    ['source' => 'entry-ai', 'target' => 'entry-send'],
                    ['source' => 'entry-send', 'target' => 'entry-goto'],
                ],
            ],
        ]);

        $this->actingAs($user)
            ->postJson("/api/v1/workflows/{$first->id}/execute", [
                'input' => ['message' => 'Halo', 'conversation_id' => 'conv-cross'],
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'waiting')
            ->assertJsonPath('data.current_workflow_id', $second->id)
            ->assertJsonPath('data.current_node_id', 'follow-ai');

        $execution = WorkflowExecution::query()->firstOrFail();
        $this->assertSame($second->id, $execution->current_workflow_id);
        $this->assertSame(
            ['Entry workflow', 'Entry workflow', 'Entry workflow', 'Entry workflow'],
            $execution->steps()->pluck('workflow_name')->all()
        );

        $this->actingAs($user)
            ->postJson("/api/v1/workflows/{$first->id}/execute", [
                'input' => ['message' => 'Lanjut', 'conversation_id' => 'conv-cross'],
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'success')
            ->assertJsonPath('data.output.messages.0', 'Halo dari workflow kedua.');

        $this->assertSame(
            [
                'Entry workflow',
                'Entry workflow',
                'Entry workflow',
                'Entry workflow',
                'Follow up',
                'Follow up',
            ],
            $execution->fresh()->steps()->pluck('workflow_name')->all()
        );

        $this->assertSame(
            ['trigger', 'ai_agent', 'output', 'go_to', 'ai_agent', 'output'],
            $execution->fresh()->steps()->pluck('node_type')->all()
        );
    }

    public function test_cross_workflow_go_to_without_end_flow_continues_in_same_turn(): void
    {
        $this->fakeGemini('Langsung lanjut.');

        $user = $this->user();

        $second = Workflow::create([
            'user_id' => $user->id,
            'name' => 'Closing',
            'definition' => [
                'nodes' => [
                    $this->aiNode('closing-ai', 'Closing agent'),
                    $this->sendNode('closing-send'),
                ],
                'edges' => [
                    ['source' => 'closing-ai', 'target' => 'closing-send'],
                ],
            ],
        ]);

        $first = Workflow::create([
            'user_id' => $user->id,
            'name' => 'Greeting',
            'definition' => [
                'nodes' => [
                    $this->triggerNode(),
                    $this->aiNode('greeting-ai', 'Greeting agent'),
                    $this->sendNode('greeting-send'),
                    $this->goToNode('greeting-goto', 'closing-ai', false, false, $second->id),
                ],
                'edges' => [
                    ['source' => 'trigger-1', 'target' => 'greeting-ai'],
                    ['source' => 'greeting-ai', 'target' => 'greeting-send'],
                    ['source' => 'greeting-send', 'target' => 'greeting-goto'],
                ],
            ],
        ]);

        $this->actingAs($user)
            ->postJson("/api/v1/workflows/{$first->id}/execute", [
                'input' => ['message' => 'Halo', 'conversation_id' => 'conv-continue'],
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'success')
            ->assertJsonPath('data.output.messages.0', 'Langsung lanjut.');

        $execution = WorkflowExecution::query()->firstOrFail();
        $this->assertSame(
            ['Greeting', 'Greeting', 'Greeting', 'Greeting', 'Closing', 'Closing'],
            $execution->steps()->pluck('workflow_name')->all()
        );
    }
}
