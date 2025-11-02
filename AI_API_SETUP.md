# Free AI API Setup Guide

The AI Financial Coach now supports multiple free AI APIs! Here's how to set them up:

## 🆓 Option 1: Groq (Recommended - Fast & Free)

**Best for:** Speed and reliability  
**Free tier:** 14,400 requests/day  
**Cost:** Completely FREE (no credit card required)

### Setup Steps:

1. **Get a free API key:**
   - Visit: https://console.groq.com
   - Sign up with Google or email (free)
   - Go to "API Keys" section
   - Click "Create API Key"
   - Copy your API key (starts with `gsk_`)

2. **Add to your `.env` file:**
   ```bash
   VITE_GROQ_API_KEY=your-groq-api-key-here
   ```

3. **Restart your dev server:**
   ```bash
   npm run dev
   ```

That's it! Groq is fast and has a generous free tier.

---

## 🆓 Option 2: Google Gemini (Alternative Free Option)

**Best for:** Google ecosystem integration  
**Free tier:** 15 requests/minute  
**Cost:** FREE tier available

### Setup Steps:

1. **Get a free API key:**
   - Visit: https://aistudio.google.com/app/apikey
   - Sign in with your Google account
   - Click "Create API Key"
   - Copy your API key

2. **Add to your `.env` file:**
   ```bash
   VITE_GEMINI_API_KEY=your-gemini-api-key-here
   ```

3. **Restart your dev server**

---

## 💰 Option 3: OpenAI (Paid - Fallback)

If you have an OpenAI API key with credits, you can still use it:

1. **Add to your `.env` file:**
   ```bash
   VITE_OPENAI_API_KEY=your-openai-api-key-here
   ```

---

## How It Works

The AI assistant will automatically try APIs in this order:
1. **Groq** (if `VITE_GROQ_API_KEY` is set) - Fast, free
2. **Gemini** (if `VITE_GEMINI_API_KEY` is set) - Free alternative
3. **OpenAI** (if `VITE_OPENAI_API_KEY` is set) - Paid fallback
4. **Supabase Edge Function** (as last resort)

## Example `.env` File

```bash
# Free AI API (Recommended)
VITE_GROQ_API_KEY=gsk_your_groq_key_here

# Alternative Free API
VITE_GEMINI_API_KEY=your_gemini_key_here

# Paid API (optional)
VITE_OPENAI_API_KEY=sk-proj-your_openai_key_here
```

## Troubleshooting

- **No API key errors?** Make sure you've added the API key to `.env` and restarted the server
- **Rate limit errors?** The free tiers have rate limits - wait a moment and try again
- **Need help?** Check the browser console for detailed error messages

