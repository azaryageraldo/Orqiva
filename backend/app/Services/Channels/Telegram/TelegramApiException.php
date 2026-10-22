<?php

namespace App\Services\Channels\Telegram;

use RuntimeException;

class TelegramApiException extends RuntimeException
{
    public function __construct(
        string $message,
        private readonly int $status = 0,
        private readonly ?int $retryAfter = null
    ) {
        parent::__construct($message, $status);
    }

    public function status(): int
    {
        return $this->status;
    }

    public function retryAfter(): ?int
    {
        return $this->retryAfter;
    }
}
