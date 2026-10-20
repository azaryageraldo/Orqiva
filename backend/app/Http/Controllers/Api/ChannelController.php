<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Channel;
use App\Models\Workflow;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ChannelController extends Controller
{
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

        $channel->update($validated);

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
                'settings' => [
                    'welcome_message' => 'Halo! Ada yang bisa kami bantu?',
                    'placeholder' => 'Tulis pesan...',
                ],
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
            'settings' => $channel->settings ?? [],
            'updated_at' => $channel->updated_at?->toISOString(),
        ];
    }
}
