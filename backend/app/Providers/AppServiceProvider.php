<?php

namespace App\Providers;

use App\Models\Workflow;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Register application services here.
    }

    public function boot(): void
    {
        /*
         * Batasi resolusi route model workflow pada pemiliknya agar
         * workflow milik pengguna lain menghasilkan 404.
         */
        Route::bind('workflow', function (string $value) {
            $user = auth()->user();

            return Workflow::query()
                ->when(
                    $user !== null,
                    fn ($query) => $query->where('user_id', $user->id)
                )
                ->findOrFail($value);
        });
    }
}
