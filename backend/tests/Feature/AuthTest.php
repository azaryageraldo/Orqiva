<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    private function user(): User
    {
        return User::create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'password' => 'password',
        ]);
    }

    public function test_user_can_login(): void
    {
        $this->user();

        $this->withHeader('Origin', 'http://localhost:5173')
            ->postJson('/api/v1/login', [
                'email' => 'admin@example.com',
                'password' => 'password',
            ])
            ->assertOk()
            ->assertJsonPath('user.email', 'admin@example.com');
    }

    public function test_login_fails_with_wrong_password(): void
    {
        $this->user();

        $this->withHeader('Origin', 'http://localhost:5173')
            ->postJson('/api/v1/login', [
                'email' => 'admin@example.com',
                'password' => 'wrong-password',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    public function test_login_is_rate_limited(): void
    {
        $this->user();

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->withHeader('Origin', 'http://localhost:5173')
                ->postJson('/api/v1/login', [
                    'email' => 'admin@example.com',
                    'password' => 'wrong-password',
                ])
                ->assertStatus(422);
        }

        $this->withHeader('Origin', 'http://localhost:5173')
            ->postJson('/api/v1/login', [
                'email' => 'admin@example.com',
                'password' => 'wrong-password',
            ])
            ->assertStatus(429);
    }

    public function test_me_requires_authentication(): void
    {
        $this->getJson('/api/v1/me')->assertUnauthorized();

        $this->actingAs($this->user())
            ->getJson('/api/v1/me')
            ->assertOk()
            ->assertJsonPath('user.email', 'admin@example.com');
    }
}
