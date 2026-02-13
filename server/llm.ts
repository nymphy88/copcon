
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { type Agent, type Message } from "@shared/schema";

// Initialize clients
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

  // Construct System Prompt with Role and Specific Task
  const systemMessage = `Role: ${agent.role || "Assistant"}\nTask: ${agent.task || "Respond to input"}\n\n${agent.systemPrompt}\n\nMain Goal: ${goal}`;

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
        max_tokens: agent.maxTokens || 1000,
      });

      content = response.choices[0]?.message?.content || "";
      inputTokens = response.usage?.prompt_tokens || 0;
      outputTokens = response.usage?.completion_tokens || 0;
    } else if (agent.provider === "anthropic") {
      const messages = history.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }));

      const response = await anthropic.messages.create({
        model: agent.model,
        system: systemMessage,
        messages: messages as any,
        max_tokens: agent.maxTokens || 4096,
        temperature: agent.temperature ? agent.temperature / 100 : 0.7,
      });

      content = response.content[0].type === 'text' ? response.content[0].text : "";
      inputTokens = response.usage?.input_tokens || 0;
      outputTokens = response.usage?.output_tokens || 0;
    } else if (agent.provider === "gemini") {
        const model = gemini.getGenerativeModel({
            model: agent.model,
            systemInstruction: systemMessage,
        });

        let lastUserMessage = "";
        const historyForGemini = [...history];
        
        if (historyForGemini.length > 0 && historyForGemini[historyForGemini.length - 1].role === 'user') {
            lastUserMessage = historyForGemini.pop()!.content;
        } else if (historyForGemini.length > 0) {
            lastUserMessage = historyForGemini.pop()!.content;
        }
        
        const formattedHistory = historyForGemini.map(m => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
        }));
        
        const chatSession = model.startChat({
             history: formattedHistory,
             generationConfig: {
                 maxOutputTokens: agent.maxTokens || 1000,
                 temperature: agent.temperature ? agent.temperature / 100 : 0.7,
             }
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
