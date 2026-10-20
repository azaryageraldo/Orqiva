<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiProviderSetting;
use App\Services\AI\AiProviderCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class AiSettingsController extends Controller
{
    public function __construct(
        private readonly AiProviderCatalog $catalog
    ) {}

    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->payload($request),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'provider' => ['sometimes', 'nullable', 'string', Rule::in(array_keys(AiProviderCatalog::PROVIDERS))],
            'api_key' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'default_model' => ['sometimes', 'nullable', 'string', 'max:255'],
            'debounce_ms' => ['sometimes', 'integer', 'min:0', 'max:5000'],
        ]);

        $user = $request->user();
        $providerInput = trim((string) ($validated['provider'] ?? ''));

        if ($providerInput === '') {
            if (array_key_exists('api_key', $validated) || array_key_exists('default_model', $validated)) {
                throw ValidationException::withMessages([
                    'provider' => 'Pilih provider AI terlebih dahulu.',
                ]);
            }

            if (! array_key_exists('debounce_ms', $validated)) {
                throw ValidationException::withMessages([
                    'provider' => 'Pilih provider AI atau isi preferensi balasan.',
                ]);
            }

            $user->update([
                'ai_reply_debounce_ms' => (int) $validated['debounce_ms'],
            ]);

            return response()->json([
                'message' => 'Preferensi AI disimpan.',
                'data' => $this->payload($request),
            ]);
        }

        $provider = $this->catalog->normalizeProvider($providerInput);
        $setting = AiProviderSetting::query()->firstOrNew([
            'user_id' => $user->id,
            'provider' => $provider,
        ]);

        $newKey = trim((string) ($validated['api_key'] ?? ''));
        $existingKey = trim((string) ($setting->api_key ?? ''));
        $shouldDetect = $newKey !== '' || (
            $existingKey !== ''
            && (! is_array($setting->models) || $setting->models === [])
        );

        if ($newKey !== '') {
            $setting->api_key = $newKey;
        }

        if ($shouldDetect) {
            try {
                $models = $this->catalog->detectModels(
                    $provider,
                    $newKey !== '' ? $newKey : $existingKey
                );
            } catch (RuntimeException $exception) {
                throw ValidationException::withMessages([
                    'api_key' => $exception->getMessage(),
                ]);
            }

            $setting->models = $models;
            $setting->last_checked_at = now();
        }

        if (trim((string) ($setting->api_key ?? '')) === '') {
            throw ValidationException::withMessages([
                'api_key' => 'API key wajib diisi untuk provider ini.',
            ]);
        }

        $models = is_array($setting->models) ? $setting->models : [];
        $defaultModel = array_key_exists('default_model', $validated)
            ? trim((string) ($validated['default_model'] ?? ''))
            : trim((string) ($setting->default_model ?? ''));

        if ($defaultModel === '' && $models !== []) {
            $defaultModel = (string) $models[0];
        }

        if ($defaultModel !== '' && $models !== [] && ! in_array($defaultModel, $models, true)) {
            throw ValidationException::withMessages([
                'default_model' => 'Model default harus dipilih dari model yang terdeteksi.',
            ]);
        }

        $setting->default_model = $defaultModel !== '' ? $defaultModel : null;
        $setting->save();

        if (array_key_exists('debounce_ms', $validated)) {
            $user->update([
                'ai_reply_debounce_ms' => (int) $validated['debounce_ms'],
            ]);
        }

        $user->refresh();

        return response()->json([
            'message' => 'Pengaturan AI disimpan.',
            'data' => $this->payload($request),
        ]);
    }

    public function detectModels(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'provider' => ['required', 'string', Rule::in(array_keys(AiProviderCatalog::PROVIDERS))],
            'api_key' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);

        $provider = $this->catalog->normalizeProvider($validated['provider']);
        $apiKey = trim((string) ($validated['api_key'] ?? ''));

        if ($apiKey === '') {
            $apiKey = trim((string) AiProviderSetting::query()
                ->where('user_id', $request->user()->id)
                ->where('provider', $provider)
                ->first()?->api_key);
        }

        if ($apiKey === '') {
            throw ValidationException::withMessages([
                'api_key' => 'Isi API key terlebih dahulu.',
            ]);
        }

        try {
            $models = $this->catalog->detectModels($provider, $apiKey);
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages([
                'api_key' => $exception->getMessage(),
            ]);
        }

        return response()->json([
            'data' => [
                'provider' => $provider,
                'provider_label' => $this->catalog->label($provider),
                'models' => $models,
            ],
        ]);
    }

    public function destroy(Request $request, string $provider): JsonResponse
    {
        if (! array_key_exists($provider, AiProviderCatalog::PROVIDERS)) {
            throw ValidationException::withMessages([
                'provider' => 'Provider AI tidak dikenal.',
            ]);
        }

        $provider = $this->catalog->normalizeProvider($provider);

        AiProviderSetting::query()
            ->where('user_id', $request->user()->id)
            ->where('provider', $provider)
            ->delete();

        return response()->json([
            'message' => 'API key provider dihapus.',
            'data' => $this->payload($request),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(Request $request): array
    {
        $settings = AiProviderSetting::query()
            ->where('user_id', $request->user()->id)
            ->get()
            ->keyBy('provider');

        $providers = [];
        $models = [];

        foreach (AiProviderCatalog::PROVIDERS as $provider => $label) {
            $setting = $settings->get($provider);
            $providerModels = is_array($setting?->models)
                ? array_values(array_filter(
                    $setting->models,
                    fn (mixed $model): bool => is_string($model) && trim($model) !== ''
                ))
                : [];

            $providers[] = [
                'provider' => $provider,
                'label' => $label,
                'configured' => $setting !== null,
                'models' => $providerModels,
                'default_model' => $setting?->default_model,
                'last_checked_at' => $setting?->last_checked_at?->toISOString(),
            ];

            foreach ($providerModels as $model) {
                $models[] = [
                    'id' => $model,
                    'provider' => $provider,
                    'provider_label' => $label,
                ];
            }
        }

        return [
            'providers' => $providers,
            'models' => $models,
            'debounce_ms' => (int) ($request->user()?->ai_reply_debounce_ms ?? 0),
        ];
    }
}
