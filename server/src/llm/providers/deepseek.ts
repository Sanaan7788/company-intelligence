import OpenAI from 'openai';
import { LLMProvider, ChatResponse } from '../types';

export const deepseekProvider: LLMProvider = {
  name: 'DeepSeek V3',
  supportsNativeWebSearch: false,

  async chat(systemPrompt: string, userPrompt: string): Promise<ChatResponse> {
    const client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
      timeout: 120_000,
    });

    const response = await client.chat.completions.create({
      model: process.env.DEEPSEEK_MODEL || 'deepseek-ai/deepseek-r1',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4096,
    });

    return {
      content: response.choices[0]?.message?.content || '',
      prompt_tokens: response.usage?.prompt_tokens ?? 0,
      completion_tokens: response.usage?.completion_tokens ?? 0,
    };
  },
};
