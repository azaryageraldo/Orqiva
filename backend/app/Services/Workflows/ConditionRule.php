<?php

namespace App\Services\Workflows;

/**
 * Membaca konfigurasi Condition dari data node dan mengevaluasinya.
 */
class ConditionRule
{
    public const OPERATORS = [
        'equals',
        'not_equals',
        'contains',
        'not_contains',
        'is_empty',
        'is_not_empty',
    ];

    /**
     * Mendukung format Condition frontend dan format lama.
     *
     * @return array{field: string, operator: string, value: mixed}|null
     */
    public function fromData(array $data): ?array
    {
        if (isset($data['condition']) && is_array($data['condition'])) {
            $condition = $data['condition'];

            $field = $condition['field'] ?? null;
            $operator = $condition['operator'] ?? null;
            $value = $condition['value'] ?? null;
        } else {
            $field = $data['conditionVariable'] ?? null;
            $operator = $data['conditionOperator'] ?? null;
            $value = $data['conditionValue'] ?? null;
        }

        if (
            ! is_string($field)
            || trim($field) === ''
            || ! is_string($operator)
            || ! in_array($operator, self::OPERATORS, true)
        ) {
            return null;
        }

        if (
            ! in_array($operator, ['is_empty', 'is_not_empty'], true)
            && ! is_scalar($value)
            && $value !== null
        ) {
            return null;
        }

        return [
            'field' => trim($field),
            'operator' => $operator,
            'value' => $value,
        ];
    }

    public function matches(
        mixed $actual,
        string $operator,
        mixed $expected
    ): bool {
        return match ($operator) {
            'equals' => $actual === $expected,
            'not_equals' => $actual !== $expected,

            'contains' => is_string($actual)
                && is_string($expected)
                && str_contains($actual, $expected),

            'not_contains' => ! (
                is_string($actual)
                && is_string($expected)
                && str_contains($actual, $expected)
            ),

            'is_empty' => $actual === null
                || $actual === ''
                || $actual === [],

            'is_not_empty' => ! (
                $actual === null
                || $actual === ''
                || $actual === []
            ),

            default => false,
        };
    }
}
