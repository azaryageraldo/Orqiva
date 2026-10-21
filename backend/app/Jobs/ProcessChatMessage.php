<?php

namespace App\Jobs;

use App\Services\Conversations\ConversationOrchestrator;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\Middleware\WithoutOverlapping;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class ProcessChatMessage implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public int $timeout = 240;

    public int $backoff = 10;

    public function __construct(
        public readonly int $messageId,
        public readonly int $chatSessionId
    ) {}

    /**
     * @return array<int, object>
     */
    public function middleware(): array
    {
        return [
            (new WithoutOverlapping('chat-session-'.$this->chatSessionId))
                ->releaseAfter(2)
                ->expireAfter(300),
        ];
    }

    public function handle(ConversationOrchestrator $orchestrator): void
    {
        $orchestrator->processMessage($this->messageId);
    }

    public function failed(Throwable $exception): void
    {
        app(ConversationOrchestrator::class)->failMessage(
            $this->messageId,
            $exception
        );

        Log::error('Chat message job failed', [
            'message_id' => $this->messageId,
            'chat_session_id' => $this->chatSessionId,
            'error' => $exception->getMessage(),
        ]);
    }
}
