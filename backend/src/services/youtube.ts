import axios from "axios";
import { NormalizedMetadata } from "./scraper";

function getYouTubeApiKey(): string | undefined {
  return process.env.YOUTUBE_API_KEY;
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the given URL points to YouTube (youtube.com or youtu.be).
 */
export function isYouTubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    return (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtu.be" ||
      host === "music.youtube.com"
    );
  } catch {
    return false;
  }
}

/**
 * Extracts the video ID from various YouTube URL formats.
 *
 * Supported patterns:
 *  - https://www.youtube.com/watch?v=VIDEO_ID
 *  - https://youtu.be/VIDEO_ID
 *  - https://www.youtube.com/embed/VIDEO_ID
 *  - https://www.youtube.com/v/VIDEO_ID
 *  - https://www.youtube.com/shorts/VIDEO_ID
 *  - https://www.youtube.com/live/VIDEO_ID
 */
export function extractVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

    // youtu.be/VIDEO_ID
    if (host === "youtu.be") {
      const id = parsed.pathname.slice(1).split(/[?&#]/)[0];
      return id.length > 0 ? id : null;
    }

    // youtube.com/watch?v=VIDEO_ID
    const vParam = parsed.searchParams.get("v");
    if (vParam) return vParam;

    // youtube.com/embed/VIDEO_ID | /v/VIDEO_ID | /shorts/VIDEO_ID | /live/VIDEO_ID
    const pathMatch = parsed.pathname.match(
      /^\/(embed|v|shorts|live)\/([a-zA-Z0-9_-]+)/
    );
    if (pathMatch && pathMatch[2]) return pathMatch[2];

    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// YouTube Data API v3
// ---------------------------------------------------------------------------

interface YouTubeSnippet {
  title: string;
  description: string;
  channelTitle: string;
  thumbnails: {
    default?: { url: string };
    medium?: { url: string };
    high?: { url: string };
    standard?: { url: string };
    maxres?: { url: string };
  };
}

interface YouTubeApiResponse {
  items?: Array<{
    snippet: YouTubeSnippet;
  }>;
}

/**
 * Fetches YouTube video metadata via the Data API v3 and returns a
 * NormalizedMetadata object (or null on failure).
 */
export async function getYouTubeMetadata(
  url: string
): Promise<NormalizedMetadata | null> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    console.warn("[YOUTUBE] Could not extract video ID from:", url);
    return null;
  }

  if (!getYouTubeApiKey()) {
    console.warn("[YOUTUBE] YOUTUBE_API_KEY is not set – skipping API call");
    return null;
  }

  try {
    const apiUrl = "https://www.googleapis.com/youtube/v3/videos";
    const { data } = await axios.get<YouTubeApiResponse>(apiUrl, {
      params: {
        part: "snippet",
        id: videoId,
        key: getYouTubeApiKey(),
      },
      timeout: 10_000,
    });

    if (!data.items || data.items.length === 0) {
      console.warn("[YOUTUBE] No items returned for video ID:", videoId);
      return null;
    }

    const snippet = data.items[0].snippet;
    const thumbs = snippet.thumbnails;

    const imageUrl =
      thumbs.maxres?.url ||
      thumbs.standard?.url ||
      thumbs.high?.url ||
      thumbs.medium?.url ||
      thumbs.default?.url ||
      undefined;

    const thumbnailUrl =
      thumbs.medium?.url || thumbs.default?.url || undefined;

    return {
      source: "youtube",
      title: snippet.title,
      description: snippet.description,
      imageUrl,
      thumbnailUrl,
      channelTitle: snippet.channelTitle,
    };
  } catch (err) {
    console.error(
      "[YOUTUBE] API request failed:",
      (err as Error).message
    );
    return null;
  }
}
