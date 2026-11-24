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
    protected $signature = 'orqiva:prune {--days=30 : Batas hari retensi log eksekusi}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Membersihkan log audit eksekusi lama dan antrean gagal untuk memelihara database';

    public function handle(): int
    {
        $days = max(1, (int) $this->option('days'));
        $cutoff = now()->subDays($days);

        // Hapus eksekusi alur kerja lama yang sudah berstatus terminal
        $deleted = WorkflowExecution::query()
            ->whereIn('status', ['success', 'failed'])
            ->where('created_at', '<', $cutoff)
            ->delete();

        $this->info("Berhasil membersihkan {$deleted} log eksekusi yang lebih lama dari {$days} hari.");

        // Bersihkan failed jobs jika tabel exists
        if (Schema::hasTable('failed_jobs')) {
            try {
                Artisan::call('queue:prune-failed', ['--hours' => 168]);
                $this->info('Berhasil membersihkan failed jobs antrean yang lebih lama dari 7 hari.');
            } catch (\Throwable) {
                // Abaikan jika command tidak tersedia
            }
        }

        return Command::SUCCESS;
    }
}
