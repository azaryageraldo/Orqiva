<?php

namespace Tests\Feature;

use App\Models\Channel;
use App\Models\ChatSession;
use App\Models\Contact;
use App\Models\User;
use App\Models\Workflow;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsWorkflowDefinitions;
use Tests\TestCase;

class AutoResolveSessionsTest extends TestCase
{
    use BuildsWorkflowDefinitions;
    use RefreshDatabase;

    public function test_it_closes_sessions_older_than_cutoff(): void
    {
        $user = User::create([
            'name' => 'Owner',
            'email' => 'autoresolve@example.com',
            'password' => 'password',
        ]);

        $workflow = Workflow::create([
            'user_id' => $user->id,
            'name' => 'Flow',
            'definition' => $this->singleAgentDefinition(),
        ]);

        $channel = Channel::create([
            'user_id' => $user->id,
            'workflow_id' => $workflow->id,
            'type' => 'widget',
            'name' => 'Widget',
            'public_token' => 'widget-token-123',
            'is_active' => true,
        ]);

        $contact = Contact::create([
            'user_id' => $user->id,
            'public_id' => 'ct_test_123',
            'name' => 'Pelanggan Lama',
        ]);

        // Sesi aktif baru (1 jam lalu)
        $recentSession = ChatSession::create([
            'user_id' => $user->id,
            'channel_id' => $channel->id,
            'contact_id' => $contact->id,
            'workflow_id' => $workflow->id,
            'public_token' => 'session-recent',
            'status' => ChatSession::STATUS_ACTIVE,
            'last_activity_at' => now()->subHour(),
        ]);

        // Sesi lama yang menggantung (25 jam lalu)
        $staleSession = ChatSession::create([
            'user_id' => $user->id,
            'channel_id' => $channel->id,
            'contact_id' => $contact->id,
            'workflow_id' => $workflow->id,
            'public_token' => 'session-stale',
            'status' => ChatSession::STATUS_HUMAN,
            'last_activity_at' => now()->subHours(25),
        ]);

        $this->artisan('sessions:auto-resolve', ['--hours' => 24])
            ->assertSuccessful();

        $this->assertSame(ChatSession::STATUS_ACTIVE, $recentSession->fresh()->status);
        $this->assertSame(ChatSession::STATUS_ENDED, $staleSession->fresh()->status);
        $this->assertNotNull($staleSession->fresh()->ended_at);
    }
}
