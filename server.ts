import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './server/routes.ts';
import { getDb, resetDemoData } from './server/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory sliding window upload rate limiter (safe default: 5 uploads per hour per IP)
const uploadTimestampsByIp = new Map<string, number[]>();
const UPLOAD_WINDOW_MS = 60 * 60 * 1000; // 1 hour sliding window
const MAX_UPLOADS_PER_WINDOW = 5; // 5 uploads per IP per hour in demo mode

function uploadRateLimiter(req: Request, res: Response, next: NextFunction) {
  // Allow sample sheets to bypass rate limit
  if (req.body?.sampleKey) {
    return next();
  }

  const forwarded = req.headers['x-forwarded-for'];
  const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress) || 'default_ip';
  const now = Date.now();
  const windowStart = now - UPLOAD_WINDOW_MS;
  const history = (uploadTimestampsByIp.get(ip) || []).filter(t => t > windowStart);

  if (history.length >= MAX_UPLOADS_PER_WINDOW) {
    return res.status(429).json({
      error: 'Upload limit reached (5 uploads per hour per IP for demo protection). Please try our 3 built-in synthetic sample sheets for instant testing.',
      retryAfterSeconds: Math.ceil((history[0] + UPLOAD_WINDOW_MS - now) / 1000),
      sampleFallback: true,
    });
  }

  history.push(now);
  uploadTimestampsByIp.set(ip, history);
  next();
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Safe defaults from environment variables
  const demoMode = process.env.DEMO_MODE !== 'false'; // default true for public demo
  const whatsappProvider = (process.env.WHATSAPP_PROVIDER || 'simulated').toLowerCase();
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  // Initialize SQLite database, verify schema, and auto-seed initial clinical demo data
  try {
    console.log('[Going Home Right] Initializing database...');
    await getDb();
    console.log('[Going Home Right] Database schema and initial seed data verified successfully.');
  } catch (dbErr) {
    console.error('[Going Home Right] Database initialization warning:', dbErr);
  }

  // Automatic reset of demo data every 3 hours during public demo mode
  if (demoMode) {
    const RESET_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 hours
    setInterval(async () => {
      try {
        console.log('[Going Home Right] Running scheduled demo data reset...');
        await resetDemoData();
      } catch (err) {
        console.error('[Going Home Right] Scheduled demo reset notice:', err);
      }
    }, RESET_INTERVAL_MS);
  }

  // Basic security & CORS middleware (safe default: same-origin or configured ALLOWED_ORIGINS)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;

    if (origin) {
      const isAllowed =
        allowedOriginsEnv.length === 0 ||
        allowedOriginsEnv.includes('*') ||
        allowedOriginsEnv.includes(origin) ||
        Boolean(req.headers.host && origin.includes(req.headers.host));

      if (isAllowed) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
    }

    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }

    next();
  });

  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Health endpoint for Cloud Run and uptime checks
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'going-home-right',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      demo_mode: demoMode,
      whatsapp_provider: whatsappProvider,
      gemini_configured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    });
  });

  // Apply rate limiting specifically to file/sample upload endpoint
  app.post('/api/discharges', uploadRateLimiter);

  // Mount API routes
  app.use('/api', apiRouter);

  // Fallback for unmatched API routes: return JSON 404 rather than HTML
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
  });

  // Interactive Swagger UI documentation at /docs
  app.get('/docs', (req: Request, res: Response) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Going Home Right API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <style>
    body { margin: 0; background: #fafafa; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
    .topbar { display: none !important; }
    .header-banner { background: #0f172a; color: white; padding: 18px 24px; border-bottom: 3px solid #10b981; }
    .header-banner h1 { margin: 0; font-size: 20px; font-weight: 700; color: #10b981; }
    .header-banner p { margin: 4px 0 0; font-size: 13px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="header-banner">
    <h1>Going Home Right (Team HealthNova) API</h1>
    <p>Clinical Discharge Ingestion, Safety Rules Engine, Nurse Sign-off & ABDM FHIR Specification</p>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: '/api/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
      });
    };
  </script>
</body>
</html>`);
  });

  // Development: Mount Vite middleware; Production: Serve pre-built static bundle
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production: Serve dist folder
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Going Home Right] Server listening on http://0.0.0.0:${PORT} (env: ${process.env.NODE_ENV || 'development'})`);
    console.log(`[Going Home Right] Demo Mode: ${demoMode} | WhatsApp Provider: ${whatsappProvider}`);
  });
}

startServer().catch((err) => {
  console.error('[Server Error]', err);
  process.exit(1);
});
