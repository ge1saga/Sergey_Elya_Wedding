export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const data = await request.json();
      const now = new Date().toISOString();
      data.submitted_at = now;

      const drinks = Array.isArray(data.drinks) ? data.drinks.join("; ") : (data.drinks || "");
      const row = [
        escapeCsv(data.submitted_at),
        escapeCsv(data.guestName || ""),
        escapeCsv(data.attendance || ""),
        escapeCsv(data.allergies || ""),
        escapeCsv(drinks),
        escapeCsv(data.extraInfo || "")
      ].join(",");

      const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH } = env;

      if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO || !GITHUB_BRANCH) {
        return new Response("Server config error: missing environment variables", { status: 500 });
      }

      const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/rsvp.csv`;
      const headers = {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "User-Agent": "wedding-rsvp-worker",
        Accept: "application/vnd.github.v3+json"
      };

      let sha = null;
      let existingContent = "";

      const getResp = await fetch(`${apiUrl}?ref=${GITHUB_BRANCH}`, { headers });

      if (getResp.ok) {
        const file = await getResp.json();
        sha = file.sha;
        existingContent = decodeUTF8(file.content);
      } else if (getResp.status !== 404) {
        const err = await getResp.text();
        return new Response(`GitHub read error: ${err}`, { status: 502 });
      }

      const header = "submitted_at,guestName,attendance,allergies,drinks,extraInfo\n";
      const newContent = existingContent === ""
        ? header + row + "\n"
        : existingContent.trimEnd() + "\n" + row + "\n";

      const body = {
        message: `RSVP: ${data.guestName} (${now})`,
        content: encodeUTF8(newContent),
        branch: GITHUB_BRANCH
      };
      if (sha) body.sha = sha;

      const putResp = await fetch(apiUrl, {
        method: "PUT",
        headers,
        body: JSON.stringify(body)
      });

      if (!putResp.ok) {
        const err = await putResp.text();
        return new Response(`GitHub write error: ${err}`, { status: 502 });
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (err) {
      return new Response(err.message, { status: 500 });
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
