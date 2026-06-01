import { request as httpsRequest } from 'https';

const ODOO_URL = process.env.ODOO_URL || 'https://24-law-chambers.odoo.com';
const ODOO_DB = process.env.ODOO_DB || '24-law-chambers';
const ODOO_API_KEY = process.env.ODOO_API_KEY;

const ALLOWED_MODELS = { 'crm-lead': 'crm.lead', 'mailing-contact': 'mailing.contact' };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function odooRpc(model, values) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      id: Date.now(),
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [ODOO_DB, 2, ODOO_API_KEY, model, 'create', [values], {}],
      },
    });

    const url = new URL('/jsonrpc', ODOO_URL);
    const req = httpsRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('Invalid JSON from Odoo')); }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

export const handler = async (event) => {
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  const path = event.rawPath || event.path || '';
  const modelKey = path.replace(/^\/api\/odoo\//, '').replace(/\/$/, '');
  const odooModel = ALLOWED_MODELS[modelKey];

  if (!odooModel) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Model not allowed' }) };
  }

  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const result = await odooRpc(odooModel, body);

    if (result.error) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: result.error.data?.message || result.error.message }),
      };
    }

    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ id: result.result }) };
  } catch {
    return { statusCode: 502, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Failed to reach Odoo' }) };
  }
};
