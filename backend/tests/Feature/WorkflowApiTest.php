<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Workflow;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsWorkflowDefinitions;
use Tests\TestCase;

class WorkflowApiTest extends TestCase
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

    public function test_guests_cannot_access_workflows(): void
    {
        $this->getJson('/api/v1/workflows')->assertUnauthorized();
    }

    public function test_users_only_see_their_own_workflows(): void
    {
        $owner = $this->user();
        $other = $this->user('other@example.com');

        Workflow::create(['user_id' => $owner->id, 'name' => 'Mine']);
        Workflow::create(['user_id' => $other->id, 'name' => 'Theirs']);

        $response = $this->actingAs($owner)->getJson('/api/v1/workflows');

        $response->assertOk();

        $names = array_column($response->json('data.data'), 'name');

        $this->assertSame(['Mine'], $names);
    }

    public function test_users_cannot_view_other_users_workflow(): void
    {
        $other = $this->user('other@example.com');
        $workflow = Workflow::create([
            'user_id' => $other->id,
            'name' => 'Private',
        ]);

        $this->actingAs($this->user())
            ->getJson('/api/v1/workflows/'.$workflow->id)
            ->assertNotFound();
    }

    public function test_users_cannot_delete_other_users_workflow(): void
    {
        $other = $this->user('other@example.com');
        $workflow = Workflow::create([
            'user_id' => $other->id,
            'name' => 'Private',
        ]);

        $this->actingAs($this->user())
            ->deleteJson('/api/v1/workflows/'.$workflow->id)
            ->assertNotFound();

        $this->assertDatabaseHas('workflows', ['id' => $workflow->id]);
    }

    public function test_store_assigns_owner_and_persists_definition(): void
    {
        $owner = $this->user();

        $response = $this->actingAs($owner)->postJson('/api/v1/workflows', [
            'name' => 'Support bot',
            'description' => 'Menjawab pertanyaan pelanggan',
            'definition' => $this->singleAgentDefinition(),
        ]);

        $response->assertCreated();

        $this->assertDatabaseHas('workflows', [
            'name' => 'Support bot',
            'user_id' => $owner->id,
        ]);
    }

    public function test_store_rejects_terminal_outgoing_edge(): void
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

        $this->actingAs($this->user())
            ->postJson('/api/v1/workflows', [
                'name' => 'Broken',
                'definition' => $definition,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('definition');
    }

    public function test_store_rejects_unknown_node_type(): void
    {
        $definition = $this->singleAgentDefinition();
        $definition['nodes'][1]['type'] = 'Database Query';

        $this->actingAs($this->user())
            ->postJson('/api/v1/workflows', [
                'name' => 'Broken',
                'definition' => $definition,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('definition');
    }

    public function test_incomplete_draft_can_still_be_saved(): void
    {
        $owner = $this->user();
        $workflow = Workflow::create([
            'user_id' => $owner->id,
            'name' => 'Draft',
        ]);

        $this->actingAs($owner)
            ->putJson('/api/v1/workflows/'.$workflow->id, [
                'definition' => [
                    'nodes' => [
                        $this->triggerNode(),
                        $this->aiNode('ai-1'),
                    ],
                    'edges' => [
                        ['source' => 'trigger-1', 'target' => 'ai-1'],
                    ],
                ],
            ])
            ->assertOk();
    }

    public function test_update_rejects_invalid_definition(): void
    {
        $owner = $this->user();
        $workflow = Workflow::create([
            'user_id' => $owner->id,
            'name' => 'Draft',
        ]);

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

        $this->actingAs($owner)
            ->putJson('/api/v1/workflows/'.$workflow->id, [
                'definition' => $definition,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('definition');
    }

    public function test_options_only_lists_own_workflows(): void
    {
        $owner = $this->user();
        $other = $this->user('other@example.com');

        Workflow::create([
            'user_id' => $owner->id,
            'name' => 'Mine',
            'definition' => $this->singleAgentDefinition(),
        ]);
        Workflow::create([
            'user_id' => $other->id,
            'name' => 'Theirs',
            'definition' => $this->singleAgentDefinition(),
        ]);

        $this->actingAs($owner)
            ->getJson('/api/v1/workflow-options')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Mine')
            ->assertJsonPath('data.0.nodes.0.type', 'Trigger');
    }

    public function test_store_accepts_cross_workflow_go_to_target(): void
    {
        $owner = $this->user();
        $target = Workflow::create([
            'user_id' => $owner->id,
            'name' => 'Closing',
            'definition' => $this->singleAgentDefinition(),
        ]);

        $this->actingAs($owner)
            ->postJson('/api/v1/workflows', [
                'name' => 'Entry',
                'definition' => [
                    'nodes' => [
                        $this->triggerNode(),
                        $this->goToNode('goto-1', 'ai-1', true, false, $target->id),
                    ],
                    'edges' => [
                        ['source' => 'trigger-1', 'target' => 'goto-1'],
                    ],
                ],
            ])
            ->assertCreated();
    }

    public function test_store_rejects_cross_workflow_target_from_other_user(): void
    {
        $owner = $this->user();
        $other = $this->user('other@example.com');
        $target = Workflow::create([
            'user_id' => $other->id,
            'name' => 'Private closing',
            'definition' => $this->singleAgentDefinition(),
        ]);

        $this->actingAs($owner)
            ->postJson('/api/v1/workflows', [
                'name' => 'Entry',
                'definition' => [
                    'nodes' => [
                        $this->triggerNode(),
                        $this->goToNode('goto-1', 'ai-1', true, false, $target->id),
                    ],
                    'edges' => [
                        ['source' => 'trigger-1', 'target' => 'goto-1'],
                    ],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('definition');
    }

    public function test_store_rejects_missing_cross_workflow_target_node(): void
    {
        $owner = $this->user();
        $target = Workflow::create([
            'user_id' => $owner->id,
            'name' => 'Closing',
            'definition' => $this->singleAgentDefinition(),
        ]);

        $this->actingAs($owner)
            ->postJson('/api/v1/workflows', [
                'name' => 'Entry',
                'definition' => [
                    'nodes' => [
                        $this->triggerNode(),
                        $this->goToNode('goto-1', 'missing-node', true, false, $target->id),
                    ],
                    'edges' => [
                        ['source' => 'trigger-1', 'target' => 'goto-1'],
                    ],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('definition');
    }

    public function test_search_filters_workflows(): void
    {
        $owner = $this->user();

        Workflow::create(['user_id' => $owner->id, 'name' => 'Support bot']);
        Workflow::create(['user_id' => $owner->id, 'name' => 'Sales agent']);

        $response = $this->actingAs($owner)
            ->getJson('/api/v1/workflows?search=sales');

        $response->assertOk();

        $this->assertSame(
            ['Sales agent'],
            array_column($response->json('data.data'), 'name')
        );
    }
}
