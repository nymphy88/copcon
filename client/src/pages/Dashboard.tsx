import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { AgentConfig } from "@/components/AgentConfig";
import { ChatInterface } from "@/components/ChatInterface";
import { useConversations } from "@/hooks/use-conversations";

export default function Dashboard() {
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const { data: conversations, isLoading } = useConversations();

  // Select first conversation on load if none selected
  useEffect(() => {
    if (!selectedConversationId && conversations && conversations.length > 0) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  if (isLoading) return (
    <div className="h-screen w-full flex items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-muted-foreground animate-pulse">Initializing Orchestrator...</p>
      </div>
    </div>
  );

  return (
    <div className="h-screen w-full flex overflow-hidden bg-background text-foreground">
      <Sidebar 
        selectedId={selectedConversationId} 
        onSelect={setSelectedConversationId} 
      />
      
      {selectedConversationId ? (
        <ChatInterface conversationId={selectedConversationId} />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
           <div className="w-24 h-24 rounded-2xl bg-white/5 flex items-center justify-center mb-6 rotate-12">
             <span className="text-6xl">🤖</span>
           </div>
           <h1 className="text-2xl font-bold text-foreground mb-2">Welcome to AI Orchestrator</h1>
           <p className="max-w-md mx-auto">
             Create a conversation on the left and configure your agent team on the right to start a multi-agent workflow.
           </p>
        </div>
      )}
      
      <AgentConfig />
    </div>
  );
}
