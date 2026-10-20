<?php

namespace App\Services\AI;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class AiProviderCatalog
{
    public const PROVIDERS = [
        'gemini' => 'Google Gemini',
        'openai' => 'OpenAI',
        'openrouter' => 'OpenRouter',
    ];

    public const DEFAULT_PROVIDER = 'gemini';

    public function normalizeProvider(?string $provider): string
    {
        $provider = is_string($provider) ? strtolower(trim($provider)) : '';

        return array_key_exists($provider, self::PROVIDERS)
            ? $provider
            : self::DEFAULT_PROVIDER;
    }

    public function label(string $provider): string
    {
        return self::PROVIDERS[$provider] ?? $provider;
    }

    /**
     * @return array<int, string>
     */
    public function detectModels(string $provider, string $apiKey): array
    {
        $provider = $this->normalizeProvider($provider);

        if (trim($apiKey) === '') {
            throw new RuntimeException('API key belum diisi.');
        }

        try {
            $models = match ($provider) {
                'openai' => $this->openAiModels($apiKey),
                'openrouter' => $this->openRouterModels($apiKey),
                default => $this->geminiModels($apiKey),
            };
        } catch (ConnectionException) {
            throw new RuntimeException(
                'Tidak dapat menghubungi '.$this->label($provider).'. Periksa koneksi lalu coba lagi.'
            );
        }

        if ($models === []) {
            throw new RuntimeException(
                'Tidak ada model chat yang tersedia untuk API key '.$this->label($provider).'.'
            );
        }

        return $models;
    }

    /**
     * @return array<int, string>
     */
    private function geminiModels(string $apiKey): array
    {
        $response = Http::timeout(20)
            ->acceptJson()
            ->get(
                'https://generativelanguage.googleapis.com/v1beta/models',
                ['key' => $apiKey, 'pageSize' => 1000]
            );

        if ($response->failed()) {
            throw new RuntimeException(
                'Google Gemini menolak API key (HTTP '.$response->status().'): '
                .(string) $response->json('error.message', 'Unknown error')
            );
        }

        $models = collect($response->json('models', []))
            ->filter(function (mixed $model): bool {
                if (! is_array($model)) {
                    return false;
                }

                $methods = $model['supportedGenerationMethods'] ?? [];

                return is_array($methods)
                    && in_array('generateContent', $methods, true);
            })
            ->map(function (array $model): ?string {
                $name = $model['name'] ?? null;

                if (! is_string($name) || trim($name) === '') {
                    return null;
                }

                $name = str_starts_with($name, 'models/')
                    ? substr($name, strlen('models/'))
                    : $name;
                $lower = strtolower($name);

                if (
                    ! str_starts_with($lower, 'gemini-')
                    && ! str_starts_with($lower, 'gemma-')
                ) {
                    return null;
                }

                if (preg_match('/image|tts|embedding|transcribe|computer-use|robotics|lyria|nano-banana|antigravity|deep-research/', $lower) === 1) {
                    return null;
                }

                return $name;
            })
            ->filter()
            ->sort()
            ->values()
            ->all();

        return array_values(array_unique($models));
    }

    /**
     * @return array<int, string>
     */
    private function openAiModels(string $apiKey): array
    {
        $response = Http::timeout(20)
            ->acceptJson()
            ->withToken($apiKey)
            ->get('https://api.openai.com/v1/models');

        if ($response->failed()) {
            throw new RuntimeException(
                'OpenAI menolak API key (HTTP '.$response->status().'): '
                .(string) $response->json('error.message', 'Unknown error')
            );
        }

        $models = collect($response->json('data', []))
            ->map(fn (mixed $model): ?string => is_array($model)
                && is_string($model['id'] ?? null)
                ? $model['id']
                : null)
            ->filter(fn (?string $model): bool => is_string($model)
                && preg_match('/^(gpt-|o[1-9]|chatgpt)/i', $model) === 1
                && preg_match('/embedding|tts|whisper|dall-e|moderation|transcribe|realtime|audio|image|sora|search/i', $model) !== 1)
            ->sort()
            ->values()
            ->all();

        return array_values(array_unique($models));
    }

    /**
     * @return array<int, string>
     */
    private function openRouterModels(string $apiKey): array
    {
        $response = Http::timeout(20)
            ->acceptJson()
            ->withToken($apiKey)
            ->get('https://openrouter.ai/api/v1/models');

        if ($response->failed()) {
            throw new RuntimeException(
                'OpenRouter menolak API key (HTTP '.$response->status().'): '
                .(string) $response->json('error.message', 'Unknown error')
            );
        }

        $models = collect($response->json('data', []))
            ->map(fn (mixed $model): ?string => is_array($model)
                && is_string($model['id'] ?? null)
                ? $model['id']
                : null)
            ->filter(fn (?string $model): bool => is_string($model)
                && preg_match('/embed|tts|whisper|moderation|rerank|audio|image|sora|transcribe/i', $model) !== 1)
            ->sort()
            ->values()
            ->all();

        return array_values(array_unique($models));
    }
}
