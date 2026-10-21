<?php

namespace App\Providers;

use App\Models\Workflow;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
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

        /*
         * Setiap endpoint memakai bucket rate limit sendiri supaya polling
         * pesan widget tidak ikut memblokir pengiriman pesan pelanggan.
         */
        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(5)
            ->by('login|'.$request->ip()));

        RateLimiter::for('setup', fn (Request $request) => Limit::perMinute(10)
            ->by('setup|'.$request->ip()));

        RateLimiter::for('public-start', fn (Request $request) => Limit::perMinute(20)
            ->by('public-start|'.$request->ip()));

        RateLimiter::for('public-poll', fn (Request $request) => Limit::perMinute(120)
            ->by('public-poll|'.$request->ip().'|'.$request->route('token')));

        RateLimiter::for('public-send', fn (Request $request) => Limit::perMinute(30)
            ->by('public-send|'.$request->ip().'|'.$request->route('token')));

        RateLimiter::for('workflow-execute', fn (Request $request) => Limit::perMinute(30)
            ->by('workflow-execute|'.($request->user()?->id ?? $request->ip())));
    }
}
