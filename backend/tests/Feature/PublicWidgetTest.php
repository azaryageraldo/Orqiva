<?php

namespace Tests\Feature;

use App\Models\Channel;
use App\Models\ChatMessage;
use App\Models\ChatSession;
use App\Models\Contact;
use App\Models\User;
use App\Models\Workflow;
use App\Models\WorkflowExecution;
use App\Services\GeminiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery\MockInterface;
use Tests\Concerns\BuildsWorkflowDefinitions;
use Tests\Concerns\ConfiguresAiProvider;
use Tests\TestCase;

class PublicWidgetTest extends TestCase
{
    use BuildsWorkflowDefinitions;
    use ConfiguresAiProvider;
    use RefreshDatabase;

    private function user(string $email = 'owner@example.com'): User
    {
        $user = User::create([
            'name' => 'Owner',
            'email' => $email,
            'password' => 'password',
        ]);

        $this->configureAiProvider($user);

        return $user;
    }

    private function workflow(User $user, array $definition = []): Workflow
    {
        return Workflow::create([
            'user_id' => $user->id,
            'name' => 'Support workflow',
            'status' => 'active',
            'definition' => $definition ?: $this->singleAgentDefinition(),
        ]);
    }

    private function channel(User $user, Workflow $workflow, string $token = 'widget-token'): Channel
    {
        return Channel::create([
            'user_id' => $user->id,
            'workflow_id' => $workflow->id,
            'type' => 'widget',
            'name' => 'Website Widget',
            'public_token' => $token,
            'is_active' => true,
            'settings' => [
                'welcome_message' => 'Halo!',
                'placeholder' => 'Tulis pesan...',
            ],
        ]);
    }

    private function fakeGemini(string $text = 'Halo, ada yang bisa dibantu?'): void
    {
        $this->mock(GeminiService::class, function (MockInterface $mock) use ($text): void {
            $mock->shouldReceive('generate')->andReturn([
                'text' => $text,
                'usage' => [
                    'prompt_tokens' => 10,
                    'completion_tokens' => 5,
                    'total_tokens' => 15,
                ],
            ]);
        });
    }

    private function startWidgetSession(string $token, ?string $contactId = null): array
    {
        $payload = $contactId === null ? [] : ['contact_id' => $contactId];

        return $this->postJson("/api/v1/public/channels/{$token}/sessions", $payload)
            ->assertCreated()
            ->json('data');
    }

    public function test_public_widget_updates_contact_name_from_ai_output(): void
    {
        $user = $this->user();
        $workflow = $this->workflow($user, [
            'nodes' => [
                $this->triggerNode(),
                $this->aiNode('ai-1', 'Capture name', [
                    ['name' => 'nama', 'type' => 'string', 'description' => 'Nama pelanggan'],
                ]),
                $this->sendNode('send-1', 'Halo {{nama}}'),
            ],
            'edges' => [
                ['id' => 'e1', 'source' => 'trigger-1', 'target' => 'ai-1'],
                ['id' => 'e2', 'source' => 'ai-1', 'target' => 'send-1'],
            ],
        ]);
        $this->channel($user, $workflow);

        $this->mock(GeminiService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('generate')->andReturn([
                'text' => json_encode(['nama' => 'Budi']),
                'usage' => [
                    'prompt_tokens' => 10,
                    'completion_tokens' => 5,
                    'total_tokens' => 15,
                ],
            ]);
        });

        $started = $this->startWidgetSession('widget-token');

        $this->postJson("/api/v1/public/sessions/{$started['session_token']}/messages", [
            'message' => 'Nama saya Budi',
        ])->assertOk();

        $this->assertSame(
            'Budi',
            Contact::query()->where('public_id', $started['contact_id'])->value('name')
        );
    }

    public function test_duplicate_client_message_id_does_not_run_workflow_twice(): void
    {
        $calls = 0;

        $this->mock(GeminiService::class, function (MockInterface $mock) use (&$calls): void {
            $mock->shouldReceive('generate')->andReturnUsing(function () use (&$calls) {
                $calls++;

                return [
                    'text' => 'Halo!',
                    'finish_reason' => 'STOP',
                    'usage' => [
                        'prompt_tokens' => 10,
                        'completion_tokens' => 5,
                        'total_tokens' => 15,
                    ],
                ];
            });
        });

        $user = $this->user();
        $workflow = $this->workflow($user);
        $this->channel($user, $workflow);
        $session = $this->startWidgetSession('widget-token');
        $payload = [
            'message' => 'Halo',
            'client_message_id' => 'client-message-1',
        ];

        $this->postJson("/api/v1/public/sessions/{$session['session_token']}/messages", $payload)
            ->assertOk();
        $this->postJson("/api/v1/public/sessions/{$session['session_token']}/messages", $payload)
            ->assertOk();

        $this->assertSame(1, $calls);
        $this->assertSame(1, ChatMessage::query()->where('role', 'customer')->count());
        $this->assertSame(1, ChatMessage::query()->where('role', 'assistant')->count());
        $this->assertDatabaseCount('workflow_executions', 1);
    }

    public function test_public_failed_turn_resumes_from_failed_node_on_next_message(): void
    {
        $calls = 0;

        $this->mock(GeminiService::class, function (MockInterface $mock) use (&$calls): void {
            $mock->shouldReceive('generate')->andReturnUsing(function () use (&$calls) {
                $calls++;

                if ($calls === 2) {
                    throw new \RuntimeException('Provider sedang down.');
                }

                return [
                    'text' => $calls === 1 ? 'Jawaban pertama' : 'Jawaban kedua',
                    'finish_reason' => 'STOP',
                    'usage' => [
                        'prompt_tokens' => 10,
                        'completion_tokens' => 5,
                        'total_tokens' => 15,
                    ],
                ];
            });
        });

        $user = $this->user();
        $workflow = $this->workflow($user, $this->resumableDefinition());
        $this->channel($user, $workflow);
        $session = $this->startWidgetSession('widget-token');
        $token = $session['session_token'];

        $this->postJson("/api/v1/public/sessions/{$token}/messages", [
            'message' => 'Halo',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'waiting');

        $this->postJson("/api/v1/public/sessions/{$token}/messages", [
            'message' => 'Lanjut',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'failed');

        $execution = WorkflowExecution::query()->firstOrFail();
        $this->assertSame('failed', $execution->status);
        $this->assertSame('ai-2', $execution->current_node_id);

        $this->postJson("/api/v1/public/sessions/{$token}/messages", [
            'message' => 'Coba lagi',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'success');

        $this->assertSame(3, $calls);
        $this->assertSame(1, $execution->steps()->where('node_type', 'trigger')->count());
        $this->assertSame(
            'Jawaban kedua',
            data_get($execution->fresh()->context, 'ai_response')
        );
    }

    public function test_refresh_closes_previous_waiting_execution(): void
    {
        $this->fakeGemini('Halo!');

        $user = $this->user();
        $workflow = $this->workflow($user, $this->resumableDefinition());
        $this->channel($user, $workflow);

        $first = $this->startWidgetSession('widget-token');

        $this->postJson("/api/v1/public/sessions/{$first['session_token']}/messages", [
            'message' => 'Halo',
        ])->assertOk();

        $execution = WorkflowExecution::query()->firstOrFail();
        $this->assertSame('waiting', $execution->status);
        $this->assertNotNull($execution->current_node_id);

        $this->startWidgetSession('widget-token', $first['contact_id']);

        $execution->refresh();

        $this->assertSame('success', $execution->status);
        $this->assertNull($execution->current_node_id);
        $this->assertNull($execution->current_workflow_id);
        $this->assertNotNull($execution->finished_at);
    }

    public function test_widget_polling_does_not_exhaust_send_rate_limit(): void
    {
        $this->fakeGemini('Halo!');

        $user = $this->user();
        $workflow = $this->workflow($user);
        $this->channel($user, $workflow, 'rate-widget-token');

        $session = $this->startWidgetSession('rate-widget-token');

        for ($i = 0; $i < 40; $i++) {
            $this->getJson(
                "/api/v1/public/sessions/{$session['session_token']}"
            )->assertOk();
        }

        $this->postJson(
            "/api/v1/public/sessions/{$session['session_token']}/messages",
            ['message' => 'Halo']
        )->assertOk();
    }

    public function test_public_widget_creates_contact_session_and_ai_reply(): void
    {
        $this->fakeGemini('Halo! Ada yang bisa dibantu?');

        $user = $this->user();
        $workflow = $this->workflow($user);
        $this->channel($user, $workflow);

        $session = $this->startWidgetSession('widget-token');

        $this->assertStringStartsWith('ct_', $session['contact_id']);
        $this->assertNotEmpty($session['session_token']);
        $this->assertSame('active', $session['status']);
        $this->assertSame('Website Widget', $session['channel']['name']);

        $this->postJson("/api/v1/public/sessions/{$session['session_token']}/messages", [
            'message' => 'Saya mau beli',
        ])
            ->assertOk()
            ->assertJsonPath('data.session_status', 'active')
            ->assertJsonPath('data.messages.0.role', 'customer')
            ->assertJsonPath('data.messages.0.content', 'Saya mau beli')
            ->assertJsonPath('data.messages.1.role', 'assistant')
            ->assertJsonPath('data.messages.1.content', 'Halo! Ada yang bisa dibantu?');

        $this->assertDatabaseCount('contacts', 1);
        $this->assertDatabaseCount('chat_sessions', 1);
        $this->assertDatabaseCount('chat_messages', 2);
        $this->assertDatabaseCount('workflow_executions', 1);

        $execution = WorkflowExecution::query()->firstOrFail();
        $this->assertSame($session['contact_id'], data_get($execution->input, 'conversation_id'));
        $this->assertNotNull($execution->chat_session_id);
        $this->assertNotNull($execution->contact_id);
    }

    public function test_refresh_keeps_contact_but_starts_new_session_and_audit_log(): void
    {
        $this->fakeGemini('Halo!');

        $user = $this->user();
        $workflow = $this->workflow($user);
        $this->channel($user, $workflow);

        $first = $this->startWidgetSession('widget-token');
        $this->postJson("/api/v1/public/sessions/{$first['session_token']}/messages", [
            'message' => 'Pesan pertama',
        ])->assertOk();

        $second = $this->startWidgetSession('widget-token', $first['contact_id']);

        $this->assertSame($first['contact_id'], $second['contact_id']);
        $this->assertNotSame($first['session_token'], $second['session_token']);
        $this->assertDatabaseCount('contacts', 1);
        $this->assertDatabaseCount('chat_sessions', 2);
        $this->assertDatabaseCount('workflow_executions', 1);

        $this->assertSame(
            ChatSession::STATUS_ENDED,
            ChatSession::query()->where('public_token', $first['session_token'])->value('status')
        );

        $this->postJson("/api/v1/public/sessions/{$second['session_token']}/messages", [
            'message' => 'Pesan kedua',
        ])->assertOk();

        $this->assertDatabaseCount('workflow_executions', 2);
        $this->assertSame(2, WorkflowExecution::query()->distinct()->count('chat_session_id'));
    }

    public function test_admin_takeover_pauses_ai_and_release_resumes_ai(): void
    {
        $this->fakeGemini('Balasan AI');

        $owner = $this->user();
        $workflow = $this->workflow($owner);
        $this->channel($owner, $workflow);

        $started = $this->startWidgetSession('widget-token');
        $session = ChatSession::query()->where('public_token', $started['session_token'])->firstOrFail();

        $this->postJson("/api/v1/public/sessions/{$started['session_token']}/messages", [
            'message' => 'Halo',
        ])->assertOk();

        $this->actingAs($owner)
            ->postJson("/api/v1/inbox/sessions/{$session->id}/takeover")
            ->assertOk()
            ->assertJsonPath('data.status', 'human');

        $this->postJson("/api/v1/public/sessions/{$started['session_token']}/messages", [
            'message' => 'Saya butuh admin',
        ])
            ->assertOk()
            ->assertJsonPath('data.session_status', 'human')
            ->assertJsonPath('data.notice', 'Admin akan membalas percakapan ini.');

        $this->assertSame(1, WorkflowExecution::query()->count());

        $this->actingAs($owner)
            ->postJson("/api/v1/inbox/sessions/{$session->id}/messages", [
                'message' => 'Halo, saya admin.',
            ])
            ->assertCreated()
            ->assertJsonPath('data.role', 'admin');

        $messages = $this->getJson("/api/v1/public/sessions/{$started['session_token']}")
            ->assertOk()
            ->json('data.messages');

        $this->assertSame('admin', collect($messages)->last()['role']);
        $this->assertSame('Halo, saya admin.', collect($messages)->last()['content']);

        $this->actingAs($owner)
            ->postJson("/api/v1/inbox/sessions/{$session->id}/release")
            ->assertOk()
            ->assertJsonPath('data.status', 'active');

        $this->postJson("/api/v1/public/sessions/{$started['session_token']}/messages", [
            'message' => 'Lanjut',
        ])
            ->assertOk()
            ->assertJsonPath('data.session_status', 'active')
            ->assertJsonPath('data.messages.'.(count(collect($this->getJson("/api/v1/public/sessions/{$started['session_token']}")->json('data.messages'))) - 1).'.role', 'assistant');
    }

    public function test_inactive_widget_cannot_start_a_session(): void
    {
        $user = $this->user();
        $workflow = $this->workflow($user);
        $channel = $this->channel($user, $workflow);
        $channel->update(['is_active' => false]);

        $this->postJson('/api/v1/public/channels/widget-token/sessions')
            ->assertStatus(422)
            ->assertJsonValidationErrors('channel');
    }

    public function test_public_session_tokens_are_scoped_to_their_contact(): void
    {
        $this->fakeGemini('Halo!');

        $user = $this->user();
        $this->channel($user, $this->workflow($user));

        $first = $this->startWidgetSession('widget-token');
        $second = $this->startWidgetSession('widget-token');

        $this->postJson("/api/v1/public/sessions/{$first['session_token']}/messages", [
            'message' => 'Halo',
        ])->assertOk();

        $firstSession = ChatSession::query()
            ->where('public_token', $first['session_token'])
            ->firstOrFail();

        $this->assertNotSame($first['contact_id'], $second['contact_id']);
        $this->assertSame($firstSession->contact_id, ChatMessage::query()->value('contact_id'));
    }
}
