<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $email = 'owner@example.com'): User
    {
        return User::create([
            'name' => 'Owner',
            'email' => $email,
            'password' => 'password',
        ]);
    }

    public function test_guests_cannot_access_profile(): void
    {
        $this->getJson('/api/v1/profile')->assertUnauthorized();
        $this->putJson('/api/v1/profile', [])->assertUnauthorized();
    }

    public function test_user_can_update_name_and_email(): void
    {
        $user = $this->user();

        $this->actingAs($user)
            ->putJson('/api/v1/profile', [
                'name' => 'Orqiva Admin',
                'email' => 'new@example.com',
            ])
            ->assertOk()
            ->assertJsonPath('user.name', 'Orqiva Admin')
            ->assertJsonPath('user.email', 'new@example.com')
            ->assertJsonMissingPath('user.password');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Orqiva Admin',
            'email' => 'new@example.com',
        ]);
    }

    public function test_email_must_be_unique(): void
    {
        $user = $this->user();
        $this->user('taken@example.com');

        $this->actingAs($user)
            ->putJson('/api/v1/profile', [
                'name' => 'Owner',
                'email' => 'taken@example.com',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    public function test_password_change_requires_current_password(): void
    {
        $user = $this->user();

        $this->actingAs($user)
            ->putJson('/api/v1/profile', [
                'name' => 'Owner',
                'email' => 'owner@example.com',
                'password' => 'new-password',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('current_password');

        $this->assertTrue(Hash::check('password', $user->fresh()->password));
    }

    public function test_password_change_rejects_wrong_current_password(): void
    {
        $user = $this->user();

        $this->actingAs($user)
            ->putJson('/api/v1/profile', [
                'name' => 'Owner',
                'email' => 'owner@example.com',
                'password' => 'new-password',
                'current_password' => 'wrong-password',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('current_password');

        $this->assertTrue(Hash::check('password', $user->fresh()->password));
    }

    public function test_user_can_change_password_with_current_password(): void
    {
        $user = $this->user();

        $this->actingAs($user)
            ->putJson('/api/v1/profile', [
                'name' => 'Owner',
                'email' => 'owner@example.com',
                'password' => 'new-password',
                'current_password' => 'password',
            ])
            ->assertOk();

        $this->assertTrue(Hash::check('new-password', $user->fresh()->password));
    }

    public function test_short_password_is_rejected(): void
    {
        $user = $this->user();

        $this->actingAs($user)
            ->putJson('/api/v1/profile', [
                'name' => 'Owner',
                'email' => 'owner@example.com',
                'password' => 'short',
                'current_password' => 'password',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('password');
    }
}
