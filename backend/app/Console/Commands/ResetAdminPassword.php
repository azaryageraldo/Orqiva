<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class ResetAdminPassword extends Command
{
    protected $signature = 'orqiva:reset-admin-password
                            {--password= : Password baru untuk admin (default: 12345)}';

    protected $description = 'Reset password admin (user pertama) ke default 12345';

    public function handle(): int
    {
        $user = User::query()->orderBy('id')->first();

        if (! $user) {
            $this->error('Belum ada pengguna. Jalankan setup terlebih dahulu.');
            return self::FAILURE;
        }

        $password = $this->option('password') ?? '12345';

        $user->forceFill(['password' => Hash::make($password)])->save();

        $this->info(
            "Password pengguna {$user->name} (ID {$user->id}) berhasil diubah menjadi: {$password}"
        );

        return self::SUCCESS;
    }
}
