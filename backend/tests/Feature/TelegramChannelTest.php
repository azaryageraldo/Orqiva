<?php

namespace Tests\Feature;

use App\Models\Channel;
use App\Models\User;
use App\Models\Workflow;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\Concerns\BuildsWorkflowDefinitions;
use Tests\TestCase;

class TelegramChannelTest extends TestCase
{
    use BuildsWorkflowDefinitions;
    use RefreshDatabase;

    private function user(): User
    {
        return User::create([
            'name' => 'Owner',
            'email' => 'telegram-owner@example.com',
            'password' => 'password',
        ]);
    }

    private function workflow(User $user): Workflow
    {
        return Workflow::create([
            'user_id' => $user->id,
            'name' => 'Support',
            'status' => 'active',
            'definition' => $this->singleAgentDefinition(),
        ]);
    }

    private function fakeTelegram(string $username = 'orqiva_bot'): void
    {
        Http::fake(function ($request) use ($username) {
            $url = $request->url();

            if (str_contains($url, '/getMe')) {
                return Http::response([
                    'ok' => true,
                    'result' => [
                        'id' => 12345,
                        'is_bot' => true,
                        'first_name' => 'Orqiva',
                        'username' => $username,
                    ],
                ]);
            }

            if (str_contains($url, '/deleteWebhook')) {
                return Http::response(['ok' => true, 'result' => true]);
            }

            return Http::response(['ok' => true, 'result' => []]);
        });
    }

    public function test_store_requires_a_bot_token_for_telegram(): void
    {
        $owner = $this->user();
        $workflow = $this->workflow($owner);

        $this->actingAs($owner)
            ->postJson('/api/v1/channels', [
                'type' => 'telegram',
                'name' => 'Telegram',
                'workflow_id' => $workflow->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('bot_token');
    }

    public function test_store_validates_token_and_never_returns_it(): void
    {
        $this->fakeTelegram();

        $owner = $this->user();
        $workflow = $this->workflow($owner);

        $response = $this->actingAs($owner)
            ->postJson('/api/v1/channels', [
                'type' => 'telegram',
                'name' => 'Telegram',
                'workflow_id' => $workflow->id,
                'bot_token' => '123:abc',
            ])
            ->assertCreated()
            ->assertJsonPath('data.type', 'telegram')
            ->assertJsonPath('data.external_id', '@orqiva_bot')
            ->assertJsonPath('data.has_credentials', true);

        $this->assertStringNotContainsString('123:abc', $response->getContent());

        $channel = Channel::query()->firstOrFail();
        $this->assertSame('123:abc', data_get($channel->credentials, 'bot_token'));
        $this->assertSame('@orqiva_bot', $channel->external_id);
        $this->assertNotNull($channel->last_connected_at);

        Http::assertSent(fn ($request) => str_contains($request->url(), '/deleteWebhook'));
    }

    public function test_invalid_token_is_rejected(): void
    {
        Http::fake([
            'api.telegram.org/*' => Http::response([
                'ok' => false,
                'error_code' => 401,
                'description' => 'Unauthorized',
            ], 401),
        ]);

        $owner = $this->user();

        $this->actingAs($owner)
            ->postJson('/api/v1/channels', [
                'type' => 'telegram',
                'name' => 'Telegram',
                'bot_token' => 'bad:token',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('bot_token');
    }

    public function test_only_one_telegram_channel_per_user(): void
    {
        $this->fakeTelegram();

        $owner = $this->user();

        $this->actingAs($owner)
            ->postJson('/api/v1/channels', [
                'type' => 'telegram',
                'name' => 'Telegram',
                'bot_token' => '123:abc',
            ])
            ->assertCreated();

        $this->actingAs($owner)
            ->postJson('/api/v1/channels', [
                'type' => 'telegram',
                'name' => 'Second bot',
                'bot_token' => '456:def',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('type');
    }

    public function test_owner_can_rotate_the_bot_token(): void
    {
        $owner = $this->user();

        $channel = Channel::create([
            'user_id' => $owner->id,
            'type' => 'telegram',
            'name' => 'Telegram',
            'public_token' => 'telegram-token',
            'credentials' => ['bot_token' => '123:abc'],
            'external_id' => '@old_bot',
            'is_active' => false,
        ]);

        Http::fake(function ($request) {
            $url = $request->url();

            if (str_contains($url, '/getMe')) {
                return Http::response([
                    'ok' => true,
                    'result' => [
                        'id' => 999,
                        'is_bot' => true,
                        'username' => 'new_bot',
                    ],
                ]);
            }

            return Http::response(['ok' => true, 'result' => true]);
        });

        $this->actingAs($owner)
            ->putJson("/api/v1/channels/{$channel->id}", [
                'bot_token' => '456:def',
            ])
            ->assertOk()
            ->assertJsonPath('data.external_id', '@new_bot');

        $this->assertSame(
            '456:def',
            data_get($channel->fresh()->credentials, 'bot_token')
        );
    }

    public function test_widget_cannot_use_a_bot_token(): void
    {
        $owner = $this->user();

        $this->actingAs($owner)
            ->postJson('/api/v1/channels', [
                'type' => 'widget',
                'name' => 'Widget',
                'bot_token' => '123:abc',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('bot_token');
    }

    public function test_telegram_channel_cannot_regenerate_a_public_token(): void
    {
        $owner = $this->user();

        $channel = Channel::create([
            'user_id' => $owner->id,
            'type' => 'telegram',
            'name' => 'Telegram',
            'public_token' => 'telegram-token',
            'credentials' => ['bot_token' => '123:abc'],
            'is_active' => false,
        ]);

        $this->actingAs($owner)
            ->postJson("/api/v1/channels/{$channel->id}/regenerate")
            ->assertStatus(422)
            ->assertJsonValidationErrors('channel');
    }
}
