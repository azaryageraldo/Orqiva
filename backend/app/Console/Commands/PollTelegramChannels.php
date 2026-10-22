<?php

namespace App\Console\Commands;

use App\Models\Channel;
use App\Services\Channels\InboundMessageHandler;
use App\Services\Channels\Telegram\TelegramClient;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class PollTelegramChannels extends Command
{
    protected $signature = 'channels:telegram-poll
                            {--once : Ambil satu batch lalu keluar}';

    protected $description = 'Ambil pesan Telegram lewat long polling dan teruskan ke workflow';

    public function handle(
        TelegramClient $client,
        InboundMessageHandler $handler
    ): int {
        $this->info('Telegram poller berjalan. Tekan Ctrl+C untuk berhenti.');

        do {
            $channels = Channel::query()
                ->where('type', Channel::TYPE_TELEGRAM)
                ->where('is_active', true)
                ->whereNotNull('credentials')
                ->orderBy('id')
                ->get();

            if ($channels->isEmpty()) {
                if ($this->option('once')) {
                    return self::SUCCESS;
                }

                sleep(5);

                continue;
            }

            $timeout = $this->option('once')
                ? 0
                : ($channels->count() === 1 ? 25 : 1);

            foreach ($channels as $channel) {
                $this->pollChannel($channel, $client, $handler, $timeout);
            }

            if (! $this->option('once') && $channels->count() > 1) {
                sleep(1);
            }
        } while (! $this->option('once'));

        return self::SUCCESS;
    }

    private function pollChannel(
        Channel $channel,
        TelegramClient $client,
        InboundMessageHandler $handler,
        int $timeout
    ): void {
        $token = data_get($channel->credentials, 'bot_token');

        if (! is_string($token) || trim($token) === '') {
            return;
        }

        try {
            $offset = $channel->polling_offset === null
                ? null
                : (int) $channel->polling_offset + 1;

            $updates = $client->getUpdates($token, $offset, $timeout);

            foreach ($updates as $update) {
                if (! is_array($update)) {
                    continue;
                }

                $this->processUpdate($channel, $update, $handler);
                $this->advanceOffset($channel, (int) ($update['update_id'] ?? 0));
            }

            if ($channel->last_error !== null) {
                $channel->forceFill(['last_error' => null])->save();
            }
        } catch (Throwable $exception) {
            Log::warning('Telegram polling failed', [
                'channel_id' => $channel->id,
                'error' => $exception->getMessage(),
            ]);

            $channel->forceFill([
                'last_error' => Str::limit($exception->getMessage(), 500, ''),
            ])->save();

            if (! $this->option('once')) {
                sleep(5);
            }
        }
    }

    /**
     * @param  array<string, mixed>  $update
     */
    private function processUpdate(
        Channel $channel,
        array $update,
        InboundMessageHandler $handler
    ): void {
        $message = $update['message'] ?? null;

        if (! is_array($message)) {
            return;
        }

        $text = $message['text'] ?? null;

        if (! is_string($text) || trim($text) === '') {
            return;
        }

        $from = is_array($message['from'] ?? null) ? $message['from'] : [];
        $chat = is_array($message['chat'] ?? null) ? $message['chat'] : [];

        if (($from['is_bot'] ?? false) === true) {
            return;
        }

        $chatId = $chat['id'] ?? null;

        if ($chatId === null) {
            return;
        }

        $name = trim(
            (string) ($from['first_name'] ?? '').' '.($from['last_name'] ?? '')
        );

        if ($name === '') {
            $name = trim((string) ($chat['title'] ?? ''));
        }

        $updateId = $update['update_id'] ?? null;

        if ($updateId === null) {
            return;
        }

        try {
            $handler->handle(
                $channel,
                (string) $chatId,
                $text,
                'tg:update:'.$updateId,
                $name !== '' ? $name : null
            );
        } catch (Throwable $exception) {
            Log::warning('Telegram update failed', [
                'channel_id' => $channel->id,
                'update_id' => $updateId,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    private function advanceOffset(Channel $channel, int $updateId): void
    {
        if ($updateId <= 0) {
            return;
        }

        if ($updateId <= (int) $channel->polling_offset) {
            return;
        }

        $channel->forceFill(['polling_offset' => $updateId])->save();
    }
}
