<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Workflow;
use App\Models\WorkflowExecution;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UsageStatsTest extends TestCase
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

    private function execution(User $user, int $totalTokens, string $status = 'success'): WorkflowExecution
    {
        $workflow = Workflow::create([
            'user_id' => $user->id,
            'name' => 'Workflow '.$user->id,
        ]);

        return WorkflowExecution::create([
            'workflow_id' => $workflow->id,
            'status' => $status,
            'input' => ['message' => 'Halo'],
            'logs' => [],
            'started_at' => now(),
            'finished_at' => now(),
            'prompt_tokens' => 10,
            'completion_tokens' => 5,
            'total_tokens' => $totalTokens,
        ]);
    }

    public function test_guests_cannot_read_stats(): void
    {
        $this->getJson('/api/v1/stats/activity')->assertUnauthorized();
        $this->getJson('/api/v1/stats/token-usage')->assertUnauthorized();
    }

    public function test_activity_only_counts_own_executions(): void
    {
        $owner = $this->user('owner@example.com');
        $other = $this->user('other@example.com');

        $this->execution($owner, 15);
        $this->execution($other, 99);

        $response = $this->actingAs($owner)->getJson('/api/v1/stats/activity');

        $response
            ->assertOk()
            ->assertJsonPath('data.summary.total', 1)
            ->assertJsonPath('data.summary.success', 1);

        $this->assertCount(1, $response->json('data.executions'));
    }

    public function test_token_usage_only_counts_own_executions(): void
    {
        $owner = $this->user('owner@example.com');
        $other = $this->user('other@example.com');

        $this->execution($owner, 15);
        $this->execution($owner, 25, 'failed');
        $this->execution($other, 500);

        $response = $this->actingAs($owner)
            ->getJson('/api/v1/stats/token-usage?period=daily');

        $response->assertOk();

        $this->assertSame(40, $response->json('data.totals.total_tokens'));
        $this->assertSame(2, $response->json('data.totals.executions'));
    }
}
