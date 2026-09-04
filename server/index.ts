import 'dotenv/config';
import express, { Request, Response } from 'express';
import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

// Import all function handlers
import { handler as weatherHandler } from '../netlify/functions/weather.js';
import { handler as tidesHandler } from '../netlify/functions/tides.js';
import { handler as currentsHandler } from '../netlify/functions/currents.js';
import { handler as sunmoonHandler } from '../netlify/functions/sunmoon.js';
import { handler as tropicalHandler } from '../netlify/functions/tropical.js';
import { handler as clearanceHandler } from '../netlify/functions/clearance.js';
import { handler as vesselsHandler } from '../netlify/functions/vessels.js';
import { handler as sessionCheckHandler } from '../netlify/functions/session-check.js';
import { handler as sessionStartHandler } from '../netlify/functions/session-start.js';
import { handler as adminMarinasHandler } from '../netlify/functions/admin-marinas.js';
import { handler as adminVesselCountHandler } from '../netlify/functions/admin-vessel-count.js';
import { handler as marinaScrapeHandler } from '../netlify/functions/marina-scrape.js';
import { handler as waitlistHandler } from '../netlify/functions/waitlist.js';
import { handler as windFieldHandler } from '../netlify/functions/wind-field.js';
import { handler as authRedeemHandler } from '../netlify/functions/auth-redeem.js';
import { handler as authLogoutHandler } from '../netlify/functions/auth-logout.js';
import { handler as authMagicLinkHandler } from '../netlify/functions/auth-magic-link.js';
import { handler as authVerifyHandler } from '../netlify/functions/auth-verify.js';

const app = express();
const PORT = process.env.API_PORT || 3457;

app.use(express.json());
app.use(express.text());

// Adapt Express req/res to Netlify Handler format
async function adapt(handler: Handler, req: Request, res: Response) {
  const event: HandlerEvent = {
    httpMethod: req.method,
    path: req.path,
    queryStringParameters: req.query as Record<string, string>,
    multiValueQueryStringParameters: {},
    headers: req.headers as Record<string, string>,
    multiValueHeaders: {},
    body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body) || null,
    isBase64Encoded: false,
    rawUrl: req.url,
    rawQuery: req.url.split('?')[1] || '',
  };

  const result = await handler(event, {} as HandlerContext, () => {});
  if (!result) { res.status(500).send('No response from handler'); return; }

  res.status(result.statusCode);

  if (result.headers) {
    for (const [key, value] of Object.entries(result.headers)) {
      if (key.toLowerCase() === 'set-cookie' && Array.isArray(value)) {
        value.forEach(v => res.append('Set-Cookie', v));
      } else {
        res.setHeader(key, value as string);
      }
    }
  }
  if (result.multiValueHeaders?.['Set-Cookie']) {
    result.multiValueHeaders['Set-Cookie'].forEach(v => res.append('Set-Cookie', v));
  }

  res.send(result.body || '');
}

// Routes
app.all('/api/weather',              (req, res) => adapt(weatherHandler, req, res));
app.all('/api/tides',                (req, res) => adapt(tidesHandler, req, res));
app.all('/api/currents',             (req, res) => adapt(currentsHandler, req, res));
app.all('/api/sunmoon',              (req, res) => adapt(sunmoonHandler, req, res));
app.all('/api/tropical',             (req, res) => adapt(tropicalHandler, req, res));
app.all('/api/clearance',            (req, res) => adapt(clearanceHandler, req, res));
app.all('/api/vessels',              (req, res) => adapt(vesselsHandler, req, res));
app.all('/api/session/check',        (req, res) => adapt(sessionCheckHandler, req, res));
app.all('/api/session/start',        (req, res) => adapt(sessionStartHandler, req, res));
app.all('/api/admin/vessel-count',   (req, res) => adapt(adminVesselCountHandler, req, res));
app.all('/api/admin-marinas',        (req, res) => adapt(adminMarinasHandler, req, res));
app.all('/api/admin-marinas/*path',   (req, res) => adapt(adminMarinasHandler, req, res));
app.all('/api/marina-scrape',        (req, res) => adapt(marinaScrapeHandler, req, res));
app.all('/api/waitlist',             (req, res) => adapt(waitlistHandler, req, res));
app.all('/api/wind-field',           (req, res) => adapt(windFieldHandler, req, res));

app.all('/api/auth/redeem',            (req, res) => adapt(authRedeemHandler, req, res));
app.all('/api/auth/logout',            (req, res) => adapt(authLogoutHandler, req, res));
app.all('/api/auth/magic-link',        (req, res) => adapt(authMagicLinkHandler, req, res));
app.all('/api/auth/verify',            (req, res) => adapt(authVerifyHandler, req, res));

app.listen(PORT, '127.0.0.1', () => {
  console.log(`baystats API listening on 127.0.0.1:${PORT}`);
});
