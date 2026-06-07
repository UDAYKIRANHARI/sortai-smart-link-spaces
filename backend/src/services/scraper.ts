import * as cheerio from "cheerio";
import { getWithRetry } from "./http";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface NormalizedMetadata {
  source: string;
  title: string;
  description: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  channelTitle?: string;
}

// ---------------------------------------------------------------------------
// Source detection
// ---------------------------------------------------------------------------

/**
 * Returns a human-readable source label based on the URL hostname.
 */
export function detectSource(
  url: string
): "youtube" | "instagram" | "tiktok" | "facebook" | "web" | "other" {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();

    if (host.includes("youtube.com") || host === "youtu.be") return "youtube";
    if (host.includes("instagram.com")) return "instagram";
    if (host.includes("tiktok.com")) return "tiktok";
    if (host.includes("facebook.com") || host.includes("fb.com"))
      return "facebook";

    // If it looks like a normal website
    if (host.includes(".")) return "web";

    return "other";
  } catch {
    return "other";
  }
}

// ---------------------------------------------------------------------------
// JSON-LD parser
// ---------------------------------------------------------------------------
interface JsonLdData {
  name?: string;
  headline?: string;
  description?: string;
  image?: string | { url?: string } | Array<string | { url?: string }>;
  author?: { name?: string } | string;
  thumbnailUrl?: string | string[];
}

function extractFromJsonLd(
  $: cheerio.CheerioAPI
): Partial<NormalizedMetadata> | null {
  const result: Partial<NormalizedMetadata> = {};
  let found = false;

  $('script[type="application/ld+json"]').each((_i, el) => {
    if (found) return; // use the first valid one
    try {
      const raw = $(el).html();
      if (!raw) return;

      const parsed: JsonLdData | JsonLdData[] = JSON.parse(raw);
      const data: JsonLdData = Array.isArray(parsed) ? parsed[0] : parsed;

      if (data.name || data.headline) {
        result.title = (data.name || data.headline) as string;
      }
      if (data.description) {
        result.description = data.description;
      }

      // image can be a string, object, or array
      if (data.image) {
        if (typeof data.image === "string") {
          result.imageUrl = data.image;
        } else if (Array.isArray(data.image)) {
          const first = data.image[0];
          result.imageUrl =
            typeof first === "string" ? first : first?.url;
        } else if (typeof data.image === "object" && data.image.url) {
          result.imageUrl = data.image.url;
        }
      }

      if (data.thumbnailUrl) {
        result.thumbnailUrl = Array.isArray(data.thumbnailUrl)
          ? data.thumbnailUrl[0]
          : data.thumbnailUrl;
      }

      if (data.author) {
        result.channelTitle =
          typeof data.author === "string" ? data.author : data.author.name;
      }

      found = true;
    } catch {
      // invalid JSON-LD, skip
    }
  });

  return found ? result : null;
}

// ---------------------------------------------------------------------------
// OpenGraph / Twitter card helpers
// ---------------------------------------------------------------------------
function getMetaContent($: cheerio.CheerioAPI, property: string): string | undefined {
  return (
    $(`meta[property="${property}"]`).attr("content") ||
    $(`meta[name="${property}"]`).attr("content") ||
    undefined
  );
}

// ---------------------------------------------------------------------------
// extractMetadata – main scraper entry point
// ---------------------------------------------------------------------------

/**
 * Fetches the page at `url` and extracts structured metadata using multiple
 * strategies (JSON-LD → OpenGraph → Twitter Card → raw HTML fallback).
 */
export async function extractMetadata(url: string): Promise<NormalizedMetadata> {
  const source = detectSource(url);

  // Defaults when everything else fails
  let title = url;
  let description = "";
  let imageUrl: string | undefined;
  let thumbnailUrl: string | undefined;
  let channelTitle: string | undefined;

  try {
    const parsedInput = new URL(url);
    const host = parsedInput.hostname.replace(/^www\./, "").toLowerCase();
    const blockedHosts = ["localhost", "127.0.0.1", "::1"];
    if (
      blockedHosts.includes(host)
      || host.startsWith("10.")
      || host.startsWith("192.168.")
      || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
      || host.endsWith(".local")
    ) {
      throw new Error("Blocked internal host");
    }

    const isSocial = host.includes("instagram.com") || host.includes("facebook.com") || host.includes("tiktok.com");
    const userAgent = isSocial
      ? "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)"
      : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

    const { data: html } = await getWithRetry<string>(url, {
      maxRedirects: 5,
      headers: {
        "User-Agent": userAgent,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      responseType: "text",
    });

    const $ = cheerio.load(html);

    // ---- Strategy 1: JSON-LD ---- //
    const jsonLd = extractFromJsonLd($);
    if (jsonLd) {
      title = jsonLd.title || title;
      description = jsonLd.description || description;
      imageUrl = jsonLd.imageUrl || imageUrl;
      thumbnailUrl = jsonLd.thumbnailUrl || thumbnailUrl;
      channelTitle = jsonLd.channelTitle || channelTitle;
    }

    // ---- Strategy 2: OpenGraph ---- //
    const ogTitle = getMetaContent($, "og:title");
    const ogDesc = getMetaContent($, "og:description");
    const ogImage = getMetaContent($, "og:image");
    const ogSiteName = getMetaContent($, "og:site_name");

    if (!title || title === url) title = ogTitle || title;
    if (!description) description = ogDesc || description;
    if (!imageUrl) imageUrl = ogImage;
    if (!channelTitle) channelTitle = ogSiteName;

    // ---- Strategy 3: Twitter Card ---- //
    const twTitle = getMetaContent($, "twitter:title");
    const twDesc = getMetaContent($, "twitter:description");
    const twImage = getMetaContent($, "twitter:image");

    if (!title || title === url) title = twTitle || title;
    if (!description) description = twDesc || description;
    if (!imageUrl) imageUrl = twImage;

    // ---- Strategy 4: Standard HTML elements ---- //
    if (!title || title === url) {
      title = $("title").first().text().trim() || title;
    }
    if (!description) {
      description =
        getMetaContent($, "description") ||
        $('meta[name="Description"]').attr("content") ||
        "";
    }

    // ---- Strategy 5: Last resort ---- //
    if (!title || title === url) {
      title = $("h1").first().text().trim() || url;
    }
    if (!description) {
      description = $("p").first().text().trim().slice(0, 500) || "";
    }

    // Trim overly long descriptions
    if (description.length > 1000) {
      description = description.slice(0, 1000) + "…";
    }
  } catch (err) {
    console.warn("[SCRAPER] Failed to fetch URL:", url, (err as Error).message);
    // Return minimal metadata derived from the URL itself
    try {
      const parsed = new URL(url);
      title = parsed.hostname;
      description = `Link to ${parsed.hostname}${parsed.pathname}`;
    } catch {
      title = url;
      description = "Could not fetch page metadata";
    }
  }

  return {
    source,
    title,
    description,
    imageUrl,
    thumbnailUrl,
    channelTitle,
  };
}
