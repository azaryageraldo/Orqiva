<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Workflow;
use App\Models\WorkflowExecution;
use App\Services\GeminiService;
use App\Services\Workflows\AiAgentVariables;
use App\Services\Workflows\ConditionRule;
use App\Services\Workflows\MessageRenderer;
use App\Services\Workflows\WorkflowContext;
use App\Services\Workflows\WorkflowGraphValidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Throwable;

class WorkflowExecutionController extends Controller
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
        private readonly MessageRenderer $messageRenderer
    ) {}

    public function index(Workflow $workflow): JsonResponse
    {
        return response()->json([
            'data' => $workflow->executions()
                ->latest()
                ->paginate(10),
        ]);
    }

    public function show(
        Workflow $workflow,
        WorkflowExecution $execution
    ): JsonResponse {
        abort_unless($execution->workflow_id === $workflow->id, 404);

        $execution->load('steps');

        return response()->json([
            'data' => [
                'id' => $execution->id,
                'workflow_id' => $execution->workflow_id,
                'workflow_name' => $workflow->name,
                'status' => $execution->status,
                'input' => $execution->input,
                'output' => $execution->output,
                'logs' => $execution->logs,
                'error' => $execution->error,
                'context' => $execution->context,
                'prompt_tokens' => (int) $execution->prompt_tokens,
                'completion_tokens' => (int) $execution->completion_tokens,
                'total_tokens' => (int) $execution->total_tokens,
                'started_at' => $execution->started_at?->toISOString(),
                'finished_at' => $execution->finished_at?->toISOString(),
                'waiting_since' => $execution->waiting_since?->toISOString(),
                'steps' => $execution->steps
                    ->map(fn ($step) => [
                        'id' => $step->id,
                        'step' => $step->step,
                        'node_id' => $step->node_id,
                        'node_type' => $step->node_type,
                        'node_name' => $step->node_name,
                        'status' => $step->status,
                        'input' => $step->input,
                        'output' => $step->output,
                        'variables' => $step->variables,
                        'branch' => $step->branch,
                        'messages' => $step->messages,
                        'duration_ms' => $step->duration_ms,
                        'prompt_tokens' => $step->prompt_tokens,
                        'completion_tokens' => $step->completion_tokens,
                        'total_tokens' => $step->total_tokens,
                        'error' => $step->error,
                        'executed_at' => $step->executed_at?->toISOString(),
                    ])
                    ->values(),
            ],
        ]);
    }

    public function execute(
        Request $request,
        Workflow $workflow
    ): JsonResponse {
        $validated = $request->validate([
            'input' => ['sometimes', 'array'],
        ]);

        $input = $validated['input'] ?? [];
        $conversationId = $input['conversation_id'] ?? null;

        $tokens = [
            'prompt_tokens' => 0,
            'completion_tokens' => 0,
            'total_tokens' => 0,
        ];

        $resumeNodeId = null;
        $resumeContext = null;
        $claimed = null;

        if (is_string($conversationId) && $conversationId !== '') {
            /*
             * Sesi yang sudah dialihkan ke admin tidak dijalankan lagi.
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
                return response()->json([
                    'message' => 'Percakapan sedang ditangani admin.',
                    'data' => $escalated,
                ]);
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
                    ->where('status', 'waiting')
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
                    'waiting_since' => null,
                ]);

                return [
                    'execution' => $execution,
                    'input' => $input,
                    'logs' => $logs,
                    'resume_node_id' => $execution->current_node_id,
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
            $definition = $workflow->definition ?? [];
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
                $currentStep
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
                    'waiting_since' => null,
                    'finished_at' => now(),
                ]);

                $message = 'Percakapan dialihkan ke admin.';
            } elseif ($result['paused']) {
                $execution->update($common + [
                    'status' => 'waiting',
                    'current_node_id' => $result['resume_node_id'],
                    'waiting_since' => now(),
                    'finished_at' => null,
                ]);

                $message = 'Workflow menunggu pesan berikutnya.';
            } else {
                $execution->update($common + [
                    'status' => 'success',
                    'current_node_id' => null,
                    'waiting_since' => null,
                    'finished_at' => now(),
                ]);

                $message = 'Workflow berhasil dieksekusi.';
            }

            return response()->json([
                'message' => $message,
                'data' => $execution->fresh(),
            ]);
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

            $execution->update([
                'status' => 'failed',
                'error' => $exception->getMessage(),
                'logs' => $logs,
                'finished_at' => now(),
                'prompt_tokens' => $tokens['prompt_tokens'],
                'completion_tokens' => $tokens['completion_tokens'],
                'total_tokens' => $tokens['total_tokens'],
            ]);

            return response()->json([
                'message' => 'Workflow gagal dieksekusi.',
                'data' => $execution->fresh(),
            ], 422);
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
        ?array &$currentStep = null
    ): array {
        $graph = $this->graphValidator->validate(
            $nodes,
            $edges,
            $resumeNodeId
        );

        $nodeMap = $graph['nodes'];
        $next = $graph['next'];

        $currentId = $resumeNodeId ?? $graph['entry_id'];

        if ($currentId === '') {
            throw new RuntimeException('Workflow tidak memiliki titik awal.');
        }

        $context = array_replace($resumeContext ?? $input, $input);

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

            $currentStep = [
                'step' => $stepNumber,
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

                $systemMessage = (string) (
                    $data['systemMessage'] ?? 'You are a helpful assistant.'
                );

                $systemMessage = $this->context->render(
                    $systemMessage,
                    $context
                );

                if ($schema !== null) {
                    $systemMessage .= "\n\nRespond only with JSON matching the provided schema.";
                }

                $model = is_string($data['model'] ?? null)
                    ? $data['model']
                    : config('services.gemini.model', 'gemini-2.5-flash');

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
                    'system_message' => $systemMessage,
                    'user_message' => $userMessage,
                    'model' => $model,
                    'temperature' => (float) ($data['temperature'] ?? 0.7),
                ];

                if ($currentStep !== null) {
                    $currentStep['input'] = $stepInput;
                }

                $aiResult = app(GeminiService::class)->generate(
                    $systemMessage,
                    $userMessage,
                    (float) ($data['temperature'] ?? 0.7),
                    is_string($data['model'] ?? null) ? $data['model'] : null,
                    $schema
                );

                $stepPromptTokens = (int) $aiResult['usage']['prompt_tokens'];
                $stepCompletionTokens = (int) $aiResult['usage']['completion_tokens'];
                $stepTotalTokens = (int) $aiResult['usage']['total_tokens'];

                $tokens['prompt_tokens'] += $stepPromptTokens;
                $tokens['completion_tokens'] += $stepCompletionTokens;
                $tokens['total_tokens'] += $stepTotalTokens;

                if ($schema !== null) {
                    $json = trim($aiResult['text']);

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
                    $logContext['variables'] = $values;
                    $stepVariables = $values;
                    $stepOutput = [
                        'text' => $aiText,
                        'raw_text' => $aiResult['text'],
                        'ai_response' => $aiText,
                    ];
                } else {
                    $context['ai_response'] = $aiResult['text'];
                    $stepOutput = ['text' => $aiResult['text']];
                }

                $message = 'AI Agent berhasil menghasilkan jawaban.';
                $logContext['provider'] = 'gemini';
                $logContext['model'] = $model;
                $logContext['prompt_tokens'] = $aiResult['usage']['prompt_tokens'];
                $logContext['completion_tokens'] = $aiResult['usage']['completion_tokens'];
                $logContext['total_tokens'] = $aiResult['usage']['total_tokens'];
            } elseif ($type === 'if_else') {
                $field = $this->conditionRule->field($data);

                if ($field === null) {
                    throw new RuntimeException(
                        'Condition belum memilih variabel boolean.'
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

                $message = 'Go To → '.$jumpTo;

                $logContext['target_node_id'] = $jumpTo;
                $logContext['end_flow'] = $endFlow;
                $stepInput = [
                    'target_node_id' => $jumpTo,
                    'end_flow' => $endFlow,
                ];

                if ($endFlow) {
                    $paused = true;
                    $resumeAtNodeId = $jumpTo;
                    $message .= ' (End flow)';
                }

                $stepOutput = [
                    'paused' => $paused && $endFlow,
                    'resume_node_id' => $resumeAtNodeId,
                ];
            } else {
                $message = 'Workflow menunggu pesan pelanggan berikutnya.';
                $paused = true;
                $resumeAtNodeId = $next[$currentId.':default'] ?? null;
                $stepOutput = ['resume_node_id' => $resumeAtNodeId];
            }

            $durationMs = (int) round(
                (hrtime(true) - $startedAt) / 1_000_000
            );

            $auditSteps[] = [
                'step' => $stepNumber,
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

            if ($escalated || $paused || $type === 'output') {
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
            'executed_steps' => $steps,
            'tokens' => $tokens,
        ];
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
}
