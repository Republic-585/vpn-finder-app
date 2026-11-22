import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const app = await fs.readFile("assets/js/app.js", "utf8");
const supabaseUrl = app.match(/const SUPABASE_URL = "([^"]+)"/)?.[1];
const supabaseKey = app.match(/const SUPABASE_KEY = "([^"]+)"/)?.[1];
if (!supabaseUrl || !supabaseKey) throw new Error("Cannot resolve the public Supabase endpoint/key from app.js");

const fallbackBlock = app.match(/const serviceAvatars = \{([\s\S]*?)\n\};/);
if (!fallbackBlock) throw new Error("Cannot find the serviceAvatars source map");
const fallbackUrls = Object.fromEntries([...fallbackBlock[1].matchAll(/"(VPN-\d+)":\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]));

const response = await fetch(`${supabaseUrl}/rest/v1/vpn_services?select=id,name,logo_url,bot_url,source_urls,status&status=eq.active&order=id.asc`, {
  headers: { apikey: supabaseKey }
});
if (!response.ok) throw new Error(`Supabase service list failed: HTTP ${response.status}`);
const services = await response.json();
if (!Array.isArray(services) || services.length === 0) throw new Error("Supabase returned no active services");

const outDir = "assets/avatars";
await fs.mkdir(outDir, { recursive: true });
const manifest = {};
const report = [];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function imageExtension(buffer, contentType) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return "png";
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpg";
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (buffer.length >= 6 && /^GIF8[79]a$/.test(buffer.toString("ascii", 0, 6))) return "gif";
  const text = buffer.toString("utf8", 0, Math.min(buffer.length, 512)).trimStart();
  if (text.startsWith("<svg") || (text.startsWith("<?xml") && text.includes("<svg"))) return "svg";
  throw new Error(`Unsupported or invalid image payload (content-type: ${contentType || "unknown"})`);
}

async function fetchImage(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { redirect: "follow", headers: { "user-agent": "VPN-Finder-Avatar-Mirror/1.0", accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const type = res.headers.get("content-type") || "";
      if (!type.toLowerCase().startsWith("image/")) throw new Error(`Non-image response: ${type || "unknown"}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length < 100 || buffer.length > 5 * 1024 * 1024) throw new Error(`Unexpected image size: ${buffer.length} bytes`);
      return { buffer, extension: imageExtension(buffer, type), source: res.url || url };
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(700 * attempt);
    }
  }
  throw lastError;
}

for (const service of services) {
  const directCandidates = [...new Set([service.logo_url, fallbackUrls[service.id]].filter((v) => typeof v === "string" && /^https:\/\//i.test(v)))];
  const pageCandidates = [...new Set([service.bot_url, ...(Array.isArray(service.source_urls) ? service.source_urls : [])].filter((v) => typeof v === "string" && /^https:\/\//i.test(v)))];
  let downloaded;
  let usedUrl;
  const errors = [];
  const tryImages = async (candidates) => {
    for (const candidate of candidates) {
      try { downloaded = await fetchImage(candidate); usedUrl = candidate; return true; }
      catch (error) { errors.push(`${candidate}: ${error.message}`); }
    }
    return false;
  };
  await tryImages(directCandidates);
  if (!downloaded) {
    for (const pageUrl of pageCandidates) {
      try {
        const page = await fetch(pageUrl, { redirect: "follow", headers: { "user-agent": "Mozilla/5.0 VPN-Finder-Avatar-Mirror/1.0", accept: "text/html,application/xhtml+xml" } });
        if (!page.ok) throw new Error(`HTTP ${page.status}`);
        const html = await page.text();
        const imageUrls = [];
        const patterns = [
          /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image|twitter:image:src)["'][^>]+content=["']([^"']+)["']/gi,
          /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image|twitter:image:src)["']/gi,
          /<link[^>]+rel=["'][^"']*(?:icon|apple-touch-icon)[^"']*["'][^>]+href=["']([^"']+)["']/gi
        ];
        for (const pattern of patterns) {
          for (const match of html.matchAll(pattern)) {
            try { imageUrls.push(new URL(match[1].replace(/&amp;/g, "&"), page.url || pageUrl).href); } catch {}
          }
        }
        if (!await tryImages([...new Set(imageUrls)])) errors.push(`${pageUrl}: no working social/logo image found`);
      } catch (error) { errors.push(`${pageUrl}: page discovery failed: ${error.message}`); }
      if (downloaded) break;
    }
  }
  if (!downloaded) throw new Error(`Cannot mirror avatar for ${service.id} (${service.name}): ${errors.slice(0, 8).join(" | ")}`);
  const filename = `${service.id}.${downloaded.extension}`;
  await fs.writeFile(path.join(outDir, filename), downloaded.buffer);
  manifest[service.id] = `./assets/avatars/${filename}`;
  report.push({
    id: service.id,
    name: service.name,
    file: filename,
    bytes: downloaded.buffer.length,
    sha256: crypto.createHash("sha256").update(downloaded.buffer).digest("hex"),
    sourceHost: new URL(usedUrl).host,
    finalHost: new URL(downloaded.source).host
  });
}

let generatedAt = new Date().toISOString();
try {
  const previous = JSON.parse(await fs.readFile("assets/avatars/manifest.json", "utf8"));
  if (JSON.stringify(previous.avatars) === JSON.stringify(report)) generatedAt = previous.generatedAt || generatedAt;
} catch {}
await fs.writeFile("assets/avatars/manifest.json", JSON.stringify({ generatedAt, count: report.length, avatars: report }, null, 2) + "\n");
await fs.writeFile("assets/avatars/manifest.js", "/* Generated by scripts/sync-avatars.mjs. Do not edit manually. */\nwindow.VPN_AVATAR_ASSETS = " + JSON.stringify(manifest, null, 2) + ";\n");
console.log(`Mirrored and validated ${report.length} active service avatars:\n` + report.map((item) => `- ${item.id} ${item.name}: ${item.file} (${item.bytes} bytes)`).join("\n"));
