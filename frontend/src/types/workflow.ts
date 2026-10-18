export type WorkflowStatus = 'draft' | 'active';

export interface Workflow {
    id: number;
    name: string;
    description: string | null;
    status: WorkflowStatus;
    definition: {
        nodes: Array<{
            id: string;
            type: string;
            data?: Record<string, unknown>;
            position?: { x: number; y: number };
        }>;
        edges: Array<{
            id?: string;
            source: string;
            target: string;
            sourceHandle?: string | null;
        }>;
    } | null;
    created_at: string;
    updated_at: string;
}

export interface PaginatedResponse<T> {
    data: {
        current_page: number;
        data: T[];
        last_page: number;
        total: number;
    };
}