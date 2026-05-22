const CSV_HEADER = "submitted_at,guestName,attendance,allergies,drinks,extraInfo,requestId\n";

function escapeCsv(val) {
  if (typeof val !== "string") val = String(val || "");
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

async function pushToGitHub(row, env) {
  const { GH_TOKEN, GH_OWNER, GH_REPO, GH_BRANCH } = env;
  if (!GH_TOKEN || !GH_OWNER || !GH_REPO) return false;

  const apiUrl = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/rsvp.csv`;
  const headers = {
    Authorization: `Bearer ${GH_TOKEN}`,
    "User-Agent": "wedding-rsvp",
    Accept: "application/vnd.github.v3+json",
  };

  try {
    const getResp = await fetch(`${apiUrl}?ref=${GH_BRANCH || "main"}`, { headers });
    let sha = null;
    let existingContent = "";

    if (getResp.ok) {
      const file = await getResp.json();
      sha = file.sha;
      existingContent = Buffer.from(file.content, "base64").toString("utf-8");
    }

    const newContent = existingContent === ""
      ? CSV_HEADER + row + "\n"
      : existingContent.trimEnd() + "\n" + row + "\n";

    const putResp = await fetch(apiUrl, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `RSVP: ${new Date().toISOString()}`,
        content: Buffer.from(newContent).toString("base64"),
        branch: GH_BRANCH || "main",
        sha: sha || undefined,
      }),
    });

    return putResp.ok;
  } catch (err) {
    console.error("GitHub push error:", err);
    return false;
  }
}

exports.handler = async (event, context) => {
  const { httpMethod, body, headers } = event;

  const corsHeaders = {
    "Access-Control-Allow-Origin": headers?.origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };

  if (httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders,
    };
  }

  if (httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "Method not allowed" }),
    };
  }

  try {
    const data = JSON.parse(body);
    data.submitted_at = data.submitted_at || new Date().toISOString();

    const drinks = Array.isArray(data.drinks) ? data.drinks.join("; ") : (data.drinks || "");

    const row = [
      escapeCsv(data.submitted_at),
      escapeCsv(data.guestName),
      escapeCsv(data.attendance),
      escapeCsv(data.allergies || ""),
      escapeCsv(drinks),
      escapeCsv(data.extraInfo || ""),
      escapeCsv(data.requestId || ""),
    ].join(",");

    const pushed = await pushToGitHub(row, process.env);

    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, github: pushed }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
