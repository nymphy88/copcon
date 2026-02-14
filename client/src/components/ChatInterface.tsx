import { useState, useEffect, useRef } from "react";
import { Send, Play, Pause, Edit2, RotateCw, Activity, Bot, Paperclip, FileText, ImageIcon, X } from "lucide-react";
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
  const [automaticPass, setAutomaticPass] = useState(true);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [rewriteModal, setRewriteModal] = useState<{ id: number, content: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ url: string, type: string, name: string } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
      agentId,
      fileUrl: pendingFile?.url,
      fileType: pendingFile?.type,
      fileName: pendingFile?.name
    }, {
      onSuccess: () => {
        setUserInput("");
        setPendingFile(null);
      }
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Mock upload - in a real app we'd upload to S3/Storage
      // For now we'll use a data URL for simplicity in this demo environment
      const reader = new FileReader();
      reader.onloadend = () => {
        setPendingFile({
          url: reader.result as string,
          type: file.type,
          name: file.name
        });
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Upload failed", err);
      setIsUploading(false);
    }
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
    
    if (conversationData?.autoMode && !runTurn.isPending && automaticPass) {
      console.log(`[AutoMode] Triggering next turn in ${autoDelay}ms...`);
      timeout = setTimeout(() => {
        runTurn.mutate({ conversationId });
      }, autoDelay);
    }
    
    return () => clearTimeout(timeout);
  }, [conversationData?.autoMode, runTurn.isPending, conversationData?.messages?.length, automaticPass]);


  if (!conversationData) return <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading chat...</div>;

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex flex-col gap-4 glass-panel z-10">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1 w-full max-w-2xl">
            <h2 className="font-bold text-lg leading-none">{conversationData.title}</h2>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/20 text-[10px] py-0">BRIEFING / MAIN GOAL</Badge>
              <Input 
                className="h-8 bg-black/20 border-white/10 hover:border-white/20 focus:border-primary/50 text-foreground px-3 transition-all rounded-lg text-sm"
                placeholder="Set the briefing that all agents will follow..."
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                onBlur={handleGoalBlur}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 font-thin text-[12px] text-right">
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

             <div className="flex items-center gap-2 bg-black/20 rounded-full px-3 py-1 border border-white/5">
                <input 
                  type="checkbox" 
                  id="autoPass" 
                  checked={automaticPass}
                  onChange={(e) => setAutomaticPass(e.target.checked)}
                  className="rounded border-white/20 bg-background/50"
                />
                <label htmlFor="autoPass" className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Auto Pass</label>
             </div>
          </div>
        </div>

        {/* Timeline / Queue View */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">Timeline / Queue:</span>
          {agents?.map((agent, i) => {
            const isTarget = selectedNextAgent !== "auto" ? parseInt(selectedNextAgent) === agent.id : (i === (conversationData.messages?.length || 0) % agents.length);
            const isProcessing = runTurn.isPending && isTarget;
            
            return (
              <div key={agent.id} className="flex items-center shrink-0">
                <div 
                  className={`flex items-center gap-2 px-2 py-1 rounded-md border text-[10px] font-medium transition-all
                    ${isProcessing 
                      ? "border-primary bg-primary/20 shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-110 ring-1 ring-primary/50 animate-pulse" 
                      : isTarget && !runTurn.isPending
                        ? "border-primary/40 bg-primary/5 opacity-100"
                        : "border-white/5 bg-white/5 opacity-40"}`}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: agent.color }} />
                  <div className="flex flex-col">
                    <span>{agent.name}</span>
                    {agent.role && <span className="text-[8px] opacity-70 leading-none">{agent.role}</span>}
                  </div>
                </div>
                {i < (agents.length - 1) && <span className="mx-1 text-muted-foreground/20">→</span>}
              </div>
            );
          })}
        </div>
      </div>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
        <AnimatePresence initial={false}>
          {conversationData.messages?.map((msg: any, idx: number) => {
            const isUser = msg.role === "user";
            const agent = agents?.find(a => a.id === msg.agentId);
            const agentColor = agent?.color || "#3b82f6";
            const isProcessing = runTurn.isPending && (selectedNextAgent !== "auto" ? parseInt(selectedNextAgent) === msg.agentId : true); // Simplification for glow

            return (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div 
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-white mr-3 mt-1 shadow-md shrink-0 transition-all ${isProcessing && idx === (conversationData.messages?.length || 0) - 1 ? "ring-2 ring-white ring-offset-2 ring-offset-background scale-110 shadow-[0_0_15px_white]" : ""}`} 
                    style={{ backgroundColor: agentColor as any }}
                  >
                    <Bot className="w-5 h-5" />
                  </div>
                )}
                
                <div className={`relative max-w-[80%] group`}>
                   <div className="flex items-baseline gap-2 mb-1 px-1">
                      <div className="flex flex-col">
                        <span className={`text-xs font-bold ${isUser ? "text-primary ml-auto" : ""}`} style={{ color: !isUser ? agentColor : undefined }}>
                          {isUser ? "You" : agent?.name || "Unknown Agent"}
                        </span>
                        {!isUser && agent?.role && (
                          <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter">
                            {agent.role}
                          </span>
                        )}
                      </div>
                      {!isUser && <span className="text-[10px] text-muted-foreground uppercase self-start mt-0.5">{msg.role}</span>}
                   </div>
                   
                   <div className={`
                      p-4 rounded-2xl text-sm leading-relaxed shadow-md backdrop-blur-sm border transition-all
                      ${isUser 
                        ? "bg-primary/10 border-primary/20 text-foreground rounded-tr-sm" 
                        : "bg-card/80 border-white/5 text-foreground/90 rounded-tl-sm"}
                      ${isProcessing && idx === (conversationData.messages?.length || 0) - 1 ? "ring-2 ring-primary/50 scale-[1.01] shadow-[0_0_25px_rgba(59,130,246,0.2)]" : ""}
                   `}>
                      {msg.fileUrl && (
                        <div className="mb-3 p-2 bg-black/20 rounded-lg border border-white/10 flex items-center gap-3">
                          {msg.fileType?.startsWith("image/") ? (
                            <img src={msg.fileUrl} alt={msg.fileName || "Uploaded"} className="max-w-full max-h-48 rounded object-contain" />
                          ) : (
                            <>
                              <FileText className="h-8 w-8 text-primary" />
                              <div className="flex flex-col">
                                <span className="text-xs font-medium truncate max-w-[200px]">{msg.fileName}</span>
                                <span className="text-[10px] text-muted-foreground uppercase">{msg.fileType}</span>
                              </div>
                            </>
                          )}
                        </div>
                      )}
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
          {pendingFile && (
            <div className="flex items-center gap-2 p-2 bg-primary/10 border border-primary/20 rounded-lg self-start">
              {pendingFile.type.startsWith("image/") ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              <span className="text-xs truncate max-w-[200px]">{pendingFile.name}</span>
              <Button size="icon" variant="ghost" className="h-5 w-5 hover:bg-white/10" onClick={() => setPendingFile(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileSelect}
              accept="image/*,.py,.js,.ts,.txt,.pdf,.json"
            />
            <Button 
              type="button" 
              variant="outline" 
              size="icon" 
              className="shrink-0 bg-card border-white/10"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
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
