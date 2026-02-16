import { useState, useEffect, useRef } from "react";
import { Send, Play, Pause, Edit2, RotateCw, Activity, Bot, Paperclip, FileText, ImageIcon, X, GripVertical } from "lucide-react";
import { useConversation, useUpdateConversation } from "@/hooks/use-conversations";
import { useAgents } from "@/hooks/use-agents";
import { useRunTurn } from "@/hooks/use-turns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LogViewer } from "./LogViewer";
import { motion, AnimatePresence } from "framer-motion";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ChatInterfaceProps {
  conversationId: number;
}

function SortableAgent({ agent, i, isTarget, isProcessing, runTurn, agentsCount, goal, conversationId, updateConversation }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: agent.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center shrink-0 will-change-transform">
      <div 
        {...attributes}
        {...listeners}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-semibold transition-all cursor-grab active:cursor-grabbing hover:bg-white/10
          ${isProcessing 
            ? "border-primary bg-primary/20 shadow-[0_0_20px_rgba(59,130,246,0.3)] scale-105 ring-1 ring-primary/50" 
            : isTarget && !runTurn.isPending
              ? "border-primary/40 bg-primary/10 opacity-100 shadow-sm"
              : "border-white/5 bg-white/5 opacity-60"}`}
      >
        <GripVertical className="w-3 h-3 text-muted-foreground/40" />
        <div className="w-2.5 h-2.5 rounded-full ring-2 ring-background shadow-sm" style={{ backgroundColor: agent.color }} />
        <div className="flex flex-col">
          <span className="tracking-tight">{agent.name}</span>
          {agent.role && <span className="text-[9px] opacity-60 leading-none font-normal">{agent.role}</span>}
        </div>
      </div>
      {i < (agentsCount - 1) && (
        <div className="mx-2 flex items-center gap-1.5">
          <div className="w-4 h-[1px] bg-white/5" />
          <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full bg-white/5 hover:bg-primary/20 group transition-all" onClick={() => {
            const marker = `\n\n[POINT: DISCUSSION MARKER ${i + 1}]`;
            updateConversation.mutate({ id: conversationId, goal: goal + marker });
          }}>
            <X className="h-3 w-3 rotate-45 text-muted-foreground group-hover:text-primary" />
          </Button>
          <div className="w-4 h-[1px] bg-white/5" />
        </div>
      )}
    </div>
  );
}

export function ChatInterface({ conversationId }: ChatInterfaceProps) {
  const { data: conversationData } = useConversation(conversationId);
  const { data: initialAgents } = useAgents();
  const [agents, setAgents] = useState<any[]>([]);
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (initialAgents) {
      setAgents(initialAgents);
    }
  }, [initialAgents]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setAgents((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }
  
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
    
    const runTurnParams: any = {
      conversationId,
      userInput: userInput || undefined,
      agentId,
      fileUrl: pendingFile?.url,
    };

    runTurn.mutate(runTurnParams, {
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
    
    const runTurnParams: any = { conversationId };
    
    if (conversationData?.autoMode && !runTurn.isPending && automaticPass) {
      console.log(`[AutoMode] Triggering next turn in ${autoDelay}ms...`);
      timeout = setTimeout(() => {
        runTurn.mutate(runTurnParams);
      }, autoDelay);
    }
    
    return () => clearTimeout(timeout);
  }, [conversationData?.autoMode, runTurn.isPending, conversationData?.messages?.length, automaticPass]);


  if (!conversationData) return <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading chat...</div>;

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden font-sans">
      {/* Header with Briefing/Goal */}
      <div className="px-6 py-4 border-b border-white/5 glass-panel z-10 shrink-0">
        <div className="flex flex-col gap-3 w-full max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-xl leading-tight tracking-tight text-foreground/90">{conversationData.title}</h2>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/5" onClick={() => setIsLogOpen(true)} title="View Logs">
                <Activity className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] uppercase tracking-tighter px-2 h-5 shrink-0">GOAL</Badge>
            <Input 
              className="h-9 bg-black/40 border-white/5 hover:border-white/10 focus:border-primary/40 text-foreground px-4 transition-all rounded-full text-sm placeholder:text-muted-foreground/40"
              placeholder="Define the core mission for the agents..."
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              onBlur={handleGoalBlur}
            />
          </div>
        </div>
      </div>

      {/* Timeline / Queue View */}
      <div className="flex items-center gap-3 overflow-x-auto px-6 py-3 border-b border-white/5 bg-black/20 scrollbar-hide shrink-0">
          <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.2em] shrink-0">Flow</span>
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={agents.map(a => a.id)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex items-center gap-1">
                {agents.map((agent, i) => {
                  const isTarget = selectedNextAgent !== "auto" ? parseInt(selectedNextAgent) === agent.id : (i === (conversationData.messages?.length || 0) % (agents?.length || 1));
                  const isProcessing = runTurn.isPending && isTarget;
                  
                  return (
                    <SortableAgent 
                      key={agent.id}
                      agent={agent}
                      i={i}
                      isTarget={isTarget}
                      isProcessing={isProcessing}
                      runTurn={runTurn}
                      agentsCount={agents.length}
                      goal={goal}
                      conversationId={conversationId}
                      updateConversation={updateConversation}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
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
                   
                   <div className="p-4 rounded-2xl shadow-md backdrop-blur-sm border transition-all bg-primary/10 border-primary/20 text-foreground rounded-tr-sm text-[12px]">
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
      <div className="p-4 bg-background border-t border-white/5 text-[14px]">
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
              <Textarea 
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type instructions or intervention..."
                className="bg-card border-white/10 pr-12 focus-visible:ring-primary min-h-[40px] max-h-[200px] py-2"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
            </div>
            <Button type="submit" disabled={runTurn.isPending} className="h-10 w-24 font-semibold shadow-lg shadow-primary/20 self-end">
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
