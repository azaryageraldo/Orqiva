<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class GeminiService
{
    public function generate(
        string $systemMessage,
        string $userMessage,
        float $temperature = 0.7,
        ?string $modelOverride = null
    ): string {
        $apiKey = config('services.gemini.api_key');
        $model = $modelOverride ?: config('services.gemini.model', 'gemini-2.5-flash');
        $timeout = (int) config('services.gemini.timeout', 30);

        if (! is_string($apiKey) || trim($apiKey) === '') {
            throw new RuntimeException(
                'GEMINI_API_KEY belum dikonfigurasi.'
            );
        }

        $response = Http::timeout($timeout)
            ->withHeaders([
                'x-goog-api-key' => $apiKey,
            ])
            ->post(
                "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent",
                [
                    'systemInstruction' => [
                        'parts' => [
                            ['text' => $systemMessage],
                        ],
                    ],
                    'contents' => [
                        [
                            'role' => 'user',
                            'parts' => [
                                ['text' => $userMessage],
                            ],
                        ],
                    ],
                    'generationConfig' => [
                        'temperature' => max(
                            0,
                            min(1, $temperature)
                        ),
                    ],
                ]
            );

        if ($response->failed()) {
            throw new RuntimeException(
                'Gemini API gagal (HTTP '
                . $response->status()
                . '): '
                . (string) $response->json('error.message', 'Unknown error')
            );
        }

        $text = $response->json('candidates.0.content.parts.0.text');

        if (! is_string($text) || trim($text) === '') {
            throw new RuntimeException(
                'Gemini tidak menghasilkan teks jawaban.'
            );
        }

        return trim($text);
    }
}
