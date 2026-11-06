<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Workflow;
use App\Services\Workflows\WorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkflowController extends Controller
{
    public function __construct(
        private readonly WorkflowService $workflowService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $result = $this->workflowService->getWorkflows(
            $request->user(),
            [
                'search' => $request->query('search', ''),
                'page' => $request->query('page', 1),
                'per_page' => $request->query('per_page', 10),
            ]
        );

        return response()->json(['data' => $result]);
    }

    public function options(Request $request): JsonResponse
    {
        $data = $this->workflowService->getWorkflowOptions($request->user());

        return response()->json(['data' => $data]);
    }

    public function store(Request $request): JsonResponse
    {
        $workflow = $this->workflowService->createWorkflow(
            $request->user(),
            $request->only(['name', 'description', 'status', 'definition'])
        );

        return response()->json(['data' => $workflow], 201);
    }

    public function show(Request $request, Workflow $workflow): JsonResponse
    {
        $data = $this->workflowService->getWorkflow($request->user(), (int) $workflow->id);

        return response()->json(['data' => $data]);
    }

    public function update(Request $request, Workflow $workflow): JsonResponse
    {
        $data = $this->workflowService->updateWorkflow(
            $request->user(),
            (int) $workflow->id,
            $request->only(['name', 'description', 'status', 'definition'])
        );

        return response()->json([
            'data' => $data,
        ]);
    }

    public function destroy(Request $request, Workflow $workflow): JsonResponse
    {
        $this->workflowService->deleteWorkflow($request->user(), (int) $workflow->id);

        return response()->json([
            'message' => 'Workflow deleted successfully.',
        ]);
    }
}
