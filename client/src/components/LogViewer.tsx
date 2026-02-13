import { useLogs } from "@/hooks/use-logs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface LogViewerProps {
  conversationId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export function LogViewer({ conversationId, isOpen, onClose }: LogViewerProps) {
  const { data: logs, isLoading } = useLogs(conversationId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col bg-card border-white/10">
        <DialogHeader>
          <DialogTitle>Execution Logs</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto border border-white/10 rounded-md bg-black/20">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-white/5 sticky top-0 backdrop-blur-md">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-xs uppercase w-24">Time</TableHead>
                  <TableHead className="text-xs uppercase w-20">Agent ID</TableHead>
                  <TableHead className="text-xs uppercase text-right">Input Tokens</TableHead>
                  <TableHead className="text-xs uppercase text-right">Output Tokens</TableHead>
                  <TableHead className="text-xs uppercase text-right">Latency (ms)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No logs recorded yet.</TableCell>
                  </TableRow>
                ) : (
                  logs?.map((log) => (
                    <TableRow key={log.id} className="border-white/5 hover:bg-white/5">
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {log.timestamp ? format(new Date(log.timestamp), "HH:mm:ss") : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{log.agentId}</TableCell>
                      <TableCell className="font-mono text-xs text-right text-emerald-400">{log.inputTokens}</TableCell>
                      <TableCell className="font-mono text-xs text-right text-blue-400">{log.outputTokens}</TableCell>
                      <TableCell className="font-mono text-xs text-right text-amber-400">{log.latency}ms</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
