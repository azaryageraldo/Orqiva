<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Workflow;
use App\Services\Workflows\WorkflowGraphValidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class WorkflowController extends Controller
{
    public function __construct(
        private readonly WorkflowGraphValidator $graphValidator
    ) {}

    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));

        $workflows = $request->user()
            ->workflows()
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($query) use ($search): void {
                    $query
                        ->where('name', 'like', '%'.$search.'%')
                        ->orWhere('description', 'like', '%'.$search.'%');
                });
            })
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return response()->json(['data' => $workflows]);
    }

    public function options(Request $request): JsonResponse
    {
        $workflows = $request->user()
            ->workflows()
            ->orderBy('name')
            ->get(['id', 'name', 'status', 'definition'])
            ->map(fn (Workflow $workflow) => [
                'id' => $workflow->id,
                'name' => $workflow->name,
                'status' => $workflow->status,
                'nodes' => collect(data_get($workflow->definition, 'nodes', []))
                    ->map(fn ($node) => [
                        'id' => is_array($node) ? ($node['id'] ?? null) : null,
                        'type' => is_array($node) ? ($node['type'] ?? null) : null,
                        'name' => is_array($node)
                            ? (data_get($node, 'data.nodeName')
                                ?: data_get($node, 'data.label'))
                            : null,
                    ])
                    ->filter(fn ($node) => is_string($node['id']) && $node['id'] !== '')
                    ->values(),
            ]);

        return response()->json(['data' => $workflows]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['sometimes', Rule::in(['draft', 'active'])],
            'definition' => ['nullable', 'array'],
        ]);

        $this->assertDefinitionIsValid(
            $validated['definition'] ?? null,
            $request->user()
        );

        $workflow = $request->user()->workflows()->create($validated);

        return response()->json(['data' => $workflow], 201);
    }

    public function show(Request $request, Workflow $workflow): JsonResponse
    {
        abort_unless($workflow->user_id === $request->user()->id, 404);

        return response()->json(['data' => $workflow]);
    }

    public function update(
        Request $request,
        Workflow $workflow
    ): JsonResponse {
        abort_unless($workflow->user_id === $request->user()->id, 404);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', Rule::in(['draft', 'active'])],
            'definition' => ['sometimes', 'nullable', 'array'],
        ]);

        if (array_key_exists('definition', $validated)) {
            $this->assertDefinitionIsValid(
                $validated['definition'],
                $request->user()
            );
        }

        $workflow->update($validated);

        return response()->json([
            'data' => $workflow->fresh(),
        ]);
    }

    public function destroy(Request $request, Workflow $workflow): JsonResponse
    {
        abort_unless($workflow->user_id === $request->user()->id, 404);

        $workflow->delete();

        return response()->json([
            'message' => 'Workflow deleted successfully.',
        ]);
    }

    /**
     * Validasi struktur graph saat workflow disimpan. Kelengkapan
     * (Trigger, Condition, jalur) baru diwajibkan ketika dieksekusi
     * agar draft yang belum selesai tetap bisa disimpan.
     */
    private function assertDefinitionIsValid(mixed $definition, $user): void
    {
        if ($definition === null) {
            return;
        }

        if (! is_array($definition)) {
            throw ValidationException::withMessages([
                'definition' => 'Definition harus berupa object.',
            ]);
        }

        try {
            $this->graphValidator->validateDefinition(
                $definition,
                null,
                false
            );
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages([
                'definition' => $exception->getMessage(),
            ]);
        }

        $this->assertCrossWorkflowTargets($definition, $user);
    }

    private function assertCrossWorkflowTargets(array $definition, $user): void
    {
        $nodes = $definition['nodes'] ?? [];

        if (! is_array($nodes)) {
            return;
        }

        foreach ($nodes as $node) {
            if (! is_array($node)) {
                continue;
            }

            $type = $node['type'] ?? null;

            if (! in_array($type, ['Go To', 'go_to'], true)) {
                continue;
            }

            $targetWorkflowId = data_get($node, 'data.targetWorkflowId');
            $targetNodeId = data_get($node, 'data.targetNodeId');

            if ($targetWorkflowId === null || $targetWorkflowId === '') {
                continue;
            }

            if (! is_numeric($targetWorkflowId)) {
                throw ValidationException::withMessages([
                    'definition' => 'Workflow tujuan Go To tidak valid. Perbaikan: pilih ulang workflow tujuan dari daftar.',
                ]);
            }

            $targetWorkflow = $user->workflows()
                ->whereKey((int) $targetWorkflowId)
                ->first();

            if ($targetWorkflow === null) {
                throw ValidationException::withMessages([
                    'definition' => 'Workflow tujuan Go To tidak ditemukan atau bukan milik akun ini. Perbaikan: pilih workflow lain yang tersedia.',
                ]);
            }

            $targetNodes = data_get($targetWorkflow->definition, 'nodes', []);
            $exists = collect(is_array($targetNodes) ? $targetNodes : [])
                ->contains(fn ($target) => is_array($target)
                    && ($target['id'] ?? null) === $targetNodeId);

            if (! is_string($targetNodeId) || ! $exists) {
                throw ValidationException::withMessages([
                    'definition' => 'Node tujuan Go To tidak ditemukan di workflow "'.$targetWorkflow->name.'". Perbaikan: buka node Go To lalu pilih ulang node tujuan.',
                ]);
            }
        }
    }
}
