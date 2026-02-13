import { useState, useEffect, useRef } from "react";
import { Send, Play, Pause, Edit2, RotateCw, Activity, Bot } from "lucide-react";
import { useConversation, useUpdateConversation } from "@/hooks/use-conversations";
import { useAgents } from "@/hooks/use-agents";
import { useRunTurn } from "@/hooks/use-turns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LogViewer } from "./LogViewer";
import { motion, AnimatePresence } from "framer-motion";

interface ChatInterfaceProps {
  conversationId: number;
}

export function ChatInterface({ conversationId }: ChatInterfaceProps) {
  const { data: conversationData } = useConversation(conversationId);
  const { data: agents } = useAgents();
  const updateConversation = useUpdateConversation();
  const runTurn = useRunTurn();
  
  const [userInput, setUserInput] = useState("");
  const [goal, setGoal] = useState("");
  const [autoDelay, setAutoDelay] = useState(2000);
  const [selectedNextAgent, setSelectedNextAgent] = useState<string>("auto");
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [rewriteModal, setRewriteModal] = useState<{ id: number, content: string } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Sync goal when conversation loads
  useEffect(() => {
    if (conversationData) {
      setGoal(conversationData.goal || "");
      setAutoDelay(conversationData.autoDelay || 2000);
    }
  }, [conversationData?.id]); // Only re-sync when switching conversations

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversationData?.messages?.length]);

  // Handle Goal Update (debounce could be added)
  const handleGoalBlur = () => {
    if (conversationData && goal !== conversationData.goal) {
      updateConversation.mutate({ id: conversationId, goal });
    }
  };

  // Handle Auto Mode toggle
  const toggleAutoMode = () => {
    if (!conversationData) return;
    const newMode = !conversationData.autoMode;
    updateConversation.mutate({ id: conversationId, autoMode: newMode, autoDelay });
  };

  // Handle Message Submission
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    
    // Determine agent ID: if 'auto', send undefined, otherwise parse int
    const agentId = selectedNextAgent === "auto" ? undefined : parseInt(selectedNextAgent);

    runTurn.mutate({
      conversationId,
      userInput: userInput || undefined,
      agentId
    }, {
      onSuccess: () => {
        setUserInput("");
      }
    });
  };

  // Handle Rewrite
  const handleRewrite = () => {
    if (!rewriteModal) return;
    runTurn.mutate({
      conversationId,
      isRewrite: true,
      messageIdToRewrite: rewriteModal.id,
      newContent: rewriteModal.content
    }, {
      onSuccess: () => setRewriteModal(null)
    });
  };

  // Auto-loop logic effect
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (conversationData?.autoMode && !runTurn.isPending) {
      timeout = setTimeout(() => {
        // Trigger next turn automatically
        runTurn.mutate({ conversationId });
      }, autoDelay);
    }
    
    return () => clearTimeout(timeout);
  }, [conversationData?.autoMode, runTurn.isPending, conversationData?.messages?.length]);


  if (!conversationData) return <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading chat...</div>;

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between glass-panel z-10">
        <div className="flex flex-col gap-1 w-full max-w-2xl">
          <h2 className="font-bold text-lg leading-none">{conversationData.title}</h2>
          <Input 
            className="h-8 bg-transparent border-transparent hover:border-white/10 focus:border-primary/50 text-muted-foreground px-0 transition-all"
            placeholder="Set a main goal for the agents..."
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            onBlur={handleGoalBlur}
          />
        </div>

        <div className="flex items-center gap-3">
           <div className="flex items-center gap-2 bg-black/20 rounded-full px-3 py-1 border border-white/5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Delay (ms)</span>
            <Input 
              type="number" 
              className="w-16 h-6 text-xs bg-transparent border-none text-right p-0 focus-visible:ring-0"
              value={autoDelay}
              onChange={(e) => setAutoDelay(parseInt(e.target.value))}
              onBlur={() => updateConversation.mutate({ id: conversationId, autoDelay })}
            />
           </div>

           <Button 
             variant={conversationData.autoMode ? "destructive" : "default"} 
             size="sm"
             onClick={toggleAutoMode}
             className={`gap-2 transition-all ${conversationData.autoMode ? "animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]" : "shadow-lg shadow-primary/20"}`}
           >
             {conversationData.autoMode ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
             {conversationData.autoMode ? "Stop Auto" : "Start Auto"}
           </Button>

           <Button variant="outline" size="icon" onClick={() => setIsLogOpen(true)} title="View Logs">
             <Activity className="h-4 w-4" />
           </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
        <AnimatePresence initial={false}>
          {conversationData.messages?.map((msg, idx) => {
            const isUser = msg.role === "user";
            const agent = agents?.find(a => a.id === msg.agentId);
            const agentColor = agent?.color || "#3b82f6";

            return (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white mr-3 mt-1 shadow-md shrink-0" 
                    style={{ backgroundColor: agentColor }}
                  >
                    <Bot className="w-5 h-5" />
                  </div>
                )}
                
                <div className={`relative max-w-[80%] group`}>
                   <div className="flex items-baseline gap-2 mb-1 px-1">
                      <span className={`text-xs font-bold ${isUser ? "text-primary ml-auto" : ""}`} style={{ color: !isUser ? agentColor : undefined }}>
                        {isUser ? "You" : agent?.name || "Unknown Agent"}
                      </span>
                      {!isUser && <span className="text-[10px] text-muted-foreground uppercase">{msg.role}</span>}
                   </div>
                   
                   <div className={`
                      p-4 rounded-2xl text-sm leading-relaxed shadow-md backdrop-blur-sm border
                      ${isUser 
                        ? "bg-primary/10 border-primary/20 text-foreground rounded-tr-sm" 
                        : "bg-card/80 border-white/5 text-foreground/90 rounded-tl-sm"}
                   `}>
                      {msg.content}
                   </div>

                   {/* Actions */}
                   <div className={`absolute top-2 ${isUser ? "-left-10" : "-right-10"} opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 rounded-full" onClick={() => setRewriteModal({ id: msg.id, content: msg.content })}>
                        <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 rounded-full" onClick={() => runTurn.mutate({ conversationId, isRewrite: true, messageIdToRewrite: msg.id })}>
                         <RotateCw className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                   </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {runTurn.isPending && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex w-full justify-start">
            <div className="w-8 h-8 rounded-lg bg-white/10 mr-3 animate-pulse" />
            <div className="bg-card/50 p-4 rounded-2xl rounded-tl-sm border border-white/5 flex gap-1 items-center h-12">
               <div className="w-2 h-2 bg-primary/50 rounded-full typing-dot" />
               <div className="w-2 h-2 bg-primary/50 rounded-full typing-dot" />
               <div className="w-2 h-2 bg-primary/50 rounded-full typing-dot" />
            </div>
          </motion.div>
        )}
        <div className="h-4" /> {/* Spacer */}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-background border-t border-white/5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-4xl mx-auto">
          <div className="flex gap-2">
            <Select value={selectedNextAgent} onValueChange={setSelectedNextAgent}>
              <SelectTrigger className="w-[180px] bg-card border-white/10">
                <SelectValue placeholder="Next Agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (Next Turn)</SelectItem>
                {agents?.map(a => (
                  <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1 relative">
              <Input 
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type instructions or intervention..."
                className="bg-card border-white/10 pr-12 focus-visible:ring-primary"
              />
            </div>
            <Button type="submit" disabled={runTurn.isPending} className="w-24 font-semibold shadow-lg shadow-primary/20">
              {userInput ? "Submit" : "Next Turn"}
            </Button>
          </div>
        </form>
      </div>

      {/* Rewrite Modal */}
      <Dialog open={!!rewriteModal} onOpenChange={(o) => !o && setRewriteModal(null)}>
        <DialogContent className="bg-card border-white/10">
           <DialogHeader>
             <DialogTitle>Rewrite Message</DialogTitle>
           </DialogHeader>
           <Textarea 
             className="min-h-[150px] font-mono text-sm bg-black/20"
             value={rewriteModal?.content || ""}
             onChange={(e) => setRewriteModal(prev => prev ? { ...prev, content: e.target.value } : null)}
           />
           <DialogFooter>
             <Button variant="ghost" onClick={() => setRewriteModal(null)}>Cancel</Button>
             <Button onClick={handleRewrite}>Update & Continue</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logs Modal */}
      <LogViewer 
        conversationId={conversationId} 
        isOpen={isLogOpen} 
        onClose={() => setIsLogOpen(false)} 
      />
    </div>
  );
}
