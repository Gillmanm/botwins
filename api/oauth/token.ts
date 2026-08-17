const getAuthBaseUrl = (): string =>
  process.env.NEXT_PUBLIC_DERIV_ENV === 'preview'
    ? 'https://staging-auth.deriv.com/oauth2'
    : 'https://auth.deriv.com/oauth2';

type TokenRequest = {
  code?: string;
  client_id?: string;
  redirect_uri?: string;
  code_verifier?: string;
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body: TokenRequest =
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};

    if (!body.code || !body.client_id || !body.redirect_uri || !body.code_verifier) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'code, client_id, redirect_uri, and code_verifier are required',
      });
    }

    const form = new URLSearchParams({
      grant_type: 'authorization_code',
      code: body.code,
      client_id: body.client_id,
      redirect_uri: body.redirect_uri,
      code_verifier: body.code_verifier,
    });

    const upstream = await fetch(`${getAuthBaseUrl()}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });

    const contentType = upstream.headers.get('content-type') || 'application/json';
    const responseBody = await upstream.text();
    res.setHeader('Content-Type', contentType);
    return res.status(upstream.status).send(responseBody);
  } catch (error) {
    console.error('[OAuth] Token proxy failed:', error);
    return res.status(502).json({
      error: 'token_exchange_unavailable',
      error_description: 'Unable to reach the Deriv authorization server',
    });
  }
}
