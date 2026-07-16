import youtubedl from "yt-dlp-exec";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import os from "os";
import { ClassificationResult } from "./gemini";

// ---------------------------------------------------------------------------
// Frame Extraction Helper
// ---------------------------------------------------------------------------

/**
 * Extracts a single frame from a video URL (usually at 10% or 50% timestamp)
 * and returns it as a base64 encoded string.
 */
async function extractBase64Frame(videoStreamUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const tempFilePath = path.join(os.tmpdir(), `frame-${Date.now()}.jpg`);

    ffmpeg(videoStreamUrl)
      .screenshots({
        count: 1,
        timestamps: ["25%"], // Take a frame at 25% of the video duration
        filename: path.basename(tempFilePath),
        folder: path.dirname(tempFilePath),
        size: '1280x720' // Resize to reduce payload size
      })
      .on("end", () => {
        try {
          const fileBuffer = fs.readFileSync(tempFilePath);
          const base64Image = fileBuffer.toString("base64");
          fs.unlinkSync(tempFilePath); // Cleanup
          resolve(base64Image);
        } catch (err) {
          reject(err);
        }
      })
      .on("error", (err: Error) => {
        reject(new Error(`FFmpeg extraction failed: ${err.message}`));
      });
  });
}

/**
 * Uses yt-dlp to find the direct .mp4 or .m3u8 stream URL from a given link.
 */
async function getVideoUrl(url: string): Promise<string> {
  try {
    const output = await youtubedl(url, {
      dumpSingleJson: true,
      noWarnings: true,
      preferFreeFormats: true,
      format: "bestvideo[height<=720]+bestaudio/best[height<=720]/best"
    });
    
    const anyOutput = output as any;
    // Fallback to url if requested format doesn't have a direct URL
    return output.url || (anyOutput.requested_downloads ? anyOutput.requested_downloads[0].url : "");
  } catch (err) {
    throw new Error(`yt-dlp failed to fetch URL: ${(err as Error).message}`);
  }
}

// ---------------------------------------------------------------------------
// NVIDIA Llama Vision API
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are SortAi, an intelligent visual classification assistant.
Your job is to analyze an image extracted from a video (YouTube/Instagram) and classify it into exactly ONE space.

Available spaces:
- Career      – Jobs, resumes, interviews, professional development, LinkedIn, networking
- Study       – Courses, tutorials, documentation, research papers, educational content
- Fashion     – Clothing, style, trends, beauty, accessories, fashion brands
- Fitness     – Workouts, nutrition, health tips, gym routines, sports
- Tech        – Programming languages, core software engineering, gadgets, computer hardware, science, tech news
- Tools       – SaaS platforms, AI utilities, online editors, calculators, website builders, Figma/Canva designs, converters, dashboards, developer utilities
- Web links   – General websites, landing pages, registration forms, login screens, news sites, search results, general bookmarks
- Entertainment – Movies, music, games, comedy, pop culture. (Note: Do NOT classify a link as Entertainment simply because it is on YouTube, Instagram, or TikTok. Look at the actual topic. E.g. an Instagram post about AI is Tech).
- Life        – Recipes, travel, personal finance, relationships, self-improvement, productivity
- Other       – Anything that doesn't fit the above categories

Rules:
1. Choose the SINGLE most relevant space based on the visual content in the frame.
2. Generate a concise, descriptive title (max 80 chars) describing the video.
3. Write a short_description (1-2 sentences, max 200 chars) explaining what the video is about.
4. Provide 3-6 relevant tags as lowercase keywords.
5. Write a reason_to_save (1 sentence) explaining why someone might want to save this video.
6. Set confidence to "high", "medium", or "low".
7. Return ONLY valid JSON matching the required schema. No markdown, no extra text.`;

export async function analyzeVideoWithVision(url: string, rawMetadataTitle: string): Promise<ClassificationResult> {
  console.log(`[VISION] Processing video URL: ${url}`);
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY is not configured in .env");
  }

  // 1. Get raw video stream URL
  console.log(`[VISION] Extracting raw stream with yt-dlp...`);
  const streamUrl = await getVideoUrl(url);
  if (!streamUrl) throw new Error("Could not extract raw stream URL.");

  // 2. Extract a frame image
  console.log(`[VISION] Grabbing frame with FFmpeg...`);
  const base64Frame = await extractBase64Frame(streamUrl);

  // 3. Send to NVIDIA Vision API
  console.log(`[VISION] Sending frame to NVIDIA Llama 3.2 11B Vision...`);
  
  const payload = {
    model: "meta/llama-3.2-11b-vision-instruct",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { 
        role: "user", 
        content: [
          { type: "text", text: `Classify this video frame. The original page title was: "${rawMetadataTitle}". Return strict JSON.` },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Frame}` } }
        ]
      }
    ],
    temperature: 0.2,
    max_tokens: 512,
  };

  const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Nvidia Vision API error ${response.status}: ${errText}`);
  }

  const data = await response.json() as any;
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("Nvidia Vision returned an empty response");
  }

  let parsed: ClassificationResult;
  try {
    // Some models might wrap JSON in markdown blocks despite instructions
    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    parsed = JSON.parse(cleanText);
  } catch (err) {
    console.error("[VISION] Failed to parse JSON:", text);
    throw new Error("Vision classification failed: Invalid JSON format");
  }

  // Validate the required fields
  const validSpaces = ["Career", "Study", "Fashion", "Fitness", "Tech", "Tools", "Web links", "Entertainment", "Life", "Other"];
  if (!validSpaces.includes(parsed.space)) parsed.space = "Other";
  if (!["high", "medium", "low"].includes(parsed.confidence)) parsed.confidence = "medium";
  if (!Array.isArray(parsed.tags)) parsed.tags = [];

  return parsed;
}
