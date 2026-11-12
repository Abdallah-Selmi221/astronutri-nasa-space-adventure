import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const MAX_TEXT_LENGTH = 500;
const MAX_RAW_BODY_BYTES = 2048;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;
const SAFE_TEXT_REGEX =
  /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFa-zA-Z0-9\s.,!?;:()'"«»\-–—%+/،؛؟]+$/;

/**
 * Local Dev & Preview Middleware for `/api/tts` that mirrors the hardened Vercel Serverless Function (`api/tts.ts`).
 * Enforces IP rate limiting (20 req/min), 500-char limit, Arabic/English allowlist regex, and safe error messages.
 */
function localVercelTtsPlugin(serverApiKey: string): Plugin {
  const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

  const attachMiddleware = (middlewares: {
    use: (
      route: string,
      fn: (
        req: {
          method?: string;
          headers?: Record<string, string | string[] | undefined>;
          socket?: { remoteAddress?: string };
          on: (event: string, cb: (chunk?: unknown) => void) => void;
        },
        res: {
          statusCode: number;
          setHeader: (k: string, v: string) => void;
          end: (body: string) => void;
        },
        next: () => void
      ) => void
    ) => void;
  }) => {
    middlewares.use('/api/tts', (req, res) => {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');

      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'Method Not Allowed. Use POST /api/tts.' }));
        return;
      }

      // 1. IP Rate Limiting
      const xff = req.headers?.['x-forwarded-for'];
      const clientIp =
        typeof xff === 'string' && xff.length > 0
          ? xff.split(',')[0].trim()
          : req.socket?.remoteAddress || '127.0.0.1';

      const now = Date.now();
      const bucket = rateLimitStore.get(clientIp);
      if (!bucket || now >= bucket.resetAt) {
        rateLimitStore.set(clientIp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        res.setHeader('X-RateLimit-Limit', String(MAX_REQUESTS_PER_WINDOW));
        res.setHeader('X-RateLimit-Remaining', String(MAX_REQUESTS_PER_WINDOW - 1));
      } else if (bucket.count >= MAX_REQUESTS_PER_WINDOW) {
        const retrySec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
        res.setHeader('X-RateLimit-Limit', String(MAX_REQUESTS_PER_WINDOW));
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('Retry-After', String(retrySec));
        res.statusCode = 429;
        res.end(JSON.stringify({ error: 'Too many TTS requests. Please wait before trying again.' }));
        return;
      } else {
        bucket.count += 1;
        res.setHeader('X-RateLimit-Limit', String(MAX_REQUESTS_PER_WINDOW));
        res.setHeader('X-RateLimit-Remaining', String(MAX_REQUESTS_PER_WINDOW - bucket.count));
      }

      let rawBody = '';
      let abortedTooLarge = false;

      req.on('data', (chunk) => {
        rawBody += String(chunk || '');
        if (rawBody.length > MAX_RAW_BODY_BYTES) {
          abortedTooLarge = true;
        }
      });

      req.on('end', async () => {
        if (abortedTooLarge) {
          res.statusCode = 413;
          res.end(JSON.stringify({ error: 'Request payload too large.' }));
          return;
        }

        let parsed: { text?: unknown } = {};
        try {
          parsed = JSON.parse(rawBody || '{}');
        } catch {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Malformed JSON request body.' }));
          return;
        }

        if (typeof parsed.text !== 'string') {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Missing or invalid "text" field.' }));
          return;
        }

        const stripped = parsed.text
          .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu, '')
          .replace(/\s+/g, ' ')
          .trim();

        if (!stripped) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Text must contain non-empty Arabic or English words.' }));
          return;
        }

        if (stripped.length > MAX_TEXT_LENGTH) {
          res.statusCode = 400;
          res.end(
            JSON.stringify({
              error: `Text exceeds maximum allowed length of ${MAX_TEXT_LENGTH} characters.`
            })
          );
          return;
        }

        if (!SAFE_TEXT_REGEX.test(stripped)) {
          res.statusCode = 400;
          res.end(
            JSON.stringify({
              error:
                'Invalid characters in text. Only Arabic and English letters, numbers, and safe punctuation are allowed.'
            })
          );
          return;
        }

        if (!serverApiKey) {
          res.statusCode = 503;
          res.end(JSON.stringify({ error: 'Speech synthesis service is currently unavailable.' }));
          return;
        }

        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 8500);

          const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${serverApiKey}`;
          const payload = {
            contents: [
              {
                parts: [
                  {
                    text: `انطق الجملة التالية كاملة بلهجة مصرية واضحة ومبهجة ومناسبة للأطفال: ${stripped}`
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

          const upstream = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
          });
          clearTimeout(timer);

          if (!upstream.ok) {
            res.statusCode = 502;
            res.end(JSON.stringify({ error: 'Upstream speech synthesis service returned an error.' }));
            return;
          }

          const json = (await upstream.json()) as {
            candidates?: Array<{
              content?: {
                parts?: Array<{
                  inlineData?: { data?: string };
                }>;
              };
            }>;
          };
          const base64Audio = json?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (!base64Audio) {
            res.statusCode = 502;
            res.end(JSON.stringify({ error: 'Upstream speech synthesis returned empty audio.' }));
            return;
          }

          res.statusCode = 200;
          res.end(JSON.stringify({ base64Audio, sampleRate: 24000 }));
        } catch {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Internal speech synthesis error.' }));
        }
      });
    });
  };

  return {
    name: 'local-vercel-tts-proxy',
    configureServer(server) {
      attachMiddleware(server.middlewares as unknown as Parameters<typeof attachMiddleware>[0]);
    },
    configurePreviewServer(server) {
      attachMiddleware(server.middlewares as unknown as Parameters<typeof attachMiddleware>[0]);
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const serverOnlyGeminiKey = env.GEMINI_API_KEY || '';

  return {
    plugins: [
      react(),
      localVercelTtsPlugin(serverOnlyGeminiKey),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'robots.txt', 'apple-touch-icon.png'],
        manifest: {
          name: 'AstroNutri - Junior Astronaut Mission Trainer',
          short_name: 'AstroNutri',
          description: 'Zero-G Transit Preparation & Space Nutrition Training for Junior Astronauts',
          theme_color: '#0f172a',
          background_color: '#050814',
          display: 'standalone',
          orientation: 'any',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
          navigateFallbackDenylist: [/^\/api\//],
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024
        }
      })
    ]
  };
});
