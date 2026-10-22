<?php

namespace App\Services\Channels\Telegram;

use Illuminate\Support\Facades\Http;

class TelegramClient
{
    public function __construct(
        private readonly string $baseUrl = 'https://api.telegram.org'
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function getMe(string $token): array
    {
        return $this->call($token, 'getMe');
    }

    public function deleteWebhook(string $token): void
    {
        $this->call($token, 'deleteWebhook', [
            'drop_pending_updates' => false,
        ]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getUpdates(string $token, ?int $offset, int $timeout): array
    {
        $payload = [
            'timeout' => max(0, $timeout),
            'allowed_updates' => ['message'],
        ];

        if ($offset !== null) {
            $payload['offset'] = $offset;
        }

        $result = $this->call($token, 'getUpdates', $payload);

        return array_values(array_filter($result, 'is_array'));
    }

    /**
     * @param  array<string, mixed>  $options
     * @return array<string, mixed>
     */
    public function sendMessage(
        string $token,
        string $chatId,
        string $text,
        array $options = []
    ): array {
        return $this->call($token, 'sendMessage', array_merge([
            'chat_id' => $chatId,
            'text' => $text,
            'disable_web_page_preview' => true,
        ], $options));
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<int|string, mixed>
     */
    private function call(string $token, string $method, array $payload = []): array
    {
        $response = Http::baseUrl(
            rtrim($this->baseUrl, '/').'/bot'.$token.'/'
        )
            ->acceptJson()
            ->timeout($method === 'getUpdates' ? 40 : 20)
            ->post($method, $payload);

        $json = $response->json();

        if (
            $response->failed()
            || ! is_array($json)
            || ($json['ok'] ?? false) !== true
        ) {
            $description = is_array($json)
                ? trim((string) ($json['description'] ?? ''))
                : '';

            throw new TelegramApiException(
                $description !== ''
                    ? $description
                    : 'Telegram API gagal (HTTP '.$response->status().').',
                $response->status(),
                is_array($json)
                    ? (int) data_get($json, 'parameters.retry_after', 0) ?: null
                    : null
            );
        }

        $result = $json['result'] ?? [];

        return is_array($result) ? $result : [];
    }
}
