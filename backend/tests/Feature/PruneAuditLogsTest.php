<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Workflow;
use App\Models\WorkflowExecution;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsWorkflowDefinitions;
use Tests\TestCase;

class PruneAuditLogsTest extends TestCase
{
    use BuildsWorkflowDefinitions;
    use RefreshDatabase;

    public function test_it_prunes_terminal_executions_older_than_cutoff(): void
    {
        $user = User::create([
            'name' => 'Owner',
            'email' => 'prune@example.com',
            'password' => 'password',
        ]);

        $workflow = Workflow::create([
            'user_id' => $user->id,
            'name' => 'Prunable Flow',
            'definition' => $this->singleAgentDefinition(),
        ]);

        // Eksekusi baru (1 hari lalu)
        $recentExecution = WorkflowExecution::create([
            'workflow_id' => $workflow->id,
            'user_id' => $user->id,
            'status' => 'success',
            'created_at' => now()->subDay(),
        ]);

        // Eksekusi lama (35 hari lalu)
        $oldExecution = WorkflowExecution::create([
            'workflow_id' => $workflow->id,
            'user_id' => $user->id,
            'status' => 'success',
        ]);
        $oldExecution->forceFill(['created_at' => now()->subDays(35)])->save();

        $this->artisan('orqiva:prune', ['--days' => 30])
            ->assertSuccessful();

        $this->assertDatabaseHas('workflow_executions', ['id' => $recentExecution->id]);
        $this->assertDatabaseMissing('workflow_executions', ['id' => $oldExecution->id]);
    }
}
