/**
 * Minimal LLM client for ai-kit.
 * Uses OpenCode plugin system or direct API calls based on environment.
 */

export interface LLMCallOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

/**
 * Call an LLM with the given prompts.
 * 
 * This implementation tries to use the configured provider in ai-kit.
 * For NVIDIA (default in ai-kit), it uses the NVIDIA API.
 * Can be extended to support other providers.
 */
export async function callLLM(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  options: LLMCallOptions = {},
): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
  const model = options.model || process.env.LLM_MODEL || "nvidia/llama-3.1-nemotron-70b-instruct";
  
  if (!apiKey) {
    throw new Error(
      "No API key found. Set NVIDIA_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY environment variable."
    );
  }

  // Determine API endpoint based on available keys
  if (process.env.NVIDIA_API_KEY) {
    return callNVIDIA(systemPrompt, messages, options);
  }
  
  if (process.env.OPENAI_API_KEY) {
    return callOpenAI(systemPrompt, messages, options);
  }
  
  if (process.env.ANTHROPIC_API_KEY) {
    return callAnthropic(systemPrompt, messages, options);
  }

  throw new Error("No supported LLM provider configured.");
}

async function callNVIDIA(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  options: LLMCallOptions,
): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY!;
  const model = options.model || "nvidia/llama-3.1-nemotron-70b-instruct";
  const maxTokens = options.maxTokens || 1800;
  const temperature = options.temperature ?? 0;

  const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`NVIDIA API error: ${response.status} ${error}`);
  }

  const data = await response.json() as any;
  return data.choices?.[0]?.message?.content ?? "";
}

async function callOpenAI(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  options: LLMCallOptions,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY!;
  const model = options.model || "gpt-4o-mini";
  const maxTokens = options.maxTokens || 1800;
  const temperature = options.temperature ?? 0;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${error}`);
  }

  const data = await response.json() as any;
  return data.choices?.[0]?.message?.content ?? "";
}

async function callAnthropic(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  options: LLMCallOptions,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY!;
  const model = options.model || "claude-3-5-haiku-20241022";
  const maxTokens = options.maxTokens || 1800;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} ${error}`);
  }

  const data = await response.json() as any;
  return data.content?.[0]?.text ?? "";
}
