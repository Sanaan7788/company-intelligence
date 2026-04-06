import { LLMProvider } from '../types';
import { deepseekProvider } from './deepseek';
import { anthropicProvider } from './anthropic';
import { openaiProvider } from './openai';
import { ollamaProvider } from './ollama';

export function getProvider(): LLMProvider {
  const providerName = process.env.LLM_PROVIDER || 'deepseek';
  switch (providerName) {
    case 'anthropic': return anthropicProvider;
    case 'openai': return openaiProvider;
    case 'ollama': return ollamaProvider;
    case 'deepseek':
    default: return deepseekProvider;
  }
}
