
import { z } from 'zod';
import { insertConversationSchema, insertAgentSchema, insertMessageSchema, conversations, agents, messages, logs } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  conversations: {
    list: {
      method: 'GET' as const,
      path: '/api/conversations' as const,
      responses: {
        200: z.array(z.custom<typeof conversations.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/conversations' as const,
      input: insertConversationSchema,
      responses: {
        201: z.custom<typeof conversations.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/conversations/:id' as const,
      responses: {
        200: z.custom<typeof conversations.$inferSelect & { messages: (typeof messages.$inferSelect & { agent?: typeof agents.$inferSelect })[] }>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/conversations/:id' as const,
      input: insertConversationSchema.partial(),
      responses: {
        200: z.custom<typeof conversations.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
        method: 'DELETE' as const,
        path: '/api/conversations/:id' as const,
        responses: {
          204: z.void(),
          404: errorSchemas.notFound,
        },
      },
  },
  agents: {
    list: {
      method: 'GET' as const,
      path: '/api/agents' as const,
      responses: {
        200: z.array(z.custom<typeof agents.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/agents' as const,
      input: insertAgentSchema,
      responses: {
        201: z.custom<typeof agents.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/agents/:id' as const,
      input: insertAgentSchema.partial(),
      responses: {
        200: z.custom<typeof agents.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/agents/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  turns: {
    run: {
      method: 'POST' as const,
      path: '/api/turns/run' as const,
      input: z.object({
        conversationId: z.number(),
        agentId: z.number().optional(), // If not provided, orchestrator logic decides? Or round robin.
        userInput: z.string().optional(), // For "Submit to next Agent"
        isRewrite: z.boolean().optional(),
        messageIdToRewrite: z.number().optional(),
        newContent: z.string().optional(), // Content for rewrite
      }),
      responses: {
        200: z.object({
          message: z.custom<typeof messages.$inferSelect>(),
          stats: z.custom<typeof logs.$inferSelect>().optional(),
        }),
        400: errorSchemas.validation,
      },
    }
  },
  logs: {
      list: {
          method: 'GET' as const,
          path: '/api/logs/:conversationId' as const,
          responses: {
              200: z.array(z.custom<typeof logs.$inferSelect>())
          }
      }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
