import { Router, type Request, type Response } from 'express';
import { pool } from '../db.js';
import { env } from '../env.js';
import { requireAuth, requirePlan } from '../middleware/auth.js';
import { releaseAiUsageSlot, reserveAiUsageSlot } from '../lib/orgQuery.js';

const router = Router();

async function aiAssistantHandler(req: Request, res: Response) {
  const { message, invoices, context } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' });
  }

  const orgId = req.auth!.orgId;
  let slotReserved = false;

  try {
    const usage = await reserveAiUsageSlot(pool, orgId, env.AI_DAILY_LIMIT_PRO);
    if (!usage.allowed) {
      return res.status(429).json({
        error: 'Daily AI quota exceeded',
        remaining: 0,
        limit: env.AI_DAILY_LIMIT_PRO,
      });
    }
    slotReserved = true;

    const invoiceContext = (Array.isArray(invoices) ? invoices : []).map(
      (inv: Record<string, unknown>) => ({
        number: inv.invoicenumber,
        amount: inv.amount,
        dueDate: inv.duedate,
        status: inv.status,
      })
    );

    const systemPrompt = `You are InvoiceFlow's AI assistant for accounts receivable collections.

Context about the organization's invoices:
${JSON.stringify(invoiceContext, null, 2)}

Guidelines:
- Be helpful, friendly, and concise
- Provide actionable advice for collections and follow-ups
- When generating email templates, make them professional but firm
- Reference specific invoice data when relevant
- Help with dunning strategies and payment reminders

Current context: ${context || 'General AR collections assistance'}`;

    let aiResponse: string | null = null;

    if (env.GROQ_API_KEY) {
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: message },
            ],
            max_tokens: 1000,
            temperature: 0.7,
          }),
        });

        if (groqRes.ok) {
          const groqData = (await groqRes.json()) as { choices?: { message?: { content?: string } }[] };
          aiResponse = groqData.choices?.[0]?.message?.content ?? null;
        }
      } catch (err) {
        console.warn('Groq failed:', err);
      }
    }

    if (!aiResponse && env.OPENAI_API_KEY) {
      try {
        const oaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: message },
            ],
            max_tokens: 1000,
            temperature: 0.7,
          }),
        });

        if (oaiRes.ok) {
          const oaiData = (await oaiRes.json()) as { choices?: { message?: { content?: string } }[] };
          aiResponse = oaiData.choices?.[0]?.message?.content ?? null;
        }
      } catch (err) {
        console.warn('OpenAI failed:', err);
      }
    }

    if (!aiResponse) {
      await releaseAiUsageSlot(pool, orgId);
      slotReserved = false;
      return res.status(503).json({
        success: false,
        error: 'No AI API keys configured. Set GROQ_API_KEY or OPENAI_API_KEY.',
      });
    }

    res.json({ success: true, response: aiResponse, remaining: usage.remaining });
  } catch (err) {
    if (slotReserved) {
      await releaseAiUsageSlot(pool, orgId).catch(() => {});
    }
    console.error('ai-assistant error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

router.post('/assistant', requireAuth, requirePlan('pro'), aiAssistantHandler);
router.post('/ai-assistant', requireAuth, requirePlan('pro'), aiAssistantHandler);

export default router;
