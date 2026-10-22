<?php

namespace Tests\Feature;

use App\Models\Channel;
use App\Models\User;
use App\Models\Workflow;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsWorkflowDefinitions;
use Tests\TestCase;

class ChannelManagementTest extends TestCase
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

    private function workflow(User $user, array $definition = []): Workflow
    {
        return Workflow::create([
            'user_id' => $user->id,
            'name' => 'Support workflow',
            'status' => 'active',
            'definition' => $definition ?: $this->singleAgentDefinition(),
        ]);
    }

    public function test_guests_cannot_list_channels(): void
    {
        $this->getJson('/api/v1/channels')->assertUnauthorized();
    }

    public function test_list_only_returns_own_channels_and_hides_credentials(): void
    {
        $owner = $this->user();
        $other = $this->user('other@example.com');

        Channel::create([
            'user_id' => $owner->id,
            'type' => 'widget',
            'name' => 'Website Widget',
            'public_token' => 'owner-token',
            'external_id' => '@orqiva_bot',
            'credentials' => ['bot_token' => 'super-secret'],
            'is_active' => false,
        ]);

        Channel::create([
            'user_id' => $other->id,
            'type' => 'widget',
            'name' => 'Other widget',
            'public_token' => 'other-token',
            'is_active' => false,
        ]);

        $response = $this->actingAs($owner)
            ->getJson('/api/v1/channels')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Website Widget')
            ->assertJsonPath('data.0.type', 'widget')
            ->assertJsonPath('data.0.external_id', '@orqiva_bot')
            ->assertJsonPath('data.0.has_credentials', true);

        $this->assertArrayNotHasKey('credentials', $response->json('data.0'));
        $this->assertStringNotContainsString('super-secret', $response->getContent());
    }

    public function test_store_creates_one_channel_per_type(): void
    {
        $owner = $this->user();
        $workflow = $this->workflow($owner);

        $this->actingAs($owner)
            ->postJson('/api/v1/channels', [
                'name' => 'Website Widget',
                'workflow_id' => $workflow->id,
            ])
            ->assertCreated()
            ->assertJsonPath('data.type', 'widget')
            ->assertJsonPath('data.workflow_id', $workflow->id)
            ->assertJsonPath('data.is_active', false);

        $this->actingAs($owner)
            ->postJson('/api/v1/channels', [
                'name' => 'Second widget',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('type');

        $this->assertSame(1, Channel::query()->where('user_id', $owner->id)->count());
    }

    public function test_store_rejects_workflow_without_trigger(): void
    {
        $owner = $this->user();
        $workflow = $this->workflow($owner, [
            'nodes' => [$this->aiNode('ai-1')],
            'edges' => [],
        ]);

        $this->actingAs($owner)
            ->postJson('/api/v1/channels', [
                'name' => 'Website Widget',
                'workflow_id' => $workflow->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('workflow_id');
    }

    public function test_store_rejects_active_channel_without_workflow(): void
    {
        $owner = $this->user();

        $this->actingAs($owner)
            ->postJson('/api/v1/channels', [
                'name' => 'Website Widget',
                'is_active' => true,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('workflow_id');
    }

    public function test_channels_are_scoped_to_the_owner(): void
    {
        $owner = $this->user();
        $other = $this->user('other@example.com');

        $channel = Channel::create([
            'user_id' => $other->id,
            'type' => 'widget',
            'name' => 'Other widget',
            'public_token' => 'other-token',
            'is_active' => false,
        ]);

        $this->actingAs($owner)
            ->putJson("/api/v1/channels/{$channel->id}", ['name' => 'Hijacked'])
            ->assertNotFound();

        $this->actingAs($owner)
            ->deleteJson("/api/v1/channels/{$channel->id}")
            ->assertNotFound();

        $this->assertSame('Other widget', $channel->fresh()->name);
    }

    public function test_owner_can_update_and_delete_a_channel(): void
    {
        $owner = $this->user();
        $workflow = $this->workflow($owner);

        $channel = Channel::create([
            'user_id' => $owner->id,
            'type' => 'widget',
            'name' => 'Website Widget',
            'public_token' => 'owner-token',
            'is_active' => false,
        ]);

        $this->actingAs($owner)
            ->putJson("/api/v1/channels/{$channel->id}", [
                'name' => 'Support Widget',
                'workflow_id' => $workflow->id,
                'is_active' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Support Widget')
            ->assertJsonPath('data.is_active', true);

        $this->actingAs($owner)
            ->deleteJson("/api/v1/channels/{$channel->id}")
            ->assertOk();

        $this->assertDatabaseMissing('channels', ['id' => $channel->id]);
    }

    public function test_legacy_channel_endpoint_still_manages_the_widget(): void
    {
        $owner = $this->user();
        $workflow = $this->workflow($owner);

        $this->actingAs($owner)
            ->getJson('/api/v1/channel')
            ->assertOk()
            ->assertJsonPath('data.type', 'widget')
            ->assertJsonPath('data.name', 'Website Chat Widget');

        $this->actingAs($owner)
            ->putJson('/api/v1/channel', [
                'workflow_id' => $workflow->id,
                'is_active' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.is_active', true);

        $this->assertSame(1, Channel::query()->where('user_id', $owner->id)->count());
    }
}
