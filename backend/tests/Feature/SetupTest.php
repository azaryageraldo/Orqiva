<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SetupTest extends TestCase
{
    use RefreshDatabase;

    public function test_setup_is_required_when_no_user_exists(): void
    {
        $this->getJson('/api/v1/setup/status')
            ->assertOk()
            ->assertJsonPath('data.required', true);
    }

    public function test_setup_is_not_required_after_an_account_exists(): void
    {
        User::create([
            'name' => 'Owner',
            'email' => 'owner@example.com',
            'password' => 'password123',
        ]);

        $this->getJson('/api/v1/setup/status')
            ->assertOk()
            ->assertJsonPath('data.required', false);
    }

    public function test_first_account_can_be_created_and_is_logged_in(): void
    {
        $this->withHeader('Origin', 'http://localhost:5173')
            ->postJson('/api/v1/setup', [
                'name' => 'Orqiva Owner',
                'email' => 'Owner@Example.com',
                'password' => 'password123',
                'password_confirmation' => 'password123',
            ])
            ->assertCreated()
            ->assertJsonPath('user.email', 'owner@example.com');

        $user = User::query()->firstOrFail();

        $this->assertSame('Orqiva Owner', $user->name);
        $this->assertTrue(Hash::check('password123', $user->password));
        $this->assertAuthenticatedAs($user);

        $this->getJson('/api/v1/me')
            ->assertOk()
            ->assertJsonPath('user.email', 'owner@example.com');

        $this->getJson('/api/v1/setup/status')
            ->assertOk()
            ->assertJsonPath('data.required', false);
    }

    public function test_setup_cannot_run_twice(): void
    {
        User::create([
            'name' => 'Owner',
            'email' => 'owner@example.com',
            'password' => 'password123',
        ]);

        $this->postJson('/api/v1/setup', [
            'name' => 'Second Owner',
            'email' => 'second@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');

        $this->assertSame(1, User::query()->count());
    }

    public function test_setup_validates_the_first_account(): void
    {
        $this->postJson('/api/v1/setup', [
            'name' => '',
            'email' => 'not-an-email',
            'password' => 'short',
            'password_confirmation' => 'different',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email', 'password']);

        $this->assertSame(0, User::query()->count());
    }
}
