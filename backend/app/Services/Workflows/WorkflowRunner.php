<?php

namespace App\Services\Workflows;

use App\Models\ChatSession;
use App\Models\Workflow;
use App\Models\WorkflowExecution;
use App\Services\AI\AiProviderManager;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Throwable;

class WorkflowRunner
{
    /**
     * Batas langkah untuk mencegah loop tak berujung lewat Go To.
     */
    private const MAX_STEPS = 100;

    public function __construct(
        private readonly WorkflowGraphValidator $graphValidator,
        private readonly ConditionRule $conditionRule,
        private readonly WorkflowContext $context,
        private readonly AiAgentVariables $agentVariables,
        private readonly MessageRenderer $messageRenderer,
        private readonly AiProviderManager $aiProviders
    ) {}

    /**
     * Snapshot konteks terakhir agar eksekusi yang gagal bisa dilanjutkan.
     */
    private ?array $liveContext = null;

    /**
     * @param  array<string, mixed>  $input
     * @return array{status: int, message: string, execution: ?WorkflowExecution}
     */
    public function execute(
        Workflow $workflow,
        array $input = [],
        ?ChatSession $chatSession = null
    ): array {
        $this->liveContext = null;

        if ($chatSession !== null) {
            $input['conversation_id'] = $input['conversation_id']
                ?? $chatSession->contact?->public_id;
            $input['chat_session_id'] = $chatSession->id;
            $input['contact_id'] = $chatSession->contact_id;
        }

        $conversationId = $input['conversation_id'] ?? null;

        $tokens = [
            'prompt_tokens' => 0,
            'completion_tokens' => 0,
            'total_tokens' => 0,
        ];

        $resumeNodeId = null;
        $resumeWorkflowId = null;
        $resumeContext = null;
        $claimed = null;
        $logs = [];

        if ($chatSession !== null) {
            if ($chatSession->status === ChatSession::STATUS_HUMAN) {
                return [
                    'status' => 200,
                    'message' => 'Percakapan sedang ditangani admin.',
                    'execution' => $chatSession->execution?->fresh(),
                ];
            }

            if ($chatSession->status === ChatSession::STATUS_ENDED) {
                return [
                    'status' => 422,
                    'message' => 'Sesi percakapan sudah berakhir.',
                    'execution' => null,
                ];
            }

            $sessionState = DB::transaction(function () use (
                $chatSession,
                $workflow,
                $input,
                &$tokens
            ): array {
                $execution = $chatSession->execution()
                    ->lockForUpdate()
                    ->first();

                if ($execution === null) {
                    $execution = WorkflowExecution::create([
                        'workflow_id' => $workflow->id,
                        'chat_session_id' => $chatSession->id,
                        'contact_id' => $chatSession->contact_id,
                        'status' => 'running',
                        'input' => $input,
                        'logs' => [],
                        'started_at' => now(),
                    ]);

                    return [
                        'execution' => $execution,
                        'input' => $input,
                        'logs' => [],
                        'resume_node_id' => null,
                        'resume_workflow_id' => null,
                        'resume_context' => $input,
                    ];
                }

                $tokens = [
                    'prompt_tokens' => (int) ($execution->prompt_tokens ?? 0),
                    'completion_tokens' => (int) ($execution->completion_tokens ?? 0),
                    'total_tokens' => (int) ($execution->total_tokens ?? 0),
                ];

                $mergedInput = array_replace($execution->input ?? [], $input);
                $isResumable = $this->isResumable($execution);
                $logs = $execution->logs ?? [];
                $context = array_replace(
                    $execution->context ?? [],
                    $mergedInput
                );

                $execution->update([
                    'status' => 'running',
                    'input' => $mergedInput,
                    'error' => null,
                    'waiting_since' => null,
                    'finished_at' => null,
                ]);

                return [
                    'execution' => $execution,
                    'input' => $mergedInput,
                    'logs' => $logs,
                    'resume_node_id' => $isResumable
                        ? $execution->current_node_id
                        : null,
                    'resume_workflow_id' => $isResumable
                        ? ($execution->current_workflow_id ?? $execution->workflow_id)
                        : null,
                    'resume_context' => $context,
                ];
            });

            $execution = $sessionState['execution'];
            $input = $sessionState['input'];
            $logs = $sessionState['logs'];
            $resumeNodeId = $sessionState['resume_node_id'];
            $resumeWorkflowId = $sessionState['resume_workflow_id'];
            $resumeContext = $sessionState['resume_context'];
        } else {
            if (is_string($conversationId) && $conversationId !== '') {
                /*
                 * Sesi lama tanpa chat session: percakapan yang sudah
                 * dialihkan ke admin tidak dijalankan lagi.
                 */
                $escalated = $workflow->executions()
                    ->where('status', 'escalated')
                    ->latest()
                    ->get()
                    ->first(fn (WorkflowExecution $execution) => data_get(
                        $execution->input,
                        'conversation_id'
                    ) === $conversationId);

                if ($escalated !== null) {
                    return [
                        'status' => 200,
                        'message' => 'Percakapan sedang ditangani admin.',
                        'execution' => $escalated,
                    ];
                }

                /*
                 * Klaim eksekusi yang menunggu pesan berikutnya di dalam
                 * transaksi agar dua pesan bersamaan tidak menjalankan node
                 * yang sama dua kali.
                 */
                $claimed = DB::transaction(function () use (
                    $workflow,
                    $conversationId,
                    $input,
                    &$tokens
                ): ?array {
                    $execution = $workflow->executions()
                        ->whereIn('status', ['waiting', 'failed'])
                        ->whereNotNull('current_node_id')
                        ->latest()
                        ->lockForUpdate()
                        ->get()
                        ->first(fn (WorkflowExecution $candidate) => data_get(
                            $candidate->input,
                            'conversation_id'
                        ) === $conversationId);

                    if ($execution === null) {
                        return null;
                    }

                    $tokens = [
                        'prompt_tokens' => (int) ($execution->prompt_tokens ?? 0),
                        'completion_tokens' => (int) ($execution->completion_tokens ?? 0),
                        'total_tokens' => (int) ($execution->total_tokens ?? 0),
                    ];

                    $input = array_replace($execution->input ?? [], $input);
                    $logs = $execution->logs ?? [];

                    $execution->update([
                        'status' => 'running',
                        'input' => $input,
                        'error' => null,
                        'waiting_since' => null,
                        'finished_at' => null,
                    ]);

                    return [
                        'execution' => $execution,
                        'input' => $input,
                        'logs' => $logs,
                        'resume_node_id' => $execution->current_node_id,
                        'resume_workflow_id' => $execution->current_workflow_id,
                        'resume_context' => array_replace(
                            $execution->context ?? [],
                            $input
                        ),
                    ];
                });
            }

            if ($claimed !== null) {
                $execution = $claimed['execution'];
                $input = $claimed['input'];
                $logs = $claimed['logs'];
                $resumeNodeId = $claimed['resume_node_id'];
                $resumeWorkflowId = $claimed['resume_workflow_id'];
                $resumeContext = $claimed['resume_context'];
            } else {
                $logs = [];
                $execution = WorkflowExecution::create([
                    'workflow_id' => $workflow->id,
                    'status' => 'running',
                    'input' => $input,
                    'logs' => [],
                    'started_at' => now(),
                ]);
            }
        }

        /*
         * Nomor langkah dilanjutkan dari eksekusi sebelumnya agar audit
         * tetap berurutan saat percakapan dilanjutkan.
         */
        $stepStart = max(
            (int) $execution->steps()->max('step'),
            count($logs)
        );

        $auditSteps = [];
        $currentStep = null;
        $stepsPersisted = false;

        try {
            $runWorkflow = $workflow;

            if ($resumeWorkflowId !== null && $resumeWorkflowId !== $workflow->id) {
                $runWorkflow = Workflow::query()
                    ->whereKey($resumeWorkflowId)
                    ->where('user_id', $workflow->user_id)
                    ->first();

                if ($runWorkflow === null) {
                    throw new RuntimeException(
                        'Workflow lanjutan tidak ditemukan. Perbaikan: periksa kembali node Go To lintas workflow.'
                    );
                }
            }

            $definition = $runWorkflow->definition ?? [];
            $nodes = $definition['nodes'] ?? [];
            $edges = $definition['edges'] ?? [];

            if (! is_array($nodes) || ! is_array($edges)) {
                throw new RuntimeException(
                    'Nodes dan edges harus berupa array.'
                );
            }

            $result = $this->runWorkflow(
                $nodes,
                $edges,
                $input,
                $logs,
                $tokens,
                $resumeNodeId,
                $resumeContext,
                $stepStart,
                $auditSteps,
                $currentStep,
                (int) $workflow->user_id,
                (int) $runWorkflow->id,
                (string) $runWorkflow->name,
                $resumeWorkflowId === null || $resumeWorkflowId === $workflow->id
            );

            $common = [
                'output' => $result,
                'logs' => $logs,
                'context' => $result['context'],
                'prompt_tokens' => $tokens['prompt_tokens'],
                'completion_tokens' => $tokens['completion_tokens'],
                'total_tokens' => $tokens['total_tokens'],
            ];

            $this->persistSteps($execution, $auditSteps);
            $stepsPersisted = true;

            if ($result['escalated']) {
                $execution->update($common + [
                    'status' => 'escalated',
                    'current_node_id' => null,
                    'current_workflow_id' => null,
                    'waiting_since' => null,
                    'finished_at' => now(),
                ]);

                $message = 'Percakapan dialihkan ke admin.';
            } elseif ($result['paused']) {
                $execution->update($common + [
                    'status' => 'waiting',
                    'current_node_id' => $result['resume_node_id'],
                    'current_workflow_id' => $result['resume_workflow_id'],
                    'waiting_since' => now(),
                    'finished_at' => null,
                ]);

                $message = 'Workflow menunggu pesan berikutnya.';
            } else {
                $execution->update($common + [
                    'status' => 'success',
                    'current_node_id' => null,
                    'current_workflow_id' => null,
                    'waiting_since' => null,
                    'finished_at' => now(),
                ]);

                $message = 'Workflow berhasil dieksekusi.';
            }

            if ($chatSession !== null) {
                $chatSession->update([
                    'status' => $result['escalated']
                        ? ChatSession::STATUS_HUMAN
                        : ChatSession::STATUS_ACTIVE,
                    'context' => $result['context'],
                    'current_workflow_id' => $result['paused']
                        ? $result['resume_workflow_id']
                        : null,
                    'current_node_id' => $result['paused']
                        ? $result['resume_node_id']
                        : null,
                    'takeover_at' => $result['escalated'] ? now() : null,
                    'last_activity_at' => now(),
                ]);
            }

            return [
                'status' => 200,
                'message' => $message,
                'execution' => $execution->fresh(),
            ];
        } catch (Throwable $exception) {
            if ($currentStep !== null) {
                $auditSteps[] = $this->errorStep(
                    $currentStep,
                    $exception->getMessage()
                );
            }

            if (! $stepsPersisted) {
                try {
                    $this->persistSteps($execution, $auditSteps);
                    $stepsPersisted = true;
                } catch (Throwable) {
                    // Jangan menutupi error utama jika audit gagal ditulis.
                }
            }

            $logs[] = [
                'status' => 'error',
                'message' => $exception->getMessage(),
                'timestamp' => now()->toISOString(),
            ];

            $failedNodeId = is_array($currentStep)
                ? ($currentStep['node_id'] ?? null)
                : $execution->current_node_id;
            $failedWorkflowId = is_array($currentStep)
                ? ($currentStep['workflow_id'] ?? null)
                : $execution->current_workflow_id;
            $failedContext = $this->liveContext
                ?? $execution->context
                ?? $resumeContext
                ?? $input;

            $execution->update([
                'status' => 'failed',
                'error' => $exception->getMessage(),
                'logs' => $logs,
                'context' => $failedContext,
                'current_node_id' => $failedNodeId,
                'current_workflow_id' => $failedWorkflowId,
                'waiting_since' => null,
                'finished_at' => now(),
                'prompt_tokens' => $tokens['prompt_tokens'],
                'completion_tokens' => $tokens['completion_tokens'],
                'total_tokens' => $tokens['total_tokens'],
            ]);

            if ($chatSession !== null) {
                $chatSession->update([
                    'context' => $failedContext,
                    'current_node_id' => $failedNodeId,
                    'current_workflow_id' => $failedWorkflowId,
                    'last_activity_at' => now(),
                ]);
            }

            return [
                'status' => 422,
                'message' => 'Workflow gagal dieksekusi.',
                'execution' => $execution->fresh(),
            ];
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $logs
     * @param  array{prompt_tokens: int, completion_tokens: int, total_tokens: int}  $tokens
     * @return array<string, mixed>
     */
    private function runWorkflow(
        array $nodes,
        array $edges,
        array $input,
        array &$logs,
        array &$tokens,
        ?string $resumeNodeId = null,
        ?array $resumeContext = null,
        int $stepStart = 0,
        array &$auditSteps = [],
        ?array &$currentStep = null,
        int $ownerId = 0,
        int $workflowId = 0,
        string $workflowName = 'Workflow',
        bool $requireRunnable = true
    ): array {
        $graph = $this->graphValidator->validate(
            $nodes,
            $edges,
            $resumeNodeId,
            $requireRunnable
        );

        $nodeMap = $graph['nodes'];
        $next = $graph['next'];
        $currentWorkflowId = $workflowId;
        $currentWorkflowName = $workflowName;

        $currentId = $resumeNodeId ?? $graph['entry_id'];

        if ($currentId === '') {
            throw new RuntimeException('Workflow tidak memiliki titik awal.');
        }

        $context = array_replace($resumeContext ?? $input, $input);
        $this->liveContext = $context;

        /*
         * Pemetaan variabel format lama (sourceValue → context).
         */
        foreach ($nodeMap as $node) {
            $definitions = $node['data']['variableDefinitions'] ?? [];

            if (! is_array($definitions)) {
                continue;
            }

            foreach ($definitions as $definition) {
                if (! is_array($definition)) {
                    continue;
                }

                $name = $definition['name'] ?? null;
                $sourceValue = $definition['sourceValue'] ?? null;

                if (
                    ! is_string($name)
                    || trim($name) === ''
                    || ! is_string($sourceValue)
                    || trim($sourceValue) === ''
                ) {
                    continue;
                }

                $name = trim($name);
                $sourceValue = trim($sourceValue);

                if ($sourceValue === 'input') {
                    $context[$name] = $context;

                    continue;
                }

                if (str_starts_with($sourceValue, 'input.')) {
                    $sourceValue = substr($sourceValue, strlen('input.'));
                }

                $context[$name] = $this->context->value($context, $sourceValue);
            }
        }

        $replyMessages = [];
        $paused = false;
        $escalated = false;
        $resumeAtNodeId = null;
        $resumeAtWorkflowId = null;
        $steps = 0;

        while (true) {
            if ($steps >= self::MAX_STEPS) {
                throw new RuntimeException(
                    'Workflow melebihi batas '.self::MAX_STEPS.' langkah. Periksa Go To yang berulang.'
                );
            }

            $steps++;
            $stepNumber = $stepStart + $steps;

            if (! isset($nodeMap[$currentId])) {
                throw new RuntimeException(
                    'Node berikutnya tidak ditemukan: '.$currentId
                );
            }

            $node = $nodeMap[$currentId];
            $type = $node['type'];
            $data = $node['data'] ?? [];
            $startedAt = hrtime(true);
            $handle = 'default';
            $message = '';
            $jumpTo = null;
            $logContext = [];
            $stepInput = null;
            $stepOutput = null;
            $stepVariables = null;
            $stepBranch = null;
            $stepMessages = null;
            $stepPromptTokens = 0;
            $stepCompletionTokens = 0;
            $stepTotalTokens = 0;

            $stepWorkflowId = $currentWorkflowId;
            $stepWorkflowName = $currentWorkflowName;

            $currentStep = [
                'step' => $stepNumber,
                'workflow_id' => $stepWorkflowId,
                'workflow_name' => $stepWorkflowName,
                'node_id' => $currentId,
                'node_type' => $type,
                'node_name' => $this->nodeName($node),
                'started_hrtime' => $startedAt,
            ];

            if ($type === 'trigger') {
                $stepInput = [
                    'conversation_id' => $context['conversation_id'] ?? null,
                    'customer_message' => $context['customer_message']
                        ?? $context['message']
                        ?? null,
                ];
                $stepOutput = ['node_id' => $currentId];
                $message = 'Workflow dimulai dari Trigger.';
            } elseif ($type === 'ai_agent') {
                $outputVariables = $this->agentVariables->normalize($data);
                $schema = $this->agentVariables->schema($outputVariables);
                $agentNamespace = $this->agentVariables->namespace(
                    $data,
                    $currentId
                );
                $verbosity = in_array(
                    $data['verbosity'] ?? null,
                    ['concise', 'balanced', 'detailed'],
                    true
                ) ? (string) $data['verbosity'] : 'concise';
                $contextMessages = max(
                    0,
                    min(20, (int) ($data['contextMessages'] ?? 10))
                );

                $systemMessage = (string) (
                    $data['systemMessage'] ?? 'You are a helpful assistant.'
                );

                $systemMessage = $this->context->render(
                    $systemMessage,
                    $context
                );

                $systemMessage .= "\n\n".$this->verbosityInstruction($verbosity);

                if ($schema !== null) {
                    $systemMessage .= "\n\nRespond only with JSON matching the provided schema.";
                }

                $provider = is_string($data['provider'] ?? null)
                    ? $data['provider']
                    : 'gemini';
                $model = $this->aiProviders->resolveModel(
                    $ownerId,
                    $provider,
                    is_string($data['model'] ?? null) ? $data['model'] : null
                );

                $userMessage = $context['customer_message']
                    ?? $context['message']
                    ?? $context['input']['message']
                    ?? '';

                if (! is_string($userMessage)) {
                    $userMessage = json_encode(
                        $userMessage,
                        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
                    ) ?: '';
                }

                $history = $context['conversation_history'] ?? null;

                if (is_array($history) && $contextMessages > 0) {
                    $history = array_slice($history, -$contextMessages);
                    $history = collect($history)
                        ->map(function (mixed $message): string {
                            if (! is_array($message)) {
                                return '';
                            }

                            $role = match ($message['role'] ?? null) {
                                'customer' => 'Pelanggan',
                                'admin' => 'Admin',
                                'assistant' => 'AI',
                                default => 'Sistem',
                            };

                            return $role.': '.trim((string) ($message['content'] ?? ''));
                        })
                        ->filter()
                        ->implode("\n");
                }

                if (is_string($history) && trim($history) !== '' && $contextMessages > 0) {
                    $userMessage = "Riwayat percakapan sesi ini (terbaru di bawah):\n"
                        .trim($history)
                        ."\n\nPesan pelanggan terbaru: "
                        .$userMessage;
                } elseif ($history === [] || $contextMessages === 0) {
                    $userMessage = 'Pesan pelanggan terbaru: '.$userMessage;
                }

                $customerName = $context['customer_name'] ?? null;

                if (is_string($customerName) && trim($customerName) !== '') {
                    $userMessage = "Nama pelanggan: {$customerName}\n\n"
                        ."Pesan pelanggan: {$userMessage}";
                }

                if (trim($userMessage) === '') {
                    throw new RuntimeException(
                        'Pesan pengguna kosong. Periksa input Trigger dan variabel AI Agent.'
                    );
                }

                $stepInput = [
                    'provider' => $provider,
                    'system_message' => $systemMessage,
                    'user_message' => $userMessage,
                    'model' => $model,
                    'temperature' => (float) ($data['temperature'] ?? 0.7),
                    'verbosity' => $verbosity,
                    'context_messages' => $contextMessages,
                    'agent_namespace' => $agentNamespace,
                ];

                if ($currentStep !== null) {
                    $currentStep['input'] = $stepInput;
                }

                $aiResult = $this->aiProviders->generate(
                    $ownerId,
                    $provider,
                    $model,
                    $systemMessage,
                    $userMessage,
                    (float) ($data['temperature'] ?? 0.7),
                    $schema,
                    match ($verbosity) {
                        'concise' => 800,
                        'detailed' => 2000,
                        default => 1200,
                    }
                );

                $stepPromptTokens = (int) $aiResult['usage']['prompt_tokens'];
                $stepCompletionTokens = (int) $aiResult['usage']['completion_tokens'];
                $stepTotalTokens = (int) $aiResult['usage']['total_tokens'];

                $tokens['prompt_tokens'] += $stepPromptTokens;
                $tokens['completion_tokens'] += $stepCompletionTokens;
                $tokens['total_tokens'] += $stepTotalTokens;

                if ($schema !== null) {
                    $json = trim($aiResult['text']);

                    if (($aiResult['finish_reason'] ?? 'STOP') === 'MAX_TOKENS') {
                        throw new RuntimeException(
                            'Jawaban AI terpotong karena batas token. Ringkas system prompt atau tambah kapasitas output.'
                        );
                    }

                    if (str_starts_with($json, '```')) {
                        $json = (string) preg_replace(
                            '/^```[a-zA-Z]*\s*|\s*```$/',
                            '',
                            $json
                        );
                    }

                    $payload = json_decode($json, true);

                    $values = $this->agentVariables->extract(
                        $outputVariables,
                        $payload
                    );

                    foreach ($values as $name => $value) {
                        $context[$name] = $value;
                        $context[$agentNamespace][$name] = $value;
                    }

                    $aiText = '';

                    foreach ($outputVariables as $variable) {
                        if (
                            $variable['type'] === 'string'
                            && (string) $values[$variable['name']] !== ''
                        ) {
                            $aiText = (string) $values[$variable['name']];

                            break;
                        }
                    }

                    if ($aiText === '') {
                        foreach ($outputVariables as $variable) {
                            if ($variable['type'] !== 'array') {
                                continue;
                            }

                            $first = $values[$variable['name']][0][$variable['item_field']] ?? '';

                            if ($first !== '') {
                                $aiText = $first;

                                break;
                            }
                        }
                    }

                    $context['ai_response'] = $aiText;
                    $context[$agentNamespace]['ai_response'] = $aiText;
                    $logContext['variables'] = $values;
                    $stepVariables = $values;
                    $stepOutput = [
                        'text' => $aiText,
                        'raw_text' => $aiResult['text'],
                        'ai_response' => $aiText,
                    ];
                } else {
                    $context['ai_response'] = $aiResult['text'];
                    $context[$agentNamespace]['ai_response'] = $aiResult['text'];
                    $stepOutput = ['text' => $aiResult['text']];
                }

                $message = 'AI Agent berhasil menghasilkan jawaban.';
                $logContext['provider'] = $provider;
                $logContext['model'] = $model;
                $logContext['agent_namespace'] = $agentNamespace;
                $logContext['verbosity'] = $verbosity;
                $logContext['context_messages'] = $contextMessages;
                $logContext['prompt_tokens'] = $aiResult['usage']['prompt_tokens'];
                $logContext['completion_tokens'] = $aiResult['usage']['completion_tokens'];
                $logContext['total_tokens'] = $aiResult['usage']['total_tokens'];
            } elseif ($type === 'if_else') {
                $field = $this->conditionRule->validatedField($data);

                if (! $this->context->has($context, $field)) {
                    throw new RuntimeException(
                        'Variabel Condition "'.$field.'" tidak ditemukan. Perbaikan: pakai format {{nama-agent.variabel}} dari AI Agent sebelumnya, contoh: rekomendasi-penawaran.mau_beli.'
                    );
                }

                $actual = $this->context->resolve($context, $field);
                $handle = $this->conditionRule->isTruthy($actual)
                    ? 'true'
                    : 'false';

                $stepInput = ['variable' => $field, 'value' => $actual];
                $stepOutput = ['branch' => $handle];
                $stepBranch = $handle;

                $message = 'Condition {{'.$field.'}} → '
                    .($handle === 'true' ? 'If match.' : 'Else.');

                $logContext['variable'] = $field;
                $logContext['value'] = $actual;
                $logContext['branch'] = $handle;
            } elseif ($type === 'output') {
                $stepInput = [
                    'template' => (string) ($data['messageTemplate'] ?? ''),
                ];

                if ($currentStep !== null) {
                    $currentStep['input'] = $stepInput;
                }

                $messages = $this->messageRenderer->render(
                    (string) ($data['messageTemplate'] ?? ''),
                    $context
                );

                if ($messages === []) {
                    throw new RuntimeException(
                        'Send Message tidak menghasilkan pesan. Periksa variabel yang dipakai.'
                    );
                }

                $replyMessages = array_merge($replyMessages, $messages);

                $context['messages'] = $messages;
                $context['message'] = implode("\n", $messages);

                $message = count($messages) > 1
                    ? 'Send Message menghasilkan '.count($messages).' bubble.'
                    : 'Send Message menghasilkan 1 bubble.';

                $logContext['messages'] = $messages;
                $stepOutput = ['messages' => $messages];
                $stepMessages = $messages;
            } elseif ($type === 'relocate') {
                $escalated = true;
                $message = 'Percakapan dialihkan ke admin. AI tidak membalas.';
                $logContext['escalated'] = true;
                $stepOutput = ['escalated' => true];
            } elseif ($type === 'go_to') {
                $jumpTo = (string) ($data['targetNodeId'] ?? '');
                $endFlow = (bool) ($data['endFlow'] ?? false);
                $targetWorkflowId = $data['targetWorkflowId'] ?? null;
                $targetWorkflowId = is_numeric($targetWorkflowId)
                    ? (int) $targetWorkflowId
                    : null;

                if ($jumpTo === '') {
                    throw new RuntimeException(
                        'Node Go To belum memilih node tujuan. Perbaikan: buka node Go To lalu pilih node tujuan.'
                    );
                }

                $message = 'Go To → '.$jumpTo;

                $logContext['target_node_id'] = $jumpTo;
                $logContext['end_flow'] = $endFlow;
                $stepInput = [
                    'target_node_id' => $jumpTo,
                    'target_workflow_id' => $targetWorkflowId,
                    'end_flow' => $endFlow,
                ];

                if (
                    $targetWorkflowId !== null
                    && $targetWorkflowId !== $currentWorkflowId
                ) {
                    $targetWorkflow = Workflow::query()
                        ->whereKey($targetWorkflowId)
                        ->where('user_id', $ownerId)
                        ->first();

                    if ($targetWorkflow === null) {
                        throw new RuntimeException(
                            'Workflow tujuan Go To tidak ditemukan. Perbaikan: pilih ulang workflow tujuan yang masih ada.'
                        );
                    }

                    $targetGraph = $this->graphValidator->validateDefinition(
                        $targetWorkflow->definition ?? [],
                        $jumpTo,
                        false
                    );

                    $nodeMap = $targetGraph['nodes'];
                    $next = $targetGraph['next'];
                    $currentWorkflowId = (int) $targetWorkflow->id;
                    $currentWorkflowName = (string) $targetWorkflow->name;

                    $logContext['target_workflow_id'] = $currentWorkflowId;
                    $logContext['target_workflow_name'] = $currentWorkflowName;
                }

                if ($endFlow) {
                    $paused = true;
                    $resumeAtNodeId = $jumpTo;
                    $resumeAtWorkflowId = $currentWorkflowId;
                    $message .= ' (End flow)';
                }

                $stepOutput = [
                    'paused' => $paused && $endFlow,
                    'resume_node_id' => $resumeAtNodeId,
                    'resume_workflow_id' => $resumeAtWorkflowId,
                ];
            } else {
                $message = 'Workflow menunggu pesan pelanggan berikutnya.';
                $paused = true;
                $resumeAtNodeId = $next[$currentId.':default'] ?? null;
                $resumeAtWorkflowId = $currentWorkflowId;
                $stepOutput = ['resume_node_id' => $resumeAtNodeId];
            }

            $durationMs = (int) round(
                (hrtime(true) - $startedAt) / 1_000_000
            );

            $auditSteps[] = [
                'step' => $stepNumber,
                'workflow_id' => $stepWorkflowId,
                'workflow_name' => $stepWorkflowName,
                'node_id' => $currentId,
                'node_type' => $type,
                'node_name' => $this->nodeName($node),
                'status' => 'success',
                'input' => $stepInput,
                'output' => $stepOutput,
                'variables' => $stepVariables,
                'branch' => $stepBranch,
                'messages' => $stepMessages,
                'duration_ms' => $durationMs,
                'prompt_tokens' => $stepPromptTokens,
                'completion_tokens' => $stepCompletionTokens,
                'total_tokens' => $stepTotalTokens,
                'error' => null,
                'executed_at' => now(),
            ];

            $currentStep = null;
            $this->liveContext = $context;

            $logs[] = [
                'step' => $stepNumber,
                'node_id' => $currentId,
                'node' => $type,
                'name' => $this->nodeName($node),
                'status' => 'success',
                'message' => $message,
                'timestamp' => now()->toISOString(),
                'duration_ms' => $durationMs,
            ] + $logContext;

            if ($escalated || $paused) {
                break;
            }

            if ($type === 'output' && ! isset($next[$currentId.':default'])) {
                break;
            }

            if ($jumpTo !== null) {
                $currentId = $jumpTo;

                continue;
            }

            $key = $currentId.':'.$handle;

            if (! isset($next[$key])) {
                throw new RuntimeException(
                    'Koneksi berikutnya tidak ditemukan untuk node: '
                    .$currentId
                );
            }

            $currentId = $next[$key];
        }

        return [
            'message' => 'Workflow berhasil dieksekusi.',
            'input' => $input,
            'context' => $context,
            'output' => $replyMessages === []
                ? null
                : implode("\n", $replyMessages),
            'messages' => $replyMessages,
            'paused' => $paused,
            'escalated' => $escalated,
            'resume_node_id' => $resumeAtNodeId,
            'resume_workflow_id' => $resumeAtWorkflowId,
            'executed_steps' => $steps,
            'tokens' => $tokens,
        ];
    }

    private function isResumable(WorkflowExecution $execution): bool
    {
        return in_array($execution->status, ['waiting', 'failed'], true)
            && is_string($execution->current_node_id)
            && trim($execution->current_node_id) !== '';
    }

    private function nodeName(array $node): string
    {
        $name = $node['data']['nodeName'] ?? null;

        if (is_string($name) && trim($name) !== '') {
            return trim($name);
        }

        return match ($node['type'] ?? '') {
            'trigger' => 'Trigger',
            'ai_agent' => 'AI Agent',
            'output' => 'Send Message',
            'if_else' => 'Condition',
            'relocate' => 'Relocate',
            'go_to' => 'Go To',
            'stopper' => 'Stopper',
            default => 'Node',
        };
    }

    /**
     * @param  array<int, array<string, mixed>>  $steps
     */
    private function persistSteps(WorkflowExecution $execution, array $steps): void
    {
        foreach ($steps as $step) {
            $execution->steps()->create($step);
        }
    }

    /**
     * @param  array<string, mixed>  $currentStep
     * @return array<string, mixed>
     */
    private function errorStep(array $currentStep, string $error): array
    {
        return [
            'step' => $currentStep['step'],
            'workflow_id' => $currentStep['workflow_id'] ?? null,
            'workflow_name' => $currentStep['workflow_name'] ?? null,
            'node_id' => $currentStep['node_id'],
            'node_type' => $currentStep['node_type'],
            'node_name' => $currentStep['node_name'] ?? null,
            'status' => 'error',
            'input' => $currentStep['input'] ?? null,
            'output' => null,
            'variables' => null,
            'branch' => null,
            'messages' => null,
            'duration_ms' => (int) round(
                (hrtime(true) - $currentStep['started_hrtime']) / 1_000_000
            ),
            'prompt_tokens' => 0,
            'completion_tokens' => 0,
            'total_tokens' => 0,
            'error' => $error,
            'executed_at' => now(),
        ];
    }

    private function verbosityInstruction(string $verbosity): string
    {
        return match ($verbosity) {
            'detailed' => 'Gaya jawaban: cukup detail, tetapi tetap terstruktur dan tanpa pengulangan. Gunakan maksimal tiga paragraf pendek atau tiga poin. Setiap bubble maksimal tiga kalimat.',
            'balanced' => 'Gaya jawaban: ringkas dan jelas. Gunakan maksimal dua paragraf pendek. Setiap bubble maksimal dua sampai tiga kalimat. Jangan mengulang pertanyaan atau informasi yang sudah diketahui.',
            default => 'Gaya jawaban: sangat ringkas. Setiap bubble maksimal dua kalimat. Langsung jawab inti, jangan mengulang pertanyaan pelanggan, jangan bertele-tele, dan ajukan paling banyak satu pertanyaan lanjutan.',
        };
    }
}
