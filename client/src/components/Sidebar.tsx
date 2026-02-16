import { useState, useEffect } from "react";
import { Plus, MessageSquare, Trash2, X, Play, Pause, Target, Hash } from "lucide-react";
import { useConversations, useConversation, useCreateConversation, useDeleteConversation, useUpdateConversation } from "@/hooks/use-conversations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export function Sidebar({ selectedId, onSelect }: SidebarProps) {
  const { data: conversations } = useConversations();
  const { data: conversationData } = useConversation(selectedId || 0);
  const createMutation = useCreateConversation();
  const deleteMutation = useDeleteConversation();
  const updateConversation = useUpdateConversation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  
  const [goal, setGoal] = useState("");
  const [autoDelay, setAutoDelay] = useState(2000);
  const [subTopic, setSubTopic] = useState("");
  const [turnLimit, setTurnLimit] = useState(0);
  const [keywords, setKeywords] = useState("");

  useEffect(() => {
    if (conversationData) {
      setGoal(conversationData.goal || "");
      setAutoDelay(conversationData.autoDelay || 2000);
      setTurnLimit(conversationData.turnLimit || 0);
      setKeywords(conversationData.completionKeywords || "");
    }
  }, [conversationData?.id, conversationData?.goal, conversationData?.autoDelay, conversationData?.turnLimit, conversationData?.completionKeywords]);

  const handleGoalBlur = () => {
    if (selectedId && conversationData && goal !== conversationData.goal) {
      updateConversation.mutate({ id: selectedId, goal });
    }
  };

  const handleSettingsBlur = () => {
    if (selectedId && conversationData) {
      updateConversation.mutate({ 
        id: selectedId, 
        turnLimit, 
        completionKeywords: keywords 
      });
    }
  };

  const handleSubTopicSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && subTopic.trim()) {
      const newGoal = goal ? `${goal}\n\nPoint of interest: ${subTopic}` : `Point of interest: ${subTopic}`;
      setGoal(newGoal);
      updateConversation.mutate({ id: selectedId!, goal: newGoal });
      toast({ title: "Sub-topic added to briefing" });
      setSubTopic("");
    }
  };

  const toggleAutoMode = () => {
    if (!selectedId || !conversationData) return;
    updateConversation.mutate({ 
      id: selectedId, 
      autoMode: !conversationData.autoMode,
      autoDelay 
    });
  };

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    createMutation.mutate({ title: newTitle, goal: "", autoMode: false, isActive: true }, {
      onSuccess: (data) => {
        setIsDialogOpen(false);
        setNewTitle("");
        onSelect(data.id);
        toast({ title: "Conversation created" });
      }
    });
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm("Are you sure?")) {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          if (selectedId === id) onSelect(0);
        }
      });
    }
  };

  return (
    <div className="w-80 border-r border-white/5 bg-black/40 flex flex-col h-full backdrop-blur-xl">
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h2 className="font-semibold text-lg tracking-tight">AI Orchestrator</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/10 rounded-full">
              <Plus className="h-5 w-5 text-primary" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-white/10">
            <DialogHeader>
              <DialogTitle>New Conversation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input 
                placeholder="Conversation Title" 
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full">
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {selectedId && conversationData && (
        <div className="p-4 border-b border-white/5 space-y-4 bg-primary/5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="h-3 w-3 text-primary" />
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Briefing / Goal</label>
            </div>
            <textarea 
              className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary min-h-[60px] resize-none"
              placeholder="Primary objective..."
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              onBlur={handleGoalBlur}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Hash className="h-3 w-3 text-primary" />
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sub-topic / Discussion Point</label>
            </div>
            <Input 
              className="h-7 bg-black/20 border-white/10 text-[10px]"
              placeholder="Add sub-topic and press Enter..."
              value={subTopic}
              onChange={(e) => setSubTopic(e.target.value)}
              onKeyDown={handleSubTopicSubmit}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 bg-black/20 rounded-lg px-2 py-1 border border-white/5 flex-1">
              <span className="text-[10px] text-muted-foreground uppercase">Delay</span>
              <Input 
                type="number" 
                className="w-12 h-4 text-[10px] bg-transparent border-none text-right p-0 focus-visible:ring-0"
                value={autoDelay}
                onChange={(e) => setAutoDelay(parseInt(e.target.value))}
                onBlur={() => updateConversation.mutate({ id: selectedId, autoDelay })}
              />
            </div>
            <Button 
              size="sm" 
              variant={conversationData.autoMode ? "destructive" : "default"}
              onClick={toggleAutoMode}
              className="h-7 px-3 text-[10px] uppercase font-bold"
            >
              {conversationData.autoMode ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
              {conversationData.autoMode ? "Stop" : "Start"}
            </Button>
          </div>

          <div className="space-y-3 pt-2 border-t border-white/5">
             <div className="flex items-center justify-between">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Turn Limit</label>
                <Input 
                  type="number" 
                  className="w-12 h-5 text-[10px] bg-black/20 border-white/10 text-right p-1"
                  value={turnLimit}
                  onChange={(e) => setTurnLimit(parseInt(e.target.value))}
                  onBlur={handleSettingsBlur}
                  placeholder="0"
                />
             </div>
             <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Completion Keywords</label>
                <Input 
                  className="h-6 bg-black/20 border-white/10 text-[10px]"
                  placeholder="e.g. done, finished, summary"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  onBlur={handleSettingsBlur}
                />
             </div>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {conversations?.map((conv: any) => (
            <div
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`
                group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all duration-200
                ${selectedId === conv.id 
                  ? "bg-primary/10 text-primary border border-primary/10 shadow-[0_0_15px_rgba(59,130,246,0.05)]" 
                  : "hover:bg-white/5 border border-transparent text-muted-foreground/80 hover:text-foreground"}
              `}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquare className={`h-4 w-4 shrink-0 transition-colors ${selectedId === conv.id ? "text-primary" : "text-muted-foreground/40 group-hover:text-muted-foreground"}`} />
                <span className="truncate text-[13px] font-medium tracking-tight">{conv.title}</span>
              </div>
              <button 
                onClick={(e) => handleDelete(e, conv.id)} 
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 hover:text-destructive rounded-md transition-all"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
