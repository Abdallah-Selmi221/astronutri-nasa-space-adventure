// Vercel Serverless Function — Hardened Gemini Egyptian Arabic TTS Endpoint (/api/tts)
// Security Controls:
// 1. Server-only GEMINI_API_KEY (never exposed to browser bundles or error payloads)
// 2. Per-instance IP-based sliding-window rate limiting (HTTP 429) using x-vercel-forwarded-for / x-real-ip / x-forwarded-for
//    ARCHITECTURAL LIMITATION NOTE (Serverless Scaling):
//    Because this rate limiter uses an in-memory Map (`rateLimitStore`), its state is local to each
//    warm Vercel Serverless Function execution instance and resets on cold starts or horizontal scaling across microVMs.
//    In a zero-cost hackathon environment without an external distributed store (such as Upstash Redis / Vercel KV)
//    or enterprise WAF, this provides best-effort per-instance flood mitigation while prioritizing edge-injected
//    headers (`x-vercel-forwarded-for` and `x-real-ip`) over client-spoofable headers.
// 3. Strict payload & character length limits (max 500 chars, HTTP 400 / 413)
// 4. Strict Arabic/English/digits/safe-punctuation character validation (HTTP 400)
// 5. Sanitized error responses (zero API key or internal URL leakage)

declare const process: {
  env: Record<string, string | undefined>;
};

export interface VercelRequestLike {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
  body?: { text?: string } | string;
}

export interface VercelResponseLike {
  status: (code: number) => VercelResponseLike;
  setHeader: (name: string, value: string) => VercelResponseLike;
  json: (payload: Record<string, unknown>) => void;
}

export const MAX_TEXT_LENGTH = 500;
export const MAX_RAW_BODY_BYTES = 2048;
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const MAX_REQUESTS_PER_WINDOW = 20;
const UPSTREAM_TIMEOUT_MS = 8500;

// Allow ONLY Arabic script, English letters, digits, whitespace, and safe punctuation.
// Explicitly blocks HTML angle brackets (<, >), control chars, and shell/script metacharacters.
export const SAFE_TEXT_REGEX =
  /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFa-zA-Z0-9\s.,!?;:()'"«»\-–—%+/،؛؟]+$/;

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const MAX_TRACKED_IPS = 1000;
const rateLimitStore = new Map<string, RateLimitBucket>();

export function resetRateLimitStoreForTesting(): void {
  rateLimitStore.clear();
}

function getClientIp(req: VercelRequestLike): string {
  // 1. Prefer Vercel edge-verified headers first (cannot be spoofed behind Vercel proxy)
  const vercelFf = req.headers?.['x-vercel-forwarded-for'];
  if (typeof vercelFf === 'string' && vercelFf.trim().length > 0) {
    return vercelFf.split(',')[0].trim().slice(0, 64);
  }

  const realIp = req.headers?.['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim().length > 0) {
    return realIp.trim().slice(0, 64);
  }

  // 2. Fallback to x-forwarded-for (first hop) or socket remoteAddress
  const xff = req.headers?.['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim().length > 0) {
    return xff.split(',')[0].trim().slice(0, 64);
  }
  if (Array.isArray(xff) && xff.length > 0) {
    return xff[0].split(',')[0].trim().slice(0, 64);
  }

  return (req.socket?.remoteAddress || '127.0.0.1').slice(0, 64);
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSec: number; remaining: number } {
  const now = Date.now();

  // Opportunistic expired-bucket cleanup + strict FIFO eviction cap to prevent memory exhaustion
  if (rateLimitStore.size >= MAX_TRACKED_IPS) {
    for (const [k, bucket] of rateLimitStore.entries()) {
      if (now >= bucket.resetAt) {
        rateLimitStore.delete(k);
      }
    }
    if (rateLimitStore.size >= MAX_TRACKED_IPS) {
      const oldestKey = rateLimitStore.keys().next().value;
      if (oldestKey !== undefined) {
        rateLimitStore.delete(oldestKey);
      }
    }
  }

  const existing = rateLimitStore.get(ip);
  if (!existing || now >= existing.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return {
      allowed: true,
      retryAfterSec: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
      remaining: MAX_REQUESTS_PER_WINDOW - 1
    };
  }

  if (existing.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { allowed: false, retryAfterSec, remaining: 0 };
  }

  existing.count += 1;
  return {
    allowed: true,
    retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    remaining: MAX_REQUESTS_PER_WINDOW - existing.count
  };
}

export function validateAndSanitizeTtsText(rawInput: unknown): {
  valid: boolean;
  statusCode?: number;
  error?: string;
  cleanText?: string;
} {
  if (typeof rawInput !== 'string') {
    return {
      valid: false,
      statusCode: 400,
      error: 'Missing or invalid "text" field.'
    };
  }

  // Strip emojis and normalize whitespace before validating Arabic/English content
  const stripped = rawInput
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!stripped) {
    return {
      valid: false,
      statusCode: 400,
      error: 'Text must contain non-empty Arabic or English words.'
    };
  }

  if (stripped.length > MAX_TEXT_LENGTH) {
    return {
      valid: false,
      statusCode: 400,
      error: `Text exceeds maximum allowed length of ${MAX_TEXT_LENGTH} characters.`
    };
  }

  if (!SAFE_TEXT_REGEX.test(stripped)) {
    return {
      valid: false,
      statusCode: 400,
      error: 'Invalid characters in text. Only Arabic and English letters, numbers, and safe punctuation are allowed.'
    };
  }

  return {
    valid: true,
    cleanText: stripped
  };
}

export default async function handler(
  req: VercelRequestLike,
  res: VercelResponseLike
): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed. Use POST /api/tts.' });
    return;
  }

  // 1. IP Rate Limiting Check
  const clientIp = getClientIp(req);
  const rateStatus = checkRateLimit(clientIp);
  res.setHeader('X-RateLimit-Limit', String(MAX_REQUESTS_PER_WINDOW));
  res.setHeader('X-RateLimit-Remaining', String(rateStatus.remaining));

  if (!rateStatus.allowed) {
    res.setHeader('Retry-After', String(rateStatus.retryAfterSec));
    res.status(429).json({
      error: 'Too many TTS requests. Please wait before trying again.'
    });
    return;
  }

  // 2. Payload Size & JSON Parsing Check
  let parsedBody: { text?: unknown } = {};
  if (typeof req.body === 'string') {
    if (req.body.length > MAX_RAW_BODY_BYTES) {
      res.status(413).json({ error: 'Request payload too large.' });
      return;
    }
    try {
      parsedBody = JSON.parse(req.body);
    } catch {
      res.status(400).json({ error: 'Malformed JSON request body.' });
      return;
    }
  } else if (req.body && typeof req.body === 'object') {
    parsedBody = req.body;
  } else {
    res.status(400).json({ error: 'Missing JSON request body.' });
    return;
  }

  // 3. Strict Text Length & Arabic/English Character Validation
  const validation = validateAndSanitizeTtsText(parsedBody.text);
  if (!validation.valid || !validation.cleanText) {
    res.status(validation.statusCode || 400).json({
      error: validation.error || 'Invalid text input.'
    });
    return;
  }

  // 4. Server-Side API Key Check (Never exposed in response)
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({
      error: 'Speech synthesis service is currently unavailable.'
    });
    return;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;
    const payload = {
      contents: [
        {
          parts: [
            {
              text: `انطق الجملة التالية كاملة بلهجة مصرية واضحة ومبهجة ومناسبة للأطفال: ${validation.cleanText}`
            }
          ]
        }
      ],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Puck'
            }
          }
        }
      }
    };

    const upstreamRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!upstreamRes.ok) {
      // Never echo upstream error body or key
      res.status(502).json({
        error: 'Upstream speech synthesis service returned an error.'
      });
      return;
    }

    const data = (await upstreamRes.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            inlineData?: {
              data?: string;
            };
          }>;
        };
      }>;
    };

    const base64Audio = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      res.status(502).json({ error: 'Upstream speech synthesis returned empty audio.' });
      return;
    }

    res.status(200).json({
      base64Audio,
      sampleRate: 24000
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const isAbort = err instanceof Error && err.name === 'AbortError';
    res.status(isAbort ? 504 : 500).json({
      error: isAbort
        ? 'Speech synthesis request timed out.'
        : 'Internal speech synthesis error.'
    });
  }
}
