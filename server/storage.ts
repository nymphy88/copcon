
import { db } from "./db";
import {
  conversations, agents, messages, logs,
  type Conversation, type InsertConversation,
  type Agent, type InsertAgent,
  type Message, type InsertMessage,
  type Log
} from "@shared/schema";
import { eq, desc, asc } from "drizzle-orm";

export interface IStorage {
  // Conversations
  getConversations(): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: number, updates: Partial<Conversation>): Promise<Conversation>;
  deleteConversation(id: number): Promise<void>;

  // Agents
  getAgents(): Promise<Agent[]>;
  getAgent(id: number): Promise<Agent | undefined>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgent(id: number, updates: Partial<Agent>): Promise<Agent>;
  deleteAgent(id: number): Promise<void>;

  // Messages
  getMessages(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: number, updates: Partial<Message>): Promise<Message>;

  // Logs
  createLog(log: typeof logs.$inferInsert): Promise<Log>;
  getLogs(conversationId: number): Promise<Log[]>;
}

export class DatabaseStorage implements IStorage {
  async getConversations(): Promise<Conversation[]> {
    return await db.select().from(conversations).orderBy(desc(conversations.createdAt));
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const [conversation] = await db.insert(conversations).values(insertConversation).returning();
    return conversation;
  }

  async updateConversation(id: number, updates: Partial<Conversation>): Promise<Conversation> {
    const [conversation] = await db.update(conversations)
      .set(updates)
      .where(eq(conversations.id, id))
      .returning();
    return conversation;
  }

  async deleteConversation(id: number): Promise<void> {
      await db.delete(messages).where(eq(messages.conversationId, id));
      await db.delete(conversations).where(eq(conversations.id, id));
  }

  async getAgents(): Promise<Agent[]> {
    return await db.select().from(agents).orderBy(asc(agents.id));
  }

  async getAgent(id: number): Promise<Agent | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.id, id));
    return agent;
  }

  async createAgent(insertAgent: InsertAgent): Promise<Agent> {
    const [agent] = await db.insert(agents).values(insertAgent).returning();
    return agent;
  }

  async updateAgent(id: number, updates: Partial<Agent>): Promise<Agent> {
    const [agent] = await db.update(agents)
      .set(updates)
      .where(eq(agents.id, id))
      .returning();
    return agent;
  }

  async deleteAgent(id: number): Promise<void> {
    await db.delete(agents).where(eq(agents.id, id));
  }

  async getMessages(conversationId: number): Promise<Message[]> {
    // Join with agents to get name/color
    const msgs = await db.select({
      id: messages.id,
      conversationId: messages.conversationId,
      agentId: messages.agentId,
      role: messages.role,
      content: messages.content,
      parentId: messages.parentId,
      isHidden: messages.isHidden,
      turnOrder: messages.turnOrder,
      createdAt: messages.createdAt,
      agentName: agents.name,
      agentColor: agents.color,
    })
    .from(messages)
    .leftJoin(agents, eq(messages.agentId, agents.id))
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));

    return msgs;
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  async updateMessage(id: number, updates: Partial<Message>): Promise<Message> {
    const [message] = await db.update(messages)
      .set(updates)
      .where(eq(messages.id, id))
      .returning();
    return message;
  }

  async createLog(log: typeof logs.$inferInsert): Promise<Log> {
    const [newLog] = await db.insert(logs).values(log).returning();
    return newLog;
  }

  async getLogs(conversationId: number): Promise<Log[]> {
    return await db.select().from(logs).where(eq(logs.conversationId, conversationId)).orderBy(desc(logs.timestamp));
  }
}

export const storage = new DatabaseStorage();
