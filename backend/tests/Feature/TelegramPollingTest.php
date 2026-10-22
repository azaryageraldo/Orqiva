<?php

namespace Tests\Feature;

use App\Jobs\ProcessChatMessage;
use App\Models\Channel;
use App\Models\ChatMessage;
use App\Models\ChatSession;
use App\Models\Contact;
use App\Models\ContactChannel;
use App\Models\User;
use App\Models\Workflow;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\Concerns\BuildsWorkflowDefinitions;
use Tests\TestCase;

class TelegramPollingTest extends TestCase
{
    use BuildsWorkflowDefinitions;
    use RefreshDatabase;

    private function channel(bool $active = true): Channel
    {
        $user = User::create([
            'name' => 'Owner',
            'email' => 'telegram-poll@example.com',
            'password' => 'password',
        ]);

        $workflow = Workflow::create([
            'user_id' => $user->id,
            'name' => 'Support',
            'status' => 'active',
            'definition' => $this->singleAgentDefinition(),
        ]);

        return Channel::create([
            'user_id' => $user->id,
            'workflow_id' => $workflow->id,
            'type' => 'telegram',
            'name' => 'Telegram',
            'public_token' => 'telegram-token',
            'credentials' => ['bot_token' => '123:abc'],
            'is_active' => $active,
        ]);
    }

    /**
     * @param  array<int, array<string, mixed>>  $updates
     */
    private function fakeUpdates(array $updates): void
    {
        Http::fake(function ($request) use ($updates) {
            if (str_contains($request->url(), '/getUpdates')) {
                return Http::response(['ok' => true, 'result' => $updates]);
            }

            return Http::response(['ok' => true, 'result' => true]);
        });
    }

    /**
     * @return array<string, mixed>
     */
    private function update(int $updateId = 10, string $text = 'Halo', bool $fromBot = false): array
    {
        return [
            'update_id' => $updateId,
            'message' => [
                'message_id' => $updateId,
                'chat' => ['id' => 555, 'type' => 'private'],
                'from' => [
                    'id' => 555,
                    'is_bot' => $fromBot,
                    'first_name' => 'Budi',
                    'last_name' => 'Santoso',
                ],
                'text' => $text,
            ],
        ];
    }

    public function test_it_stores_incoming_messages_and_advances_the_offset(): void
    {
        Queue::fake();

        $channel = $this->channel();
        $this->fakeUpdates([$this->update(10, 'Saya mau tanya stok')]);

        $this->artisan('channels:telegram-poll', ['--once' => true])
            ->assertSuccessful();

        $this->assertSame(10, $channel->fresh()->polling_offset);

        $contact = Contact::query()->firstOrFail();
        $this->assertSame('Budi Santoso', $contact->name);
        $this->assertSame(1, ContactChannel::query()->count());
        $this->assertSame('555', ContactChannel::query()->value('external_id'));
        $this->assertSame(1, ChatSession::query()->count());

        $message = ChatMessage::query()->where('role', 'customer')->firstOrFail();
        $this->assertSame('Saya mau tanya stok', $message->content);
        $this->assertSame('tg:update:10', $message->external_message_id);

        Queue::assertPushed(ProcessChatMessage::class, 1);

        Http::assertSent(fn ($request) => str_contains($request->url(), '/getUpdates')
            && ! array_key_exists('offset', $request->data()));
    }

    public function test_next_poll_uses_the_stored_offset(): void
    {
        Queue::fake();

        $channel = $this->channel();
        $channel->update(['polling_offset' => 41]);

        $this->fakeUpdates([]);

        $this->artisan('channels:telegram-poll', ['--once' => true])
            ->assertSuccessful();

        Http::assertSent(fn ($request) => str_contains($request->url(), '/getUpdates')
            && ($request->data()['offset'] ?? null) === 42);
    }

    public function test_duplicate_updates_are_idempotent(): void
    {
        Queue::fake();

        $this->channel();
        $this->fakeUpdates([$this->update(77, 'Halo')]);

        $this->artisan('channels:telegram-poll', ['--once' => true])
            ->assertSuccessful();
        $this->artisan('channels:telegram-poll', ['--once' => true])
            ->assertSuccessful();

        $this->assertSame(1, ChatMessage::query()->where('role', 'customer')->count());
        Queue::assertPushed(ProcessChatMessage::class, 1);
    }

    public function test_bot_messages_are_ignored_but_still_acknowledged(): void
    {
        Queue::fake();

        $channel = $this->channel();
        $this->fakeUpdates([$this->update(12, 'Pesan bot', fromBot: true)]);

        $this->artisan('channels:telegram-poll', ['--once' => true])
            ->assertSuccessful();

        $this->assertSame(0, ChatMessage::query()->count());
        $this->assertSame(12, $channel->fresh()->polling_offset);
        Queue::assertNothingPushed();
    }

    public function test_inactive_channels_are_not_polled(): void
    {
        Http::fake();

        $this->channel(active: false);

        $this->artisan('channels:telegram-poll', ['--once' => true])
            ->assertSuccessful();

        Http::assertNothingSent();
    }
}
