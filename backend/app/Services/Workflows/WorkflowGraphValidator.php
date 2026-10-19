<?php

namespace App\Services\Workflows;

use RuntimeException;

/**
 * Memvalidasi definisi workflow (node, koneksi, siklus) sebelum
 * disimpan maupun dieksekusi.
 */
class WorkflowGraphValidator
{
    public const TYPE_MAP = [
        'Trigger' => 'trigger',
        'AI Agent' => 'ai_agent',
        'Send Message' => 'output',
        'Condition' => 'if_else',
        'Stopper' => 'stopper',

        // Kompatibilitas dengan format lama.
        'trigger' => 'trigger',
        'ai_agent' => 'ai_agent',
        'output' => 'output',
        'if_else' => 'if_else',
        'stopper' => 'stopper',
    ];

    public function __construct(private readonly ConditionRule $conditionRule) {}

    /**
     * @return array{nodes: array<string, array>, next: array<string, string>, trigger_id: string}
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
     * @return array{nodes: array<string, array>, next: array<string, string>, trigger_id: string}
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

        $outputs = array_filter(
            $nodeMap,
            fn (array $node) => $node['type'] === 'output'
        );

        if ($requireRunnable) {
            if (count($triggers) !== 1) {
                throw new RuntimeException(
                    'Workflow harus memiliki tepat satu Trigger.'
                );
            }

            if (count($outputs) < 1) {
                throw new RuntimeException(
                    'Workflow harus memiliki minimal satu Send Message.'
                );
            }
        }

        /*
         * Validasi koneksi antarnode.
         */
        $next = [];
        $incoming = [];
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

            if ($sourceType === 'output') {
                throw new RuntimeException(
                    'Node Send Message tidak boleh memiliki koneksi keluar.'
                );
            }

            if ($sourceType === 'if_else') {
                if (! in_array($handle, ['true', 'false'], true)) {
                    throw new RuntimeException(
                        'Koneksi Condition harus memiliki sourceHandle true atau false.'
                    );
                }
            } elseif ($handle !== null) {
                throw new RuntimeException(
                    'sourceHandle hanya didukung pada node Condition.'
                );
            }

            $key = $source.':'.($handle ?? 'default');

            if (isset($next[$key])) {
                throw new RuntimeException(
                    'Terdapat beberapa koneksi pada jalur yang sama.'
                );
            }

            if (isset($incoming[$target])) {
                throw new RuntimeException(
                    'Beberapa koneksi menuju satu node belum didukung.'
                );
            }

            $next[$key] = $target;
            $incoming[$target] = true;
            $adjacency[$source][] = $target;
        }

        $triggerId = '';

        if ($triggers !== []) {
            $triggerId = array_key_first($triggers);

            if (isset($incoming[$triggerId])) {
                throw new RuntimeException(
                    'Trigger tidak boleh memiliki koneksi masuk.'
                );
            }
        }

        if ($requireRunnable) {
            foreach ($nodeMap as $nodeId => $node) {
                $type = $node['type'];
                $data = $node['data'] ?? [];

                if ($type === 'trigger' && ! isset($next[$nodeId.':default'])) {
                    throw new RuntimeException(
                        'Trigger harus memiliki koneksi keluar.'
                    );
                }

                if ($type === 'if_else') {
                    if (
                        ! isset($next[$nodeId.':true'])
                        || ! isset($next[$nodeId.':false'])
                    ) {
                        throw new RuntimeException(
                            'Condition harus memiliki koneksi true dan false.'
                        );
                    }

                    if ($this->conditionRule->fromData($data) === null) {
                        throw new RuntimeException(
                            'Konfigurasi Condition tidak valid.'
                        );
                    }
                }

                if ($type === 'ai_agent' && ! isset($next[$nodeId.':default'])) {
                    throw new RuntimeException(
                        'AI Agent harus memiliki koneksi keluar.'
                    );
                }

                if (
                    $type === 'stopper'
                    && ! isset($next[$nodeId.':default'])
                ) {
                    throw new RuntimeException(
                        'Stopper harus terhubung ke node yang akan dijalankan setelah pesan berikutnya.'
                    );
                }
            }

            if ($triggerId !== '') {
                $reachable = [];

                foreach (
                    $this->findReachableNodes($triggerId, $next) as $nodeId
                ) {
                    $reachable[$nodeId] = true;
                }

                foreach (array_keys($nodeMap) as $nodeId) {
                    if (! isset($reachable[$nodeId])) {
                        throw new RuntimeException(
                            'Workflow memiliki node yang tidak terhubung ke Trigger: '
                            .$nodeId
                        );
                    }
                }
            }
        }

        /*
         * Deteksi siklus sebelum workflow dijalankan.
         */
        $indegree = array_fill_keys(array_keys($nodeMap), 0);

        foreach ($adjacency as $targets) {
            foreach ($targets as $target) {
                $indegree[$target]++;
            }
        }

        $queue = [];

        foreach ($indegree as $nodeId => $degree) {
            if ($degree === 0) {
                $queue[] = $nodeId;
            }
        }

        $processed = 0;

        while ($queue !== []) {
            $current = array_shift($queue);
            $processed++;

            foreach ($adjacency[$current] ?? [] as $target) {
                $indegree[$target]--;

                if ($indegree[$target] === 0) {
                    $queue[] = $target;
                }
            }
        }

        if ($processed !== count($nodeMap)) {
            throw new RuntimeException('Siklus terdeteksi pada workflow.');
        }

        return [
            'nodes' => $nodeMap,
            'next' => $next,
            'trigger_id' => $triggerId,
        ];
    }

    /**
     * Mencari seluruh node yang dapat dicapai dari node awal.
     *
     * @return array<int, string>
     */
    private function findReachableNodes(string $start, array $next): array
    {
        $visited = [];
        $stack = [$start];

        while ($stack !== []) {
            $current = array_pop($stack);

            if (isset($visited[$current])) {
                continue;
            }

            $visited[$current] = true;

            foreach (['default', 'true', 'false'] as $handle) {
                $key = $current.':'.$handle;

                if (isset($next[$key])) {
                    $stack[] = $next[$key];
                }
            }
        }

        return array_keys($visited);
    }
}
