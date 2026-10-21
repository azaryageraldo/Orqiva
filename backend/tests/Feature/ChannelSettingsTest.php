<?php

namespace Tests\Feature;

use App\Models\Channel;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ChannelSettingsTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $email = 'owner@example.com'): User
    {
        return User::create([
            'name' => 'Owner',
            'email' => $email,
            'password' => 'password',
        ]);
    }

    private function channel(User $user, array $settings = []): Channel
    {
        return Channel::create([
            'user_id' => $user->id,
            'type' => 'widget',
            'name' => 'Website Widget',
            'public_token' => 'widget-token',
            'is_active' => true,
            'settings' => array_replace([
                'welcome_message' => 'Halo!',
                'placeholder' => 'Tulis pesan...',
                'open_mode' => 'manual',
                'appearance' => [
                    'header_color' => '#17212b',
                    'background_color' => '#0e1621',
                    'outgoing_color' => '#2b5278',
                    'accent_color' => '#64b5ef',
                ],
                'icons' => [
                    'chat' => null,
                    'launcher' => null,
                ],
            ], $settings),
        ]);
    }

    public function test_channel_defaults_use_telegram_dark_and_manual_open(): void
    {
        $response = $this->actingAs($this->user())
            ->getJson('/api/v1/channel')
            ->assertOk();

        $response
            ->assertJsonPath('data.settings.open_mode', 'manual')
            ->assertJsonPath('data.settings.appearance.header_color', '#17212b')
            ->assertJsonPath('data.settings.appearance.background_color', '#0e1621')
            ->assertJsonPath('data.settings.appearance.outgoing_color', '#2b5278')
            ->assertJsonPath('data.settings.appearance.accent_color', '#64b5ef')
            ->assertJsonPath('data.icon_urls.chat', null)
            ->assertJsonPath('data.icon_urls.launcher', null);
    }

    public function test_channel_appearance_and_open_mode_can_be_updated(): void
    {
        $user = $this->user();
        $this->channel($user);

        $response = $this->actingAs($user)
            ->putJson('/api/v1/channel', [
                'settings' => [
                    'open_mode' => 'always',
                    'appearance' => [
                        'header_color' => '#112233',
                        'background_color' => '#223344',
                        'outgoing_color' => '#334455',
                        'accent_color' => '#445566',
                    ],
                ],
            ])
            ->assertOk();

        $response
            ->assertJsonPath('data.settings.open_mode', 'always')
            ->assertJsonPath('data.settings.appearance.header_color', '#112233')
            ->assertJsonPath('data.settings.appearance.background_color', '#223344')
            ->assertJsonPath('data.settings.appearance.outgoing_color', '#334455')
            ->assertJsonPath('data.settings.appearance.accent_color', '#445566');
    }

    public function test_channel_rejects_invalid_colors_and_open_mode(): void
    {
        $user = $this->user();
        $this->channel($user);

        $this->actingAs($user)
            ->putJson('/api/v1/channel', [
                'settings' => [
                    'open_mode' => 'sometimes',
                    'appearance' => ['header_color' => 'red'],
                ],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'settings.open_mode',
                'settings.appearance.header_color',
            ]);
    }

    public function test_channel_icon_upload_and_removal(): void
    {
        Storage::fake('public');

        $user = $this->user();
        $channel = $this->channel($user);

        $this->actingAs($user)
            ->post('/api/v1/channel/icon', [
                'kind' => 'chat',
                'icon' => UploadedFile::fake()->image('avatar.png', 600, 400),
            ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('data.icon_urls.chat', fn ($value) => is_string($value) && $value !== '');

        $path = data_get($channel->fresh()->settings, 'icons.chat');

        $this->assertIsString($path);
        Storage::disk('public')->assertExists($path);

        $this->get('/api/v1/public/channels/widget-token/icon/chat')
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png');

        $this->actingAs($user)
            ->deleteJson('/api/v1/channel/icon/chat')
            ->assertOk()
            ->assertJsonPath('data.icon_urls.chat', null);

        Storage::disk('public')->assertMissing($path);
    }

    public function test_embed_config_exposes_only_public_widget_settings(): void
    {
        $user = $this->user();
        $this->channel($user, [
            'open_mode' => 'always',
            'appearance' => [
                'header_color' => '#17212b',
                'background_color' => '#0e1621',
                'outgoing_color' => '#2b5278',
                'accent_color' => '#abcdef',
            ],
            'icons' => [
                'chat' => null,
                'launcher' => null,
            ],
        ]);

        $response = $this->get('/api/v1/public/channels/widget-token/embed-config.js')
            ->assertOk()
            ->assertHeader('Content-Type', 'application/javascript; charset=utf-8');

        $script = $response->getContent();

        $this->assertStringContainsString('"mode":"always"', $script);
        $this->assertStringContainsString('"accent":"#abcdef"', $script);
        $this->assertStringNotContainsString('workflow', $script);
    }

    public function test_public_channel_payload_includes_appearance_without_workflow_details(): void
    {
        $user = $this->user();
        $this->channel($user, ['open_mode' => 'always']);

        $response = $this->getJson('/api/v1/public/channels/widget-token')
            ->assertOk();

        $response
            ->assertJsonPath('data.settings.open_mode', 'always')
            ->assertJsonPath('data.settings.appearance.accent_color', '#64b5ef')
            ->assertJsonPath('data.icon_urls.chat', null);

        $this->assertArrayNotHasKey('workflow_name', $response->json('data'));
    }
}
