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

const MODEL = "gemini-2.5-flash";

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
// classifyLink – Primary Gemini classification with bulletproof Heuristic Fallback
// ---------------------------------------------------------------------------
export async function classifyLink(
  metadata: NormalizedMetadata
): Promise<ClassificationResult> {
  try {
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

    if (!["high", "medium", "low"].includes(parsed.confidence)) {
      parsed.confidence = "medium";
    }

    if (!Array.isArray(parsed.tags)) {
      parsed.tags = [];
    }

    return parsed;
  } catch (err) {
    console.warn("[GEMINI] Classification failed, falling back to smart heuristic tagger:", (err as Error).message);
    return heuristicClassifyLink(metadata);
  }
}

// ---------------------------------------------------------------------------
// Bulletproof Heuristic Classifier (Guarantees zero link-save failures)
// ---------------------------------------------------------------------------
export function heuristicClassifyLink(metadata: NormalizedMetadata): ClassificationResult {
  const title = metadata.title || "Untitled Link";
  const desc = metadata.description || "";
  const source = metadata.source || "web";
  const fullText = `${title} ${desc}`.toLowerCase();

  let space = "Web links";
  let tags = ["bookmark", source];
  let reason = "Saved for later reading.";
  let matched = false;

  // Rule 1: Tech & Dev
  if (containsWord(fullText, ["code", "developer", "github", "react", "python", "javascript", "typescript", "api", "ai", "llm", "model", "software", "tech", "hardware", "linux", "cloud", "server"])) {
    space = "Tech";
    tags = ["tech", "developer", "software"];
    reason = "Core technical article, documentation, or developer tool.";
    matched = true;
  }
  // Rule 2: Career
  else if (containsWord(fullText, ["job", "career", "resume", "cv", "interview", "linkedin", "hire", "salary", "promotion", "hiring", "recruiter"])) {
    space = "Career";
    tags = ["career", "jobs", "professional"];
    reason = "Career development or professional networking resource.";
    matched = true;
  }
  // Rule 3: Study
  else if (containsWord(fullText, ["course", "tutorial", "learn", "university", "study", "research", "paper", "education", "lesson", "guide"])) {
    space = "Study";
    tags = ["study", "tutorial", "learning"];
    reason = "Educational resource or learning guide.";
    matched = true;
  }
  // Rule 4: Tools
  else if (containsWord(fullText, ["tool", "saas", "editor", "calculator", "generator", "app", "utility", "converter", "figma", "canva"])) {
    space = "Tools";
    tags = ["tools", "utility", "app"];
    reason = "Online tool or SaaS application.";
    matched = true;
  }
  // Rule 5: Fitness
  else if (containsWord(fullText, ["workout", "fitness", "gym", "health", "diet", "nutrition", "exercise", "running", "muscle", "sports"])) {
    space = "Fitness";
    tags = ["fitness", "health", "workout"];
    reason = "Health, fitness, or workout content.";
    matched = true;
  }
  // Rule 6: Fashion
  else if (containsWord(fullText, ["fashion", "clothing", "style", "outfit", "dress", "shoes", "beauty", "makeup", "skincare"])) {
    space = "Fashion";
    tags = ["fashion", "style", "beauty"];
    reason = "Fashion, style, or apparel resource.";
    matched = true;
  }
  // Rule 7: Life
  else if (containsWord(fullText, ["recipe", "food", "travel", "finance", "money", "budget", "life", "mindset", "productivity"])) {
    space = "Life";
    tags = ["life", "productivity", "personal"];
    reason = "Personal life, finance, or travel guide.";
    matched = true;
  }

  return {
    title: title.slice(0, 80),
    short_description: desc ? desc.slice(0, 200) : "No description available.",
    space,
    tags,
    reason_to_save: reason,
    confidence: "medium",
  };
}

function containsWord(text: string, keywords: string[]): boolean {
  const normalized = text.toLowerCase();
  return keywords.some(keyword => {
    const escaped = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    return regex.test(normalized);
  });
}

// ---------------------------------------------------------------------------
// Generates an embedding for text using Gemini text-embedding-004
// ---------------------------------------------------------------------------
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const aiClient = getGeminiClient();
    const response = await aiClient.models.embedContent({
      model: "text-embedding-004",
      contents: text
    });
    if (!response.embeddings?.[0]?.values) {
      throw new Error("Gemini returned empty embedding");
    }
    return response.embeddings[0].values;
  } catch (err) {
    console.warn("[GEMINI] Embedding warning (using fallback zero-vector):", (err as Error).message);
    return new Array(768).fill(0);
  }
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
    return "I couldn't process your question at the moment. Please try asking about your saved links again.";
  }
}
