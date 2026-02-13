import { useState } from "react";
import { Plus, MessageSquare, Trash2, X } from "lucide-react";
import { useConversations, useCreateConversation, useDeleteConversation } from "@/hooks/use-conversations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface SidebarProps {
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export function Sidebar({ selectedId, onSelect }: SidebarProps) {
  const { data: conversations } = useConversations();
  const createMutation = useCreateConversation();
  const deleteMutation = useDeleteConversation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    createMutation.mutate({ title: newTitle, goal: "", autoMode: false, isActive: true }, {
      onSuccess: (data) => {
        setIsDialogOpen(false);
        setNewTitle("");
        onSelect(data.id);
        toast({ title: "Conversation created", description: "You can now start configuring agents." });
      }
    });
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this conversation?")) {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          if (selectedId === id) onSelect(0); // Deselect
          toast({ title: "Conversation deleted" });
        }
      });
    }
  };

  return (
    <div className="w-80 border-r border-white/5 bg-black/20 flex flex-col h-full backdrop-blur-xl">
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h2 className="font-semibold text-lg tracking-tight">Conversations</h2>
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
                placeholder="Enter title (e.g., Debate on AI Ethics)" 
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="bg-background/50 border-white/10 focus-visible:ring-primary"
              />
              <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full font-semibold">
                {createMutation.isPending ? "Creating..." : "Start Chat"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {conversations?.length === 0 && (
            <div className="text-center text-muted-foreground py-8 text-sm">
              No conversations yet.
              <br />Start one to begin!
            </div>
          )}
          {conversations?.map((conv) => (
            <div
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`
                group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200
                ${selectedId === conv.id 
                  ? "bg-primary/10 border border-primary/20 shadow-lg shadow-primary/5" 
                  : "hover:bg-white/5 border border-transparent"}
              `}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquare className={`h-4 w-4 shrink-0 ${selectedId === conv.id ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`truncate text-sm font-medium ${selectedId === conv.id ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>
                  {conv.title}
                </span>
              </div>
              <button 
                onClick={(e) => handleDelete(e, conv.id)}
                className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
