
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { generateResponse } from "./llm";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get(api.conversations.list.path, async (req, res) => {
    const conversations = await storage.getConversations();
    res.json(conversations);
  });

  app.post(api.conversations.create.path, async (req, res) => {
    try {
      const input = api.conversations.create.input.parse(req.body);
      const conversation = await storage.createConversation(input);
      res.status(201).json(conversation);
    } catch (err) {
       if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  app.get(api.conversations.get.path, async (req, res) => {
    const conversation = await storage.getConversation(Number(req.params.id));
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    const messages = await storage.getMessages(Number(req.params.id));
    res.json({ ...conversation, messages });
  });

  app.patch(api.conversations.update.path, async (req, res) => {
    try {
        const input = api.conversations.update.input.parse(req.body);
        const conversation = await storage.updateConversation(Number(req.params.id), input);
        res.json(conversation);
    } catch (err) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ message: err.errors[0].message });
        } else {
            res.status(500).json({ message: "Internal Server Error" });
        }
    }
  });

  app.delete(api.conversations.delete.path, async (req, res) => {
      await storage.deleteConversation(Number(req.params.id));
      res.status(204).send();
  });

  app.get(api.agents.list.path, async (req, res) => {
    const agents = await storage.getAgents();
    res.json(agents);
  });

  app.post(api.agents.create.path, async (req, res) => {
    try {
      const input = api.agents.create.input.parse(req.body);
      const agent = await storage.createAgent(input);
      res.status(201).json(agent);
    } catch (err) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ message: err.errors[0].message });
        } else {
            res.status(500).json({ message: "Internal Server Error" });
        }
    }
  });

  app.patch(api.agents.update.path, async (req, res) => {
      try {
          const input = api.agents.update.input.parse(req.body);
          const agent = await storage.updateAgent(Number(req.params.id), input);
          res.json(agent);
      } catch (err) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ message: err.errors[0].message });
        } else {
            res.status(500).json({ message: "Internal Server Error" });
        }
      }
  });

  app.delete(api.agents.delete.path, async (req, res) => {
      await storage.deleteAgent(Number(req.params.id));
      res.status(204).send();
  });

  app.post(api.turns.run.path, async (req, res) => {
    try {
      const { conversationId, agentId, userInput, isRewrite, messageIdToRewrite, newContent } = api.turns.run.input.parse(req.body);

      if (isRewrite && messageIdToRewrite && newContent) {
          const updatedMessage = await storage.updateMessage(messageIdToRewrite, { content: newContent });
          return res.json({ message: updatedMessage });
      }

      if (userInput) {
        await storage.createMessage({
          conversationId,
          role: "user",
          content: userInput,
          turnOrder: 0,
        });
      }

      if (!agentId) {
          const messages = await storage.getMessages(conversationId);
          const lastMsg = messages[messages.length - 1];
          return res.json({ message: lastMsg });
      }

      const agent = await storage.getAgent(agentId);
      if (!agent) {
          return res.status(404).json({ message: "Agent not found" });
      }

      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
          return res.status(404).json({ message: "Conversation not found" });
      }

      const allMessages = await storage.getMessages(conversationId);
      const visibleMessages = allMessages.filter(m => !m.isHidden);
      
      // Use Input Scope from agent
      const scope = agent.inputScope || 2;
      const history = visibleMessages.slice(-scope);

      const response = await generateResponse(agent, conversation.goal || "No specific goal.", history);

      const newMessage = await storage.createMessage({
        conversationId,
        agentId,
        role: "assistant",
        content: response.content,
        turnOrder: (visibleMessages.length > 0 ? (visibleMessages[visibleMessages.length-1].turnOrder || 0) + 1 : 1),
      });

      const log = await storage.createLog({
        conversationId,
        agentId,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        latency: response.latency,
      });

      res.json({ message: newMessage, stats: log });

    } catch (err) {
      console.error(err);
      if (err instanceof z.ZodError) {
          res.status(400).json({ message: err.errors[0].message });
      } else {
          res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  app.get(api.logs.list.path, async (req, res) => {
      const logs = await storage.getLogs(Number(req.params.conversationId));
      res.json(logs);
  });

  return httpServer;
}
