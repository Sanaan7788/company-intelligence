import OpenAI from 'openai';
import { LLMProvider, ChatResponse } from '../types';

export const openaiProvider: LLMProvider = {
  name: 'OpenAI',
  supportsNativeWebSearch: false,

  async chat(systemPrompt: string, userPrompt: string): Promise<ChatResponse> {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
    });

    return {
      content: response.choices[0]?.message?.content || '',
      prompt_tokens: response.usage?.prompt_tokens ?? 0,
      completion_tokens: response.usage?.completion_tokens ?? 0,
    };
  },
};
