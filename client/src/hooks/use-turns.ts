import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { Message, Log } from "@shared/schema";

type RunTurnInput = {
  conversationId: number;
  agentId?: number;
  userInput?: string;
  isRewrite?: boolean;
  messageIdToRewrite?: number;
  newContent?: string;
};

type RunTurnResponse = {
  message: Message;
  stats?: Log;
};

export function useRunTurn() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: RunTurnInput) => {
      const res = await fetch(api.turns.run.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to run turn");
      }
      return await res.json() as RunTurnResponse;
    },
    onSuccess: (_, variables) => {
      // Invalidate the specific conversation to refresh messages
      queryClient.invalidateQueries({ 
        queryKey: [api.conversations.get.path, variables.conversationId] 
      });
      // Invalidate logs if we're viewing them
      queryClient.invalidateQueries({ 
        queryKey: [api.logs.list.path.replace(':conversationId', String(variables.conversationId))] 
      });
    },
  });
}
