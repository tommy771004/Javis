import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fetchOpenRouterWithFallback } from "./openRouterHelper";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history, model } = req.body;
      const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "Missing API key (OPENROUTER_API_KEY or GEMINI_API_KEY)" });
      }

      // Format history into a single blob or just use it as context
      let prompt = "System: You are Mark-XXXIX, an advanced, highly efficient, and intelligent personal AI assistant. Be direct, helpful, and sophisticated.\n\n";
      if (history && history.length > 0) {
        prompt += history.map((msg: any) => `${msg.role === 'user' ? 'User' : 'Mark-XXXIX'}: ${msg.content}`).join('\n') + `\nUser: ${message}\nMark-XXXIX:`;
      } else {
        prompt += `User: ${message}\nMark-XXXIX:`;
      }

      const result = await fetchOpenRouterWithFallback(apiKey, prompt, undefined, model);

      res.json({ 
        text: result.text,
        model: result.model,
        usage: result.usage
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to generate response" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
