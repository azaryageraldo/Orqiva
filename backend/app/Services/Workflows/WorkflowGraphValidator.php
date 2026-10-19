<?php

namespace App\Services\Workflows;

use RuntimeException;

/**
 * Memvalidasi definisi workflow (node, koneksi, tujuan Go To) sebelum
 * disimpan maupun dieksekusi.
 *
 * Workflow sengaja dibuat sederhana untuk customer service:
 * Trigger → AI Agent → Send Message / Condition / Go To / Relocate.
 */
class WorkflowGraphValidator
{
    public const TYPE_MAP = [
        'Trigger' => 'trigger',
        'AI Agent' => 'ai_agent',
        'Send Message' => 'output',
        'Condition' => 'if_else',
        'Relocate' => 'relocate',
        'Go To' => 'go_to',
        'Stopper' => 'stopper',

        // Kompatibilitas dengan format lama.
        'trigger' => 'trigger',
        'ai_agent' => 'ai_agent',
        'output' => 'output',
        'if_else' => 'if_else',
        'relocate' => 'relocate',
        'go_to' => 'go_to',
        'stopper' => 'stopper',
    ];

    /**
     * Node yang tidak boleh memiliki koneksi keluar.
     */
    public const TERMINAL_TYPES = ['output', 'relocate', 'go_to'];

    public function __construct(
        private readonly ConditionRule $conditionRule,
        private readonly AiAgentVariables $agentVariables
    ) {}

    /**
     * @return array{
     *     nodes: array<string, array>,
     *     next: array<string, string>,
     *     trigger_id: string,
     *     entry_id: string,
     *     starting_point_id: ?string
     * }
     */
    public function validateDefinition(
        array $definition,
        ?string $resumeNodeId = null,
        bool $requireRunnable = true
    ): array {
        $nodes = $definition['nodes'] ?? [];
        $edges = $definition['edges'] ?? [];

        if (! is_array($nodes) || ! is_array($edges)) {
            throw new RuntimeException(
                'Nodes dan edges harus berupa array.'
            );
        }

        return $this->validate($nodes, $edges, $resumeNodeId, $requireRunnable);
    }

    /**
     * @return array{
     *     nodes: array<string, array>,
     *     next: array<string, string>,
     *     trigger_id: string,
     *     entry_id: string,
     *     starting_point_id: ?string
     * }
     */
    public function validate(
        array $nodes,
        array $edges,
        ?string $resumeNodeId = null,
        bool $requireRunnable = true
    ): array {
        if ($requireRunnable && count($nodes) < 2) {
            throw new RuntimeException(
                'Workflow minimal memiliki Trigger dan node tujuan.'
            );
        }

        $nodeMap = [];

        foreach ($nodes as $node) {
            if (
                ! is_array($node)
                || ! isset($node['id'], $node['type'])
                || ! is_string($node['id'])
                || $node['id'] === ''
                || ! is_string($node['type'])
                || $node['type'] === ''
            ) {
                throw new RuntimeException(
                    'Node harus memiliki ID dan tipe yang valid.'
                );
            }

            if (isset($nodeMap[$node['id']])) {
                throw new RuntimeException(
                    'ID node duplikat: '.$node['id']
                );
            }

            $type = self::TYPE_MAP[$node['type']] ?? null;

            if ($type === null) {
                throw new RuntimeException(
                    'Tipe node belum didukung: '.$node['type']
                );
            }

            if (isset($node['data']) && ! is_array($node['data'])) {
                throw new RuntimeException(
                    'Data node harus berupa object atau array.'
                );
            }

            $node['type'] = $type;

            if ($type === 'ai_agent') {
                $this->agentVariables->normalize($node['data'] ?? []);
            }

            $nodeMap[$node['id']] = $node;
        }

        if ($resumeNodeId !== null && ! isset($nodeMap[$resumeNodeId])) {
            throw new RuntimeException(
                'Node lanjutan tidak ditemukan. Workflow mungkin telah diubah saat menunggu pesan.'
            );
        }

        $triggers = array_filter(
            $nodeMap,
            fn (array $node) => $node['type'] === 'trigger'
        );

        $terminals = array_filter(
            $nodeMap,
            fn (array $node) => in_array(
                $node['type'],
                ['output', 'relocate'],
                true
            )
        );

        if ($requireRunnable) {
            if (count($triggers) !== 1) {
                throw new RuntimeException(
                    'Workflow harus memiliki tepat satu Trigger.'
                );
            }

            if (count($terminals) < 1) {
                throw new RuntimeException(
                    'Workflow harus memiliki minimal satu Send Message atau Relocate.'
                );
            }
        }

        /*
         * Validasi koneksi antarnode.
         */
        $next = [];
        $adjacency = [];

        foreach ($edges as $edge) {
            if (
                ! is_array($edge)
                || ! isset($edge['source'], $edge['target'])
                || ! is_string($edge['source'])
                || ! is_string($edge['target'])
            ) {
                throw new RuntimeException(
                    'Koneksi harus memiliki source dan target.'
                );
            }

            $source = $edge['source'];
            $target = $edge['target'];
            $handle = $edge['sourceHandle'] ?? null;

            if (
                ! isset($nodeMap[$source], $nodeMap[$target])
                || $source === $target
            ) {
                throw new RuntimeException(
                    'Koneksi mengarah ke node yang tidak valid.'
                );
            }

            $sourceType = $nodeMap[$source]['type'];

            if (in_array($sourceType, self::TERMINAL_TYPES, true)) {
                throw new RuntimeException(
                    'Node '
                    .$this->labelOf($sourceType)
                    .' tidak boleh memiliki koneksi keluar.'
                );
            }

            if ($sourceType === 'if_else') {
                if (! in_array($handle, ['true', 'false'], true)) {
                    throw new RuntimeException(
                        'Koneksi Condition harus memiliki cabang If match atau Else.'
                    );
                }
            } elseif ($handle !== null) {
                throw new RuntimeException(
                    'Cabang If match/Else hanya didukung pada node Condition.'
                );
            }

            $key = $source.':'.($handle ?? 'default');

            if (isset($next[$key])) {
                throw new RuntimeException(
                    'Terdapat beberapa koneksi pada jalur yang sama.'
                );
            }

            $next[$key] = $target;
            $adjacency[$source][] = $target;
        }

        $triggerId = '';

        if ($triggers !== []) {
            $triggerId = (string) array_key_first($triggers);

            foreach ($edges as $edge) {
                if (($edge['target'] ?? null) === $triggerId) {
                    throw new RuntimeException(
                        'Trigger tidak boleh memiliki koneksi masuk.'
                    );
                }
            }
        }

        $startingPointId = null;

        foreach ($nodeMap as $nodeId => $node) {
            if ($node['type'] !== 'go_to') {
                continue;
            }

            $data = $node['data'] ?? [];
            $target = $data['targetNodeId'] ?? null;
            $isStartingPoint = (bool) ($data['setStartingPoint'] ?? false);

            if ($target === null || $target === '') {
                if ($requireRunnable) {
                    throw new RuntimeException(
                        'Node Go To harus memilih node tujuan.'
                    );
                }

                continue;
            }

            if (! is_string($target) || ! isset($nodeMap[$target])) {
                throw new RuntimeException(
                    'Node tujuan Go To tidak ditemukan.'
                );
            }

            if ($target === $nodeId) {
                throw new RuntimeException(
                    'Node Go To tidak boleh mengarah ke dirinya sendiri.'
                );
            }

            // Go To melompat langsung ke target, jadi ikut dihitung
            // sebagai koneksi saat memeriksa keterhubungan.
            $adjacency[$nodeId][] = $target;

            if ($isStartingPoint) {
                if ($startingPointId !== null) {
                    throw new RuntimeException(
                        'Hanya boleh ada satu Go To dengan Set starting point.'
                    );
                }

                $startingPointId = $target;
            }
        }

        if ($requireRunnable) {
            foreach ($nodeMap as $nodeId => $node) {
                $type = $node['type'];
                $data = $node['data'] ?? [];

                if ($type === 'trigger' && $startingPointId === null) {
                    if (! isset($next[$nodeId.':default'])) {
                        throw new RuntimeException(
                            'Trigger harus memiliki koneksi keluar.'
                        );
                    }
                }

                if ($type === 'if_else') {
                    if (
                        ! isset($next[$nodeId.':true'])
                        || ! isset($next[$nodeId.':false'])
                    ) {
                        throw new RuntimeException(
                            'Condition harus memiliki cabang If match dan Else.'
                        );
                    }

                    if ($this->conditionRule->field($data) === null) {
                        throw new RuntimeException(
                            'Condition belum memilih variabel boolean.'
                        );
                    }
                }

                if (
                    in_array($type, ['ai_agent', 'stopper'], true)
                    && ! isset($next[$nodeId.':default'])
                ) {
                    throw new RuntimeException(
                        $this->labelOf($type).' harus memiliki koneksi keluar.'
                    );
                }
            }

            $entryId = $startingPointId ?? $triggerId;

            $roots = array_values(array_unique(array_filter([
                $entryId,
                $triggerId,
            ])));

            $reachable = [];

            foreach ($roots as $root) {
                foreach ($this->findReachableNodes($root, $adjacency) as $id) {
                    $reachable[$id] = true;
                }
            }

            foreach (array_keys($nodeMap) as $nodeId) {
                if (! isset($reachable[$nodeId])) {
                    throw new RuntimeException(
                        'Workflow memiliki node yang tidak terhubung ke alur: '
                        .$nodeId
                    );
                }
            }
        }

        return [
            'nodes' => $nodeMap,
            'next' => $next,
            'trigger_id' => $triggerId,
            'entry_id' => $startingPointId ?? $triggerId,
            'starting_point_id' => $startingPointId,
        ];
    }

    /**
     * Mencari seluruh node yang dapat dicapai dari node awal.
     *
     * @return array<int, string>
     */
    private function findReachableNodes(string $start, array $adjacency): array
    {
        $visited = [];
        $stack = [$start];

        while ($stack !== []) {
            $current = array_pop($stack);

            if (isset($visited[$current])) {
                continue;
            }

            $visited[$current] = true;

            foreach ($adjacency[$current] ?? [] as $target) {
                $stack[] = $target;
            }
        }

        return array_keys($visited);
    }

    private function labelOf(string $type): string
    {
        return match ($type) {
            'output' => 'Send Message',
            'ai_agent' => 'AI Agent',
            'if_else' => 'Condition',
            'relocate' => 'Relocate',
            'go_to' => 'Go To',
            'stopper' => 'Stopper',
            default => 'Node',
        };
    }
}
