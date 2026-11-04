<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    private function user(): User
    {
        return User::create([
            'name' => 'Owner',
            'email' => null,
            'password' => 'password',
        ]);
    }

    public function test_guests_cannot_access_profile(): void
    {
        $this->getJson('/api/v1/profile')->assertUnauthorized();
        $this->putJson('/api/v1/profile', [])->assertUnauthorized();
    }

    public function test_user_can_update_name(): void
    {
        $user = $this->user();

        $this->actingAs($user)
            ->putJson('/api/v1/profile', [
                'name' => 'Orqiva Admin',
            ])
            ->assertOk()
            ->assertJsonPath('user.name', 'Orqiva Admin')
            ->assertJsonMissingPath('user.password');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Orqiva Admin',
        ]);
    }

    public function test_password_change_requires_current_password(): void
    {
        $user = $this->user();

        $this->actingAs($user)
            ->putJson('/api/v1/profile', [
                'name' => 'Owner',
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
                'password' => 'short',
                'current_password' => 'password',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('password');
    }
}
