<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('ORQIVA_ADMIN_EMAIL');
        $password = env('ORQIVA_ADMIN_PASSWORD');

        if (! is_string($email) || trim($email) === '' || ! is_string($password) || $password === '') {
            throw new RuntimeException(
                'Set ORQIVA_ADMIN_EMAIL dan ORQIVA_ADMIN_PASSWORD, atau gunakan wizard setup saat pertama kali membuka Orqiva.'
            );
        }

        User::updateOrCreate(
            ['email' => strtolower(trim($email))],
            [
                'name' => env('ORQIVA_ADMIN_NAME', 'Orqiva Admin'),
                'password' => Hash::make($password),
            ]
        );
    }
}
