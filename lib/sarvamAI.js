/**
 * Sarvam AI Chat Completion Integration
 * 
 * Uses the official Sarvam AI JavaScript SDK
 * Documentation: https://docs.sarvam.ai/api-reference-docs/endpoints/chat
 */

import { SarvamAIClient } from 'sarvamai';

const SARVAM_API_KEY = process.env.SARVAM_AI_API_KEY;

/**
 * Get or create Sarvam AI client instance
 */
function getSarvamClient() {
  if (!SARVAM_API_KEY) {
    throw new Error('SARVAM_AI_API_KEY environment variable is not set');
  }
  
  return new SarvamAIClient({
    apiSubscriptionKey: SARVAM_API_KEY
  });
}

/**
 * Call Sarvam AI Chat Completion API
 * 
 * @param {Object} options - Configuration options
 * @param {Array} options.messages - Array of message objects with role and content
 * @param {string} options.model - Model to use (default: 'sarvam-m')
 * @param {number} options.temperature - Temperature for sampling (0-2, default: 0.8)
 * @param {number} options.max_tokens - Maximum tokens to generate
 * @param {string} options.reasoning_effort - Reasoning level: 'low', 'medium', 'high', or null
 * @param {boolean} options.wiki_grounding - Enable Wikipedia grounding for factual queries
 * @returns {Promise<Object>} - API response
 */
export async function sarvamChatCompletion({
  messages,
  model = 'sarvam-m',
  temperature = 0.8,
  max_tokens = 20000,
  reasoning_effort = null,
  wiki_grounding = false
}) {
  const client = getSarvamClient();

  const requestParams = {
    messages,
    model,
    temperature,
    maxTokens: max_tokens
  };

  // Add optional parameters if specified
  if (reasoning_effort) {
    requestParams.reasoningEffort = reasoning_effort;
  }
  
  if (wiki_grounding) {
    requestParams.wikiGrounding = wiki_grounding;
  }

  try {
    const response = await client.chat.completions(requestParams);
    return response;
  } catch (error) {
    console.error('❌ Sarvam AI API call failed:', error.message);
    throw error;
  }
}

/**
 * Extract text content from Sarvam AI response
 * 
 * @param {Object} response - Sarvam AI API response
 * @returns {string} - Extracted text content
 */
export function extractSarvamContent(response) {
  if (!response?.choices?.[0]?.message?.content) {
    throw new Error('Invalid Sarvam AI response format');
  }
  return response.choices[0].message.content;
}

/**
 * Extract reasoning content from Sarvam AI response (if reasoning_effort was set)
 * 
 * @param {Object} response - Sarvam AI API response
 * @returns {string|null} - Reasoning content or null if not available
 */
export function extractSarvamReasoning(response) {
  return response?.choices?.[0]?.message?.reasoning_content || null;
}

/**
 * Get token usage from Sarvam AI response
 * 
 * @param {Object} response - Sarvam AI API response
 * @returns {Object} - Token usage information
 */
export function getSarvamUsage(response) {
  return {
    promptTokens: response?.usage?.prompt_tokens || 0,
    completionTokens: response?.usage?.completion_tokens || 0,
    totalTokens: response?.usage?.total_tokens || 0
  };
}

/**
 * Simple text completion using Sarvam AI (compatible with Ollama-style generate endpoint)
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.prompt - Text prompt
 * @param {string} options.model - Model to use (default: 'sarvam-m')
 * @param {number} options.temperature - Temperature (0-2)
 * @param {number} options.num_predict - Maximum tokens (maps to max_tokens, capped at 4000)
 * @param {number} options.num_ctx - Context window size (ignored for Sarvam)
 * @returns {Promise<Object>} - Response with 'response' field
 */
export async function sarvamGenerate({
  prompt,
  model = 'sarvam-m',
  temperature = 0.8,
  num_predict = 20000,
  num_ctx = 20480 // Ignored for Sarvam AI
}) {
  // Increase max_tokens to 16000 for complete resume generation (input limit is 7168)
  const maxTokens = Math.min(num_predict, 16000);
  
  console.log(`🎯 Sarvam AI: Using max_tokens=${maxTokens} (requested: ${num_predict})`);
  
  // Remove system message - use only user message for less overhead
  const response = await sarvamChatCompletion({
    messages: [{ role: 'user', content: prompt }],
    model,
    temperature: 0.7, // Lower temperature for more focused, complete output
    max_tokens: maxTokens
  });

  const content = extractSarvamContent(response);
  const usage = getSarvamUsage(response);

  // Return in a format compatible with Ollama generate endpoint
  return {
    model,
    created_at: new Date().toISOString(),
    response: content,
    done: true,
    context: [],
    total_duration: 0,
    load_duration: 0,
    prompt_eval_count: usage.promptTokens,
    eval_count: usage.completionTokens
  };
}
