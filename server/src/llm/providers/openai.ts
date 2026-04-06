import OpenAI from 'openai';
import { LLMProvider } from '../types';

export const openaiProvider: LLMProvider = {
  name: 'OpenAI',
  supportsNativeWebSearch: false,

  async chat(systemPrompt: string, userPrompt: string): Promise<string> {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
    });

    return response.choices[0]?.message?.content || '';
  },
};
