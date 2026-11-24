<?php

namespace App\Console\Commands;

use App\Models\ChatSession;
use Illuminate\Console\Command;

class AutoResolveSessions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sessions:auto-resolve {--hours=24 : Batas inaktivitas dalam jam}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Menutup sesi chat yang tidak aktif secara otomatis setelah batas waktu tertentu';

    public function handle(): int
    {
        $hours = max(1, (int) $this->option('hours'));
        $cutoff = now()->subHours($hours);

        $sessions = ChatSession::query()
            ->where('status', '!=', ChatSession::STATUS_ENDED)
            ->where(function ($query) use ($cutoff): void {
                $query->where('last_activity_at', '<', $cutoff)
                    ->orWhere(function ($q) use ($cutoff): void {
                        $q->whereNull('last_activity_at')
                            ->where('created_at', '<', $cutoff);
                    });
            })
            ->get(['id']);

        if ($sessions->isEmpty()) {
            $this->info("Tidak ada sesi chat yang perlu ditutup (batas: {$hours} jam).");

            return Command::SUCCESS;
        }

        $sessionIds = $sessions->pluck('id');

        ChatSession::query()
            ->whereIn('id', $sessionIds)
            ->update([
                'status' => ChatSession::STATUS_ENDED,
                'ended_at' => now(),
                'current_workflow_id' => null,
                'current_node_id' => null,
            ]);

        $this->info("Berhasil menutup {$sessions->count()} sesi chat yang tidak aktif selama {$hours} jam.");

        return Command::SUCCESS;
    }
}
