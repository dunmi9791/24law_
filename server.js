import 'dotenv/config';
import express from 'express';
import { request as httpsRequest } from 'https';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const app = express();
const PORT = process.env.PORT || 8091;

const ODOO_URL = process.env.ODOO_URL || 'https://24-law-chambers.odoo.com';
const ODOO_DB = process.env.ODOO_DB || '24-law-chambers';
const ODOO_API_KEY = process.env.ODOO_API_KEY;

if (!ODOO_API_KEY) {
  console.error('ODOO_API_KEY is required in .env');
  process.exit(1);
}

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

const __dirname = dirname(fileURLToPath(import.meta.url));
app.use(express.static(__dirname, { extensions: ['html'] }));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
