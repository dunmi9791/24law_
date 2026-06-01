import 'dotenv/config';
import express from 'express';
import { request as httpsRequest } from 'https';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createHmac, timingSafeEqual } from 'crypto';
import { execFile } from 'child_process';

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Sanity Webhook — rebuilds insights when articles change
// (registered before express.json() so it receives the raw body for HMAC)
// ---------------------------------------------------------------------------

const SANITY_WEBHOOK_SECRET = process.env.SANITY_WEBHOOK_SECRET || '24law';

function verifySignature(payload, signature) {
  const hmac = createHmac('sha256', SANITY_WEBHOOK_SECRET);
  hmac.update(payload);
  const digest = hmac.digest('base64');
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch {
    return false;
  }
}

let buildInProgress = false;

app.post('/api/sanity-webhook', express.raw({ type: '*/*' }), (req, res) => {
  const signature = req.headers['sanity-webhook-signature'];
  if (!signature || !verifySignature(req.body, signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  if (buildInProgress) {
    return res.json({ status: 'build already in progress' });
  }

  buildInProgress = true;
  console.log('[webhook] Sanity article change detected — rebuilding insights…');

  const buildScript = resolve(__dirname, 'build', 'build-insights.js');
  execFile('node', [buildScript], { cwd: __dirname }, (err, stdout, stderr) => {
    buildInProgress = false;
    if (err) {
      console.error('[webhook] Build failed:', stderr || err.message);
    } else {
      console.log('[webhook] Build complete:\n' + stdout);
    }
  });

  res.json({ status: 'rebuild triggered' });
});

// ---------------------------------------------------------------------------

const ODOO_URL = process.env.ODOO_URL || 'https://24-law-chambers.odoo.com';
const ODOO_DB = process.env.ODOO_DB || '24-law-chambers';
const ODOO_API_KEY = process.env.ODOO_API_KEY;

app.use(express.json());

const ALLOWED_MODELS = { 'crm-lead': 'crm.lead', 'mailing-contact': 'mailing.contact' };

function odooRpc(model, method, args, kwargs) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      id: Date.now(),
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [ODOO_DB, 2, ODOO_API_KEY, model, method, args, kwargs || {}],
      },
    });

    const url = new URL('/jsonrpc', ODOO_URL);
    const odooReq = httpsRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (odooRes) => {
      let data = '';
      odooRes.on('data', chunk => data += chunk);
      odooRes.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error('Invalid JSON from Odoo'));
        }
      });
    });

    odooReq.on('error', reject);
    odooReq.write(payload);
    odooReq.end();
  });
}

app.post('/api/odoo/:model', async (req, res) => {
  const odooModel = ALLOWED_MODELS[req.params.model];
  if (!odooModel) {
    return res.status(400).json({ error: 'Model not allowed' });
  }

  try {
    const result = await odooRpc(odooModel, 'create', [req.body]);
    if (result.error) {
      res.status(400).json({ error: result.error.data?.message || result.error.message });
    } else {
      res.json({ id: result.result });
    }
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach Odoo' });
  }
});

app.use(express.static(__dirname, { extensions: ['html'] }));

export { app };

const PORT = process.env.PORT || 8091;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
