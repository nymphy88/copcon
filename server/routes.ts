
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

  // === Conversations ===
  app.get(api.conversations.list.path, async (req, res) => {
    const conversations = await storage.getConversations();
    res.json(conversations);
  });

  app.post(api.conversations.create.path, async (req, res) => {
    try {
      const input = api.conversations.create.input.parse(req.body);
      const conversation = await storage.createConversation(input);
      // Seed initial agents? For now assume agents are global or manually added.
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


  // === Agents ===
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

  // === Turns / Orchestrator ===
  app.post(api.turns.run.path, async (req, res) => {
    try {
      const { conversationId, agentId, userInput, isRewrite, messageIdToRewrite, newContent } = api.turns.run.input.parse(req.body);

      // Handle Rewrite
      if (isRewrite && messageIdToRewrite && newContent) {
          const updatedMessage = await storage.updateMessage(messageIdToRewrite, { content: newContent });
          return res.json({ message: updatedMessage });
      }

      // Handle User Input
      if (userInput) {
        await storage.createMessage({
          conversationId,
          role: "user",
          content: userInput,
          turnOrder: 0, // Need to fetch last order + 1 ideally, but simplified for now
        });
      }

      // If no agentId is provided, we can't run an agent turn. 
      // Returns just the user message if it was added.
      if (!agentId) {
          // If only userInput was provided, we are done.
          // But the type requires returning a message. 
          // If userInput was added, we could return that, but the logic below assumes generating an agent response.
          // For now, let's assume agentId is required for "running a turn" unless it's JUST a user input submission (which technically is a turn).
          // If just user input, return the user message (fetching it is slightly inefficient but safe).
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

      // Get History - Scoped to Last 2 Messages + Main Goal
      const allMessages = await storage.getMessages(conversationId);
      // Filter out hidden messages if any
      const visibleMessages = allMessages.filter(m => !m.isHidden);
      // Take last 2
      const history = visibleMessages.slice(-2);

      // Generate Response
      const response = await generateResponse(agent, conversation.goal || "No specific goal.", history);

      // Save Assistant Message
      const newMessage = await storage.createMessage({
        conversationId,
        agentId,
        role: "assistant",
        content: response.content,
        turnOrder: (visibleMessages.length > 0 ? (visibleMessages[visibleMessages.length-1].turnOrder || 0) + 1 : 1),
      });

      // Log Usage
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

  // === Logs ===
  app.get(api.logs.list.path, async (req, res) => {
      const logs = await storage.getLogs(Number(req.params.conversationId));
      res.json(logs);
  });

  // Seed Data
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
    const agents = await storage.getAgents();
    if (agents.length === 0) {
        await storage.createAgent({
            name: "Research GPT",
            systemPrompt: "You are a research assistant. Provide concise facts.",
            provider: "openai",
            model: "gpt-5.1",
            color: "#10b981", // Emerald
        });
        await storage.createAgent({
            name: "Creative Claude",
            systemPrompt: "You are a creative writer. Elaborate with flair.",
            provider: "anthropic",
            model: "claude-sonnet-4-5",
            color: "#8b5cf6", // Violet
        });
        await storage.createAgent({
            name: "Review Gemini",
            systemPrompt: "You are a critic. Review the previous statement for accuracy.",
            provider: "gemini",
            model: "gemini-2.5-flash",
            color: "#f59e0b", // Amber
        });
    }

    const conversations = await storage.getConversations();
    if (conversations.length === 0) {
        await storage.createConversation({
            title: "Project Alpha Brainstorm",
            goal: "Come up with a name for a new AI coffee machine.",
        });
    }
}
