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
- Entertainment – Movies, music, games, comedy, pop culture. (Note: Do NOT classify a link as Entertainment simply because it is on YouTube, Instagram, or TikTok. Look at the actual topic. E.g. an Instagram post about AI is Tech).
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
 * Sends link metadata to Nvidia NIM API and returns a structured classification.
 */
async function classifyWithNvidia(metadata: NormalizedMetadata): Promise<ClassificationResult> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY is not configured in .env");
  }

  const userMessage = [
    "Classify the following link based on the strict JSON rules.",
    "",
    `Source: ${metadata.source}`,
    `Title: ${metadata.title}`,
    `Description: ${metadata.description || "(none)"}`,
    metadata.channelTitle ? `Channel/Author: ${metadata.channelTitle}` : "",
    metadata.imageUrl ? `Has image: yes` : "",
  ].filter(Boolean).join("\n");

  try {
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-8b-instruct",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage }
        ],
        temperature: 0.3,
        max_tokens: 512,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Nvidia API error ${response.status}: ${errText}`);
    }

    const data = await response.json() as any;
    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error("Nvidia returned an empty response");
    }

    const parsed: ClassificationResult = JSON.parse(text);

    // Validate the required fields
    const validSpaces = ["Career", "Study", "Fashion", "Fitness", "Tech", "Tools", "Web links", "Entertainment", "Life", "Other"];
    if (!validSpaces.includes(parsed.space)) parsed.space = "Other";
    if (!["high", "medium", "low"].includes(parsed.confidence)) parsed.confidence = "medium";
    if (!Array.isArray(parsed.tags)) parsed.tags = [];

    return parsed;
  } catch (err) {
    console.error("[NVIDIA] Classification failed:", (err as Error).message);
    throw new Error(`Nvidia classification failed: ${(err as Error).message}`);
  }
}

/**
 * Sends link metadata to Groq API and returns a structured classification.
 */
async function classifyWithGroq(metadata: NormalizedMetadata): Promise<ClassificationResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured in .env");
  }

  const userMessage = [
    "Classify the following link based on the strict JSON rules.",
    "",
    `Source: ${metadata.source}`,
    `Title: ${metadata.title}`,
    `Description: ${metadata.description || "(none)"}`,
    metadata.channelTitle ? `Channel/Author: ${metadata.channelTitle}` : "",
    metadata.imageUrl ? `Has image: yes` : "",
  ].filter(Boolean).join("\n");

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage }
        ],
        temperature: 0.3,
        max_tokens: 512,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API error ${response.status}: ${errText}`);
    }

    const data = await response.json() as any;
    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error("Groq returned an empty response");
    }

    const parsed: ClassificationResult = JSON.parse(text);

    // Validate the required fields
    const validSpaces = ["Career", "Study", "Fashion", "Fitness", "Tech", "Tools", "Web links", "Entertainment", "Life", "Other"];
    if (!validSpaces.includes(parsed.space)) parsed.space = "Other";
    if (!["high", "medium", "low"].includes(parsed.confidence)) parsed.confidence = "medium";
    if (!Array.isArray(parsed.tags)) parsed.tags = [];

    return parsed;
  } catch (err) {
    console.error("[GROQ] Classification failed:", (err as Error).message);
    throw new Error(`Groq classification failed: ${(err as Error).message}`);
  }
}

/**
 * Sends link metadata to Gemini (and falls back to Groq then Nvidia) and returns a structured classification.
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
    console.warn("[GEMINI] Classification failed, attempting fallback to Groq...", (err as Error).message);
    try {
      return await classifyWithGroq(metadata);
    } catch (groqErr) {
      console.warn("[GROQ] Fallback failed, attempting final fallback to Nvidia...", (groqErr as Error).message);
      try {
        return await classifyWithNvidia(metadata);
      } catch (nvidiaErr) {
        console.error("[NVIDIA] Final fallback failed:", (nvidiaErr as Error).message);
        throw new Error(`All AI classification services failed.`);
      }
    }
  }
}

/**
 * Generates an embedding for the given text using Gemini's text-embedding-004 model.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const aiClient = getGeminiClient();
  try {
    const response = await aiClient.models.embedContent({
      model: "text-embedding-004",
      contents: text
    });
    return response.embeddings[0].values;
  } catch (err) {
    console.error("[GEMINI] Embedding failed:", (err as Error).message);
    throw new Error(`Embedding failed: ${(err as Error).message}`);
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
  
  const content = `${title} ${desc}`.toLowerCase(); // DON'T include source in content for keyword matching
  
  let space = "Web links";
  let tags: string[] = ["web"];
  let reason = "Saved for later reference.";

  // Keywords lists — check these FIRST before falling back to source-based classification
  const careerKeywords = ["job", "jobs", "career", "careers", "resume", "resumes", "interview", "interviews", "linkedin", "hire", "hiring", "recruiter", "recruiters", "internship", "internships", "business", "businesses", "profitable", "entrepreneur", "entrepreneurship", "startup", "startups", "income", "side hustle", "freelance", "freelancing", "salary", "networking", "professional"];
  const studyKeywords = ["course", "courses", "study", "studying", "tutorial", "tutorials", "class", "classes", "learn", "learning", "education", "lecture", "lectures", "academy", "doc", "docs", "documentation", "how to", "guide", "beginner", "advanced", "masterclass"];
  const fashionKeywords = ["fashion", "style", "wear", "clothing", "shoes", "outfit", "outfits", "apparel", "boutique", "makeup", "beauty", "dress", "dresses", "wardrobe", "sneakers", "accessories"];
  const fitnessKeywords = ["fit", "fitness", "workout", "workouts", "gym", "nutrition", "diet", "health", "exercise", "exercises", "wellness", "sports", "yoga", "training", "calorie", "calories", "muscle", "cardio"];
  const toolsKeywords = ["editor", "builder", "saas", "utility", "utilities", "figma", "canva", "wix", "tool", "tools", "dashboard", "dashboards", "creator", "platform", "platforms", "calculator", "calculators", "converter", "converters", "generator", "generators", "ai tool", "ai tools", "chatgpt", "gemini", "claude", "copilot", "notion", "spreadsheet", "excel"];
  const techKeywords = ["code", "coding", "programming", "software engineering", "github", "developer", "developers", "api", "apis", "database", "frontend", "backend", "webdev", "computer science", "gadget", "gadgets", "hardware", "open source", "javascript", "python", "react", "node", "typescript", "rust", "golang"];
  const entertainmentKeywords = ["movie", "movies", "music", "song", "songs", "singer", "album", "playlist", "gaming", "game", "games", "netflix", "comedy", "show", "shows", "reel", "reels", "meme", "memes", "fun", "funny", "vlog", "vlogs", "dance", "dancer", "concert", "lyrics", "beat", "remix", "cover", "official video", "music video", "trailer", "anime", "manga", "drama"];
  const lifeKeywords = ["travel", "recipe", "recipes", "cook", "cooking", "money", "finance", "finances", "life", "lifestyle", "productivity", "hobby", "hobbies", "blog", "blogs", "relationships", "marriage", "parenting", "house", "home", "motivation", "self improvement", "mindfulness", "meditation"];
  const webKeywords = ["login", "signin", "signup", "register", "registration", "auth", "account", "portal", "form", "forms", "submit", "apply"];

  // Run keyword classification on CONTENT (title + description) first
  let matched = false;
  if (containsWord(content, entertainmentKeywords)) {
    space = "Entertainment";
    tags = ["entertainment", "media", "video", "fun"];
    reason = "Saved for casual viewing, entertainment, or leisure.";
    matched = true;
  } else if (!matched && containsWord(content, careerKeywords)) {
    space = "Career";
    tags = ["career", "work", "professional", "jobs"];
    reason = "Contains helpful information for career development and professional growth.";
    matched = true;
  } else if (!matched && containsWord(content, studyKeywords)) {
    space = "Study";
    tags = ["education", "study", "learning", "tutorial"];
    reason = "Useful tutorial or educational resource for studying and learning.";
    matched = true;
  } else if (!matched && containsWord(content, fashionKeywords)) {
    space = "Fashion";
    tags = ["fashion", "style", "trends", "clothing"];
    reason = "Style inspiration, clothing collection, or fashion trend highlight.";
    matched = true;
  } else if (!matched && containsWord(content, fitnessKeywords)) {
    space = "Fitness";
    tags = ["fitness", "health", "workout", "wellness"];
    reason = "Saved for fitness routines, nutrition guides, or healthy living tips.";
    matched = true;
  } else if (!matched && containsWord(content, toolsKeywords)) {
    space = "Tools";
    tags = ["tool", "utility", "saas", "software"];
    reason = "Useful online tool, editor, generator, or software utility.";
    matched = true;
  } else if (!matched && containsWord(content, techKeywords)) {
    space = "Tech";
    tags = ["tech", "coding", "software", "developer"];
    reason = "Contains dev tools, coding references, or technical updates.";
    matched = true;
  } else if (!matched && containsWord(content, lifeKeywords)) {
    space = "Life";
    tags = ["life", "lifestyle", "personal", "general"];
    reason = "Personal interest, life organization, or daily productivity guide.";
    matched = true;
  } else if (!matched && containsWord(content, webKeywords)) {
    space = "Web links";
    tags = ["login", "register", "web", "account"];
    reason = "Web portal login, sign-up form, or account landing page.";
    matched = true;
  }

  // LAST RESORT: If no keywords matched, default to Other or Web links rather than assuming Entertainment
  if (!matched) {
    if (source === "youtube" || source === "instagram" || source === "tiktok") {
      space = "Other";
      tags = [source, "media", "social"];
      reason = `Saved from ${source} for later review.`;
    }
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

// ---------------------------------------------------------------------------
// Chat Assistant
// ---------------------------------------------------------------------------
export async function generateChatResponse(message: string, contextTexts: string[]): Promise<string> {
  const ai = getGeminiClient();
  
  const CHAT_SYSTEM_PROMPT = `You are SortAi, an AI assistant for a link management application.
The user is asking a question. You must answer their question using ONLY the provided context of their saved links.
If the answer cannot be found in the provided links, or if the user asks a general question unrelated to the SortAi app or their saved links, you must politely refuse to answer and remind them that you can only answer questions about their saved links and the SortAi application.
Do NOT use outside knowledge to answer the question.

Context (User's Saved Links):
${contextTexts.join('\n\n')}
`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: message,
      config: {
        systemInstruction: CHAT_SYSTEM_PROMPT,
      }
    });

    if (!response.text) {
      throw new Error("No text returned from Gemini chat");
    }

    return response.text;
  } catch (err) {
    console.error("[GEMINI] generateChatResponse error:", err);
    console.warn("[GEMINI] Chat generation failed, attempting fallback to Nvidia...");
    
    // Fallback to Nvidia
    const apiKey = process.env.NVIDIA_API_KEY;
    if (apiKey) {
      try {
        const fallbackResponse = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "meta/llama-3.1-8b-instruct",
            messages: [
              { role: "system", content: CHAT_SYSTEM_PROMPT },
              { role: "user", content: message }
            ]
          })
        });

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json() as any;
          const text = fallbackData.choices?.[0]?.message?.content;
          if (text) {
            return text;
          }
        }
      } catch (fallbackErr) {
        console.error("[NVIDIA] Fallback chat generation failed:", fallbackErr);
      }
    }

    console.warn("[NVIDIA] Fallback failed, attempting final fallback to Groq...");
    const groqApiKey = process.env.GROQ_API_KEY;
    if (groqApiKey) {
      try {
        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${groqApiKey}`
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
              { role: "system", content: CHAT_SYSTEM_PROMPT },
              { role: "user", content: message }
            ]
          })
        });

        if (groqResponse.ok) {
          const groqData = await groqResponse.json() as any;
          const text = groqData.choices?.[0]?.message?.content;
          if (text) {
            return text;
          }
        }
      } catch (groqErr) {
        console.error("[GROQ] Fallback chat generation failed:", groqErr);
      }
    }

    throw new Error("Failed to generate chat response after fallbacks.");
  }
}
