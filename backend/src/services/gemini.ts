import { GoogleGenAI, Type } from "@google/genai";
import { NormalizedMetadata } from "./scraper";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface ClassificationResult {
  title: string;
  short_description: string;
  space: string;
  tags: string[];
  reason_to_save: string;
  confidence: "high" | "medium" | "low";
}

// ---------------------------------------------------------------------------
// Gemini client (lazy – loaded on demand after dotenv has configured env vars)
// ---------------------------------------------------------------------------
let _ai: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!_ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Gemini API key is not configured. Set the GEMINI_API_KEY environment variable in .env"
      );
    }
    _ai = new GoogleGenAI({ apiKey });
    console.log("[GEMINI] GoogleGenAI client initialised successfully");
  }
  return _ai;
}

const MODEL = "gemini-2.0-flash";

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are SortAi, an intelligent link classification assistant.

Your job is to analyze a link's metadata and classify it into exactly ONE space (category).

Available spaces:
- Career      – Jobs, resumes, interviews, professional development, LinkedIn, networking
- Study       – Courses, tutorials, documentation, research papers, educational content
- Fashion     – Clothing, style, trends, beauty, accessories, fashion brands
- Fitness     – Workouts, nutrition, health tips, gym routines, sports
- Tech        – Programming languages, core software engineering, gadgets, computer hardware, science, tech news
- Tools       – SaaS platforms, AI utilities, online editors, calculators, website builders, Figma/Canva designs, converters, dashboards, developer utilities
- Web links   – General websites, landing pages, registration forms, login screens, news sites, search results, general bookmarks
- Entertainment – Movies, music, games, reels, memes, funny videos, pop culture, Instagram/TikTok posts
- Life        – Recipes, travel, personal finance, relationships, self-improvement, productivity
- Other       – Anything that doesn't fit the above categories

Rules:
1. Choose the SINGLE most relevant space.
2. Generate a concise, descriptive title (max 80 chars).
3. Write a short_description (1-2 sentences, max 200 chars) explaining what the link is about.
4. Provide 3-6 relevant tags as lowercase keywords.
5. Write a reason_to_save (1 sentence) explaining why someone might want to save this link.
6. Set confidence to "high" if you are very sure about the classification, "medium" if somewhat sure, "low" if uncertain.
7. Return ONLY valid JSON matching the required schema. No markdown, no extra text.`;

// ---------------------------------------------------------------------------
// classifyLink
// ---------------------------------------------------------------------------

/**
 * Sends link metadata to Gemini and returns a structured classification.
 */
export async function classifyLink(
  metadata: NormalizedMetadata
): Promise<ClassificationResult> {
  const aiClient = getGeminiClient();

  const userMessage = [
    "Classify the following link:",
    "",
    `Source: ${metadata.source}`,
    `Title: ${metadata.title}`,
    `Description: ${metadata.description || "(none)"}`,
    metadata.channelTitle ? `Channel/Author: ${metadata.channelTitle}` : "",
    metadata.imageUrl ? `Has image: yes` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await aiClient.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: "Concise descriptive title for the link (max 80 chars)",
            },
            short_description: {
              type: Type.STRING,
              description:
                "1-2 sentence description of the link content (max 200 chars)",
            },
            space: {
              type: Type.STRING,
              description: "Exactly one of: Career, Study, Fashion, Fitness, Tech, Tools, Web links, Entertainment, Life, Other",
              enum: [
                "Career",
                "Study",
                "Fashion",
                "Fitness",
                "Tech",
                "Tools",
                "Web links",
                "Entertainment",
                "Life",
                "Other",
              ],
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3-6 lowercase keyword tags",
            },
            reason_to_save: {
              type: Type.STRING,
              description:
                "One sentence explaining why someone might want to save this link",
            },
            confidence: {
              type: Type.STRING,
              description: "Classification confidence level",
              enum: ["high", "medium", "low"],
            },
          },
          required: [
            "title",
            "short_description",
            "space",
            "tags",
            "reason_to_save",
            "confidence",
          ],
        },
        temperature: 0.3,
        maxOutputTokens: 512,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Gemini returned an empty response");
    }

    const parsed: ClassificationResult = JSON.parse(text);

    // Validate the required fields
    const validSpaces = [
      "Career",
      "Study",
      "Fashion",
      "Fitness",
      "Tech",
      "Tools",
      "Web links",
      "Entertainment",
      "Life",
      "Other",
    ];
    if (!validSpaces.includes(parsed.space)) {
      parsed.space = "Other";
    }

    if (
      !["high", "medium", "low"].includes(parsed.confidence)
    ) {
      parsed.confidence = "medium";
    }

    if (!Array.isArray(parsed.tags)) {
      parsed.tags = [];
    }

    return parsed;
  } catch (err) {
    console.error("[GEMINI] Classification failed:", (err as Error).message);
    throw new Error(`Gemini classification failed: ${(err as Error).message}`);
  }
}

function containsWord(text: string, keywords: string[]): boolean {
  const normalized = text.toLowerCase();
  return keywords.some(keyword => {
    // Escape regex characters
    const escaped = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    // Enforce word boundaries
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    return regex.test(normalized);
  });
}

/**
 * Fallback classification method that uses keyword-based heuristics when Gemini API is rate-limited or unavailable.
 */
export function heuristicClassifyLink(metadata: NormalizedMetadata): ClassificationResult {
  const title = metadata.title || "Untitled Link";
  const desc = metadata.description || "";
  const source = (metadata.source || "").toLowerCase();
  
  const content = `${title} ${desc} ${source}`.toLowerCase();
  
  let space = "Web links"; // default to Web links for generic URLs
  let tags: string[] = ["web"];
  let reason = "Saved for later reference.";
  
  // Specific checks for social media
  const isSocial = source === "instagram" || source === "tiktok" || source === "facebook" || source === "youtube";
  if (isSocial) {
    space = "Entertainment";
    tags = [source, "media", "social"];
    reason = `Saved from ${source} for entertainment or reference.`;
  }

  // Keywords lists with word boundaries applied via containsWord
  const careerKeywords = ["job", "jobs", "career", "careers", "resume", "resumes", "interview", "interviews", "linkedin", "hire", "hiring", "recruiter", "recruiters", "internship", "internships"];
  const studyKeywords = ["course", "courses", "study", "studying", "tutorial", "tutorials", "class", "classes", "learn", "learning", "education", "lecture", "lectures", "academy", "doc", "docs", "documentation"];
  const fashionKeywords = ["fashion", "style", "wear", "clothing", "shoes", "outfit", "outfits", "apparel", "boutique", "makeup", "beauty", "dress", "dresses", "wardrobe", "sneakers"];
  const fitnessKeywords = ["fit", "fitness", "workout", "workouts", "gym", "nutrition", "diet", "health", "exercise", "exercises", "wellness", "sports", "yoga", "training", "calorie", "calories"];
  const toolsKeywords = ["editor", "builder", "saas", "utility", "utilities", "figma", "canva", "wix", "tool", "tools", "dashboard", "dashboards", "creator", "app", "apps", "platform", "platforms", "calculator", "calculators", "converter", "converters", "generator", "generators", "ai tool", "ai tools", "chatgpt", "gemini", "claude", "copilot", "notion", "spreadsheet", "excel"];
  const techKeywords = ["code", "coding", "programming", "tech", "technology", "software", "ai", "artificial intelligence", "github", "developer", "developers", "engineering", "api", "apis", "database", "frontend", "backend", "webdev", "computer", "gadget", "gadgets", "hardware"];
  const entertainmentKeywords = ["movie", "movies", "music", "game", "games", "gaming", "song", "songs", "video", "videos", "netflix", "youtube", "entertainment", "comedy", "show", "shows", "reel", "reels", "meme", "memes", "fun", "funny", "tiktok", "instagram", "facebook", "vlog", "vlogs"];
  const lifeKeywords = ["travel", "recipe", "recipes", "cook", "cooking", "money", "finance", "finances", "life", "lifestyle", "productivity", "hobby", "hobbies", "blog", "blogs", "relationships", "marriage", "parenting", "house", "home"];
  const webKeywords = ["login", "signin", "signup", "register", "registration", "auth", "account", "portal", "form", "forms", "submit", "apply"];

  if (containsWord(content, careerKeywords)) {
    space = "Career";
    tags = ["career", "work", "professional", "jobs"];
    reason = "Contains helpful information for career development and professional growth.";
  } else if (containsWord(content, studyKeywords)) {
    space = "Study";
    tags = ["education", "study", "learning", "tutorial"];
    reason = "Useful tutorial or educational resource for studying and learning.";
  } else if (containsWord(content, fashionKeywords)) {
    space = "Fashion";
    tags = ["fashion", "style", "trends", "clothing"];
    reason = "Style inspiration, clothing collection, or fashion trend highlight.";
  } else if (containsWord(content, fitnessKeywords)) {
    space = "Fitness";
    tags = ["fitness", "health", "workout", "wellness"];
    reason = "Saved for fitness routines, nutrition guides, or healthy living tips.";
  } else if (containsWord(content, toolsKeywords)) {
    space = "Tools";
    tags = ["tool", "utility", "saas", "software"];
    reason = "Useful online tool, editor, generator, or software utility.";
  } else if (containsWord(content, techKeywords)) {
    space = "Tech";
    tags = ["tech", "coding", "software", "developer"];
    reason = "Contains dev tools, coding references, or technical updates.";
  } else if (containsWord(content, entertainmentKeywords)) {
    space = "Entertainment";
    tags = ["entertainment", "media", "video", "fun"];
    reason = "Saved for casual viewing, entertainment, or leisure.";
  } else if (containsWord(content, lifeKeywords)) {
    space = "Life";
    tags = ["life", "lifestyle", "personal", "general"];
    reason = "Personal interest, life organization, or daily productivity guide.";
  } else if (containsWord(content, webKeywords)) {
    space = "Web links";
    tags = ["login", "register", "web", "account"];
    reason = "Web portal login, sign-up form, or account landing page.";
  }
  
  return {
    title: title.slice(0, 80),
    short_description: desc ? desc.slice(0, 200) : "No description available.",
    space,
    tags,
    reason_to_save: reason,
    confidence: "low",
  };
}
