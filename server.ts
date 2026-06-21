import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

// Ensure Gemini API client is initialized gracefully
let ai: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is missing.");
    }
    ai = new GoogleGenAI({
      apiKey: key || "MOCK_KEY",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return ai;
}

const app = express();
const PORT = 3000;

// Increase body limit for larger attachments (such as high-res images or papers)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

/**
 * Endpoint 1: Draft Generator
 * Generates an initial creative draft based on custom prompt + attachment parts
 */
app.post("/api/generate", async (req, res) => {
  try {
    const { prompt, attachments, genre, tone } = req.body;
    if (!prompt) {
      res.status(400).json({ error: "Prompt is required to generate a draft." });
      return;
    }

    const client = getGeminiClient();
    
    // Build the parts for Gemini
    const parts: any[] = [];
    
    // Add file attachments if present
    if (attachments && Array.isArray(attachments)) {
      for (const file of attachments) {
        if (file.type && file.base64) {
          // If it's an image, attach it as inline data
          if (file.type.startsWith("image/")) {
            parts.push({
              inlineData: {
                mimeType: file.type,
                data: file.base64.split(",")[1] || file.base64,
              },
            });
          } else {
            // It's a text/document attachment. We put it in as structured context.
            parts.push({
              text: `[Attachment: ${file.name || "Document"}]\n---CONTENT---\n${file.textContent || ""}\n---END ATTACHMENT---`,
            });
          }
        }
      }
    }

    // Main prompt instruction
    const genreText = genre ? `Genre/Format: ${genre}` : "";
    const toneText = tone ? `Tone/Style: ${tone}` : "";
    
    const instructions = `You are a world-class literary editor, copywriter, and collaborative co-author.
Create a beautifully written initial piece of draft text matching the requested parameters.
${genreText}
${toneText}

User Prompt/Requirements: ${prompt}

Output ONLY the raw content draft in markdown style. Do not include any meta commentary, intro conversational text, or polite transitions. Just outputs the actual text to be inserted in the writer's editor.`;

    parts.push({ text: instructions });

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: parts,
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Error in /api/generate:", error);
    res.status(500).json({ error: error.message || "Failed to generate writing." });
  }
});

/**
 * Endpoint 2: Contextual Inline Iterate
 * Rewrites a targeted selection in the context of the paragraphs immediately preceding/succeeding it.
 */
app.post("/api/iterate", async (req, res) => {
  try {
    const { selection, feedback, contextBefore, contextAfter, documentTitle, mode } = req.body;

    if (!selection) {
      res.status(400).json({ error: "No text was selected to rewrite." });
      return;
    }

    const client = getGeminiClient();

    const systemPrompt = `You are a professional writing refiner and collaborative co-author. 
Your task is to rewrite of a specific highlighted snippet of text based on the user's direct feedback.

Context is vital: you must ensure the rewritten portion blends seamlessly and matches the surrounding flow (tone, rhythm, variables, style).

Here is the document context:
${documentTitle ? `Document Title: ${documentTitle}` : ""}
Preceding Content (Before selection):
"""
${contextBefore || "(Start of document)"}
"""

Target Section to Rewrite:
"""
${selection}
"""

Succeeding Content (After selection):
"""
${contextAfter || "(End of document)"}
"""

User Instructions / Feedback for this specific target section:
"${feedback}"

Rewriting Mode requested: ${mode || "general"} (Options: 'rewrite', 'expand', 'shorten', 'formalize', 'casual', 'poetic')

Please output ONLY the refined replacement text for the "Target Section" itself. 
- Do NOT output the preceding or succeeding content.
- Do NOT provide markdown wrappers like "Replacement:", or code blocks unless the replacement itself is code.
- Do NOT include any conversation, apologies, explanation, or side notes. Just the polished text replacement.`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: systemPrompt,
    });

    res.json({ replacement: response.text });
  } catch (error: any) {
    console.error("Error in /api/iterate:", error);
    res.status(500).json({ error: error.message || "Failed to iterate selection." });
  }
});

/**
 * Endpoint 3: Proactive Copilot Feedback
 * Automatically reviews the document to suggest inline adjustments (improvements, edits, comments)
 */
app.post("/api/copilot", async (req, res) => {
  try {
    const { content, documentTitle } = req.body;

    if (!content || content.trim().length < 5) {
      res.json({ suggestions: [] });
      return;
    }

    const client = getGeminiClient();

    const instructions = `You are an incredibly encouraging, highly perceptive editor review agent.
Analyze the user's current draft and recommend 2 to 3 targeted, actionable, specific visual suggestions. It can be a critique of a line, a suggest to expand, a structural flow critique, or general advice.

Current Document Title: ${documentTitle || "Untitled"}
Current Content:
"""
${content}
"""

Provide your feedback structure strictly in JSON format. The response should be a JSON array containing objects matching this schema:
[
  {
    "id": "string (unique code)",
    "type": "improvement | structural | style | grammar",
    "title": "string (short 3-5 word label)",
    "description": "string (clear, friendly explanation of why this edit improves the piece)",
    "targetQuote": "string (the exact phrase or sentence inside the content this applies to, OR empty if general structural counsel)",
    "suggestedText": "string (the suggested replacement, OR empty if it's general criticism)"
  }
]

Analyze the content and return valid JSON matching this schema. Ensure you quote EXACT substrings from the user's content for targetQuote so we can map them. Do not include markdown headers inside the JSON response. Just output plain JSON.`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: instructions,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              targetQuote: { type: Type.STRING },
              suggestedText: { type: Type.STRING }
            },
            required: ["id", "type", "title", "description", "targetQuote", "suggestedText"]
          }
        }
      }
    });

    let suggestions = [];
    try {
      suggestions = JSON.parse(response.text || "[]");
    } catch (e) {
      console.error("Failed to parse JSON schema response:", response.text);
    }

    res.json({ suggestions });
  } catch (error: any) {
    console.error("Error in /api/copilot:", error);
    res.status(500).json({ error: error.message || "Failed to generate copilot notes." });
  }
});

// Setup Server static assets and Vite server bridge
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting in development mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
