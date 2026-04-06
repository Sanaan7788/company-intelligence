export interface ChatResponse {
  content: string;
  prompt_tokens: number;
  completion_tokens: number;
}

export interface LLMProvider {
  name: string;
  chat(systemPrompt: string, userPrompt: string): Promise<ChatResponse>;
  supportsNativeWebSearch: boolean;
}
