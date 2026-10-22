<?php

namespace App\Services\Channels;

use App\Models\Channel;
use App\Models\ChatSession;
use App\Services\Conversations\ConversationOrchestrator;
use Illuminate\Validation\ValidationException;

/**
 * Entry point for messages that arrive from an external channel
 * (webhook or polling). The widget keeps using PublicChatController.
 */
class InboundMessageHandler
{
    public function __construct(
        private readonly ConversationOrchestrator $orchestrator
    ) {}

    public function handle(
        Channel $channel,
        string $externalContactId,
        string $text,
        ?string $externalMessageId = null,
        ?string $contactName = null
    ): ChatSession {
        if (! $channel->is_active) {
            throw ValidationException::withMessages([
                'channel' => 'Channel sedang tidak aktif.',
            ]);
        }

        $text = trim($text);

        if ($text === '') {
            throw ValidationException::withMessages([
                'message' => 'Pesan tidak boleh kosong.',
            ]);
        }

        $contact = $this->orchestrator->contactForExternalId(
            $channel,
            $externalContactId,
            $contactName
        );

        $session = $this->orchestrator->ensureSession($channel, $contact);

        $this->orchestrator->enqueueMessage(
            $session,
            $text,
            null,
            $externalMessageId
        );

        return $session->fresh();
    }
}
