import api from "./api";

export type AiProvider = "gemini" | "openai" | "openrouter";

export type AiProviderSetting = {
  provider: AiProvider;
  label: string;
  configured: boolean;
  models: string[];
  default_model: string | null;
  last_checked_at: string | null;
};

export type AiModelOption = {
  id: string;
  provider: AiProvider;
  provider_label: string;
};

export type AiSettings = {
  providers: AiProviderSetting[];
  models: AiModelOption[];
  debounce_ms: number;
};

export type DetectModelsResult = {
  provider: AiProvider;
  provider_label: string;
  models: string[];
};

export async function getAiSettings(): Promise<AiSettings> {
  const response = await api.get<{ data: AiSettings }>("/ai-settings");
  return response.data.data;
}

export async function updateAiSettings(payload: {
  provider?: AiProvider;
  api_key?: string;
  default_model?: string;
  debounce_ms?: number;
}): Promise<AiSettings> {
  const response = await api.put<{ data: AiSettings }>("/ai-settings", payload);
  return response.data.data;
}

export async function detectAiModels(payload: {
  provider: AiProvider;
  api_key?: string;
}): Promise<DetectModelsResult> {
  const response = await api.post<{ data: DetectModelsResult }>(
    "/ai-settings/detect-models",
    payload,
  );
  return response.data.data;
}

export async function deleteAiProvider(
  provider: AiProvider,
): Promise<AiSettings> {
  const response = await api.delete<{ data: AiSettings }>(
    `/ai-settings/providers/${provider}`,
  );
  return response.data.data;
}
