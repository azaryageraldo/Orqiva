<?php

namespace App\Services\Workflows;

use RuntimeException;

/**
 * Variabel keluaran AI Agent.
 *
 * string  → satu teks (mis. respond)
 * boolean → dipakai node Condition (mis. beli)
 * array   → daftar teks (mis. respond.replies) untuk banyak bubble
 */
class AiAgentVariables
{
    public const TYPES = ['string', 'boolean', 'array'];

    /**
     * @return array<int, array{name: string, type: string, description: string, item_field: ?string}>
     */
    public function normalize(array $data): array
    {
        $definitions = $data['outputVariables'] ?? [];

        if (! is_array($definitions)) {
            throw new RuntimeException(
                'Variabel AI Agent harus berupa array.'
            );
        }

        $variables = [];
        $names = [];

        foreach ($definitions as $definition) {
            if (! is_array($definition)) {
                throw new RuntimeException(
                    'Definisi variabel AI Agent tidak valid.'
                );
            }

            $name = $definition['name'] ?? null;

            // Baris kosong di editor diabaikan.
            if (! is_string($name) || trim($name) === '') {
                continue;
            }

            $name = trim($name);

            if (! preg_match('/^[a-zA-Z_][a-zA-Z0-9_]*$/', $name)) {
                throw new RuntimeException(
                    'Nama variabel hanya boleh huruf, angka, dan garis bawah: '.$name
                );
            }

            if (isset($names[$name])) {
                throw new RuntimeException(
                    'Nama variabel duplikat: '.$name
                );
            }

            $names[$name] = true;

            $type = $definition['type'] ?? 'string';

            if (! is_string($type) || ! in_array($type, self::TYPES, true)) {
                throw new RuntimeException(
                    'Tipe variabel tidak didukung: '.$name
                );
            }

            $itemField = null;

            if ($type === 'array') {
                $itemField = $definition['itemField'] ?? 'replies';

                if (
                    ! is_string($itemField)
                    || ! preg_match('/^[a-zA-Z_][a-zA-Z0-9_]*$/', $itemField)
                ) {
                    throw new RuntimeException(
                        'Nama sub-variabel tidak valid pada: '.$name
                    );
                }
            }

            $variables[] = [
                'name' => $name,
                'type' => $type,
                'description' => is_string($definition['description'] ?? null)
                    ? trim($definition['description'])
                    : '',
                'item_field' => $itemField,
            ];
        }

        return $variables;
    }

    public function schema(array $variables): ?array
    {
        if ($variables === []) {
            return null;
        }

        $properties = [];

        foreach ($variables as $variable) {
            $property = [
                'type' => strtoupper($variable['type']),
                'description' => $variable['description'] !== ''
                    ? $variable['description']
                    : 'Value for '.$variable['name'],
            ];

            if ($variable['type'] === 'array') {
                $field = $variable['item_field'];

                $property['items'] = [
                    'type' => 'OBJECT',
                    'properties' => [
                        $field => ['type' => 'STRING'],
                    ],
                    'required' => [$field],
                ];
            }

            $properties[$variable['name']] = $property;
        }

        return [
            'type' => 'OBJECT',
            'properties' => $properties,
            'required' => array_keys($properties),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function extract(array $variables, mixed $payload): array
    {
        if (! is_array($payload)) {
            throw new RuntimeException(
                'AI Agent tidak mengembalikan JSON yang valid.'
            );
        }

        $values = [];

        foreach ($variables as $variable) {
            $name = $variable['name'];

            if (! array_key_exists($name, $payload)) {
                throw new RuntimeException(
                    'AI Agent tidak mengembalikan variabel: '.$name
                );
            }

            $value = $payload[$name];

            if ($variable['type'] === 'string') {
                if (! is_scalar($value)) {
                    throw new RuntimeException(
                        'Variabel '.$name.' harus berupa teks.'
                    );
                }

                $value = (string) $value;
            } elseif ($variable['type'] === 'boolean') {
                $value = $this->toBoolean($value, $name);
            } else {
                $value = $this->toReplies(
                    $value,
                    $name,
                    (string) $variable['item_field']
                );
            }

            $values[$name] = $value;
        }

        return $values;
    }

    private function toBoolean(mixed $value, string $name): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        if (is_int($value) || is_float($value)) {
            return (float) $value !== 0.0;
        }

        if (is_string($value)) {
            return in_array(
                mb_strtolower(trim($value)),
                ['true', '1', 'yes', 'ya', 'on'],
                true
            );
        }

        throw new RuntimeException(
            'Variabel '.$name.' harus berupa boolean.'
        );
    }

    /**
     * @return array<int, array<string, string>>
     */
    private function toReplies(mixed $value, string $name, string $field): array
    {
        if (! is_array($value) || ! array_is_list($value)) {
            throw new RuntimeException(
                'Variabel '.$name.' harus berupa array.'
            );
        }

        $items = [];

        foreach ($value as $item) {
            if (is_string($item)) {
                $items[] = [$field => trim($item)];

                continue;
            }

            if (
                ! is_array($item)
                || ! isset($item[$field])
                || ! is_string($item[$field])
            ) {
                throw new RuntimeException(
                    'Setiap item '.$name.' harus memiliki field '.$field.'.'
                );
            }

            $items[] = [$field => trim($item[$field])];
        }

        return $items;
    }
}
