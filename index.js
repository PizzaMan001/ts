export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get("url");

    if (!targetUrl) {
      return new Response(
        "Usage: ?url=https://target-stream.com/playlist.m3u8",
        {
          status: 400,
          headers: {
            "Content-Type": "text/plain",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    try {
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Referer: new URL(targetUrl).origin,
        },
      });

      const contentType = response.headers.get("content-type") || "";

      // Handle .m3u8 playlists
      if (
        targetUrl.includes(".m3u8") ||
        contentType.includes("mpegurl")
      ) {
        const text = await response.text();
        const base = new URL(targetUrl);

        const proxyBase = `${url.origin}${url.pathname}?url=`;

        const rewritten = text
          .split("\n")
          .map((line) => {
            const trimmed = line.trim();

            if (trimmed && !trimmed.startsWith("#")) {
              const absolute = new URL(trimmed, base.href).href;
              return `${proxyBase}${encodeURIComponent(absolute)}`;
            }

            return line;
          })
          .join("\n");

        return new Response(rewritten, {
          headers: {
            "Content-Type": "application/vnd.apple.mpegurl",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      // Handle video segments
      const newHeaders = new Headers(response.headers);
      newHeaders.set("Access-Control-Allow-Origin", "*");
      newHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      newHeaders.delete("content-security-policy");

      return new Response(response.body, {
        status: response.status,
        headers: newHeaders,
      });
    } catch (e) {
      return new Response("Proxy Error: " + e.message, {
        status: 500,
      });
    }
  },
};
