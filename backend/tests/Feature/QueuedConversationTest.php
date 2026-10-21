<?php

namespace Tests\Feature;

use App\Jobs\ProcessChatMessage;
use App\Models\Channel;
use App\Models\ChatMessage;
use App\Models\ChatSession;
use App\Models\User;
use App\Models\Workflow;
use App\Models\WorkflowExecution;
use App\Services\Conversations\ConversationOrchestrator;
use App\Services\GeminiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Mockery\MockInterface;
use Tests\Concerns\BuildsWorkflowDefinitions;
use Tests\Concerns\ConfiguresAiProvider;
use Tests\TestCase;

class QueuedConversationTest extends TestCase
{
    use BuildsWorkflowDefinitions;
    use ConfiguresAiProvider;
    use RefreshDatabase;

    private function user(): User
    {
        $user = User::create([
            'name' => 'Owner',
            'email' => 'queued@example.com',
            'password' => 'password',
        ]);

        $this->configureAiProvider($user);

        return $user;
    }

    private function channel(User $user): Channel
    {
        $workflow = Workflow::create([
            'user_id' => $user->id,
            'name' => 'Queued workflow',
            'status' => 'active',
            'definition' => $this->singleAgentDefinition(),
        ]);

        return Channel::create([
            'user_id' => $user->id,
            'workflow_id' => $workflow->id,
            'type' => 'widget',
            'name' => 'Website Widget',
            'public_token' => 'queued-widget-token',
            'is_active' => true,
            'settings' => [
                'welcome_message' => 'Halo!',
                'placeholder' => 'Tulis pesan...',
            ],
        ]);
    }

    private function startWidgetSession(string $token = 'queued-widget-token'): array
    {
        return $this->postJson("/api/v1/public/channels/{$token}/sessions")
            ->assertCreated()
            ->json('data');
    }

    private function fakeGemini(string $text = 'Halo dari AI!'): void
    {
        $this->mock(GeminiService::class, function (MockInterface $mock) use ($text): void {
            $mock->shouldReceive('generate')->andReturn([
                'text' => $text,
                'finish_reason' => 'STOP',
                'usage' => [
                    'prompt_tokens' => 10,
                    'completion_tokens' => 5,
                    'total_tokens' => 15,
                ],
            ]);
        });
    }

    public function test_incoming_message_is_queued_without_blocking_the_request(): void
    {
        Queue::fake();

        $user = $this->user();
        $this->channel($user);
        $session = $this->startWidgetSession();

        $response = $this->postJson(
            "/api/v1/public/sessions/{$session['session_token']}/messages",
            ['message' => 'Saya mau beli PS5']
        )
            ->assertOk()
            ->assertJsonPath('data.processing', true)
            ->assertJsonPath('data.messages.0.role', 'customer');

        $this->assertCount(1, $response->json('data.messages'));
        $this->assertDatabaseCount('workflow_executions', 0);

        Queue::assertPushed(
            ProcessChatMessage::class,
            fn (ProcessChatMessage $job): bool => $job->messageId === ChatMessage::query()->value('id')
                && $job->chatSessionId === ChatSession::query()->value('id')
        );
    }

    public function test_queued_job_creates_reply_and_marks_message_processed(): void
    {
        Queue::fake();
        $this->fakeGemini('PS5 tersedia, kak.');

        $user = $this->user();
        $this->channel($user);
        $session = $this->startWidgetSession();

        $this->postJson(
            "/api/v1/public/sessions/{$session['session_token']}/messages",
            ['message' => 'Ada PS5?']
        )->assertOk();

        $message = ChatMessage::query()->where('role', 'customer')->firstOrFail();
        $job = new ProcessChatMessage($message->id, $message->chat_session_id);
        $job->handle(app(ConversationOrchestrator::class));

        $this->assertSame(
            'processed',
            data_get($message->refresh()->metadata, 'job_status')
        );
        $this->assertSame(1, ChatMessage::query()->where('role', 'assistant')->count());
        $this->assertSame(1, WorkflowExecution::query()->count());

        $this->getJson("/api/v1/public/sessions/{$session['session_token']}")
            ->assertOk()
            ->assertJsonPath('data.processing', false)
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.messages.1.role', 'assistant')
            ->assertJsonPath('data.messages.1.content', 'PS5 tersedia, kak.');
    }

    public function test_processing_the_same_message_twice_does_not_duplicate_replies(): void
    {
        Queue::fake();
        $this->fakeGemini('Satu balasan saja.');

        $user = $this->user();
        $this->channel($user);
        $session = $this->startWidgetSession();

        $this->postJson(
            "/api/v1/public/sessions/{$session['session_token']}/messages",
            ['message' => 'Halo']
        )->assertOk();

        $message = ChatMessage::query()->where('role', 'customer')->firstOrFail();
        $orchestrator = app(ConversationOrchestrator::class);

        $orchestrator->processMessage($message->id);
        $orchestrator->processMessage($message->id);

        $this->assertSame(1, ChatMessage::query()->where('role', 'assistant')->count());
        $this->assertSame(1, WorkflowExecution::query()->count());
    }

    public function test_failed_ai_turn_clears_processing_and_exposes_friendly_notice(): void
    {
        Queue::fake();

        $this->mock(GeminiService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('generate')->andThrow(
                new \RuntimeException('Provider sedang down.')
            );
        });

        $user = $this->user();
        $this->channel($user);
        $session = $this->startWidgetSession();

        $this->postJson(
            "/api/v1/public/sessions/{$session['session_token']}/messages",
            ['message' => 'Halo']
        )->assertOk();

        $message = ChatMessage::query()->where('role', 'customer')->firstOrFail();
        app(ConversationOrchestrator::class)->processMessage($message->id);

        $this->assertSame(
            'failed',
            data_get($message->refresh()->metadata, 'job_status')
        );

        $this->getJson("/api/v1/public/sessions/{$session['session_token']}")
            ->assertOk()
            ->assertJsonPath('data.processing', false)
            ->assertJsonPath('data.notice', 'Maaf, sedang ada kendala teknis. Tim kami akan segera memeriksa.');
    }

    public function test_stale_processing_flag_is_not_reported_forever(): void
    {
        Queue::fake();

        $user = $this->user();
        $this->channel($user);
        $session = $this->startWidgetSession();

        $this->postJson(
            "/api/v1/public/sessions/{$session['session_token']}/messages",
            ['message' => 'Halo']
        )->assertOk();

        ChatMessage::query()
            ->where('role', 'customer')
            ->update(['updated_at' => now()->subMinutes(10)]);

        $this->getJson("/api/v1/public/sessions/{$session['session_token']}")
            ->assertOk()
            ->assertJsonPath('data.processing', false);
    }
}
