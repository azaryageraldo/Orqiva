<?php

namespace App\Services\Channels\Telegram;

use App\Models\ChatMessage;
use App\Models\ChatSession;
use App\Models\ContactChannel;
use App\Services\Channels\ChannelTransport;
use RuntimeException;

class TelegramTransport implements ChannelTransport
{
    private const MAX_LENGTH = 4000;

    public function __construct(
        private readonly TelegramClient $client
    ) {}

    public function type(): string
    {
        return 'telegram';
    }

    public function deliver(ChatSession $session, ChatMessage $message): ?string
    {
        $channel = $session->channel;

        if ($channel === null) {
            throw new RuntimeException('Channel percakapan tidak ditemukan.');
        }

        $token = data_get($channel->credentials, 'bot_token');

        if (! is_string($token) || trim($token) === '') {
            throw new RuntimeException('Token bot Telegram belum diatur.');
        }

        $chatId = ContactChannel::query()
            ->where('channel_id', $channel->id)
            ->where('contact_id', $session->contact_id)
            ->value('external_id');

        if (! is_string($chatId) || $chatId === '') {
            throw new RuntimeException('Identitas chat Telegram untuk kontak ini tidak ditemukan.');
        }

        $externalId = null;

        foreach ($this->chunks($message->content) as $chunk) {
            $result = $this->client->sendMessage($token, $chatId, $chunk);
            $messageId = $result['message_id'] ?? null;

            if ($messageId !== null) {
                $externalId = 'tg:'.$messageId;
            }
        }

        return $externalId;
    }

    /**
     * @return array<int, string>
     */
    private function chunks(string $text): array
    {
        $text = trim($text);

        if ($text === '') {
            return [];
        }

        $chunks = [];
        $length = mb_strlen($text);

        for ($offset = 0; $offset < $length; $offset += self::MAX_LENGTH) {
            $chunks[] = mb_substr($text, $offset, self::MAX_LENGTH);
        }

        return $chunks;
    }
}
