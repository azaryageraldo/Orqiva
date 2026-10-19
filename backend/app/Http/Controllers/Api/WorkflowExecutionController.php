<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Workflow;
use App\Models\WorkflowExecution;
use App\Services\GeminiService;
use App\Services\Workflows\ConditionRule;
use App\Services\Workflows\WorkflowContext;
use App\Services\Workflows\WorkflowGraphValidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Throwable;

class WorkflowExecutionController extends Controller
{
    public function __construct(
        private readonly WorkflowGraphValidator $graphValidator,
        private readonly ConditionRule $conditionRule,
        private readonly WorkflowContext $context
    ) {}

    public function index(Workflow $workflow): JsonResponse
    {
        return response()->json([
            'data' => $workflow->executions()
                ->latest()
                ->paginate(10),
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

        /*
         * Klaim eksekusi yang menunggu pesan berikutnya di dalam
         * transaksi agar dua pesan bersamaan tidak menjalankan node
         * yang sama dua kali.
         */
        if (is_string($conversationId) && $conversationId !== '') {
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
                    ->first(fn (WorkflowExecution $candidate) => data_get($candidate->input, 'conversation_id')
                            === $conversationId
                    );

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
                $resumeContext
            );

            if ($result['paused'] ?? false) {
                $execution->update([
                    'status' => 'waiting',
                    'output' => $result,
                    'logs' => $logs,
                    'context' => $result['context'],
                    'current_node_id' => $result['resume_node_id'],
                    'waiting_since' => now(),
                    'finished_at' => null,
                    'prompt_tokens' => $tokens['prompt_tokens'],
                    'completion_tokens' => $tokens['completion_tokens'],
                    'total_tokens' => $tokens['total_tokens'],
                ]);
            } else {
                $execution->update([
                    'status' => 'success',
                    'output' => $result,
                    'logs' => $logs,
                    'context' => $result['context'] ?? null,
                    'current_node_id' => null,
                    'waiting_since' => null,
                    'finished_at' => now(),
                    'prompt_tokens' => $tokens['prompt_tokens'],
                    'completion_tokens' => $tokens['completion_tokens'],
                    'total_tokens' => $tokens['total_tokens'],
                ]);
            }

            return response()->json([
                'message' => ($result['paused'] ?? false)
                    ? 'Workflow menunggu pesan berikutnya.'
                    : 'Workflow berhasil dieksekusi.',
                'data' => $execution->fresh(),
            ]);
        } catch (Throwable $exception) {
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
        ?array $resumeContext = null
    ): array {
        $graph = $this->graphValidator->validate(
            $nodes,
            $edges,
            $resumeNodeId
        );

        $nodeMap = $graph['nodes'];
        $next = $graph['next'];
        $triggerId = $graph['trigger_id'];

        /*
         * Eksekusi satu jalur workflow.
         *
         * AI Agent menggunakan Gemini untuk menghasilkan jawaban.
         * Send Message membentuk output lokal, bukan mengirim pesan
         * ke layanan eksternal.
         */
        $currentId = $resumeNodeId ?? $triggerId;
        $visited = [];
        $context = $resumeContext ?? $input;
        $context = array_replace($context, $input);
        $messageOutput = null;
        $stoppedAtStopper = false;
        $resumeAtNodeId = null;

        // Petakan variableDefinitions dari seluruh node ke context runtime.
        foreach ($nodeMap as $node) {
            $data = $node['data'] ?? [];
            $definitions = $data['variableDefinitions'] ?? [];

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

                // Input sudah berada langsung di dalam context.
                if ($sourceValue === 'input') {
                    $context[$name] = $context;

                    continue;
                }

                // Ubah input.message menjadi message.
                if (str_starts_with($sourceValue, 'input.')) {
                    $sourceValue = substr($sourceValue, strlen('input.'));
                }

                $context[$name] = $this->context->value($context, $sourceValue);
            }
        }

        while (true) {
            if (isset($visited[$currentId])) {
                throw new RuntimeException(
                    'Siklus terdeteksi saat eksekusi workflow.'
                );
            }

            $visited[$currentId] = true;

            $node = $nodeMap[$currentId];
            $type = $node['type'];
            $data = $node['data'] ?? [];
            $handle = 'default';
            $message = '';

            if ($type === 'trigger') {
                $message = 'Workflow berhasil dimulai.';
            } elseif ($type === 'ai_agent') {
                $systemMessage = (string) (
                    $data['systemMessage'] ?? 'You are a helpful assistant.'
                );

                $model = $data['model'] ?? config(
                    'services.gemini.model',
                    'gemini-2.5-flash'
                );

                // Bentuk pesan pengguna dari context workflow.
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

                // Sertakan nama pelanggan jika tersedia.
                $customerName = $context['customer_name'] ?? null;

                if (is_string($customerName) && trim($customerName) !== '') {
                    $userMessage = "Nama pelanggan: {$customerName}\n\n"
                        ."Pesan pelanggan: {$userMessage}";
                }

                if (trim($userMessage) === '') {
                    throw new RuntimeException(
                        'Pesan pengguna kosong. Periksa input Trigger dan variableDefinitions.'
                    );
                }

                $aiResult = app(GeminiService::class)->generate(
                    $systemMessage,
                    $userMessage,
                    (float) ($data['temperature'] ?? 0.7),
                    is_string($data['model'] ?? null) ? $data['model'] : null
                );

                $messageOutput = $aiResult['text'];

                $tokens['prompt_tokens'] += $aiResult['usage']['prompt_tokens'];
                $tokens['completion_tokens'] += $aiResult['usage']['completion_tokens'];
                $tokens['total_tokens'] += $aiResult['usage']['total_tokens'];

                $context['ai_response'] = $messageOutput;

                $message = 'AI Agent berhasil menghasilkan jawaban menggunakan Gemini.';

                $logs[] = [
                    'node_id' => $currentId,
                    'node' => $type,
                    'status' => 'success',
                    'message' => $message,
                    'provider' => 'gemini',
                    'model' => $model,
                    'prompt_tokens' => $aiResult['usage']['prompt_tokens'],
                    'completion_tokens' => $aiResult['usage']['completion_tokens'],
                    'total_tokens' => $aiResult['usage']['total_tokens'],
                    'timestamp' => now()->toISOString(),
                ];

                $currentId = $next[$currentId.':default'];

                continue;
            } elseif ($type === 'if_else') {
                $condition = $this->conditionRule->fromData($data);

                if ($condition === null) {
                    throw new RuntimeException(
                        'Konfigurasi Condition tidak valid.'
                    );
                }

                $actual = $this->context->value(
                    $context,
                    $condition['field']
                );

                $expected = $condition['value'];

                if (
                    is_bool($actual)
                    && in_array($expected, ['true', 'false'], true)
                ) {
                    $expected = $expected === 'true';
                }

                $matched = $this->conditionRule->matches(
                    $actual,
                    $condition['operator'],
                    $expected
                );

                $handle = $matched ? 'true' : 'false';

                $message = 'Condition menghasilkan jalur '
                    .strtoupper($handle).'.';
            } elseif ($type === 'output') {
                $template = $data['messageTemplate'] ?? '';

                $messageOutput = $this->context->render(
                    (string) $template,
                    $context
                );

                $context['message'] = $messageOutput;

                $message = 'Send Message menghasilkan output lokal. '
                    .'Pesan belum dikirim ke layanan eksternal.';
            } elseif ($type === 'stopper') {
                $stoppedAtStopper = true;
                $resumeAtNodeId = $next[$currentId.':default'] ?? null;
                $message = 'Workflow menunggu pesan pelanggan berikutnya.';
            }

            $logs[] = [
                'node_id' => $currentId,
                'node' => $type,
                'status' => 'success',
                'message' => $message,
                'timestamp' => now()->toISOString(),
            ];

            if ($type === 'output' || $type === 'stopper') {
                break;
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
            'output' => $messageOutput,
            'paused' => $stoppedAtStopper,
            'resume_node_id' => $resumeAtNodeId,
            'executed_nodes' => count($visited),
            'tokens' => $tokens,
        ];
    }
}
