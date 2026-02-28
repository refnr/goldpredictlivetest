import type { Express, Request, Response } from "express";
import { chatStorage } from "./storage";
import { isAuthenticated } from "../auth";
import { generateMarketAnalysis } from "../../services/localAnalysis";

export function registerChatRoutes(app: Express): void {
  app.get("/api/conversations", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const conversations = await chatStorage.getAllConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id: idParam } = req.params;
      const id = parseInt(Array.isArray(idParam) ? idParam[0] : idParam);
      const conversation = await chatStorage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const messages = await chatStorage.getMessagesByConversation(id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/conversations", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { title } = req.body;
      const conversation = await chatStorage.createConversation(title || "New Chat");
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.delete("/api/conversations/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id: idParam } = req.params;
      const id = parseInt(Array.isArray(idParam) ? idParam[0] : idParam);
      await chatStorage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  app.post("/api/conversations/:id/messages", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id: idParam } = req.params;
      const conversationId = parseInt(Array.isArray(idParam) ? idParam[0] : idParam);
      const { content } = req.body;

      await chatStorage.createMessage(conversationId, "user", content);

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const analysis = await generateMarketAnalysis();

      const words = analysis.split(/(\s+)/);
      let fullResponse = "";
      for (let i = 0; i < words.length; i += 3) {
        const chunk = words.slice(i, i + 3).join('');
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }

      await chatStorage.createMessage(conversationId, "assistant", fullResponse);

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error sending message:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to send message" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });
}
