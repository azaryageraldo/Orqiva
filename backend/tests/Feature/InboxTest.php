<?php

namespace Tests\Feature;

use App\Models\Channel;
use App\Models\ChatMessage;
use App\Models\ChatSession;
use App\Models\Contact;
use App\Models\User;
use App\Models\Workflow;
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

    private function channel(User $user, Workflow $workflow, string $token): Channel
    {
        return Channel::create([
            'user_id' => $user->id,
            'workflow_id' => $workflow->id,
            'type' => 'widget',
            'name' => 'Website Widget',
            'public_token' => $token,
            'is_active' => true,
            'settings' => [],
        ]);
    }

    private function contact(User $user, string $name = 'Rina', string $publicId = 'ct_rina'): Contact
    {
        return Contact::create([
            'user_id' => $user->id,
            'public_id' => $publicId,
            'name' => $name,
            'last_seen_at' => now(),
        ]);
    }

    private function chatSession(
        Contact $contact,
        Channel $channel,
        string $token,
        string $status = ChatSession::STATUS_ACTIVE
    ): ChatSession {
        return ChatSession::create([
            'user_id' => $contact->user_id,
            'channel_id' => $channel->id,
            'contact_id' => $contact->id,
            'workflow_id' => $channel->workflow_id,
            'public_token' => $token,
            'status' => $status,
            'last_activity_at' => now(),
        ]);
    }

    private function chatMessage(ChatSession $session, string $role, string $content): ChatMessage
    {
        return ChatMessage::create([
            'chat_session_id' => $session->id,
            'contact_id' => $session->contact_id,
            'role' => $role,
            'content' => $content,
        ]);
    }

    public function test_guests_cannot_read_inbox(): void
    {
        $this->getJson('/api/v1/inbox')->assertUnauthorized();
    }

    public function test_inbox_only_lists_own_contacts(): void
    {
        $owner = $this->user('owner@example.com');
        $other = $this->user('other@example.com');

        $ownerWorkflow = $this->workflow($owner);
        $ownerChannel = $this->channel($owner, $ownerWorkflow, 'owner-widget');
        $ownerContact = $this->contact($owner);
        $ownerSession = $this->chatSession($ownerContact, $ownerChannel, 'owner-session');
        $this->chatMessage($ownerSession, 'customer', 'Halo');
        $this->chatMessage($ownerSession, 'assistant', 'Hai, ada yang bisa dibantu?');

        $otherWorkflow = $this->workflow($other);
        $otherChannel = $this->channel($other, $otherWorkflow, 'other-widget');
        $otherContact = $this->contact($other, 'Orang Lain', 'ct_other');
        $otherSession = $this->chatSession($otherContact, $otherChannel, 'other-session');
        $this->chatMessage($otherSession, 'customer', 'Pesan orang lain');

        $this->actingAs($owner)
            ->getJson('/api/v1/inbox')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.contact_id', 'ct_rina')
            ->assertJsonPath('data.0.name', 'Rina')
            ->assertJsonPath('data.0.last_message', 'Hai, ada yang bisa dibantu?')
            ->assertJsonPath('data.0.session_status', 'active')
            ->assertJsonPath('data.0.session_count', 1)
            ->assertJsonPath('data.0.workflow_name', 'Support')
            ->assertJsonPath('data.0.latest_session_id', $ownerSession->id)
            ->assertJsonPath('meta.total', 1);
    }

    public function test_inbox_detail_returns_contact_history_across_sessions(): void
    {
        $owner = $this->user('owner@example.com');
        $workflow = $this->workflow($owner);
        $channel = $this->channel($owner, $workflow, 'widget');
        $contact = $this->contact($owner);

        $first = $this->chatSession($contact, $channel, 'session-1', ChatSession::STATUS_ENDED);
        $first->update(['ended_at' => now()->subDay()]);
        $this->chatMessage($first, 'customer', 'Pesan pertama');
        $this->chatMessage($first, 'assistant', 'Balasan pertama');

        $second = $this->chatSession($contact, $channel, 'session-2', ChatSession::STATUS_ACTIVE);
        $this->chatMessage($second, 'customer', 'Pesan kedua');
        $this->chatMessage($second, 'system', 'Percakapan dialihkan ke admin.');
        $this->chatMessage($second, 'admin', 'Halo, saya admin.');

        $this->actingAs($owner)
            ->getJson("/api/v1/inbox/contacts/{$contact->id}")
            ->assertOk()
            ->assertJsonPath('data.contact_id', 'ct_rina')
            ->assertJsonPath('data.latest_session.id', $second->id)
            ->assertJsonCount(2, 'data.sessions')
            ->assertJsonCount(2, 'data.sessions.0.messages')
            ->assertJsonCount(3, 'data.sessions.1.messages')
            ->assertJsonPath('data.sessions.0.messages.0.content', 'Pesan pertama')
            ->assertJsonPath('data.sessions.1.messages.2.role', 'admin');
    }

    public function test_inbox_detail_is_scoped_to_owner(): void
    {
        $owner = $this->user('owner@example.com');
        $other = $this->user('other@example.com');
        $workflow = $this->workflow($other);
        $channel = $this->channel($other, $workflow, 'other-widget');
        $contact = $this->contact($other, 'Rahasia', 'ct_private');
        $this->chatSession($contact, $channel, 'private-session');

        $this->actingAs($owner)
            ->getJson("/api/v1/inbox/contacts/{$contact->id}")
            ->assertNotFound();
    }

    public function test_admin_can_take_over_and_reply_then_release_session(): void
    {
        $owner = $this->user('owner@example.com');
        $workflow = $this->workflow($owner);
        $channel = $this->channel($owner, $workflow, 'widget');
        $contact = $this->contact($owner);
        $session = $this->chatSession($contact, $channel, 'session');
        $this->chatMessage($session, 'customer', 'Saya butuh bantuan.');

        $this->actingAs($owner)
            ->postJson("/api/v1/inbox/sessions/{$session->id}/takeover")
            ->assertOk()
            ->assertJsonPath('data.status', 'human');

        $this->assertSame('human', $session->fresh()->status);
        $this->assertNotNull($session->fresh()->takeover_at);
        $this->assertDatabaseHas('chat_messages', [
            'chat_session_id' => $session->id,
            'role' => 'system',
        ]);

        $this->actingAs($owner)
            ->postJson("/api/v1/inbox/sessions/{$session->id}/messages", [
                'message' => 'Halo, saya admin.',
            ])
            ->assertCreated()
            ->assertJsonPath('data.role', 'admin')
            ->assertJsonPath('data.content', 'Halo, saya admin.');

        $this->actingAs($owner)
            ->postJson("/api/v1/inbox/sessions/{$session->id}/release")
            ->assertOk()
            ->assertJsonPath('data.status', 'active');

        $this->assertSame('active', $session->fresh()->status);
        $this->assertNull($session->fresh()->takeover_at);
    }

    public function test_admin_reply_requires_takeover(): void
    {
        $owner = $this->user('owner@example.com');
        $workflow = $this->workflow($owner);
        $channel = $this->channel($owner, $workflow, 'widget');
        $contact = $this->contact($owner);
        $session = $this->chatSession($contact, $channel, 'session');

        $this->actingAs($owner)
            ->postJson("/api/v1/inbox/sessions/{$session->id}/messages", [
                'message' => 'Halo',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('session');
    }

    public function test_other_users_cannot_control_a_session(): void
    {
        $owner = $this->user('owner@example.com');
        $other = $this->user('other@example.com');
        $workflow = $this->workflow($owner);
        $channel = $this->channel($owner, $workflow, 'widget');
        $contact = $this->contact($owner);
        $session = $this->chatSession($contact, $channel, 'session');

        $this->actingAs($other)
            ->postJson("/api/v1/inbox/sessions/{$session->id}/takeover")
            ->assertNotFound();
    }
}
