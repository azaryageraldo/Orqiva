<?php

namespace App\Services\Channels;

use App\Models\ChatMessage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class MessageDelivery
{
    public function __construct(
        private readonly ChannelTransportManager $transports
    ) {}

    public function send(ChatMessage $message): bool
    {
        $message->loadMissing('session.channel');

        $session = $message->session;

        if ($session === null || $session->channel === null) {
            $this->markFailed($message, 'Channel percakapan tidak ditemukan.');

            return false;
        }

        try {
            $externalId = $this->transports
                ->for($session->channel)
                ->deliver($session, $message);

            $message->forceFill([
                'delivery_status' => ChatMessage::DELIVERY_SENT,
                'external_message_id' => $externalId ?? $message->external_message_id,
                'delivery_error' => null,
            ])->save();

            return true;
        } catch (Throwable $exception) {
            $this->markFailed($message, $exception->getMessage());

            Log::warning('Chat message delivery failed', [
                'message_id' => $message->id,
                'chat_session_id' => $session->id,
                'channel_type' => $session->channel->type,
                'error' => $exception->getMessage(),
            ]);

            return false;
        }
    }

    private function markFailed(ChatMessage $message, string $error): void
    {
        $message->forceFill([
            'delivery_status' => ChatMessage::DELIVERY_FAILED,
            'delivery_error' => Str::limit($error, 500, ''),
        ])->save();
    }
}
