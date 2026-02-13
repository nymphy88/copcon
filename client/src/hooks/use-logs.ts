import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { Log } from "@shared/schema";

export function useLogs(conversationId: number | null) {
  return useQuery({
    queryKey: [api.logs.list.path.replace(':conversationId', String(conversationId || ''))],
    enabled: !!conversationId,
    queryFn: async () => {
      if (!conversationId) return [];
      const url = buildUrl(api.logs.list.path, { conversationId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch logs");
      return await res.json() as Log[];
    },
  });
}
