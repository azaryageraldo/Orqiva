<?php

namespace Tests\Feature;

use App\Models\Channel;
use App\Models\ChatMessage;
use App\Models\ChatSession;
use App\Models\Contact;
use App\Models\ContactChannel;
use App\Models\User;
use App\Models\Workflow;
use App\Services\Channels\MessageDelivery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TelegramTransportTest extends TestCase
{
    use RefreshDatabase;

    private function message(string $content = 'Halo!', bool $withIdentity = true, bool $withToken = true): ChatMessage
    {
        $user = User::create([
            'name' => 'Owner',
            'email' => 'telegram-transport@example.com',
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
            'type' => 'telegram',
            'name' => 'Telegram',
            'public_token' => 'telegram-token',
            'credentials' => $withToken ? ['bot_token' => '123:abc'] : null,
            'is_active' => true,
        ]);

        $contact = Contact::create([
            'user_id' => $user->id,
            'public_id' => 'ct_telegram',
            'name' => 'Budi',
            'last_seen_at' => now(),
        ]);

        if ($withIdentity) {
            ContactChannel::create([
                'contact_id' => $contact->id,
                'channel_id' => $channel->id,
                'external_id' => '555',
            ]);
        }

        $session = ChatSession::create([
            'user_id' => $user->id,
            'channel_id' => $channel->id,
            'contact_id' => $contact->id,
            'workflow_id' => $workflow->id,
            'public_token' => 'telegram-session',
            'status' => ChatSession::STATUS_ACTIVE,
            'last_activity_at' => now(),
        ]);

        return ChatMessage::create([
            'chat_session_id' => $session->id,
            'contact_id' => $contact->id,
            'role' => 'assistant',
            'content' => $content,
        ]);
    }

    private function fakeSend(int $messageId = 42): void
    {
        Http::fake([
            'api.telegram.org/*' => Http::response([
                'ok' => true,
                'result' => [
                    'message_id' => $messageId,
                    'chat' => ['id' => 555],
                ],
            ]),
        ]);
    }

    public function test_it_sends_the_reply_to_the_contact_chat(): void
    {
        $this->fakeSend(42);

        $message = $this->message('Halo dari Orqiva');

        $delivered = app(MessageDelivery::class)->send($message);

        $this->assertTrue($delivered);
        $this->assertSame(ChatMessage::DELIVERY_SENT, $message->fresh()->delivery_status);
        $this->assertSame('tg:42', $message->fresh()->external_message_id);

        Http::assertSent(function ($request) {
            return str_contains($request->url(), '/sendMessage')
                && $request->data()['chat_id'] === '555'
                && $request->data()['text'] === 'Halo dari Orqiva';
        });
    }

    public function test_long_replies_are_split_into_multiple_messages(): void
    {
        $this->fakeSend(7);

        $message = $this->message(str_repeat('a', 5000));

        app(MessageDelivery::class)->send($message);

        Http::assertSentCount(2);
        $this->assertSame(ChatMessage::DELIVERY_SENT, $message->fresh()->delivery_status);
    }

    public function test_missing_chat_identity_marks_delivery_failed(): void
    {
        $this->fakeSend();

        $message = $this->message('Halo', withIdentity: false);

        $delivered = app(MessageDelivery::class)->send($message);

        $this->assertFalse($delivered);
        $this->assertSame(ChatMessage::DELIVERY_FAILED, $message->fresh()->delivery_status);
        $this->assertStringContainsString('Identitas chat', (string) $message->fresh()->delivery_error);
    }

    public function test_missing_bot_token_marks_delivery_failed(): void
    {
        $this->fakeSend();

        $message = $this->message('Halo', withToken: false);

        $delivered = app(MessageDelivery::class)->send($message);

        $this->assertFalse($delivered);
        $this->assertSame(ChatMessage::DELIVERY_FAILED, $message->fresh()->delivery_status);
        $this->assertStringContainsString('Token bot', (string) $message->fresh()->delivery_error);
    }
}
