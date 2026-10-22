<?php

namespace Tests\Feature;

use App\Jobs\ProcessChatMessage;
use App\Models\Channel;
use App\Models\ChatMessage;
use App\Models\ChatSession;
use App\Models\Contact;
use App\Models\ContactChannel;
use App\Models\User;
use App\Models\Workflow;
use App\Services\Channels\InboundMessageHandler;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Validation\ValidationException;
use Tests\Concerns\BuildsWorkflowDefinitions;
use Tests\TestCase;

class InboundMessageTest extends TestCase
{
    use BuildsWorkflowDefinitions;
    use RefreshDatabase;

    private function channel(string $type = 'telegram', bool $active = true): Channel
    {
        $user = User::create([
            'name' => 'Owner',
            'email' => "owner-{$type}@example.com",
            'password' => 'password',
        ]);

        $workflow = Workflow::create([
            'user_id' => $user->id,
            'name' => 'Support',
            'status' => 'active',
            'definition' => $this->singleAgentDefinition(),
        ]);

        return Channel::create([
            'user_id' => $user->id,
            'workflow_id' => $workflow->id,
            'type' => $type,
            'name' => 'Telegram bot',
            'public_token' => "token-{$type}",
            'is_active' => $active,
        ]);
    }

    private function handler(): InboundMessageHandler
    {
        return app(InboundMessageHandler::class);
    }

    public function test_inbound_message_creates_contact_identity_and_session(): void
    {
        Queue::fake();

        $channel = $this->channel();

        $session = $this->handler()->handle($channel, '123456', 'Halo, saya butuh bantuan.');

        $this->assertSame($channel->workflow_id, $session->workflow_id);
        $this->assertSame($channel->id, $session->channel_id);
        $this->assertSame(1, Contact::query()->count());
        $this->assertSame(1, ContactChannel::query()->count());
        $this->assertSame('123456', ContactChannel::query()->value('external_id'));
        $this->assertSame(1, ChatMessage::query()->where('role', 'customer')->count());
        $this->assertSame($session->contact_id, ContactChannel::query()->value('contact_id'));

        Queue::assertPushed(ProcessChatMessage::class, 1);
    }

    public function test_same_external_contact_reuses_contact_and_session(): void
    {
        Queue::fake();

        $channel = $this->channel('telegram');

        $first = $this->handler()->handle($channel, '999', 'Pesan pertama', 'upd-1');
        $second = $this->handler()->handle($channel, '999', 'Pesan kedua', 'upd-2');

        $this->assertSame($first->id, $second->id);
        $this->assertSame(1, Contact::query()->count());
        $this->assertSame(1, ContactChannel::query()->count());
        $this->assertSame(1, ChatSession::query()->count());
        $this->assertSame(2, ChatMessage::query()->where('role', 'customer')->count());

        Queue::assertPushed(ProcessChatMessage::class, 2);
    }

    public function test_duplicate_external_message_id_is_idempotent(): void
    {
        Queue::fake();

        $channel = $this->channel('telegram');

        $this->handler()->handle($channel, '777', 'Halo', 'upd-42');
        $this->handler()->handle($channel, '777', 'Halo', 'upd-42');

        $this->assertSame(1, ChatMessage::query()->where('role', 'customer')->count());
        $this->assertSame('upd-42', ChatMessage::query()->value('external_message_id'));

        Queue::assertPushed(ProcessChatMessage::class, 1);
    }

    public function test_human_session_stores_message_without_queueing_ai(): void
    {
        Queue::fake();

        $channel = $this->channel('telegram');
        $session = $this->handler()->handle($channel, '555', 'Halo', 'upd-a');

        $session->update(['status' => ChatSession::STATUS_HUMAN]);

        $this->handler()->handle($channel, '555', 'Saya tunggu admin', 'upd-b');

        $this->assertSame(2, ChatMessage::query()->where('role', 'customer')->count());
        Queue::assertPushed(ProcessChatMessage::class, 1);
    }

    public function test_inactive_channel_is_rejected(): void
    {
        $channel = $this->channel('telegram', false);

        $this->expectException(ValidationException::class);

        $this->handler()->handle($channel, '123', 'Halo');
    }
}
