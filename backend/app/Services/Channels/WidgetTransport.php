<?php

namespace App\Services\Channels;

use App\Models\ChatMessage;
use App\Models\ChatSession;

/**
 * Widget visitors read messages by polling the public session endpoint,
 * so the database row is already the delivery.
 */
class WidgetTransport implements ChannelTransport
{
    public function type(): string
    {
        return 'widget';
    }

    public function deliver(ChatSession $session, ChatMessage $message): ?string
    {
        return null;
    }
}
