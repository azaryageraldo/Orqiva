<?php

namespace App\Services\Workflows;

use App\Models\Workflow;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class WorkflowService
{
    public function __construct(
        private readonly WorkflowGraphValidator $graphValidator
    ) {}

    /**
     * Ambil daftar workflow milik user dengan pencarian dan paginasi.
     */
    public function getWorkflows(User $user, array $filters = []): array
    {
        $search = trim((string) ($filters['search'] ?? ''));
        $page = max(1, (int) ($filters['page'] ?? 1));
        $perPage = max(1, (int) ($filters['per_page'] ?? 10));

        $query = $user->workflows()
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($query) use ($search): void {
                    $query
                        ->where('name', 'like', '%'.$search.'%')
                        ->orWhere('description', 'like', '%'.$search.'%');
                });
            })
            ->latest();

        $paginated = $query->paginate($perPage, ['*'], 'page', $page)
            ->withQueryString();

        return [
            'data' => $paginated->items(),
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'total' => $paginated->total(),
            'per_page' => $paginated->perPage(),
            'from' => $paginated->firstItem(),
            'to' => $paginated->lastItem(),
        ];
    }

    /**
     * Ambil opsi workflow untuk dropdown (Go To node target).
     */
    public function getWorkflowOptions(User $user): array
    {
        return $user->workflows()
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
                    ->values()
            ])->all();
    }

    /**
     * Buat workflow baru dengan validasi definisi graph.
     */
    public function createWorkflow(User $user, array $data): Workflow
    {
        $validated = $this->validateStore($data);

        $this->assertDefinitionIsValid(
            $validated['definition'] ?? null,
            $user
        );

        return $user->workflows()->create($validated);
    }

    /**
     * Ambil satu workflow dengan pemeriksaan kepemilikan.
     */
    public function getWorkflow(User $user, int $id): Workflow
    {
        $workflow = $user->workflows()->whereKey($id)->first();

        if ($workflow === null) {
            abort(404);
        }

        return $workflow;
    }

    /**
     * Perbarui workflow dengan validasi definisi graph.
     */
    public function updateWorkflow(User $user, int $id, array $data): Workflow
    {
        $workflow = $this->getWorkflow($user, $id);

        $validated = $this->validateUpdate($data);

        if (array_key_exists('definition', $validated)) {
            $this->assertDefinitionIsValid(
                $validated['definition'],
                $user
            );
        }

        $workflow->update($validated);

        return $workflow->fresh();
    }

    /**
     * Hapus workflow dengan pemeriksaan kepemilikan.
     */
    public function deleteWorkflow(User $user, int $id): void
    {
        $workflow = $this->getWorkflow($user, $id);

        $workflow->delete();
    }

    /**
     * Validasi payload create.
     */
    private function validateStore(array $data): array
    {
        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['sometimes', Rule::in(['draft', 'active'])],
            'definition' => ['nullable', 'array'],
        ];

        return request()->validate($rules);
    }

    /**
     * Validasi payload update.
     */
    private function validateUpdate(array $data): array
    {
        $rules = [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', Rule::in(['draft', 'active'])],
            'definition' => ['sometimes', 'nullable', 'array'],
        ];

        return request()->validate($rules);
    }

    /**
     * Validasi struktur graph saat workflow disimpan.
     */
    private function assertDefinitionIsValid(mixed $definition, User $user): void
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

    private function assertCrossWorkflowTargets(array $definition, User $user): void
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
