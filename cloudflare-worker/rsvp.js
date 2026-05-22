const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function ghConfig(env) {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH } = env;
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO || !GITHUB_BRANCH) return null;
  return {
    apiUrl: `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/rsvp.csv`,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "User-Agent": "wedding-rsvp-worker",
      Accept: "application/vnd.github.v3+json"
    },
    branch: GITHUB_BRANCH
  };
}

async function checkRequestId(requestId, gh) {
  const resp = await fetch(`${gh.apiUrl}?ref=${gh.branch}`, { headers: gh.headers });
  if (resp.status === 404) return false;
  if (!resp.ok) {
    const err = await resp.text();
    console.error("GitHub read error in check:", err);
    return false;
  }
  const file = await resp.json();
  const content = decodeUTF8(file.content);
  return content.includes(requestId);
}

async function readFile(gh) {
  const resp = await fetch(`${gh.apiUrl}?ref=${gh.branch}`, { headers: gh.headers });
  if (resp.ok) {
    const file = await resp.json();
    return { sha: file.sha, content: decodeUTF8(file.content) };
  }
  if (resp.status === 404) {
    return { sha: null, content: "" };
  }
  const err = await resp.text();
  return { error: err };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/check") {
      const requestId = url.searchParams.get("requestId");
      if (!requestId) {
        return new Response(JSON.stringify({ found: false }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }
      const gh = ghConfig(env);
      if (!gh) {
        return new Response(JSON.stringify({ found: false }), {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }
      const found = await checkRequestId(requestId, gh);
      return new Response(JSON.stringify({ found }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
    }

    try {
      const data = await request.json();
      const now = new Date().toISOString();
      data.submitted_at = now;

      const gh = ghConfig(env);
      if (!gh) {
        return new Response("Server config error: missing environment variables", {
          status: 500,
          headers: CORS_HEADERS
        });
      }

      const drinks = Array.isArray(data.drinks) ? data.drinks.join("; ") : (data.drinks || "");
      const row = [
        escapeCsv(data.submitted_at),
        escapeCsv(data.guestName || ""),
        escapeCsv(data.attendance || ""),
        escapeCsv(data.allergies || ""),
        escapeCsv(drinks),
        escapeCsv(data.extraInfo || ""),
        escapeCsv(data.requestId || "")
      ].join(",");

      const header = "submitted_at,guestName,attendance,allergies,drinks,extraInfo,requestId\n";
      const apiUrl = gh.apiUrl;
      const ghHeaders = gh.headers;

      const firstRead = await readFile(gh);
      if (firstRead.error) {
        return new Response(`GitHub read error: ${firstRead.error}`, {
          status: 502,
          headers: CORS_HEADERS
        });
      }

      let sha = firstRead.sha;
      let existingContent = firstRead.content;

      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          const retryRead = await readFile(gh);
          if (retryRead.error) {
            return new Response(`GitHub re-read error: ${retryRead.error}`, {
              status: 502,
              headers: CORS_HEADERS
            });
          }
          sha = retryRead.sha;
          existingContent = retryRead.content;
        }

        if (data.requestId && existingContent.includes(data.requestId)) {
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
          });
        }

        const newContent = existingContent === ""
          ? header + row + "\n"
          : existingContent.trimEnd() + "\n" + row + "\n";

        const body = {
          message: `RSVP: ${data.guestName} (${now})`,
          content: encodeUTF8(newContent),
          branch: gh.branch
        };
        if (sha) body.sha = sha;

        const putResp = await fetch(apiUrl, {
          method: "PUT",
          headers: ghHeaders,
          body: JSON.stringify(body)
        });

        if (putResp.ok) {
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
          });
        }

        if (putResp.status !== 409) {
          const err = await putResp.text();
          return new Response(`GitHub write error: ${err}`, {
            status: 502,
            headers: CORS_HEADERS
          });
        }
      }

      return new Response(JSON.stringify({ ok: false, error: "too many concurrent submissions" }), {
        status: 409,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    } catch (err) {
      return new Response(err.message, {
        status: 500,
        headers: CORS_HEADERS
      });
    }
  }
};

function escapeCsv(val) {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function encodeUTF8(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
}

function decodeUTF8(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}
