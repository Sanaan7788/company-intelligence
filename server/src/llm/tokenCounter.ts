// In-memory token counter — resets on server restart
let promptTokens = 0;
let completionTokens = 0;
let totalCalls = 0;

export function recordTokens(prompt: number, completion: number) {
  promptTokens += prompt;
  completionTokens += completion;
  totalCalls += 1;
}

export function getTokenStats() {
  return {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: promptTokens + completionTokens,
    total_calls: totalCalls,
  };
}
