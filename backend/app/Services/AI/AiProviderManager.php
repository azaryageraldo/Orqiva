<?php

namespace App\Services\AI;

use App\Models\AiProviderSetting;
use App\Services\GeminiService;
use RuntimeException;

class AiProviderManager
{
    public function __construct(
        private readonly GeminiService $gemini,
        private readonly OpenAiCompatibleService $openAi,
        private readonly AiProviderCatalog $catalog
    ) {}

    /**
     * @return array{text: string, finish_reason: string, usage: array{prompt_tokens: int, completion_tokens: int, total_tokens: int}}
     */
    public function generate(
        int $userId,
        string $provider,
        string $model,
        string $systemMessage,
        string $userMessage,
        float $temperature = 0.7,
        ?array $responseSchema = null,
        ?int $maxOutputTokens = null
    ): array {
        $provider = $this->catalog->normalizeProvider($provider);
        $apiKey = $this->apiKey($userId, $provider);

        if ($provider === 'gemini') {
            return $this->gemini->generate(
                $systemMessage,
                $userMessage,
                $temperature,
                $model,
                $responseSchema,
                $maxOutputTokens,
                $apiKey
            );
        }

        $baseUrl = (string) config(
            'services.'.$provider.'.base_url',
            $provider === 'openrouter'
                ? 'https://openrouter.ai/api/v1'
                : 'https://api.openai.com/v1'
        );

        return $this->openAi->generate(
            $baseUrl,
            $apiKey,
            $model,
            $systemMessage,
            $userMessage,
            $temperature,
            $responseSchema,
            $maxOutputTokens,
            $provider === 'openai' && $responseSchema !== null
        );
    }

    public function resolveModel(
        int $userId,
        string $provider,
        ?string $model = null
    ): string {
        if (is_string($model) && trim($model) !== '') {
            return trim($model);
        }

        $provider = $this->catalog->normalizeProvider($provider);
        $setting = $this->setting($userId, $provider);

        if (is_string($setting?->default_model) && trim($setting->default_model) !== '') {
            return trim($setting->default_model);
        }

        if ($provider === 'gemini') {
            return (string) config('services.gemini.model', 'gemini-2.5-flash');
        }

        $models = $setting?->models ?? [];

        if (is_array($models) && is_string($models[0] ?? null) && $models[0] !== '') {
            return $models[0];
        }

        throw new RuntimeException(
            'Model '.$this->catalog->label($provider).' belum dipilih. Atur model di menu API Keys.'
        );
    }

    public function apiKey(int $userId, string $provider): string
    {
        $provider = $this->catalog->normalizeProvider($provider);
        $apiKey = $this->setting($userId, $provider)?->api_key;

        if (! is_string($apiKey) || trim($apiKey) === '') {
            throw new RuntimeException(
                'API key '.$this->catalog->label($provider)
                .' belum diatur. Buka menu API Keys dan simpan API key terlebih dahulu.'
            );
        }

        return trim($apiKey);
    }

    private function setting(int $userId, string $provider): ?AiProviderSetting
    {
        return AiProviderSetting::query()
            ->where('user_id', $userId)
            ->where('provider', $provider)
            ->first();
    }
}
