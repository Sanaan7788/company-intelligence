import { LLMProvider, ChatResponse } from '../types';

export const ollamaProvider: LLMProvider = {
  name: 'Ollama (Local)',
  supportsNativeWebSearch: false,

  async chat(systemPrompt: string, userPrompt: string): Promise<ChatResponse> {
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || 'llama3.1';

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) throw new Error(`Ollama API error: ${response.statusText}`);

    const data = await response.json() as any;
    // Ollama returns prompt_eval_count and eval_count
    return {
      content: data.message?.content || '',
      prompt_tokens: data.prompt_eval_count ?? 0,
      completion_tokens: data.eval_count ?? 0,
    };
  },
};
