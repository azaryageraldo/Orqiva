<?php

namespace App\Console\Commands;

use App\Models\WorkflowExecution;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;

class PruneAuditLogs extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'orqiva:prune {--days=30 : Execution log retention in days}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Prune old execution audit logs and failed queue jobs to keep database lightweight';

    public function handle(): int
    {
        $days = max(1, (int) $this->option('days'));
        $cutoff = now()->subDays($days);

        // Delete old workflow executions that reached a terminal status
        $deleted = WorkflowExecution::query()
            ->whereIn('status', ['success', 'failed'])
            ->where('created_at', '<', $cutoff)
            ->delete();

        $this->info("Successfully pruned {$deleted} execution logs older than {$days} days.");

        // Clean up failed queue jobs if table exists
        if (Schema::hasTable('failed_jobs')) {
            try {
                Artisan::call('queue:prune-failed', ['--hours' => 168]);
                $this->info('Successfully pruned failed queue jobs older than 7 days.');
            } catch (\Throwable) {
                // Ignore if queue command is unavailable
            }
        }

        return Command::SUCCESS;
    }
}

