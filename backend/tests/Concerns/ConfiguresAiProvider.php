<?php

namespace Tests\Concerns;

use App\Models\AiProviderSetting;
use App\Models\User;

trait ConfiguresAiProvider
{
    protected function configureAiProvider(
        User $user,
        string $provider = 'gemini'
    ): AiProviderSetting {
        return AiProviderSetting::create([
            'user_id' => $user->id,
            'provider' => $provider,
            'api_key' => 'test-'.$provider.'-key',
            'models' => ['gemini-2.5-flash'],
            'default_model' => 'gemini-2.5-flash',
            'last_checked_at' => now(),
        ]);
    }
}
