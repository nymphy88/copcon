import { useState } from "react";
import { Plus, Settings2, Trash2, Bot } from "lucide-react";
import { useAgents, useCreateAgent, useUpdateAgent, useDeleteAgent } from "@/hooks/use-agents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import type { InsertAgent, Agent } from "@shared/schema";

const PROVIDERS = ["openai", "anthropic", "gemini"];
const MODELS: Record<string, string[]> = {
  openai: ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
  anthropic: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
  gemini: ["gemini-pro", "gemini-1.5-pro"]
};

export function AgentConfig() {
  const { data: agents } = useAgents();
  const createMutation = useCreateAgent();
  const updateMutation = useUpdateAgent();
  const deleteMutation = useDeleteAgent();
  
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Partial<Agent> | null>(null);

  // Form state defaults
  const [formData, setFormData] = useState<Partial<InsertAgent>>({
    name: "",
    role: "",
    task: "",
    systemPrompt: "You are a helpful assistant.",
    provider: "openai",
    model: "gpt-4o",
    temperature: 70,
    inputScope: 2,
    color: "#3b82f6",
    isModerator: false
  });

  const resetForm = () => {
    setFormData({
      name: "",
      role: "",
      task: "",
      systemPrompt: "You are a helpful assistant.",
      provider: "openai",
      model: "gpt-4o",
      temperature: 70,
      inputScope: 2,
      color: "#3b82f6",
      isModerator: false
    });
    setEditingAgent(null);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.systemPrompt) return;
    
    // Ensure all required fields are present for InsertAgent
    const payload = {
      name: formData.name,
      role: formData.role || "",
      task: formData.task || "",
      systemPrompt: formData.systemPrompt,
      provider: formData.provider || "openai",
      model: formData.model || "gpt-4o",
      temperature: formData.temperature || 70,
      inputScope: formData.inputScope || 2,
      color: formData.color || "#3b82f6",
      isModerator: formData.isModerator || false
    } as InsertAgent;

    if (editingAgent?.id) {
      updateMutation.mutate({ id: editingAgent.id, ...payload }, {
        onSuccess: () => {
          setIsSheetOpen(false);
          resetForm();
        }
      });
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          setIsSheetOpen(false);
          resetForm();
        }
      });
    }
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      role: agent.role || "",
      task: agent.task || "",
      systemPrompt: agent.systemPrompt,
      provider: agent.provider,
      model: agent.model,
      temperature: agent.temperature || 70,
      inputScope: agent.inputScope || 2,
      maxTokens: agent.maxTokens || 1000,
      color: agent.color || "#3b82f6",
      isModerator: agent.isModerator || false
    });
    setIsSheetOpen(true);
  };

  return (
    <div className="w-80 border-l border-white/5 bg-black/20 flex flex-col h-full backdrop-blur-xl">
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h2 className="font-semibold text-lg tracking-tight">Agent Config</h2>
        <Sheet open={isSheetOpen} onOpenChange={(open) => { setIsSheetOpen(open); if(!open) resetForm(); }}>
          <SheetTrigger asChild>
            <Button size="sm" className="gap-2 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </SheetTrigger>
          <SheetContent className="border-l border-white/10 bg-card sm:max-w-md w-full">
            <SheetHeader className="mb-6">
              <SheetTitle>{editingAgent ? "Edit Agent" : "Create Agent"}</SheetTitle>
            </SheetHeader>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Logic Master" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Role / Identity</label>
                <Input 
                  value={formData.role} 
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  placeholder="e.g. Senior Architect, Security Auditor" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Specific Task</label>
                <Input 
                  value={formData.task} 
                  onChange={(e) => setFormData(prev => ({ ...prev, task: e.target.value }))}
                  placeholder="e.g. Analyze risks, Propose alternatives" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Input Scope (Last N Messages): {formData.inputScope}
                </label>
                <Slider 
                  value={[formData.inputScope || 2]} 
                  onValueChange={([val]) => setFormData(prev => ({ ...prev, inputScope: val }))}
                  min={1} max={10} step={1} 
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Max Output Tokens: {formData.maxTokens}
                </label>
                <Slider 
                  value={[formData.maxTokens || 1000]} 
                  onValueChange={([val]) => setFormData(prev => ({ ...prev, maxTokens: val }))}
                  min={100} max={4000} step={100} 
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Temperature: {formData.temperature}%
                </label>
                <Slider 
                  value={[formData.temperature || 70]} 
                  onValueChange={([val]) => setFormData(prev => ({ ...prev, temperature: val }))}
                  max={100} step={1} 
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="isMod" 
                    checked={formData.isModerator || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, isModerator: e.target.checked }))}
                    className="rounded border-white/20 bg-background/50"
                  />
                  <label htmlFor="isMod" className="text-sm">Is Moderator?</label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Provider</label>
                  <Select 
                    value={formData.provider} 
                    onValueChange={(val) => setFormData(prev => ({ ...prev, provider: val, model: MODELS[val][0] }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Model</label>
                  <Select 
                    value={formData.model} 
                    onValueChange={(val) => setFormData(prev => ({ ...prev, model: val }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MODELS[formData.provider || "openai"]?.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Temperature: {formData.temperature}%
                </label>
                <Slider 
                  value={[formData.temperature || 70]} 
                  onValueChange={([val]) => setFormData(prev => ({ ...prev, temperature: val }))}
                  max={100} step={1} 
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Color</label>
                <div className="flex gap-2">
                  {["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"].map(c => (
                    <button
                      key={c}
                      onClick={() => setFormData(prev => ({ ...prev, color: c }))}
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${formData.color === c ? "border-white" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">System Prompt</label>
                <Textarea 
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
                  className="h-32 text-sm font-mono leading-relaxed" 
                  placeholder="Define the persona and behavior..."
                />
              </div>

              <Button onClick={handleSubmit} className="w-full">
                {editingAgent ? "Save Changes" : "Create Agent"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {agents?.length === 0 && (
            <div className="text-center text-muted-foreground py-8 text-sm">
              No agents configured.
              <br />Add one to start orchestrating!
            </div>
          )}
          {agents?.map((agent) => (
            <div 
              key={agent.id} 
              className="group bg-card/40 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors relative"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: agent.color || "#3b82f6" }}>
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{agent.name}</h3>
                    <p className="text-[10px] text-primary/80 font-medium">{agent.role}</p>
                    <p className="text-xs text-muted-foreground font-mono">{agent.model}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(agent)}>
                    <Settings2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(agent.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              
              <div className="flex gap-2 mb-3">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-background/50 border-white/10">
                  {agent.provider}
                </Badge>
                {agent.isModerator && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                    MODERATOR
                  </Badge>
                )}
                <span className="text-[10px] text-muted-foreground ml-auto self-center">
                  Temp: {agent.temperature}%
                </span>
              </div>
              
              <p className="text-xs text-muted-foreground line-clamp-2 bg-background/30 p-2 rounded border border-white/5 font-mono">
                {agent.systemPrompt}
              </p>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
