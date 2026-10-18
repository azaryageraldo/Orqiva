<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Workflow;
use App\Models\WorkflowExecution;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Services\GeminiService;
use RuntimeException;
use Throwable;

class WorkflowExecutionController extends Controller
{
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
        $execution = null;

        if (is_string($conversationId) && $conversationId !== '') {
            $execution = $workflow->executions()
                ->where('status', 'waiting')
                ->latest()
                ->get()
                ->first(fn (WorkflowExecution $candidate) =>
                    data_get($candidate->input, 'conversation_id') === $conversationId
                );
        }

        $resumeNodeId = null;
        $resumeContext = null;

        if ($execution) {
            $resumeNodeId = $execution->current_node_id;
            $resumeContext = array_replace($execution->context ?? [], $input);
            $input = array_replace($execution->input ?? [], $input);
            $logs = $execution->logs ?? [];
            $execution->update([
                'status' => 'running',
                'input' => $input,
                'waiting_since' => null,
            ]);
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
            ]);

            return response()->json([
                'message' => 'Workflow gagal dieksekusi.',
                'data' => $execution->fresh(),
            ], 422);
        }
    }

    private function runWorkflow(
        array $nodes,
        array $edges,
        array $input,
        array &$logs,
        ?string $resumeNodeId = null,
        ?array $resumeContext = null
    ): array {
        if (count($nodes) < 2) {
            throw new RuntimeException(
                'Workflow minimal memiliki Trigger dan node tujuan.'
            );
        }

        /*
         * 1. Normalisasi tipe node dari frontend.
         */
        $typeMap = [
            'Trigger' => 'trigger',
            'AI Agent' => 'ai_agent',
            'Send Message' => 'output',
            'Condition' => 'if_else',
            'Stopper' => 'stopper',

            // Kompatibilitas dengan format lama.
            'trigger' => 'trigger',
            'ai_agent' => 'ai_agent',
            'output' => 'output',
            'if_else' => 'if_else',
            'stopper' => 'stopper',
        ];

        $nodeMap = [];

        foreach ($nodes as $node) {
            if (
                ! is_array($node)
                || ! isset($node['id'], $node['type'])
                || ! is_string($node['id'])
                || $node['id'] === ''
                || ! is_string($node['type'])
                || $node['type'] === ''
            ) {
                throw new RuntimeException(
                    'Node harus memiliki ID dan tipe yang valid.'
                );
            }

            if (isset($nodeMap[$node['id']])) {
                throw new RuntimeException(
                    'ID node duplikat: ' . $node['id']
                );
            }

            $rawType = $node['type'];
            $type = $typeMap[$rawType] ?? null;

            if ($type === null) {
                throw new RuntimeException(
                    'Tipe node belum didukung: ' . $rawType
                );
            }

            $node['type'] = $type;

            if (
                isset($node['data'])
                && ! is_array($node['data'])
            ) {
                throw new RuntimeException(
                    'Data node harus berupa object atau array.'
                );
            }

            $nodeMap[$node['id']] = $node;
        }

        if ($resumeNodeId !== null && ! isset($nodeMap[$resumeNodeId])) {
            throw new RuntimeException(
                'Node lanjutan tidak ditemukan. Workflow mungkin telah diubah saat menunggu pesan.'
            );
        }

        $triggers = array_filter(
            $nodeMap,
            fn (array $node) => $node['type'] === 'trigger'
        );

        $outputs = array_filter(
            $nodeMap,
            fn (array $node) => $node['type'] === 'output'
        );

        $stoppers = array_filter(
            $nodeMap,
            fn (array $node) => $node['type'] === 'stopper'
        );

        if (count($triggers) !== 1) {
            throw new RuntimeException(
                'Workflow harus memiliki tepat satu Trigger.'
            );
        }

        if (count($outputs) < 1) {
            throw new RuntimeException(
                'Workflow harus memiliki minimal satu Send Message.'
            );
        }

        /*
         * 2. Validasi koneksi antarnode.
         */
        $next = [];
        $incoming = [];
        $adjacency = [];

        foreach ($edges as $edge) {
            if (
                ! is_array($edge)
                || ! isset($edge['source'], $edge['target'])
                || ! is_string($edge['source'])
                || ! is_string($edge['target'])
            ) {
                throw new RuntimeException(
                    'Koneksi harus memiliki source dan target.'
                );
            }

            $source = $edge['source'];
            $target = $edge['target'];
            $handle = $edge['sourceHandle'] ?? null;

            if (
                ! isset($nodeMap[$source], $nodeMap[$target])
                || $source === $target
            ) {
                throw new RuntimeException(
                    'Koneksi mengarah ke node yang tidak valid.'
                );
            }

            $sourceType = $nodeMap[$source]['type'];

            if ($sourceType === 'output') {
                throw new RuntimeException(
                    'Node Send Message tidak boleh memiliki koneksi keluar.'
                );
            }

            if ($sourceType === 'if_else') {
                if (! in_array($handle, ['true', 'false'], true)) {
                    throw new RuntimeException(
                        'Koneksi Condition harus memiliki sourceHandle true atau false.'
                    );
                }
            } elseif ($handle !== null) {
                throw new RuntimeException(
                    'sourceHandle hanya didukung pada node Condition.'
                );
            }

            $key = $source . ':' . ($handle ?? 'default');

            if (isset($next[$key])) {
                throw new RuntimeException(
                    'Terdapat beberapa koneksi pada jalur yang sama.'
                );
            }

            if (isset($incoming[$target])) {
                throw new RuntimeException(
                    'Beberapa koneksi menuju satu node belum didukung.'
                );
            }

            $next[$key] = $target;
            $incoming[$target] = true;
            $adjacency[$source][] = $target;
        }

        $triggerId = array_key_first($triggers);

        if (isset($incoming[$triggerId])) {
            throw new RuntimeException(
                'Trigger tidak boleh memiliki koneksi masuk.'
            );
        }

        /*
         * 3. Validasi konfigurasi setiap node.
         */
        foreach ($nodeMap as $nodeId => $node) {
            $type = $node['type'];
            $data = $node['data'] ?? [];

            if ($type === 'trigger') {
                if (! isset($next[$nodeId . ':default'])) {
                    throw new RuntimeException(
                        'Trigger harus memiliki koneksi keluar.'
                    );
                }
            }

            if ($type === 'if_else') {
                if (
                    ! isset($next[$nodeId . ':true'])
                    || ! isset($next[$nodeId . ':false'])
                ) {
                    throw new RuntimeException(
                        'Condition harus memiliki koneksi true dan false.'
                    );
                }

                $condition = $this->getConditionConfig($data);

                if ($condition === null) {
                    throw new RuntimeException(
                        'Konfigurasi Condition tidak valid.'
                    );
                }
            }

            if ($type === 'ai_agent') {
                if (
                    ! isset($next[$nodeId . ':default'])
                ) {
                    throw new RuntimeException(
                        'AI Agent harus memiliki koneksi keluar.'
                    );
                }
            }

            if ($type === 'stopper' && ! isset($next[$nodeId . ':default'])) {
                throw new RuntimeException(
                    'Stopper harus terhubung ke node yang akan dijalankan setelah pesan berikutnya.'
                );
            }
        }

        /*
         * 4. Pastikan semua node dapat dicapai dari Trigger.
         */
        $reachable = $this->findReachableNodes(
            $triggerId,
            $next
        );

        foreach (array_keys($nodeMap) as $nodeId) {
            if (! in_array($nodeId, $reachable, true)) {
                throw new RuntimeException(
                    'Workflow memiliki node yang tidak terhubung ke Trigger: '
                    . $nodeId
                );
            }
        }

        /*
         * 5. Deteksi siklus sebelum menjalankan workflow.
         */
        $indegree = array_fill_keys(
            array_keys($nodeMap),
            0
        );

        foreach ($adjacency as $targets) {
            foreach ($targets as $target) {
                $indegree[$target]++;
            }
        }

        $queue = [];

        foreach ($indegree as $nodeId => $degree) {
            if ($degree === 0) {
                $queue[] = $nodeId;
            }
        }

        $processed = 0;

        while ($queue !== []) {
            $current = array_shift($queue);
            $processed++;

            foreach ($adjacency[$current] ?? [] as $target) {
                $indegree[$target]--;

                if ($indegree[$target] === 0) {
                    $queue[] = $target;
                }
            }
        }

        if ($processed !== count($nodeMap)) {
            throw new RuntimeException(
                'Siklus terdeteksi pada workflow.'
            );
        }

        /*
 * 6. Eksekusi satu jalur workflow.
 *
 * AI Agent menggunakan Gemini untuk menghasilkan jawaban.
 * Send Message membentuk output lokal, bukan mengirim
 * pesan ke layanan eksternal.
 */
$currentId = $resumeNodeId ?? $triggerId;
$visited = [];
$context = $resumeContext ?? $input;
$context = array_replace($context, $input);
$messageOutput = null;
$stoppedAtStopper = false;
$resumeAtNodeId = null;


// Petakan variableDefinitions dari seluruh node ke runtime context.
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
            $sourceValue = substr(
                $sourceValue,
                strlen('input.')
            );
        }

        $context[$name] = $this->getInputValue(
            $context,
            $sourceValue
        );
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

    $provider = $data['provider'] ?? 'gemini';
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
            . "Pesan pelanggan: {$userMessage}";
    }

    if (trim($userMessage) === '') {
        throw new RuntimeException(
            'Pesan pengguna kosong. Periksa input Trigger dan variableDefinitions.'
        );
    }

    $messageOutput = app(GeminiService::class)->generate(
        $systemMessage,
        $userMessage,
        (float) ($data['temperature'] ?? 0.7),
        is_string($data['model'] ?? null) ? $data['model'] : null
    );

    $context['ai_response'] = $messageOutput;

    $message = 'AI Agent berhasil menghasilkan jawaban menggunakan Gemini.';

    $logs[] = [
        'node_id' => $currentId,
        'node' => $type,
        'status' => 'success',
        'message' => $message,
        'provider' => 'gemini',
        'model' => $model,
        'timestamp' => now()->toISOString(),
    ];

    $currentId = $next[$currentId . ':default'];
    continue;
} elseif ($type === 'if_else') {
                $condition = $this->getConditionConfig($data);

                if ($condition === null) {
                    throw new RuntimeException(
                        'Konfigurasi Condition tidak valid.'
                    );
                }

                $actual = $this->getInputValue(
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

                $matched = $this->evaluateCondition(
                    $actual,
                    $condition['operator'],
                    $expected
                );

                $handle = $matched ? 'true' : 'false';

                $message = 'Condition menghasilkan jalur '
                    . strtoupper($handle) . '.';
            } elseif ($type === 'output') {
                $template = $data['messageTemplate'] ?? '';

                $messageOutput = $this->resolveTemplate(
                    (string) $template,
                    $context
                );

                $context['message'] = $messageOutput;

                $message = 'Send Message menghasilkan output lokal. '
                    . 'Pesan belum dikirim ke layanan eksternal.';
            } elseif ($type === 'stopper') {
                $stoppedAtStopper = true;
                $resumeAtNodeId = $next[$currentId . ':default'] ?? null;
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

            $key = $currentId . ':' . $handle;

            if (! isset($next[$key])) {
                throw new RuntimeException(
                    'Koneksi berikutnya tidak ditemukan untuk node: '
                    . $currentId
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
        ];
    }

    /**
     * Mendukung format Condition frontend dan format lama.
     */
    private function getConditionConfig(array $data): ?array
    {
        if (isset($data['condition']) && is_array($data['condition'])) {
            $condition = $data['condition'];

            $field = $condition['field'] ?? null;
            $operator = $condition['operator'] ?? null;
            $value = $condition['value'] ?? null;
        } else {
            $field = $data['conditionVariable'] ?? null;
            $operator = $data['conditionOperator'] ?? null;
            $value = $data['conditionValue'] ?? null;
        }

        $allowedOperators = [
            'equals',
            'not_equals',
            'contains',
            'not_contains',
            'is_empty',
            'is_not_empty',
        ];

        if (
            ! is_string($field)
            || $field === ''
            || ! is_string($operator)
            || ! in_array($operator, $allowedOperators, true)
        ) {
            return null;
        }

        if (
            ! in_array($operator, ['is_empty', 'is_not_empty'], true)
            && ! is_scalar($value)
            && $value !== null
        ) {
            return null;
        }

        return [
            'field' => $field,
            'operator' => $operator,
            'value' => $value,
        ];
    }

    /**
     * Evaluasi operator Condition.
     */
    private function evaluateCondition(
        mixed $actual,
        string $operator,
        mixed $expected
    ): bool {
        return match ($operator) {
            'equals' => $actual === $expected,
            'not_equals' => $actual !== $expected,

            'contains' => is_string($actual)
                && is_string($expected)
                && str_contains($actual, $expected),

            'not_contains' => ! (
                is_string($actual)
                && is_string($expected)
                && str_contains($actual, $expected)
            ),

            'is_empty' => $actual === null
                || $actual === ''
                || $actual === [],

            'is_not_empty' => ! (
                $actual === null
                || $actual === ''
                || $actual === []
            ),

            default => false,
        };
    }

    /**
     * Mengambil nilai dari input/context menggunakan dot notation.
     */
    private function getInputValue(
        array $input,
        string $field
    ): mixed {
        $value = $input;

        foreach (explode('.', $field) as $segment) {
            if (
                ! is_array($value)
                || ! array_key_exists($segment, $value)
            ) {
                return null;
            }

            $value = $value[$segment];
        }

        return $value;
    }

    /**
     * Mengganti placeholder seperti {{name}} atau {{user.name}}.
     */
    private function resolveTemplate(
        string $template,
        array $context
    ): string {
        return preg_replace_callback(
            '/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/',
            function (array $matches) use ($context): string {
                $value = $this->getInputValue(
                    $context,
                    $matches[1]
                );

                if (
                    is_string($value)
                    || is_int($value)
                    || is_float($value)
                    || is_bool($value)
                ) {
                    return is_bool($value)
                        ? ($value ? 'true' : 'false')
                        : (string) $value;
                }

                return '';
            },
            $template
        ) ?? $template;
    }

    /**
     * Mencari seluruh node yang dapat dicapai dari node awal.
     */
    private function findReachableNodes(
        string $start,
        array $next
    ): array {
        $visited = [];
        $stack = [$start];

        while ($stack !== []) {
            $current = array_pop($stack);

            if (isset($visited[$current])) {
                continue;
            }

            $visited[$current] = true;

            foreach (['default', 'true', 'false'] as $handle) {
                $key = $current . ':' . $handle;

                if (isset($next[$key])) {
                    $stack[] = $next[$key];
                }
            }
        }

        return array_keys($visited);
    }
}
