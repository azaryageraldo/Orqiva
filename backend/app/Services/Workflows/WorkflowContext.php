<?php

namespace App\Services\Workflows;

/**
 * Membaca nilai dari context workflow dan merender placeholder
 * seperti {{name}}, {{user.name}}, atau {{replies.text}}.
 */
class WorkflowContext
{
    /**
     * Mengambil nilai dari context menggunakan dot notation.
     */
    public function value(array $context, string $path): mixed
    {
        $value = $context;

        foreach (explode('.', $path) as $segment) {
            if (
                ! is_array($value)
                || ! array_key_exists($segment, $value)
            ) {
                return null;
            }

            $value = $value[$segment];
        }

        return $value;
    }

    /**
     * Memeriksa apakah path benar-benar ada di context, termasuk nilai null/false.
     */
    public function has(array $context, string $path): bool
    {
        $value = $context;

        foreach (explode('.', $path) as $segment) {
            if (! is_array($value) || ! array_key_exists($segment, $value)) {
                return false;
            }

            $value = $value[$segment];
        }

        return true;
    }

    /**
     * Mengambil nilai, termasuk mengambil satu field dari list of objects
     * (mis. {{replies.text}} → ["Halo", "Ada yang bisa dibantu?"]).
     */
    public function resolve(array $context, string $path): mixed
    {
        $value = $this->value($context, $path);

        if ($value !== null) {
            return $value;
        }

        $segments = explode('.', $path);

        if (count($segments) < 2) {
            return null;
        }

        $field = array_pop($segments);
        $list = $this->value($context, implode('.', $segments));

        if (! is_array($list) || ! array_is_list($list)) {
            return null;
        }

        $values = [];

        foreach ($list as $item) {
            $values[] = is_array($item) ? ($item[$field] ?? null) : null;
        }

        return $values;
    }

    /**
     * Mengganti placeholder seperti {{name}} atau {{user.name}}.
     */
    public function render(string $template, array $context): string
    {
        return preg_replace_callback(
            '/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/',
            function (array $matches) use ($context): string {
                return $this->stringify(
                    $this->resolve($context, $matches[1])
                );
            },
            $template
        ) ?? $template;
    }

    public function stringify(mixed $value): string
    {
        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }

        if (is_string($value) || is_int($value) || is_float($value)) {
            return (string) $value;
        }

        if (is_array($value)) {
            $lines = [];

            foreach ($value as $item) {
                $line = trim($this->stringifyScalar($item));

                if ($line !== '') {
                    $lines[] = $line;
                }
            }

            return implode("\n", $lines);
        }

        return '';
    }

    private function stringifyScalar(mixed $item): string
    {
        if (is_array($item)) {
            foreach ($item as $value) {
                if (is_scalar($value)) {
                    return (string) $value;
                }
            }

            return '';
        }

        return is_scalar($item) ? (string) $item : '';
    }
}
