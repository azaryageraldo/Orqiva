<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WorkflowExecution;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UsageStatsController extends Controller
{
    /**
     * Ringkasan penggunaan token AI per periode.
     */
    public function tokenUsage(Request $request): JsonResponse
    {
        $period = $request->query('period', 'daily');

        if (! in_array($period, ['daily', 'monthly', 'yearly'], true)) {
            $period = 'daily';
        }

        [$format, $series] = $this->buildBuckets($period);

        $start = $this->bucketStart($period, $series[0]['key'] ?? null);

        $rows = WorkflowExecution::query()
            ->whereHas(
                'workflow',
                fn ($query) => $query->where('user_id', $request->user()->id)
            )
            ->where('created_at', '>=', $start)
            ->get(['created_at', 'prompt_tokens', 'completion_tokens', 'total_tokens']);

        $indexed = [];

        foreach ($series as $bucket) {
            $indexed[$bucket['key']] = $bucket;
        }

        foreach ($rows as $row) {
            $key = $row->created_at->format($format);

            if (! isset($indexed[$key])) {
                continue;
            }

            $indexed[$key]['prompt_tokens'] += (int) $row->prompt_tokens;
            $indexed[$key]['completion_tokens'] += (int) $row->completion_tokens;
            $indexed[$key]['total_tokens'] += (int) $row->total_tokens;
            $indexed[$key]['executions']++;
        }

        $data = array_values($indexed);

        return response()->json([
            'data' => [
                'period' => $period,
                'totals' => [
                    'prompt_tokens' => array_sum(array_column($data, 'prompt_tokens')),
                    'completion_tokens' => array_sum(array_column($data, 'completion_tokens')),
                    'total_tokens' => array_sum(array_column($data, 'total_tokens')),
                    'executions' => array_sum(array_column($data, 'executions')),
                ],
                'series' => $data,
            ],
        ]);
    }

    /**
     * Riwayat eksekusi terbaru untuk halaman Activity.
     */
    public function activity(Request $request): JsonResponse
    {
        $limit = (int) $request->query('limit', 20);
        $limit = max(1, min($limit, 50));

        $page = (int) $request->query('page', 1);
        $page = max(1, $page);

        $status = $request->query('status');
        $status = is_string($status) && in_array(
            $status,
            ['running', 'waiting', 'success', 'failed', 'escalated'],
            true
        ) ? $status : null;

        $from = $request->query('from');
        $from = is_string($from) && strtotime($from) !== false
            ? CarbonImmutable::parse($from)
            : null;

        $rawTo = $request->query('to');
        $to = is_string($rawTo) && strtotime($rawTo) !== false
            ? CarbonImmutable::parse($rawTo)
            : null;

        // Tanggal tanpa jam mencakup seluruh hari tersebut.
        $toIsDateOnly = is_string($rawTo)
            && preg_match('/^\d{4}-\d{2}-\d{2}$/', $rawTo) === 1;

        $userId = $request->user()->id;

        $owned = fn ($query) => $query->where('user_id', $userId);

        $summary = WorkflowExecution::query()
            ->whereHas('workflow', $owned)
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        $executions = WorkflowExecution::query()
            ->whereHas('workflow', $owned)
            ->with(['workflow:id,name', 'contact:id,public_id,name', 'chatSession:id,status'])
            ->withCount('steps')
            ->when(
                $status !== null,
                fn ($query) => $query->where('status', $status)
            )
            ->when(
                $from !== null,
                fn ($query) => $query->where('created_at', '>=', $from)
            )
            ->when(
                $to !== null,
                fn ($query) => $query->where(
                    'created_at',
                    '<=',
                    $toIsDateOnly ? $to->endOfDay() : $to
                )
            )
            ->latest()
            ->orderByDesc('id')
            ->skip(($page - 1) * $limit)
            ->take($limit + 1)
            ->get();

        $hasMore = $executions->count() > $limit;
        $executions = $executions
            ->take($limit)
            ->map(fn (WorkflowExecution $execution) => [
                'id' => $execution->id,
                'workflow_id' => $execution->workflow_id,
                'workflow_name' => $execution->workflow?->name,
                'contact_id' => $execution->contact?->public_id
                    ?? data_get($execution->input, 'conversation_id'),
                'contact_name' => $execution->contact?->name,
                'session_id' => $execution->chat_session_id,
                'session_status' => $execution->chatSession?->status,
                'status' => $execution->status,
                'total_tokens' => (int) $execution->total_tokens,
                'steps_count' => (int) $execution->steps_count,
                'error' => $execution->error,
                'started_at' => $execution->started_at?->toISOString(),
                'finished_at' => $execution->finished_at?->toISOString(),
            ]);

        return response()->json([
            'data' => [
                'summary' => [
                    'total' => WorkflowExecution::query()
                        ->whereHas('workflow', $owned)
                        ->count(),
                    'success' => (int) ($summary['success'] ?? 0),
                    'failed' => (int) ($summary['failed'] ?? 0),
                    'waiting' => (int) ($summary['waiting'] ?? 0),
                    'running' => (int) ($summary['running'] ?? 0),
                    'escalated' => (int) ($summary['escalated'] ?? 0),
                ],
                'executions' => $executions->values(),
                'meta' => [
                    'page' => $page,
                    'per_page' => $limit,
                    'has_more' => $hasMore,
                ],
            ],
        ]);
    }

    /**
     * Susun label kosong untuk setiap bucket pada periode terpilih.
     *
     * @return array{0: string, 1: array<int, array<string, mixed>>}
     */
    private function buildBuckets(string $period): array
    {
        $now = CarbonImmutable::now();

        [$format, $count, $step, $label] = match ($period) {
            'monthly' => ['Y-m', 12, 'subMonths', 'M Y'],
            'yearly' => ['Y', 5, 'subYears', 'Y'],
            default => ['Y-m-d', 14, 'subDays', 'd/m'],
        };

        $series = [];

        for ($i = $count - 1; $i >= 0; $i--) {
            $date = $now->{$step}($i);
            $key = $date->format($format);

            $series[] = [
                'key' => $key,
                'label' => $date->format($label),
                'prompt_tokens' => 0,
                'completion_tokens' => 0,
                'total_tokens' => 0,
                'executions' => 0,
            ];
        }

        return [$format, $series];
    }

    private function bucketStart(string $period, ?string $firstKey): CarbonImmutable
    {
        if ($firstKey === null) {
            return CarbonImmutable::now()->subYear();
        }

        return match ($period) {
            'monthly' => CarbonImmutable::createFromFormat('Y-m', $firstKey)->startOfMonth(),
            'yearly' => CarbonImmutable::createFromFormat('Y', $firstKey)->startOfYear(),
            default => CarbonImmutable::createFromFormat('Y-m-d', $firstKey)->startOfDay(),
        };
    }
}
