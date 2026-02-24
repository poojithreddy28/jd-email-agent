# Sarvam AI Integration Guide

This branch integrates **Sarvam AI's free chat completion API** as an alternative LLM provider for resume tailoring.

## 🎯 Features

- **Free Model**: Uses Sarvam-M (24B parameter multilingual model) at no cost
- **Dual Provider Support**: Seamlessly switch between Ollama (local) and Sarvam AI (cloud)
- **No Code Changes Required**: Just set environment variables
- **Same Functionality**: All resume tailoring features work identically

## 🚀 Quick Setup

### 1. Get Your Sarvam AI API Key

1. Visit [Sarvam AI](https://www.sarvam.ai/)
2. Sign up for a free account
3. You get **₹1000 free credits** (approx 50-100 resume generations)
4. Copy your API key from the dashboard

### 2. Configure Environment

Create a `.env.local` file in the project root:

```bash
# Choose your LLM provider
LLM_PROVIDER=sarvam

# Sarvam AI Configuration
SARVAM_AI_API_KEY=your_api_key_here
SARVAM_AI_BASE_URL=https://api.sarvam.ai
```

### 3. Install Dependencies (if needed)

No new dependencies required! The integration uses standard fetch API.

### 4. Start the Application

```bash
npm run dev
```

That's it! The application will now use Sarvam AI for all LLM operations.

## 🔄 Switching Between Providers

### Use Sarvam AI (Cloud, Free)

```bash
# .env.local
LLM_PROVIDER=sarvam
SARVAM_AI_API_KEY=your_key_here
```

**Pros:**
- ✅ No local installation needed
- ✅ Free tier with ₹1000 credits
- ✅ Fast cloud-based inference
- ✅ 24B parameter model
- ✅ Works on any machine

**Cons:**
- ⚠️ Requires internet connection
- ⚠️ API key needed
- ⚠️ Rate limits apply

### Use Ollama (Local)

```bash
# .env.local
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3:latest
```

**Pros:**
- ✅ Completely private
- ✅ No internet required
- ✅ No rate limits
- ✅ Free unlimited usage

**Cons:**
- ⚠️ Requires Ollama installation
- ⚠️ Needs powerful hardware
- ⚠️ Slower inference

## 📊 API

 Usage & Costs

### Sarvam-M Model (Free Tier)

- **Price**: ₹0 per token (FREE!)
- **Free Credits**: ₹1000 for new users
- **Context Window**: ~20K tokens
- **Rate Limit**: Depends on your plan

### Typical Resume Generation Costs

- **Input**: ~2000-3000 tokens (resume + JD)
- **Output**: ~1500-2500 tokens (tailored resume)
- **Total per Resume**: ~4000-5500 tokens
- **With ₹1000 credits**: ~50-100 resumes (estimated)

## 🛠️ Architecture

### File Structure

```
lib/
├── sarvamAI.js          # Sarvam AI API client
├── llmProvider.js        # Unified LLM interface
app/api/tailor-resume-pdf/
└── route.js             # Updated to use llmProvider

```

### How It Works

1. **Unified Interface** (`llmProvider.js`):
   - Abstracts LLM provider details
   - Single `generateLLM()` function
   - Automatically routes to correct provider

2. **Sarvam AI Client** (`sarvamAI.js`):
   - Handles Sarvam API authentication
   - Converts responses to Ollama-compatible format
   - Error handling and retries

3. **Resume Route** (`route.js`):
   - No provider-specific code
   - Uses `generateLLM()` for all operations
   - Works with both providers identically

## 🧪 Testing

### Test with Sarvam AI

```bash
# Set environment
export LLM_PROVIDER=sarvam
export SARVAM_AI_API_KEY=your_key

# Run dev server
npm run dev

# Visit http://localhost:3000/resume-tailor
```

Upload a resume, paste a job description, and click "Tailor Resume". Check the console for:

```
🤖 Using LLM provider: sarvam
🤖 LLM Provider: SARVAM (sarvam-m)
📋 Full LLM Response:
```

### Verify Provider Switch

Change `LLM_PROVIDER` in `.env.local` and restart:

```bash
# Switch to Ollama
LLM_PROVIDER=ollama

# Restart
npm run dev
```

Console should show:
```
🤖 Using LLM provider: ollama
🤖 LLM Provider: OLLAMA (llama3:latest)
```

## 🐛 Troubleshooting

### "SARVAM_AI_API_KEY environment variable is not set"

**Solution**: Add your API key to `.env.local`:
```bash
SARVAM_AI_API_KEY=your_actual_key_here
```

### "Sarvam AI API error (403): Invalid API key"

**Solutions**:
1. Verify your API key is correct
2. Check if key is active in Sarvam dashboard
3. Ensure no extra spaces in `.env.local`

### "Sarvam AI API error (429): Quota exceeded"

**Solutions**:
1. Wait for rate limit reset
2. Upgrade your Sarvam plan
3. Switch to Ollama temporarily:
   ```bash
   LLM_PROVIDER=ollama
   ```

### Responses are cut off or incomplete

**Solution**: Sarvam-M has a fixed context window. If responses are truncated:
1. Reduce `num_predict` in `route.js` (default: 20000)
2. Shorten the resume or JD input
3. Use Ollama for very long documents

## 📚 API Reference

### Sarvam AI Documentation

- [Chat Completion](https://docs.sarvam.ai/api-reference-docs/endpoints/chat)
- [Pricing](https://docs.sarvam.ai/pricing)
- [Rate Limits](https://docs.sarvam.ai/api-reference-docs/rate-limits)

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LLM_PROVIDER` | No | `ollama` | `ollama` or `sarvam` |
| `SARVAM_AI_API_KEY` | Yes (if sarvam) | - | Your Sarvam API key |
| `SARVAM_AI_BASE_URL` | No | `https://api.sarvam.ai` | API base URL |
| `OLLAMA_BASE_URL` | No | `http://localhost:11434` | Ollama URL |
| `OLLAMA_MODEL` | No | `llama3:latest` | Ollama model |

## 🎓 Advanced Features

### Reasoning Mode (Optional)

Sarvam-M supports "thinking mode" for complex reasoning. Enable in `lib/llmProvider.js`:

```javascript
// Add reasoning_effort parameter
const response = await sarvamGenerate({
  prompt,
  model: 'sarvam-m',
  temperature,
  num_predict,
  reasoning_effort: 'medium'  // or 'low', 'high'
});
```

### Wikipedia Grounding (Optional)

Enable fact-checking for summaries:

```javascript
const response = await sarvamGenerate({
  prompt,
  wiki_grounding: true  // Grounds responses in Wikipedia data
});
```

## 🤝 Contributing

If you find issues or want to improve the integration:

1. Test with both providers
2. Maintain compatibility with Ollama
3. Update this README
4. Submit a PR to this branch

## 📝 License

Same as main project.

## ❓ Support

- **Sarvam AI Issues**: [Sarvam Support](https://www.sarvam.ai/support)
- **Integration Issues**: Open a GitHub issue
- **General Questions**: Check main project README

---

**Happy Resume Tailoring! 🎉**
