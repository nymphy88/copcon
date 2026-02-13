
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { type Agent, type Message } from "@shared/schema";

// Initialize clients
// These env vars are set by the Replit AI Integrations blueprints
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const gemini = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

export type LLMResponse = {
  content: string;
  inputTokens: number;
  outputTokens: number;
  latency: number;
};

export async function generateResponse(
  agent: Agent,
  goal: string,
  history: Message[]
): Promise<LLMResponse> {
  const startTime = Date.now();
  let content = "";
  let inputTokens = 0;
  let outputTokens = 0;

  // Construct System Prompt
  const systemMessage = `${agent.systemPrompt}\n\nMain Goal: ${goal}`;

  try {
    if (agent.provider === "openai") {
      const messages = [
        { role: "system", content: systemMessage },
        ...history.map((m) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        })),
      ];

      const response = await openai.chat.completions.create({
        model: agent.model,
        messages: messages as any,
        temperature: agent.temperature ? agent.temperature / 100 : 0.7,
      });

      content = response.choices[0]?.message?.content || "";
      inputTokens = response.usage?.prompt_tokens || 0;
      outputTokens = response.usage?.completion_tokens || 0;
    } else if (agent.provider === "anthropic") {
      // Anthropic puts system prompt in a separate field
      // And messages must alternate User/Assistant (handled by history usually, but we assume valid history)
      const messages = history.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }));

      const response = await anthropic.messages.create({
        model: agent.model,
        system: systemMessage,
        messages: messages as any,
        max_tokens: 4096, // Default max
        temperature: agent.temperature ? agent.temperature / 100 : 0.7,
      });

      content = response.content[0].type === 'text' ? response.content[0].text : "";
      inputTokens = response.usage?.input_tokens || 0;
      outputTokens = response.usage?.output_tokens || 0;
    } else if (agent.provider === "gemini") {
        // Google GenAI
        const model = gemini.getGenerativeModel({
            model: agent.model,
            systemInstruction: systemMessage,
        });

        const chat = model.startChat({
            history: history.map(m => ({
                role: m.role === "assistant" ? "model" : "user",
                parts: [{ text: m.content }],
            }))
        });

        // Gemini SDK doesn't take the last message as part of startChat history usually, 
        // it expects sendMessage to be called with the *next* user input.
        // But here we might be simulating a turn where the "User" input was already in history?
        // Wait, `history` here is "Last 2 messages".
        // If the last message was from User, we call sendMessage with empty? No.
        // If the last message in `history` is User, we should pop it and use it as the `sendMessage` argument.
        
        let lastUserMessage = "";
        const historyForGemini = [...history];
        
        // If the very last message is from User, use it as the trigger
        if (historyForGemini.length > 0 && historyForGemini[historyForGemini.length - 1].role === 'user') {
            lastUserMessage = historyForGemini.pop()!.content;
        } else {
             // If the last message was Assistant (e.g. Agent A), and now it's Agent B's turn.
             // We need to provide *some* input to generate content.
             // We can provide a "Continue" prompt or the previous agent's output as user input for this agent.
             // For simplicity, if history ends in Assistant, we treat the last assistant message as "User" input for the current agent.
             if (historyForGemini.length > 0) {
                 lastUserMessage = historyForGemini.pop()!.content;
             }
        }
        
        // Adjust history format
        const formattedHistory = historyForGemini.map(m => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
        }));
        
        // Re-initialize chat with adjusted history
        const chatSession = model.startChat({
             history: formattedHistory
        });

        const result = await chatSession.sendMessage(lastUserMessage || "Continue");
        const response = await result.response;
        
        content = response.text();
        inputTokens = response.usageMetadata?.promptTokenCount || 0;
        outputTokens = response.usageMetadata?.candidatesTokenCount || 0;
    }
  } catch (error) {
    console.error("LLM Error:", error);
    content = `Error calling ${agent.provider}: ${(error as Error).message}`;
  }

  return {
    content,
    inputTokens,
    outputTokens,
    latency: Date.now() - startTime,
  };
}
