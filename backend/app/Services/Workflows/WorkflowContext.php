<?php

namespace App\Services\Workflows;

/**
 * Membaca nilai dari context workflow dan merender placeholder
 * seperti {{name}} atau {{user.name}}.
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
     * Mengganti placeholder seperti {{name}} atau {{user.name}}.
     */
    public function render(string $template, array $context): string
    {
        return preg_replace_callback(
            '/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/',
            function (array $matches) use ($context): string {
                $value = $this->value($context, $matches[1]);

                if (
                    is_string($value)
                    || is_int($value)
                    || is_float($value)
                    || is_bool($value)
                ) {
                    return is_bool($value)
                        ? ($value ? 'true' : 'false')
                        : (string) $value;
                }

                return '';
            },
            $template
        ) ?? $template;
    }
}
