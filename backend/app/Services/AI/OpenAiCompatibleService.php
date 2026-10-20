<?php

namespace App\Services\AI;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class OpenAiCompatibleService
{
    /**
     * @return array{text: string, finish_reason: string, usage: array{prompt_tokens: int, completion_tokens: int, total_tokens: int}}
     */
    public function generate(
        string $baseUrl,
        string $apiKey,
        string $model,
        string $systemMessage,
        string $userMessage,
        float $temperature = 0.7,
        ?array $responseSchema = null,
        ?int $maxOutputTokens = null,
        bool $structuredOutput = false
    ): array {
        $payload = [
            'model' => $model,
            'messages' => [
                ['role' => 'system', 'content' => $systemMessage],
                ['role' => 'user', 'content' => $userMessage],
            ],
            'temperature' => max(0, min(1, $temperature)),
        ];

        if ($structuredOutput) {
            $payload['response_format'] = ['type' => 'json_object'];
        }

        if ($maxOutputTokens !== null && $maxOutputTokens > 0 && ! $structuredOutput) {
            $payload['max_tokens'] = $maxOutputTokens;
        }

        $response = Http::timeout(60)
            ->acceptJson()
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
            ->withToken($apiKey)
            ->post(rtrim($baseUrl, '/').'/chat/completions', $payload);

        if ($response->failed()) {
            throw new RuntimeException(
                'Provider AI gagal (HTTP '
                .$response->status()
                .'): '
                .(string) $response->json('error.message', 'Unknown error')
            );
        }

        $text = $response->json('choices.0.message.content');
        $finishReason = (string) $response->json(
            'choices.0.finish_reason',
            'STOP'
        );

        if (! is_string($text) || trim($text) === '') {
            throw new RuntimeException(
                'Provider AI tidak menghasilkan teks jawaban.'
            );
        }

        if ($responseSchema !== null && $finishReason === 'length') {
            throw new RuntimeException(
                'Jawaban AI terpotong karena batas token. Ringkas system prompt atau tambah kapasitas output.'
            );
        }

        return [
            'text' => trim($text),
            'finish_reason' => $finishReason === 'length' ? 'MAX_TOKENS' : $finishReason,
            'usage' => [
                'prompt_tokens' => (int) $response->json('usage.prompt_tokens', 0),
                'completion_tokens' => (int) $response->json('usage.completion_tokens', 0),
                'total_tokens' => (int) $response->json('usage.total_tokens', 0),
            ],
        ];
    }
}
