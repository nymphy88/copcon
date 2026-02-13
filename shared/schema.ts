
import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  goal: text("goal").default(""), // Main Goal / Briefing
  isActive: boolean("is_active").default(true),
  autoMode: boolean("auto_mode").default(false), // Auto Mode toggle
  autoDelay: integer("auto_delay").default(2000), // Delay in ms
  createdAt: timestamp("created_at").defaultNow(),
});

export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").default(""), // Role/Identity (e.g. "Senior Architect")
  task: text("task").default(""), // Specific Task (e.g. "Review system weaknesses")
  systemPrompt: text("system_prompt").notNull(),
  provider: text("provider").notNull(), // 'openai', 'anthropic', 'gemini'
  model: text("model").notNull(),
  temperature: integer("temperature").default(70), // stored as 0-100
  inputScope: integer("input_scope").default(2), // Number of messages to see (1, 2, 5, etc.)
  color: text("color").default("#3b82f6"), // Visual distinction
  isModerator: boolean("is_moderator").default(false), // Is this agent the moderator?
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  agentId: integer("agent_id"), // Nullable for user messages
  role: text("role").notNull(), // 'user', 'assistant', 'system'
  content: text("content").notNull(),
  parentId: integer("parent_id"), // For threading/turns
  isHidden: boolean("is_hidden").default(false), // Scoping: hidden from AI context
  turnOrder: integer("turn_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const logs = pgTable("logs", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  agentId: integer("agent_id").notNull(),
  inputTokens: integer("input_tokens").default(0),
  outputTokens: integer("output_tokens").default(0),
  latency: integer("latency").default(0), // ms
  timestamp: timestamp("timestamp").defaultNow(),
});

// === RELATIONS ===

export const conversationsRelations = relations(conversations, ({ many }) => ({
  messages: many(messages),
}));

export const agentsRelations = relations(agents, ({ many }) => ({
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  agent: one(agents, {
    fields: [messages.agentId],
    references: [agents.id],
  }),
}));

// === BASE SCHEMAS ===

export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true });
export const insertAgentSchema = createInsertSchema(agents).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });

// === EXPLICIT API CONTRACT TYPES ===

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;

export type Message = typeof messages.$inferSelect & {
  agentName?: string;
  agentColor?: string;
  agentRole?: string;
};
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Log = typeof logs.$inferSelect;

// Request/Response types
export type CreateConversationRequest = {
  title: string;
  goal?: string;
  agentIds: number[];
};

export type ConversationResponse = Conversation & {
  messages: Message[];
};

export type RunTurnRequest = {
  conversationId: number;
  agentId?: number;
  userInput?: string;
  isRewrite?: boolean;
  messageIdToRewrite?: number;
  newContent?: string;
};

export type AgentConfigResponse = Agent[];
