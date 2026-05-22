const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const CSV_FILE = path.join(__dirname, "rsvp.csv");

const GH_TOKEN = process.env.GH_TOKEN;
const GH_OWNER = process.env.GH_OWNER;
const GH_REPO = process.env.GH_REPO;
const GH_BRANCH = process.env.GH_BRANCH || "main";
const GH_FILE_PATH = "rsvp.csv";

const CSV_HEADER = "submitted_at,guestName,attendance,allergies,drinks,extraInfo,requestId\n";

app.use(express.json());
app.use(express.static(__dirname, { index: "index.html" }));

function escapeCsv(val) {
  if (typeof val !== "string") val = String(val || "");
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function appendToCsv(data) {
  const row = [
    escapeCsv(data.submitted_at),
    escapeCsv(data.guestName),
    escapeCsv(data.attendance),
    escapeCsv(data.allergies || ""),
    escapeCsv(data.drinks || ""),
    escapeCsv(data.extraInfo || ""),
    escapeCsv(data.requestId || ""),
  ].join(",");

  const exists = fs.existsSync(CSV_FILE);
  if (!exists) {
    fs.writeFileSync(CSV_FILE, CSV_HEADER, "utf-8");
  }

  fs.appendFileSync(CSV_FILE, row + "\n", "utf-8");
}

async function pushToGitHub(content) {
  if (!GH_TOKEN || !GH_OWNER || !GH_REPO) return;

  const apiUrl = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_FILE_PATH}`;
  const headers = {
    Authorization: `Bearer ${GH_TOKEN}`,
    "User-Agent": "wedding-rsvp",
    Accept: "application/vnd.github.v3+json",
  };

  try {
    const getResp = await fetch(`${apiUrl}?ref=${GH_BRANCH}`, { headers });
    let sha = null;
    let existingContent = "";

    if (getResp.ok) {
      const file = await getResp.json();
      sha = file.sha;
      existingContent = Buffer.from(file.content, "base64").toString("utf-8");
    }

    const newContent = existingContent === ""
      ? CSV_HEADER + content + "\n"
      : existingContent.trimEnd() + "\n" + content + "\n";

    const putResp = await fetch(apiUrl, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `RSVP: ${new Date().toISOString()}`,
        content: Buffer.from(newContent).toString("base64"),
        branch: GH_BRANCH,
        sha: sha || undefined,
      }),
    });

    if (!putResp.ok) {
      console.error("GitHub push error:", await putResp.text());
    }
  } catch (err) {
    console.error("GitHub push failed:", err.message);
  }
}

app.post("/api/rsvp", async (req, res) => {
  try {
    const data = req.body;
    data.submitted_at = data.submitted_at || new Date().toISOString();

    const drinks = Array.isArray(data.drinks) ? data.drinks.join("; ") : (data.drinks || "");
    data.drinks = drinks;

    const row = [
      escapeCsv(data.submitted_at),
      escapeCsv(data.guestName),
      escapeCsv(data.attendance),
      escapeCsv(data.allergies || ""),
      escapeCsv(drinks),
      escapeCsv(data.extraInfo || ""),
      escapeCsv(data.requestId || ""),
    ].join(",");

    appendToCsv(data);

    if (GH_TOKEN && GH_OWNER && GH_REPO) {
      setImmediate(() => pushToGitHub(row));
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("RSVP error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
