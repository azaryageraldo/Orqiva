<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SetupController extends Controller
{
    public function status(): JsonResponse
    {
        return response()->json([
            'data' => [
                'required' => ! User::query()->exists(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:190'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = Cache::lock('orqiva.first-account', 10)->block(5, function () use ($validated): User {
            return DB::transaction(function () use ($validated): User {
                if (User::query()->lockForUpdate()->exists()) {
                    throw ValidationException::withMessages([
                        'email' => 'Orqiva sudah memiliki akun. Silakan masuk.',
                    ]);
                }

                return User::create([
                    'name' => trim($validated['name']),
                    'email' => strtolower(trim($validated['email'])),
                    'password' => $validated['password'],
                ]);
            });
        });

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json([
            'message' => 'Akun Orqiva berhasil dibuat.',
            'user' => $user,
        ], 201);
    }
}
