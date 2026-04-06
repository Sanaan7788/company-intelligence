export interface LLMProvider {
  name: string;
  chat(systemPrompt: string, userPrompt: string): Promise<string>;
  supportsNativeWebSearch: boolean;
}
