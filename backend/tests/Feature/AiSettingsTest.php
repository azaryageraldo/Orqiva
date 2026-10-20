<?php

namespace Tests\Feature;

use App\Models\AiProviderSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AiSettingsTest extends TestCase
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

    public function test_settings_require_authentication(): void
    {
        $this->getJson('/api/v1/ai-settings')->assertUnauthorized();
        $this->putJson('/api/v1/ai-settings', ['provider' => 'gemini'])->assertUnauthorized();
    }

    public function test_api_key_is_encrypted_and_never_returned(): void
    {
        Http::fake([
            'https://generativelanguage.googleapis.com/v1beta/models*' => Http::response([
                'models' => [
                    [
                        'name' => 'models/gemini-2.5-flash',
                        'supportedGenerationMethods' => ['generateContent'],
                    ],
                    [
                        'name' => 'models/text-embedding-004',
                        'supportedGenerationMethods' => ['embedContent'],
                    ],
                    [
                        'name' => 'models/gemini-2.5-flash-image',
                        'supportedGenerationMethods' => ['generateContent'],
                    ],
                    [
                        'name' => 'models/gemini-2.5-pro-preview-tts',
                        'supportedGenerationMethods' => ['generateContent'],
                    ],
                ],
            ]),
        ]);

        $user = $this->user();

        $response = $this->actingAs($user)
            ->putJson('/api/v1/ai-settings', [
                'provider' => 'gemini',
                'api_key' => 'gemini-user-secret',
                'default_model' => 'gemini-2.5-flash',
                'debounce_ms' => 350,
            ])
            ->assertOk()
            ->assertJsonPath('data.debounce_ms', 350)
            ->assertJsonPath('data.providers.0.provider', 'gemini')
            ->assertJsonPath('data.providers.0.configured', true)
            ->assertJsonPath('data.providers.0.models.0', 'gemini-2.5-flash')
            ->assertJsonPath('data.models.0.id', 'gemini-2.5-flash')
            ->assertJsonPath('data.models.0.provider', 'gemini');

        $this->assertStringNotContainsString('gemini-user-secret', $response->getContent());
        $this->assertSame('gemini-user-secret', AiProviderSetting::query()->firstOrFail()->api_key);
        $this->assertNotSame(
            'gemini-user-secret',
            DB::table('ai_provider_settings')->value('api_key')
        );
        $this->assertSame(350, $user->fresh()->ai_reply_debounce_ms);

        $this->getJson('/api/v1/ai-settings')
            ->assertOk()
            ->assertJsonPath('data.providers.0.default_model', 'gemini-2.5-flash')
            ->assertJsonMissing(['api_key' => 'gemini-user-secret']);
    }

    public function test_models_can_be_detected_without_saving_the_key(): void
    {
        Http::fake([
            'https://api.openai.com/v1/models' => Http::response([
                'data' => [
                    ['id' => 'gpt-4o-mini'],
                    ['id' => 'text-embedding-3-small'],
                    ['id' => 'whisper-1'],
                ],
            ]),
        ]);

        $this->actingAs($this->user())
            ->postJson('/api/v1/ai-settings/detect-models', [
                'provider' => 'openai',
                'api_key' => 'sk-temporary',
            ])
            ->assertOk()
            ->assertJsonPath('data.provider', 'openai')
            ->assertJsonPath('data.models.0', 'gpt-4o-mini')
            ->assertJsonCount(1, 'data.models');

        $this->assertDatabaseCount('ai_provider_settings', 0);

        Http::assertSent(fn ($request): bool => $request->hasHeader('Authorization', 'Bearer sk-temporary'));
    }

    public function test_provider_models_are_merged_for_the_node_dropdown(): void
    {
        Http::fake([
            'https://api.openai.com/v1/models' => Http::response([
                'data' => [['id' => 'gpt-4o-mini']],
            ]),
            'https://openrouter.ai/api/v1/models' => Http::response([
                'data' => [['id' => 'google/gemini-2.5-flash']],
            ]),
        ]);

        $user = $this->user();

        $this->actingAs($user)
            ->putJson('/api/v1/ai-settings', [
                'provider' => 'openai',
                'api_key' => 'sk-openai',
            ])
            ->assertOk();
        $this->actingAs($user)
            ->putJson('/api/v1/ai-settings', [
                'provider' => 'openrouter',
                'api_key' => 'sk-openrouter',
            ])
            ->assertOk();

        $this->getJson('/api/v1/ai-settings')
            ->assertOk()
            ->assertJsonCount(2, 'data.models')
            ->assertJsonPath('data.models.0.provider', 'openai')
            ->assertJsonPath('data.models.1.provider', 'openrouter');
    }

    public function test_rejected_key_reports_provider_error_and_saves_nothing(): void
    {
        Http::fake([
            'https://api.openai.com/v1/models' => Http::response([
                'error' => ['message' => 'Incorrect API key provided'],
            ], 401),
        ]);

        $this->actingAs($this->user())
            ->putJson('/api/v1/ai-settings', [
                'provider' => 'openai',
                'api_key' => 'sk-invalid',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('api_key');

        $this->assertDatabaseCount('ai_provider_settings', 0);
    }

    public function test_delete_removes_only_the_selected_provider(): void
    {
        $user = $this->user();

        AiProviderSetting::create([
            'user_id' => $user->id,
            'provider' => 'gemini',
            'api_key' => 'gemini-key',
            'models' => ['gemini-2.5-flash'],
            'default_model' => 'gemini-2.5-flash',
        ]);
        AiProviderSetting::create([
            'user_id' => $user->id,
            'provider' => 'openai',
            'api_key' => 'openai-key',
            'models' => ['gpt-4o-mini'],
            'default_model' => 'gpt-4o-mini',
        ]);

        $this->actingAs($user)
            ->deleteJson('/api/v1/ai-settings/providers/openai')
            ->assertOk()
            ->assertJsonPath('data.providers.0.provider', 'gemini')
            ->assertJsonPath('data.providers.1.configured', false);

        $this->assertDatabaseMissing('ai_provider_settings', [
            'user_id' => $user->id,
            'provider' => 'openai',
        ]);
        $this->assertDatabaseHas('ai_provider_settings', [
            'user_id' => $user->id,
            'provider' => 'gemini',
        ]);
    }

    public function test_debounce_can_be_saved_without_selecting_a_provider(): void
    {
        $user = $this->user();

        $this->actingAs($user)
            ->putJson('/api/v1/ai-settings', ['debounce_ms' => 700])
            ->assertOk()
            ->assertJsonPath('data.debounce_ms', 700)
            ->assertJsonCount(0, 'data.models');

        $this->assertSame(700, $user->fresh()->ai_reply_debounce_ms);
        $this->assertDatabaseCount('ai_provider_settings', 0);
    }

    public function test_provider_settings_are_isolated_per_user(): void
    {
        $owner = $this->user();
        $other = $this->user('other@example.com');

        AiProviderSetting::create([
            'user_id' => $other->id,
            'provider' => 'openai',
            'api_key' => 'sk-other-user',
            'models' => ['gpt-4o-mini'],
            'default_model' => 'gpt-4o-mini',
        ]);

        $this->actingAs($owner)
            ->getJson('/api/v1/ai-settings')
            ->assertOk()
            ->assertJsonPath('data.models', [])
            ->assertJsonPath('data.providers.1.configured', false)
            ->assertJsonMissing(['api_key' => 'sk-other-user']);

        $this->deleteJson('/api/v1/ai-settings/providers/openai')
            ->assertOk();

        $this->assertDatabaseHas('ai_provider_settings', [
            'user_id' => $other->id,
            'provider' => 'openai',
        ]);
    }

    public function test_unknown_provider_cannot_delete_a_real_setting(): void
    {
        $user = $this->user();

        AiProviderSetting::create([
            'user_id' => $user->id,
            'provider' => 'gemini',
            'api_key' => 'gemini-key',
            'models' => ['gemini-2.5-flash'],
            'default_model' => 'gemini-2.5-flash',
        ]);

        $this->actingAs($user)
            ->deleteJson('/api/v1/ai-settings/providers/unknown')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('provider');

        $this->assertDatabaseHas('ai_provider_settings', [
            'user_id' => $user->id,
            'provider' => 'gemini',
        ]);
    }
}
