/**
 * Unified LLM Interface
 * 
 * Provides a single interface for calling different LLM providers
 * Supports: Anthropic Claude (cloud), Ollama (local), Sarvam AI (cloud)
 */

import { sarvamGenerate } from './sarvamAI.js';

const LLM_PROVIDER = process.env.LLM_PROVIDER || 'anthropic';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3:latest';

/**
 * Call Anthropic Claude Messages API
 * 
 * @param {string} prompt - The user prompt
 * @param {number} max_tokens - Maximum tokens to generate
 * @param {number} temperature - Temperature for sampling
 * @returns {Promise<string>} - The response text
 */
async function callClaude(prompt, max_tokens = 4096, temperature = 0.7) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens,
      temperature,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const text = data.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('');
  return text;
}

/**
 * Generate text completion using configured LLM provider
 * 
 * @param {Object} options - Generation options
 * @param {string} options.prompt - Text prompt
 * @param {string} options.model - Model to use (optional, uses default)
 * @param {number} options.temperature - Temperature for sampling (0-2)
 * @param {number} options.num_predict - Maximum tokens to generate
 * @param {number} options.num_ctx - Context window size
 * @returns {Promise<Object>} - Response with 'response' field containing generated text
 */
export async function generateLLM({
  prompt,
  model = null,
  temperature = 0.7,
  num_predict = 4096,
  num_ctx = 20480
}) {
  console.log(`🤖 Using LLM provider: ${LLM_PROVIDER}`);

  if (LLM_PROVIDER === 'anthropic') {
    // Use Anthropic Claude
    const text = await callClaude(prompt, num_predict, temperature);
    // Return in same format as Ollama for compatibility
    return { response: text };
  } else if (LLM_PROVIDER === 'sarvam') {
    // Use Sarvam AI
    const response = await sarvamGenerate({
      prompt,
      model: model || 'sarvam-m',
      temperature,
      num_predict,
      num_ctx
    });
    return response;
  } else {
    // Use Ollama (local)
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || OLLAMA_MODEL,
        prompt,
        stream: false,
        options: {
          temperature,
          num_predict,
          num_ctx
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    return await response.json();
  }
}

/**
 * Get the current LLM provider
 * 
 * @returns {string} - Current provider ('anthropic', 'ollama', or 'sarvam')
 */
export function getLLMProvider() {
  return LLM_PROVIDER;
}

/**
 * Get model information for current provider
 * 
 * @returns {Object} - Model configuration
 */
export function getLLMConfig() {
  if (LLM_PROVIDER === 'anthropic') {
    return {
      provider: 'anthropic',
      model: ANTHROPIC_MODEL,
      description: 'Anthropic Claude - Cloud LLM'
    };
  } else if (LLM_PROVIDER === 'sarvam') {
    return {
      provider: 'sarvam',
      model: 'sarvam-m',
      description: 'Sarvam AI - 24B parameter multilingual model (Free)'
    };
  } else {
    return {
      provider: 'ollama',
      model: OLLAMA_MODEL,
      description: 'Ollama - Local LLM',
      baseUrl: OLLAMA_BASE_URL
    };
  }
}

export { callClaude };
