<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class GeminiService
{
    /**
     * @return array{text: string, finish_reason: string, usage: array{prompt_tokens: int, completion_tokens: int, total_tokens: int}}
     */
    public function generate(
        string $systemMessage,
        string $userMessage,
        float $temperature = 0.7,
        ?string $modelOverride = null,
        ?array $responseSchema = null,
        ?int $maxOutputTokens = null
    ): array {
        $apiKey = config('services.gemini.api_key');
        $model = $modelOverride ?: config('services.gemini.model', 'gemini-2.5-flash');
        $timeout = (int) config('services.gemini.timeout', 30);

        if (! is_string($apiKey) || trim($apiKey) === '') {
            throw new RuntimeException(
                'GEMINI_API_KEY belum dikonfigurasi.'
            );
        }

        $generationConfig = [
            'temperature' => max(
                0,
                min(1, $temperature)
            ),
        ];

        if ($maxOutputTokens !== null && $maxOutputTokens > 0) {
            $generationConfig['maxOutputTokens'] = $maxOutputTokens;
        }

        if ($responseSchema !== null) {
            $generationConfig['responseMimeType'] = 'application/json';
            $generationConfig['responseSchema'] = $responseSchema;

            if (str_starts_with($model, 'gemini-2.5')) {
                $generationConfig['thinkingConfig'] = [
                    'thinkingBudget' => 0,
                ];
            }
        }

        $response = Http::timeout($timeout)
            ->retry(
                3,
                500,
                static function (\Throwable $exception): bool {
                    if ($exception instanceof ConnectionException) {
                        return true;
                    }

                    return $exception instanceof RequestException
                        && in_array(
                            $exception->response->status(),
                            [429, 500, 502, 503, 504],
                            true
                        );
                },
                false
            )
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
                    'generationConfig' => $generationConfig,
                ]
            );

        if ($response->failed()) {
            throw new RuntimeException(
                'Gemini API gagal (HTTP '
                .$response->status()
                .'): '
                .(string) $response->json('error.message', 'Unknown error')
            );
        }

        $text = $response->json('candidates.0.content.parts.0.text');
        $finishReason = (string) $response->json(
            'candidates.0.finishReason',
            'STOP'
        );

        if (! is_string($text) || trim($text) === '') {
            throw new RuntimeException(
                'Gemini tidak menghasilkan teks jawaban.'
            );
        }

        return [
            'text' => trim($text),
            'finish_reason' => $finishReason,
            'usage' => [
                'prompt_tokens' => (int) $response->json(
                    'usageMetadata.promptTokenCount',
                    0
                ),
                'completion_tokens' => (int) $response->json(
                    'usageMetadata.candidatesTokenCount',
                    0
                ),
                'total_tokens' => (int) $response->json(
                    'usageMetadata.totalTokenCount',
                    0
                ),
            ],
        ];
    }
}
