export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response('Usage: ?url=http://example.com/stream.m3u8', { status: 400 });
    }

    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': new URL(targetUrl).origin
        }
      });

      const contentType = response.headers.get('content-type') || '';
      
      // If it's a playlist (.m3u8), we need to rewrite the links inside it
      if (contentType.includes('application/vnd.apple.mpegurl') || contentType.includes('audio/mpegurl') || targetUrl.endsWith('.m3u8')) {
        let text = await response.text();
        const base = new URL(targetUrl);
        const proxyBase = `${url.origin}${url.pathname}?url=`;

        // This regex finds lines that don't start with # (the actual URLs)
        const rewrittenText = text.split('\n').map(line => {
          if (line.trim() && !line.startsWith('#')) {
            // Convert relative paths to absolute paths, then wrap in proxy URL
            const absoluteUrl = new URL(line.trim(), base.href).href;
            return `${proxyBase}${encodeURIComponent(absoluteUrl)}`;
          }
          return line;
        }).join('\n');

        return new Response(rewrittenText, {
          headers: {
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      // If it's a video segment (.ts), just pipe the stream directly
      const newHeaders = new Headers(response.headers);
      newHeaders.set('Access-Control-Allow-Origin', '*');
      newHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      newHeaders.delete('content-security-policy'); // Remove restrictions

      return new Response(response.body, {
        status: response.status,
        headers: newHeaders
      });

    } catch (e) {
      return new Response('Error: ' + e.message, { status: 500 });
    }
  }
};
