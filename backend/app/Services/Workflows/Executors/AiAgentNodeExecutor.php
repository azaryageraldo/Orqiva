<?php

namespace App\Services\Workflows\Executors;

use App\Services\AI\AiProviderManager;
use App\Services\Workflows\AiAgentVariables;
use App\Services\Workflows\WorkflowContext;
use RuntimeException;

class AiAgentNodeExecutor implements NodeExecutorInterface
{
    public function __construct(
        private readonly AiAgentVariables $agentVariables,
        private readonly WorkflowContext $context,
        private readonly AiProviderManager $aiProviders
    ) {}

    public function execute(
        array $node,
        array &$context,
        int $ownerId,
        int $currentWorkflowId,
        string $currentWorkflowName,
        array $next,
        ?array &$currentStep = null
    ): NodeExecutionResult {
        $nodeId = (string) ($node['id'] ?? '');
        $data = $node['data'] ?? [];

        $outputVariables = $this->agentVariables->normalize($data);
        $schema = $this->agentVariables->schema($outputVariables);
        $agentNamespace = $this->agentVariables->namespace($data, $nodeId);
        $verbosity = in_array(
            $data['verbosity'] ?? null,
            ['concise', 'balanced', 'detailed'],
            true
        ) ? (string) $data['verbosity'] : 'concise';
        $contextMessages = max(0, min(20, (int) ($data['contextMessages'] ?? 10)));

        $systemMessage = (string) (
            $data['systemMessage'] ?? 'You are a helpful assistant.'
        );
        $systemMessage = $this->context->render($systemMessage, $context);
        $systemMessage .= "\n\n".$this->verbosityInstruction($verbosity);

        if ($schema !== null) {
            $systemMessage .= "\n\nRespond only with JSON matching the provided schema.";
        }

        $provider = is_string($data['provider'] ?? null)
            ? $data['provider']
            : 'gemini';
        $model = $this->aiProviders->resolveModel(
            $ownerId,
            $provider,
            is_string($data['model'] ?? null) ? $data['model'] : null
        );

        $userMessage = $context['customer_message']
            ?? $context['message']
            ?? $context['input']['message']
            ?? '';

        if (! is_string($userMessage)) {
            $userMessage = json_encode(
                $userMessage,
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
            ) ?: '';
        }

        $history = $context['conversation_history'] ?? null;

        if (is_array($history) && $contextMessages > 0) {
            $history = array_slice($history, -$contextMessages);
            $history = collect($history)
                ->map(function (mixed $message): string {
                    if (! is_array($message)) {
                        return '';
                    }

                    $role = match ($message['role'] ?? null) {
                        'customer' => 'Pelanggan',
                        'admin' => 'Admin',
                        'assistant' => 'AI',
                        default => 'Sistem',
                    };

                    return $role.': '.trim((string) ($message['content'] ?? ''));
                })
                ->filter()
                ->implode("\n");
        }

        if (is_string($history) && trim($history) !== '' && $contextMessages > 0) {
            $userMessage = "Riwayat percakapan sesi ini (terbaru di bawah):\n"
                .trim($history)
                ."\n\nPesan pelanggan terbaru: "
                .$userMessage;
        } elseif ($history === [] || $contextMessages === 0) {
            $userMessage = 'Pesan pelanggan terbaru: '.$userMessage;
        }

        $customerName = $context['customer_name'] ?? null;

        if (is_string($customerName) && trim($customerName) !== '') {
            $userMessage = "Nama pelanggan: {$customerName}\n\n"
                ."Pesan pelanggan: {$userMessage}";
        }

        if (trim($userMessage) === '') {
            throw new RuntimeException(
                'Pesan pengguna kosong. Periksa input Trigger dan variabel AI Agent.'
            );
        }

        $stepInput = [
            'provider' => $provider,
            'system_message' => $systemMessage,
            'user_message' => $userMessage,
            'model' => $model,
            'temperature' => (float) ($data['temperature'] ?? 0.7),
            'verbosity' => $verbosity,
            'context_messages' => $contextMessages,
            'agent_namespace' => $agentNamespace,
        ];

        if ($currentStep !== null) {
            $currentStep['input'] = $stepInput;
        }

        $aiResult = $this->aiProviders->generate(
            $ownerId,
            $provider,
            $model,
            $systemMessage,
            $userMessage,
            (float) ($data['temperature'] ?? 0.7),
            $schema,
            match ($verbosity) {
                'concise' => 800,
                'detailed' => 2000,
                default => 1200,
            }
        );

        $stepPromptTokens = (int) $aiResult['usage']['prompt_tokens'];
        $stepCompletionTokens = (int) $aiResult['usage']['completion_tokens'];
        $stepTotalTokens = (int) $aiResult['usage']['total_tokens'];

        $logContext = [];
        $stepVariables = null;

        if ($schema !== null) {
            $json = trim($aiResult['text']);

            if (($aiResult['finish_reason'] ?? 'STOP') === 'MAX_TOKENS') {
                throw new RuntimeException(
                    'Jawaban AI terpotong karena batas token. Ringkas system prompt atau tambah kapasitas output.'
                );
            }

            if (str_starts_with($json, '```')) {
                $json = (string) preg_replace(
                    '/^```[a-zA-Z]*\s*|\s*```$/',
                    '',
                    $json
                );
            }

            $payload = json_decode($json, true);

            $values = $this->agentVariables->extract(
                $outputVariables,
                $payload
            );

            foreach ($values as $name => $value) {
                $context[$name] = $value;
                $context[$agentNamespace][$name] = $value;
            }

            $aiText = '';

            foreach ($outputVariables as $variable) {
                if (
                    $variable['type'] === 'string'
                    && (string) $values[$variable['name']] !== ''
                ) {
                    $aiText = (string) $values[$variable['name']];

                    break;
                }
            }

            if ($aiText === '') {
                foreach ($outputVariables as $variable) {
                    if ($variable['type'] !== 'array') {
                        continue;
                    }

                    $first = $values[$variable['name']][0][$variable['item_field']] ?? '';

                    if ($first !== '') {
                        $aiText = $first;

                        break;
                    }
                }
            }

            $context['ai_response'] = $aiText;
            $context[$agentNamespace]['ai_response'] = $aiText;
            $logContext['variables'] = $values;
            $stepVariables = $values;
            $stepOutput = [
                'text' => $aiText,
                'raw_text' => $aiResult['text'],
                'ai_response' => $aiText,
            ];
        } else {
            $context['ai_response'] = $aiResult['text'];
            $context[$agentNamespace]['ai_response'] = $aiResult['text'];
            $stepOutput = ['text' => $aiResult['text']];
        }

        $logContext['provider'] = $provider;
        $logContext['model'] = $model;
        $logContext['agent_namespace'] = $agentNamespace;
        $logContext['verbosity'] = $verbosity;
        $logContext['context_messages'] = $contextMessages;
        $logContext['prompt_tokens'] = $aiResult['usage']['prompt_tokens'];
        $logContext['completion_tokens'] = $aiResult['usage']['completion_tokens'];
        $logContext['total_tokens'] = $aiResult['usage']['total_tokens'];

        return new NodeExecutionResult(
            input: $stepInput,
            output: $stepOutput,
            variables: $stepVariables,
            promptTokens: $stepPromptTokens,
            completionTokens: $stepCompletionTokens,
            totalTokens: $stepTotalTokens,
            message: 'AI Agent berhasil menghasilkan jawaban.',
            logContext: $logContext,
        );
    }

    private function verbosityInstruction(string $verbosity): string
    {
        return match ($verbosity) {
            'detailed' => 'Gaya jawaban: cukup detail, tetapi tetap terstruktur dan tanpa pengulangan. Gunakan maksimal tiga paragraf pendek atau tiga poin. Setiap bubble maksimal tiga kalimat.',
            'balanced' => 'Gaya jawaban: ringkas dan jelas. Gunakan maksimal dua paragraf pendek. Setiap bubble maksimal dua sampai tiga kalimat. Jangan mengulang pertanyaan atau informasi yang sudah diketahui.',
            default => 'Gaya jawaban: sangat ringkas. Setiap bubble maksimal dua kalimat. Langsung jawab inti, jangan mengulang pertanyaan pelanggan, jangan bertele-tele, dan ajukan paling banyak satu pertanyaan lanjutan.',
        };
    }
}

