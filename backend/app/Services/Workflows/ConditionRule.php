<?php

namespace App\Services\Workflows;

use RuntimeException;

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

    public function validatedField(array $data): string
    {
        $field = $this->field($data);

        if ($field === null) {
            throw new RuntimeException(
                'Condition belum memilih variabel boolean. Perbaikan: buka node Condition, lalu pilih variabel Yes-No dari AI Agent sebelumnya.'
            );
        }

        if (! preg_match('/^[a-zA-Z_][a-zA-Z0-9_-]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/', $field)) {
            throw new RuntimeException(
                'Nama variabel Condition "'.$field.'" tidak valid. Perbaikan: pakai format {{nama-agent.variabel}} tanpa spasi. Contoh: rekomendasi-penawaran.mau_beli.'
            );
        }

        return $field;
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
