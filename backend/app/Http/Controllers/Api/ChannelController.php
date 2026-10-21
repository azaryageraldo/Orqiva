<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Channel;
use App\Models\Workflow;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ChannelController extends Controller
{
    private const DEFAULT_APPEARANCE = [
        'header_color' => '#17212b',
        'background_color' => '#0e1621',
        'outgoing_color' => '#2b5278',
        'accent_color' => '#64b5ef',
    ];

    private const ICON_KINDS = ['chat', 'launcher'];

    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->serialize($this->channelFor($request)),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $channel = $this->channelFor($request);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'workflow_id' => ['sometimes', 'nullable', 'integer', Rule::exists('workflows', 'id')],
            'is_active' => ['sometimes', 'boolean'],
            'settings' => ['sometimes', 'nullable', 'array'],
            'settings.welcome_message' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'settings.placeholder' => ['sometimes', 'nullable', 'string', 'max:160'],
            'settings.open_mode' => ['sometimes', Rule::in(['manual', 'always'])],
            'settings.appearance' => ['sometimes', 'array'],
            'settings.appearance.header_color' => ['sometimes', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'settings.appearance.background_color' => ['sometimes', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'settings.appearance.outgoing_color' => ['sometimes', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'settings.appearance.accent_color' => ['sometimes', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
        ]);

        if (
            array_key_exists('workflow_id', $validated)
            && $validated['workflow_id'] !== null
        ) {
            $workflow = Workflow::query()
                ->whereKey($validated['workflow_id'])
                ->where('user_id', $request->user()->id)
                ->first();

            if ($workflow === null) {
                throw ValidationException::withMessages([
                    'workflow_id' => 'Workflow tidak ditemukan atau bukan milik akun ini.',
                ]);
            }

            $hasTrigger = collect(data_get($workflow->definition, 'nodes', []))
                ->contains(fn ($node) => is_array($node)
                    && in_array($node['type'] ?? null, ['Trigger', 'trigger'], true));

            if (! $hasTrigger) {
                throw ValidationException::withMessages([
                    'workflow_id' => 'Workflow entry harus memiliki satu node Trigger. Workflow lanjutan cukup diakses lewat Go To.',
                ]);
            }
        }

        if (($validated['is_active'] ?? false) === true && $channel->workflow_id === null && ! isset($validated['workflow_id'])) {
            throw ValidationException::withMessages([
                'workflow_id' => 'Pilih workflow entry sebelum mengaktifkan widget.',
            ]);
        }

        if (array_key_exists('settings', $validated)) {
            $validated['settings'] = $this->mergeSettings(
                $channel->settings ?? [],
                is_array($validated['settings']) ? $validated['settings'] : []
            );
        }

        $channel->update($validated);

        return response()->json([
            'data' => $this->serialize($channel->fresh(['workflow'])),
        ]);
    }

    public function uploadIcon(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'kind' => ['required', Rule::in(self::ICON_KINDS)],
            'icon' => ['required', 'file', 'mimes:png,jpg,jpeg,webp', 'max:1024'],
        ]);

        $channel = $this->channelFor($request);
        $kind = (string) $validated['kind'];
        $stored = $this->storeIcon($channel, $validated['icon']);
        $settings = $this->normalizeSettings($channel->settings ?? []);
        $previous = $settings['icons'][$kind] ?? null;

        if (is_string($previous) && $previous !== '') {
            Storage::disk('public')->delete($previous);
        }

        $settings['icons'][$kind] = $stored;
        $channel->update(['settings' => $settings]);

        return response()->json([
            'data' => $this->serialize($channel->fresh(['workflow'])),
        ]);
    }

    public function deleteIcon(Request $request, string $kind): JsonResponse
    {
        abort_unless(in_array($kind, self::ICON_KINDS, true), 404);

        $channel = $this->channelFor($request);
        $settings = $this->normalizeSettings($channel->settings ?? []);
        $previous = $settings['icons'][$kind] ?? null;

        if (is_string($previous) && $previous !== '') {
            Storage::disk('public')->delete($previous);
        }

        $settings['icons'][$kind] = null;
        $channel->update(['settings' => $settings]);

        return response()->json([
            'data' => $this->serialize($channel->fresh(['workflow'])),
        ]);
    }

    public function regenerate(Request $request): JsonResponse
    {
        $channel = $this->channelFor($request);

        $channel->update([
            'public_token' => Str::random(48),
        ]);

        return response()->json([
            'data' => $this->serialize($channel->fresh(['workflow'])),
        ]);
    }

    private function channelFor(Request $request): Channel
    {
        return Channel::query()->firstOrCreate(
            [
                'user_id' => $request->user()->id,
                'type' => 'widget',
            ],
            [
                'name' => 'Website Chat Widget',
                'public_token' => Str::random(48),
                'is_active' => false,
                'settings' => $this->normalizeSettings([]),
            ]
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function serialize(Channel $channel): array
    {
        $channel->loadMissing('workflow:id,name,status');

        return [
            'id' => $channel->id,
            'name' => $channel->name,
            'type' => $channel->type,
            'public_token' => $channel->public_token,
            'workflow_id' => $channel->workflow_id,
            'workflow_name' => $channel->workflow?->name,
            'is_active' => (bool) $channel->is_active,
            'settings' => $this->normalizeSettings($channel->settings ?? []),
            'icon_urls' => [
                'chat' => $this->iconUrl($channel, 'chat'),
                'launcher' => $this->iconUrl($channel, 'launcher'),
            ],
            'updated_at' => $channel->updated_at?->toISOString(),
        ];
    }

    private function storeIcon(Channel $channel, UploadedFile $file): string
    {
        $contents = file_get_contents($file->getRealPath());
        $source = is_string($contents) ? @imagecreatefromstring($contents) : false;

        if ($source === false) {
            throw ValidationException::withMessages([
                'icon' => 'Ikon tidak dapat dibaca. Gunakan PNG, JPG, atau WebP.',
            ]);
        }

        $width = imagesx($source);
        $height = imagesy($source);
        $edge = max(1, min($width, $height));
        $sourceX = (int) floor(($width - $edge) / 2);
        $sourceY = (int) floor(($height - $edge) / 2);

        $target = imagecreatetruecolor(256, 256);
        imagealphablending($target, false);
        imagesavealpha($target, true);
        $transparent = imagecolorallocatealpha($target, 0, 0, 0, 127);
        imagefill($target, 0, 0, $transparent);
        imagecopyresampled(
            $target,
            $source,
            0,
            0,
            $sourceX,
            $sourceY,
            256,
            256,
            $edge,
            $edge
        );

        imagedestroy($source);

        ob_start();
        imagepng($target);
        $png = ob_get_clean();
        imagedestroy($target);

        if (! is_string($png) || $png === '') {
            throw ValidationException::withMessages([
                'icon' => 'Ikon gagal diproses. Coba unggah ulang.',
            ]);
        }

        $path = 'channel-icons/'.$channel->user_id.'/'.Str::uuid().'.png';
        Storage::disk('public')->put($path, $png);

        return $path;
    }

    /**
     * @return array<string, mixed>
     */
    private function mergeSettings(array $current, array $incoming): array
    {
        $current = $this->normalizeSettings($current);
        $merged = array_replace($current, $incoming);
        $merged['appearance'] = array_replace(
            $current['appearance'],
            is_array($incoming['appearance'] ?? null) ? $incoming['appearance'] : []
        );
        $merged['icons'] = $current['icons'];

        return $this->normalizeSettings($merged);
    }

    /**
     * @return array<string, mixed>
     */
    private function normalizeSettings(array $settings): array
    {
        $appearance = is_array($settings['appearance'] ?? null)
            ? $settings['appearance']
            : [];
        $icons = is_array($settings['icons'] ?? null)
            ? $settings['icons']
            : [];

        foreach (self::DEFAULT_APPEARANCE as $key => $default) {
            if (
                ! isset($appearance[$key])
                || ! is_string($appearance[$key])
                || preg_match('/^#[0-9a-fA-F]{6}$/', $appearance[$key]) !== 1
            ) {
                $appearance[$key] = $default;
            }
        }

        return [
            'welcome_message' => array_key_exists('welcome_message', $settings)
                ? (string) ($settings['welcome_message'] ?? '')
                : 'Halo! Ada yang bisa kami bantu?',
            'placeholder' => array_key_exists('placeholder', $settings)
                ? (string) ($settings['placeholder'] ?? '')
                : 'Tulis pesan...',
            'open_mode' => in_array(
                $settings['open_mode'] ?? null,
                ['manual', 'always'],
                true
            ) ? $settings['open_mode'] : 'manual',
            'appearance' => $appearance,
            'icons' => [
                'chat' => is_string($icons['chat'] ?? null)
                    ? $icons['chat']
                    : null,
                'launcher' => is_string($icons['launcher'] ?? null)
                    ? $icons['launcher']
                    : null,
            ],
        ];
    }

    private function iconUrl(Channel $channel, string $kind): ?string
    {
        $settings = $this->normalizeSettings($channel->settings ?? []);
        $path = $settings['icons'][$kind] ?? null;

        if (! is_string($path) || $path === '') {
            return null;
        }

        return '/api/v1/public/channels/'
            .$channel->public_token
            .'/icon/'
            .$kind
            .'?v='
            .($channel->updated_at?->timestamp ?? time());
    }
}
