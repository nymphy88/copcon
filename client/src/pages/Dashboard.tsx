import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { AgentConfig } from "@/components/AgentConfig";
import { ChatInterface } from "@/components/ChatInterface";
import { useConversations } from "@/hooks/use-conversations";
import { Menu, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const { data: conversations, isLoading } = useConversations();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [configCollapsed, setConfigCollapsed] = useState(false);

  // Mobile auto-collapse
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarCollapsed(true);
      setConfigCollapsed(true);
    }
  }, []);

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
    <div className="h-screen w-full flex overflow-hidden bg-background text-foreground relative">
      {/* Sidebar - Collapsible */}
      <div className={`transition-all duration-300 relative ${sidebarCollapsed ? "w-0 overflow-hidden" : "w-80"}`}>
        <Sidebar 
          selectedId={selectedConversationId} 
          onSelect={setSelectedConversationId} 
        />
      </div>
      
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Toggle buttons for mobile or preference */}
        <div className="absolute top-4 left-4 z-50 flex gap-2">
          {sidebarCollapsed && (
            <Button size="icon" variant="outline" className="h-8 w-8 bg-background/80 backdrop-blur-sm" onClick={() => setSidebarCollapsed(false)}>
              <Menu className="h-4 w-4" />
            </Button>
          )}
        </div>

        {selectedConversationId ? (
          <div className="flex-1 flex overflow-hidden relative">
             <ChatInterface conversationId={selectedConversationId} />
             
             {/* Agent Config - Collapsible */}
             <div className={`transition-all duration-300 relative ${configCollapsed ? "w-0 overflow-hidden" : "w-80 border-l border-white/5"}`}>
               <AgentConfig />
             </div>

             {/* Config Toggle Tab */}
             <button 
               onClick={() => setConfigCollapsed(!configCollapsed)}
               className={`absolute right-0 top-1/2 -translate-y-1/2 h-20 w-4 bg-white/5 hover:bg-white/10 border-l border-t border-b border-white/10 rounded-l-md flex items-center justify-center transition-all z-20 ${configCollapsed ? "right-0" : "right-80"}`}
             >
               {configCollapsed ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
             </button>
          </div>
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
      </div>
    </div>
  );
}
