/**
 * DECRR Interio — AI Assistant proxy
 *
 * This Worker sits between the DECRR Interio app (running in the browser at
 * https://decrr2026.github.io) and Anthropic's Claude API. It exists for one
 * reason: your Claude API key must never be visible in the app's source code
 * (anyone could view it, since GitHub Pages is public). Instead, the key is
 * stored here as a Cloudflare secret, and the app sends its requests to this
 * Worker, which attaches the key and forwards the request to Anthropic.
 *
 * The app never sees the key. Nothing here is logged or stored anywhere —
 * each request is simply forwarded through and the response passed back.
 *
 * SETUP: see the guide you were given for step-by-step deployment
 * instructions. In short:
 *   1. Paste this whole file into a new Cloudflare Worker.
 *   2. Add a secret named ANTHROPIC_API_KEY with your Claude API key.
 *   3. Deploy, then copy the Worker's https://....workers.dev URL into
 *      DECRR Interio's Settings -> AI Assistant -> Proxy URL field.
 */

// If you want to lock this Worker down to only your app's origin (recommended
// once everything is working), change this to your exact GitHub Pages URL,
// e.g. "https://decrr2026.github.io". Leaving it as "*" allows any site to
// call this Worker, which is fine to start with since the Worker doesn't do
// anything a caller couldn't already do with their own Claude API key --
// it just costs you money per request, so lock it down once you've confirmed
// everything works.
const ALLOWED_ORIGIN = "*";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    // Browsers send a CORS "preflight" OPTIONS request before the real POST.
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: { message: "Only POST requests are accepted." } }, 405);
    }

    if (!env.ANTHROPIC_API_KEY) {
      return jsonResponse(
        { error: { message: "This Worker has no ANTHROPIC_API_KEY secret configured yet." } },
        500
      );
    }

    let body;
    try {
      body = await request.text();
    } catch (err) {
      return jsonResponse({ error: { message: "Could not read the request body." } }, 400);
    }

    let upstreamResponse;
    try {
      upstreamResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: body,
      });
    } catch (err) {
      return jsonResponse(
        { error: { message: "Could not reach the Claude API: " + (err && err.message ? err.message : String(err)) } },
        502
      );
    }

    const upstreamText = await upstreamResponse.text();
    return new Response(upstreamText, {
      status: upstreamResponse.status,
      headers: {
        "Content-Type": "application/json",
        ...CORS_HEADERS,
      },
    });
  },
};

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}
