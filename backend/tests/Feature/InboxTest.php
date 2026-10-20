<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Workflow;
use App\Models\WorkflowExecution;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InboxTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $email): User
    {
        return User::create([
            'name' => 'Owner',
            'email' => $email,
            'password' => 'password',
        ]);
    }

    private function workflow(User $user, string $name = 'Support'): Workflow
    {
        return Workflow::create([
            'user_id' => $user->id,
            'name' => $name,
            'status' => 'active',
            'definition' => ['nodes' => [], 'edges' => []],
        ]);
    }

    private function execution(
        Workflow $workflow,
        string $conversationId,
        string $customerMessage,
        array $replies = [],
        string $status = 'success',
        ?string $customerName = 'Rina'
    ): WorkflowExecution {
        return WorkflowExecution::create([
            'workflow_id' => $workflow->id,
            'status' => $status,
            'input' => [
                'conversation_id' => $conversationId,
                'customer_name' => $customerName,
                'customer_message' => $customerMessage,
                'message' => $customerMessage,
            ],
            'output' => [
                'messages' => $replies,
                'output' => $replies === [] ? null : implode("\n", $replies),
            ],
            'logs' => [],
            'started_at' => now(),
            'finished_at' => now(),
        ]);
    }

    public function test_guests_cannot_read_inbox(): void
    {
        $this->getJson('/api/v1/inbox')->assertUnauthorized();
    }

    public function test_inbox_only_lists_own_conversations(): void
    {
        $owner = $this->user('owner@example.com');
        $other = $this->user('other@example.com');

        $this->execution(
            $this->workflow($owner),
            'conversation-owner',
            'Halo',
            ['Hai, ada yang bisa dibantu?']
        );
        $this->execution(
            $this->workflow($other),
            'conversation-other',
            'Pesan orang lain',
            ['Balasan lain']
        );

        $response = $this->actingAs($owner)
            ->getJson('/api/v1/inbox')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.conversation_id', 'conversation-owner')
            ->assertJsonPath('data.0.customer_name', 'Rina')
            ->assertJsonPath(
                'data.0.last_message',
                'Hai, ada yang bisa dibantu?'
            )
            ->assertJsonPath('meta.total', 1);

        $this->assertSame('Support', $response->json('data.0.workflow_name'));
    }

    public function test_inbox_groups_executions_by_conversation(): void
    {
        $owner = $this->user('owner@example.com');
        $workflow = $this->workflow($owner);

        $first = $this->execution(
            $workflow,
            'conversation-1',
            'Pesan pertama',
            ['Balasan pertama']
        );
        $second = $this->execution(
            $workflow,
            'conversation-1',
            'Pesan kedua',
            ['Balasan kedua']
        );

        $this->actingAs($owner)
            ->getJson('/api/v1/inbox')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.execution_id', $second->id)
            ->assertJsonPath('data.0.execution_count', 2)
            ->assertJsonPath('data.0.last_message', 'Balasan kedua');

        $this->assertNotSame($first->id, $second->id);
    }

    public function test_inbox_detail_rebuilds_messages_from_steps(): void
    {
        $owner = $this->user('owner@example.com');
        $workflow = $this->workflow($owner);
        $execution = $this->execution(
            $workflow,
            'conversation-steps',
            'Pesan terakhir',
            ['Balasan terakhir'],
            'waiting'
        );

        $execution->steps()->create([
            'step' => 1,
            'node_id' => 'trigger-1',
            'node_type' => 'trigger',
            'node_name' => 'Incoming message',
            'status' => 'success',
            'input' => ['customer_message' => 'Pesan pertama'],
            'duration_ms' => 0,
            'executed_at' => now()->subMinutes(2),
        ]);
        $execution->steps()->create([
            'step' => 2,
            'node_id' => 'message-1',
            'node_type' => 'output',
            'node_name' => 'Send AI reply',
            'status' => 'success',
            'messages' => ['Balasan pertama', 'Bubble kedua'],
            'duration_ms' => 0,
            'executed_at' => now()->subMinutes(2),
        ]);
        $execution->steps()->create([
            'step' => 3,
            'node_id' => 'trigger-1',
            'node_type' => 'trigger',
            'node_name' => 'Incoming message',
            'status' => 'success',
            'input' => ['customer_message' => 'Pesan terakhir'],
            'duration_ms' => 0,
            'executed_at' => now()->subMinute(),
        ]);

        $response = $this->actingAs($owner)
            ->getJson("/api/v1/inbox/{$execution->id}")
            ->assertOk()
            ->assertJsonPath('data.conversation_id', 'conversation-steps')
            ->assertJsonPath('data.status', 'waiting')
            ->assertJsonCount(4, 'data.messages');

        $this->assertSame(
            ['customer', 'assistant', 'assistant', 'customer'],
            array_column($response->json('data.messages'), 'role')
        );
        $this->assertSame(
            'Pesan pertama',
            $response->json('data.messages.0.content')
        );
        $this->assertSame(
            'Bubble kedua',
            $response->json('data.messages.2.content')
        );
    }

    public function test_inbox_detail_is_scoped_to_owner(): void
    {
        $owner = $this->user('owner@example.com');
        $other = $this->user('other@example.com');
        $execution = $this->execution(
            $this->workflow($other),
            'conversation-private',
            'Rahasia',
            ['Jangan dibaca']
        );

        $this->actingAs($owner)
            ->getJson("/api/v1/inbox/{$execution->id}")
            ->assertNotFound();
    }
}
