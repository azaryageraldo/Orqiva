<?php

namespace Tests\Feature;

use App\Models\Channel;
use App\Models\ChatMessage;
use App\Models\ChatSession;
use App\Models\Contact;
use App\Models\User;
use App\Models\Workflow;
use App\Services\Channels\ChannelTransportManager;
use App\Services\Channels\MessageDelivery;
use App\Services\Channels\WidgetTransport;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChannelTransportTest extends TestCase
{
    use RefreshDatabase;

    private function message(string $channelType = 'widget'): ChatMessage
    {
        $user = User::create([
            'name' => 'Owner',
            'email' => 'transport@example.com',
            'password' => 'password',
        ]);

        $workflow = Workflow::create([
            'user_id' => $user->id,
            'name' => 'Support',
            'status' => 'active',
            'definition' => ['nodes' => [], 'edges' => []],
        ]);

        $channel = Channel::create([
            'user_id' => $user->id,
            'workflow_id' => $workflow->id,
            'type' => $channelType,
            'name' => 'Test channel',
            'public_token' => 'transport-token',
            'is_active' => true,
        ]);

        $contact = Contact::create([
            'user_id' => $user->id,
            'public_id' => 'ct_transport',
            'name' => 'Pengunjung',
            'last_seen_at' => now(),
        ]);

        $session = ChatSession::create([
            'user_id' => $user->id,
            'channel_id' => $channel->id,
            'contact_id' => $contact->id,
            'workflow_id' => $workflow->id,
            'public_token' => 'transport-session',
            'status' => ChatSession::STATUS_ACTIVE,
            'last_activity_at' => now(),
        ]);

        return ChatMessage::create([
            'chat_session_id' => $session->id,
            'contact_id' => $contact->id,
            'role' => 'assistant',
            'content' => 'Halo!',
        ]);
    }

    public function test_widget_transport_marks_message_as_sent(): void
    {
        $message = $this->message();

        $delivered = app(MessageDelivery::class)->send($message);

        $this->assertTrue($delivered);
        $this->assertSame(ChatMessage::DELIVERY_SENT, $message->fresh()->delivery_status);
        $this->assertNull($message->fresh()->external_message_id);
        $this->assertNull($message->fresh()->delivery_error);
    }

    public function test_unknown_channel_type_is_marked_failed_without_throwing(): void
    {
        $message = $this->message('whatsapp');

        $delivered = app(MessageDelivery::class)->send($message);

        $this->assertFalse($delivered);
        $this->assertSame(ChatMessage::DELIVERY_FAILED, $message->fresh()->delivery_status);
        $this->assertStringContainsString('belum didukung', $message->fresh()->delivery_error);
    }

    public function test_manager_resolves_registered_transports(): void
    {
        $message = $this->message();
        $manager = app(ChannelTransportManager::class);

        $this->assertTrue($manager->has('widget'));
        $this->assertContains('widget', $manager->types());
        $this->assertInstanceOf(
            WidgetTransport::class,
            $manager->for($message->session->channel)
        );
    }
}
