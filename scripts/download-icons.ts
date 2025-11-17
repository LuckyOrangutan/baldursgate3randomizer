import fs from "node:fs/promises";
import path from "node:path";

import { gearItems } from "../src/data/gear";
import type { GearItem } from "../src/types/gear";

const BASE_URL = "https://baldursgate3.wiki.fextralife.com";
const OUTPUT_DIR = path.resolve(process.cwd(), "public", "items");
const CONCURRENCY = Number.parseInt(
  process.env.ICON_DOWNLOAD_CONCURRENCY ?? "4",
  10,
);
const USER_AGENT = "bg3-randomizer-icon-sync/1.0 (+https://github.com/)";

class HttpError extends Error {
  status: number;
  url: string;

  constructor(status: number, statusText: string, url: string) {
    super(`Request failed: ${status} ${statusText}`);
    this.status = status;
    this.url = url;
  }
}

const slugOverrides: Record<string, string> = {
  "steelforge-sword": "Steelforged+Sword",
  "ceremonial-longsword": "Longsword",
};

const iconCache = new Map<string, Buffer>();
const failureLog: { item: GearItem; reason: string }[] = [];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeName = (name: string) =>
  name
    .normalize("NFKC")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

const stripParentheticals = (input: string) =>
  input.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();

const slugify = (value: string) =>
  encodeURIComponent(value).replace(/%20/g, "+");

const buildSlugCandidates = (item: GearItem) => {
  const normalized = normalizeName(item.name);
  const candidates = new Set<string>();

  if (slugOverrides[item.id]) {
    candidates.add(slugOverrides[item.id]);
  }
  if (normalized) {
    candidates.add(slugify(normalized));
    const noParens = stripParentheticals(normalized);
    if (noParens && noParens !== normalized) {
      candidates.add(slugify(noParens));
    }
  }
  return Array.from(candidates);
};

const ensureOutputDir = async () => {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
};

const hasExistingIcon = async (itemId: string) => {
  try {
    await fs.access(path.join(OUTPUT_DIR, `${itemId}.png`));
    return true;
  } catch {
    return false;
  }
};

const fetchText = async (url: string) => {
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) {
    throw new HttpError(response.status, response.statusText, url);
  }
  return response.text();
};

const extractIconUrl = (html: string): string | null => {
  const infoboxIndex = html.indexOf('<div id="infobox"');
  if (infoboxIndex === -1) return null;
  const snippet = html.slice(infoboxIndex, infoboxIndex + 8000);
  const rarityIndex = snippet.indexOf("infobox_rarity");
  const searchSpace = rarityIndex !== -1 ? snippet.slice(rarityIndex) : snippet;
  const dataSrcMatch = searchSpace.match(
    /data-src="([^"]+\/Baldurs-Gate-3\/[^"]+?\.png)"/i,
  );
  if (dataSrcMatch) {
    return dataSrcMatch[1];
  }
  const srcMatch = searchSpace.match(
    /src="([^"]+\/Baldurs-Gate-3\/[^"]+?\.png)"/i,
  );
  return srcMatch ? srcMatch[1] : null;
};

const fetchIconBuffer = async (url: string): Promise<Buffer> => {
  const resolvedUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;
  if (!iconCache.has(resolvedUrl)) {
    const response = await fetch(resolvedUrl, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!response.ok) {
      throw new HttpError(response.status, response.statusText, resolvedUrl);
    }
    const arrayBuffer = await response.arrayBuffer();
    iconCache.set(resolvedUrl, Buffer.from(arrayBuffer));
    // Avoid hammering the wiki with back-to-back requests.
    await sleep(50);
  }
  const cached = iconCache.get(resolvedUrl);
  if (!cached) {
    throw new Error(`No data cached for ${resolvedUrl}`);
  }
  return cached;
};

const saveIcon = async (itemId: string, buffer: Buffer) => {
  const filePath = path.join(OUTPUT_DIR, `${itemId}.png`);
  await fs.writeFile(filePath, buffer);
};

const resolvePageHtml = async (item: GearItem) => {
  const normalized = normalizeName(item.name);
  const candidates = buildSlugCandidates(item);
  if (!candidates.length) {
    candidates.push(slugify(normalized || item.id));
  }

  for (const slug of candidates) {
    const pageUrl = `${BASE_URL}/${slug}`;
    try {
      const html = await fetchText(pageUrl);
      return { html, slug };
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("No wiki page for this item returned a 200 response.");
};

const processItem = async (item: GearItem) => {
  const alreadyExists = await hasExistingIcon(item.id);
  if (alreadyExists) {
    return;
  }

  try {
    const { html } = await resolvePageHtml(item);
    const iconUrl = extractIconUrl(html);
    if (!iconUrl) {
      failureLog.push({
        item,
        reason: "Icon tag not found inside infobox.",
      });
      return;
    }
    const buffer = await fetchIconBuffer(iconUrl);
    await saveIcon(item.id, buffer);
    console.log(`✔ Saved ${item.name}`);
  } catch (error) {
    failureLog.push({
      item,
      reason:
        error instanceof Error ? error.message : "Unknown error downloading icon.",
    });
  }
};

const run = async () => {
  await ensureOutputDir();

  const targetItems = gearItems;
  let index = 0;

  const worker = async () => {
    while (true) {
      const currentIndex = index++;
      const item = targetItems[currentIndex];
      if (!item) break;
      await processItem(item);
    }
  };

  const workerCount = Math.max(1, Number.isFinite(CONCURRENCY) ? CONCURRENCY : 4);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  if (failureLog.length) {
    console.warn("Failed to download the following icons:");
    failureLog.forEach(({ item, reason }) => {
      console.warn(`- ${item.name} (${item.id}): ${reason}`);
    });
    process.exitCode = 1;
  } else {
    console.log("All icons downloaded successfully.");
  }
};

run().catch((error) => {
  console.error("Unexpected failure while downloading icons:");
  console.error(error);
  process.exit(1);
});
