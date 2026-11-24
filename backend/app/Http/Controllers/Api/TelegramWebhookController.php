<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Channel;
use App\Services\Channels\InboundMessageHandler;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class TelegramWebhookController extends Controller
{
    public function __construct(
        private readonly InboundMessageHandler $handler
    ) {}

    public function handle(Request $request, string $token): JsonResponse
    {
        $channel = Channel::query()
            ->where('public_token', $token)
            ->where('type', Channel::TYPE_TELEGRAM)
            ->first();

        if ($channel === null) {
            return response()->json(['ok' => false, 'error' => 'Channel not found'], 404);
        }

        if (! $channel->is_active) {
            return response()->json(['ok' => true, 'status' => 'inactive']);
        }

        $update = $request->all();
        $message = $update['message'] ?? null;

        if (! is_array($message)) {
            return response()->json(['ok' => true]);
        }

        $text = $message['text'] ?? null;

        if (! is_string($text) || trim($text) === '') {
            return response()->json(['ok' => true]);
        }

        $from = is_array($message['from'] ?? null) ? $message['from'] : [];
        $chat = is_array($message['chat'] ?? null) ? $message['chat'] : [];

        if (($from['is_bot'] ?? false) === true) {
            return response()->json(['ok' => true]);
        }

        $chatId = $chat['id'] ?? null;

        if ($chatId === null) {
            return response()->json(['ok' => true]);
        }

        $name = trim(
            (string) ($from['first_name'] ?? '').' '.($from['last_name'] ?? '')
        );

        if ($name === '') {
            $name = trim((string) ($chat['title'] ?? ''));
        }

        $updateId = $update['update_id'] ?? null;
        $externalMessageId = $updateId !== null ? 'tg:update:'.$updateId : null;

        try {
            $this->handler->handle(
                $channel,
                (string) $chatId,
                $text,
                $externalMessageId,
                $name !== '' ? $name : null
            );
        } catch (Throwable $exception) {
            Log::warning('Telegram webhook processing error', [
                'channel_id' => $channel->id,
                'update_id' => $updateId,
                'error' => $exception->getMessage(),
            ]);
        }

        return response()->json(['ok' => true]);
    }
}

