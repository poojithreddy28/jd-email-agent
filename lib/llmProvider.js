/**
 * Unified LLM Interface
 * 
 * Provides a single interface for calling different LLM providers
 * Supports: Ollama (local), Sarvam AI (cloud)
 */

import { sarvamGenerate } from './sarvamAI.js';

const LLM_PROVIDER = process.env.LLM_PROVIDER || 'ollama';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3:latest';

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
  temperature = 0.8,
  num_predict = 20000,
  num_ctx = 20480
}) {
  console.log(`🤖 Using LLM provider: ${LLM_PROVIDER}`);

  if (LLM_PROVIDER === 'sarvam') {
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
    // Use Ollama (default)
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
 * @returns {string} - Current provider ('ollama' or 'sarvam')
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
  if (LLM_PROVIDER === 'sarvam') {
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
