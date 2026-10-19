<?php

namespace App\Services\Workflows;

/**
 * Aturan node Condition: satu variabel boolean, dua cabang
 * (If match / Else).
 */
class ConditionRule
{
    public function field(array $data): ?string
    {
        $field = $data['conditionVariable'] ?? null;

        if ($field === null && isset($data['condition']) && is_array($data['condition'])) {
            $field = $data['condition']['field'] ?? null;
        }

        if (! is_string($field) || trim($field) === '') {
            return null;
        }

        return trim($field);
    }

    public function isTruthy(mixed $value): bool
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

        if (is_array($value)) {
            return $value !== [];
        }

        return false;
    }
}
