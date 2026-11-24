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
    protected $signature = 'sessions:auto-resolve {--hours=24 : Inactivity threshold in hours}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically resolve inactive chat sessions after a given duration';

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
            $this->info("No inactive chat sessions need to be resolved (threshold: {$hours} hours).");

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

        $this->info("Successfully resolved {$sessions->count()} inactive chat sessions ({$hours} hours threshold).");

        return Command::SUCCESS;
    }
}

