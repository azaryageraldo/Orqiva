<?php

namespace App\Services\Channels;

use App\Models\ChatMessage;
use App\Models\ChatSession;

interface ChannelTransport
{
    public function type(): string;

    /**
     * Deliver a stored message to the external channel.
     *
     * @return string|null External message identifier when the channel assigns one.
     */
    public function deliver(ChatSession $session, ChatMessage $message): ?string;
}
