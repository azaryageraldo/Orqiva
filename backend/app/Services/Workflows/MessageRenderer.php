<?php

namespace App\Services\Workflows;

use RuntimeException;

/**
 * Merender template Send Message menjadi satu atau beberapa bubble.
 */
class MessageRenderer
{
    public function __construct(private readonly WorkflowContext $context) {}

    /**
     * @return array<int, string>
     */
    public function render(string $template, array $context): array
    {
        $template = trim($template);

        if ($template === '') {
            throw new RuntimeException(
                'Template pesan Send Message belum diisi.'
            );
        }

        // Template yang hanya berisi satu variabel bisa menghasilkan
        // beberapa bubble jika variabelnya berupa array.
        if (
            preg_match(
                '/^\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}$/',
                $template,
                $matches
            ) === 1
        ) {
            $value = $this->context->resolve($context, $matches[1]);

            if (is_array($value) && array_is_list($value)) {
                $messages = [];

                foreach ($value as $item) {
                    $text = trim($this->context->stringify($item));

                    if ($text !== '') {
                        $messages[] = $text;
                    }
                }

                return $messages;
            }
        }

        $text = trim($this->context->render($template, $context));

        return $text === '' ? [] : [$text];
    }
}
