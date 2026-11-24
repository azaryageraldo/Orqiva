<?php

namespace Tests\Feature;

use App\Models\Channel;
use App\Models\Contact;
use App\Models\ContactChannel;
use App\Models\User;
use App\Models\Workflow;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\Concerns\BuildsWorkflowDefinitions;
use Tests\TestCase;

class TelegramWebhookTest extends TestCase
{
    use BuildsWorkflowDefinitions;
    use RefreshDatabase;

    private function channel(bool $active = true): Channel
    {
        $user = User::create([
            'name' => 'Owner',
            'email' => 'webhook-owner@example.com',
            'password' => 'password',
        ]);

        $workflow = Workflow::create([
            'user_id' => $user->id,
            'name' => 'Support Flow',
            'status' => 'active',
            'definition' => $this->singleAgentDefinition(),
        ]);

        return Channel::create([
            'user_id' => $user->id,
            'workflow_id' => $workflow->id,
            'type' => 'telegram',
            'name' => 'Telegram Bot',
            'public_token' => 'telegram-webhook-token',
            'credentials' => ['bot_token' => '123456:ABC-DEF'],
            'is_active' => $active,
        ]);
    }

    private function updatePayload(int $updateId = 101, string $text = 'Halo via Webhook', bool $isBot = false): array
    {
        return [
            'update_id' => $updateId,
            'message' => [
                'message_id' => 50,
                'chat' => [
                    'id' => 999888,
                    'type' => 'private',
                ],
                'from' => [
                    'id' => 999888,
                    'is_bot' => $isBot,
                    'first_name' => 'Ahmad',
                    'last_name' => 'Dahlan',
                ],
                'text' => $text,
            ],
        ];
    }

    public function test_webhook_returns_404_for_unknown_token(): void
    {
        $response = $this->postJson('/api/v1/public/telegram/non-existent-token/webhook', []);
        $response->assertNotFound();
    }

    public function test_webhook_ignores_inactive_channel(): void
    {
        $channel = $this->channel(active: false);

        $response = $this->postJson("/api/v1/public/telegram/{$channel->public_token}/webhook", [
            'update_id' => 1,
            'message' => ['text' => 'Hello'],
        ]);

        $response->assertOk();
        $this->assertSame('inactive', $response->json('status'));
    }

    public function test_webhook_processes_incoming_message(): void
    {
        Queue::fake();

        $channel = $this->channel(active: true);
        $payload = $this->updatePayload(202, 'Tanya harga produk');

        $response = $this->postJson("/api/v1/public/telegram/{$channel->public_token}/webhook", $payload);

        $response->assertOk();
        $this->assertTrue($response->json('ok'));

        $contact = Contact::query()->firstOrFail();
        $this->assertSame('Ahmad Dahlan', $contact->name);
        $this->assertSame(1, ContactChannel::query()->count());
        $this->assertSame('999888', ContactChannel::query()->value('external_id'));
    }

    public function test_webhook_ignores_bot_messages(): void
    {
        Queue::fake();

        $channel = $this->channel(active: true);
        $payload = $this->updatePayload(203, 'Message from bot', isBot: true);

        $response = $this->postJson("/api/v1/public/telegram/{$channel->public_token}/webhook", $payload);

        $response->assertOk();
        $this->assertSame(0, Contact::query()->count());
    }

    public function test_owner_can_manage_telegram_webhook(): void
    {
        Http::fake([
            'https://api.telegram.org/bot123456:ABC-DEF/setWebhook' => Http::response([
                'ok' => true,
                'result' => true,
                'description' => 'Webhook was set',
            ]),
            'https://api.telegram.org/bot123456:ABC-DEF/getWebhookInfo' => Http::response([
                'ok' => true,
                'result' => [
                    'url' => 'https://example.com/api/v1/public/telegram/telegram-webhook-token/webhook',
                    'has_custom_certificate' => false,
                    'pending_update_count' => 0,
                ],
            ]),
            'https://api.telegram.org/bot123456:ABC-DEF/deleteWebhook' => Http::response([
                'ok' => true,
                'result' => true,
            ]),
        ]);

        $channel = $this->channel();
        $owner = $channel->user;

        // Set webhook
        $setResponse = $this->actingAs($owner)
            ->postJson("/api/v1/channels/{$channel->id}/telegram/webhook", [
                'action' => 'set',
                'url' => 'https://example.com/api/v1/public/telegram/telegram-webhook-token/webhook',
            ]);
        $setResponse->assertOk();
        $this->assertTrue($setResponse->json('data.success'));

        // Get webhook info
        $getInfoResponse = $this->actingAs($owner)
            ->getJson("/api/v1/channels/{$channel->id}/telegram/webhook");
        $getInfoResponse->assertOk();
        $this->assertSame(
            'https://example.com/api/v1/public/telegram/telegram-webhook-token/webhook',
            $getInfoResponse->json('data.url')
        );

        // Delete webhook
        $deleteResponse = $this->actingAs($owner)
            ->postJson("/api/v1/channels/{$channel->id}/telegram/webhook", [
                'action' => 'delete',
            ]);
        $deleteResponse->assertOk();
        $this->assertTrue($deleteResponse->json('data.success'));
    }
}
