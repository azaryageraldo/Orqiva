<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Channel;
use App\Models\Workflow;
use App\Services\Channels\Telegram\TelegramClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

class ChannelController extends Controller
{
    private const DEFAULT_APPEARANCE = [
        'header_color' => '#17212b',
        'background_color' => '#0e1621',
        'outgoing_color' => '#2b5278',
        'accent_color' => '#64b5ef',
    ];

    private const ICON_KINDS = ['chat', 'launcher'];

    public function __construct(
        private readonly TelegramClient $telegram
    ) {}

    public function index(Request $request): JsonResponse
    {
        $channels = Channel::query()
            ->where('user_id', $request->user()->id)
            ->with('workflow:id,name,status')
            ->orderBy('id')
            ->get();

        return response()->json([
            'data' => $channels
                ->map(fn (Channel $channel) => $this->serialize($channel))
                ->values()
                ->all(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['sometimes', 'string', Rule::in(Channel::TYPES)],
            'name' => ['required', 'string', 'max:120'],
            'workflow_id' => ['sometimes', 'nullable', 'integer'],
            'is_active' => ['sometimes', 'boolean'],
            'bot_token' => ['sometimes', 'nullable', 'string', 'max:200'],
        ]);

        $type = $validated['type'] ?? Channel::TYPE_WIDGET;
        $botToken = trim((string) ($validated['bot_token'] ?? ''));
        $bot = null;

        if ($type === Channel::TYPE_WIDGET && $botToken !== '') {
            throw ValidationException::withMessages([
                'bot_token' => 'Token bot hanya dipakai channel Telegram.',
            ]);
        }

        if ($type === Channel::TYPE_TELEGRAM) {
            if ($botToken === '') {
                throw ValidationException::withMessages([
                    'bot_token' => 'Token bot Telegram wajib diisi.',
                ]);
            }

            $bot = $this->validatedTelegramBot($botToken);
        }

        $exists = Channel::query()
            ->where('user_id', $request->user()->id)
            ->where('type', $type)
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'type' => 'Channel tipe ini sudah ada. Ubah channel tersebut atau hapus dulu.',
            ]);
        }

        $workflow = null;

        if (($validated['workflow_id'] ?? null) !== null) {
            $workflow = $this->ownedEntryWorkflow(
                $request,
                (int) $validated['workflow_id']
            );
        }

        if (($validated['is_active'] ?? false) === true && $workflow === null) {
            throw ValidationException::withMessages([
                'workflow_id' => 'Pilih workflow entry sebelum mengaktifkan channel.',
            ]);
        }

        $channel = Channel::create([
            'user_id' => $request->user()->id,
            'workflow_id' => $workflow?->id,
            'type' => $type,
            'name' => $validated['name'],
            'public_token' => Str::random(48),
            'external_id' => $bot === null ? null : $this->botHandle($bot),
            'credentials' => $bot === null ? null : ['bot_token' => $botToken],
            'is_active' => (bool) ($validated['is_active'] ?? false),
            'last_connected_at' => $bot === null ? null : now(),
            'settings' => $this->defaultSettings($type),
        ]);

        return response()->json([
            'data' => $this->serialize($channel->fresh(['workflow'])),
        ], 201);
    }

    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->serialize($this->channelFor($request)),
        ]);
    }

    public function update(Request $request, ?Channel $channel = null): JsonResponse
    {
        $channel ??= $this->channelFor($request);

        $this->authorizeChannel($request, $channel);

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
            'bot_token' => ['sometimes', 'nullable', 'string', 'max:200'],
        ]);

        $botToken = trim((string) ($validated['bot_token'] ?? ''));

        if (array_key_exists('bot_token', $validated)) {
            unset($validated['bot_token']);

            if ($channel->type !== Channel::TYPE_TELEGRAM) {
                throw ValidationException::withMessages([
                    'bot_token' => 'Token bot hanya dipakai channel Telegram.',
                ]);
            }

            if ($botToken === '') {
                throw ValidationException::withMessages([
                    'bot_token' => 'Token bot Telegram wajib diisi.',
                ]);
            }

            $bot = $this->validatedTelegramBot($botToken);

            $validated['credentials'] = ['bot_token' => $botToken];
            $validated['external_id'] = $this->botHandle($bot);
            $validated['last_connected_at'] = now();
            $validated['last_error'] = null;
        }

        if (
            array_key_exists('workflow_id', $validated)
            && $validated['workflow_id'] !== null
        ) {
            $this->ownedEntryWorkflow($request, (int) $validated['workflow_id']);
        }

        if (
            ($validated['is_active'] ?? false) === true
            && $channel->workflow_id === null
            && ! isset($validated['workflow_id'])
        ) {
            throw ValidationException::withMessages([
                'workflow_id' => 'Pilih workflow entry sebelum mengaktifkan widget.',
            ]);
        }

        if (array_key_exists('settings', $validated)) {
            $incoming = is_array($validated['settings']) ? $validated['settings'] : [];

            $validated['settings'] = $channel->type === Channel::TYPE_WIDGET
                ? $this->mergeSettings($channel->settings ?? [], $incoming)
                : array_replace($channel->settings ?? [], $incoming);
        }

        $channel->update($validated);

        return response()->json([
            'data' => $this->serialize($channel->fresh(['workflow'])),
        ]);
    }

    public function destroy(Request $request, Channel $channel): JsonResponse
    {
        $this->authorizeChannel($request, $channel);

        $channel->delete();

        return response()->json([
            'data' => ['deleted' => true],
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

    public function regenerate(Request $request, ?Channel $channel = null): JsonResponse
    {
        $channel ??= $this->channelFor($request);

        $this->authorizeChannel($request, $channel);

        if ($channel->type !== Channel::TYPE_WIDGET) {
            throw ValidationException::withMessages([
                'channel' => 'Ganti token hanya berlaku untuk widget.',
            ]);
        }

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
                'type' => Channel::TYPE_WIDGET,
            ],
            [
                'name' => 'Website Chat Widget',
                'public_token' => Str::random(48),
                'is_active' => false,
                'settings' => $this->normalizeSettings([]),
            ]
        );
    }

    private function authorizeChannel(Request $request, Channel $channel): void
    {
        abort_unless($channel->user_id === $request->user()->id, 404);
    }

    private function ownedEntryWorkflow(Request $request, int $workflowId): Workflow
    {
        $workflow = Workflow::query()
            ->whereKey($workflowId)
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

        return $workflow;
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedTelegramBot(string $token): array
    {
        try {
            $bot = $this->telegram->getMe($token);
            $this->telegram->deleteWebhook($token);
        } catch (Throwable $exception) {
            throw ValidationException::withMessages([
                'bot_token' => 'Token bot tidak valid: '.$exception->getMessage(),
            ]);
        }

        if (! is_array($bot) || ! isset($bot['id'])) {
            throw ValidationException::withMessages([
                'bot_token' => 'Token bot tidak valid.',
            ]);
        }

        return $bot;
    }

    /**
     * @param  array<string, mixed>  $bot
     */
    private function botHandle(array $bot): ?string
    {
        $username = trim((string) ($bot['username'] ?? ''));

        return $username !== '' ? '@'.$username : (string) $bot['id'];
    }

    /**
     * @return array<string, mixed>
     */
    private function defaultSettings(string $type): array
    {
        return $type === Channel::TYPE_WIDGET ? $this->normalizeSettings([]) : [];
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
            'external_id' => $channel->external_id,
            'has_credentials' => $channel->getRawOriginal('credentials') !== null,
            'workflow_id' => $channel->workflow_id,
            'workflow_name' => $channel->workflow?->name,
            'is_active' => (bool) $channel->is_active,
            'settings' => $channel->type === Channel::TYPE_WIDGET
                ? $this->normalizeSettings($channel->settings ?? [])
                : ($channel->settings ?? []),
            'icon_urls' => [
                'chat' => $this->iconUrl($channel, 'chat'),
                'launcher' => $this->iconUrl($channel, 'launcher'),
            ],
            'last_connected_at' => $channel->last_connected_at?->toISOString(),
            'last_error' => $channel->last_error,
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
