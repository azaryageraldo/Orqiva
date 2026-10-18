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

        $summary = WorkflowExecution::query()
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        $executions = WorkflowExecution::query()
            ->with('workflow:id,name')
            ->latest()
            ->limit($limit)
            ->get()
            ->map(fn (WorkflowExecution $execution) => [
                'id' => $execution->id,
                'workflow_id' => $execution->workflow_id,
                'workflow_name' => $execution->workflow?->name,
                'status' => $execution->status,
                'total_tokens' => (int) $execution->total_tokens,
                'error' => $execution->error,
                'started_at' => $execution->started_at?->toISOString(),
                'finished_at' => $execution->finished_at?->toISOString(),
            ]);

        return response()->json([
            'data' => [
                'summary' => [
                    'total' => WorkflowExecution::count(),
                    'success' => (int) ($summary['success'] ?? 0),
                    'failed' => (int) ($summary['failed'] ?? 0),
                    'waiting' => (int) ($summary['waiting'] ?? 0),
                    'running' => (int) ($summary['running'] ?? 0),
                ],
                'executions' => $executions,
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
