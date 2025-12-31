import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useUser() {
  return useQuery({
    queryKey: [api.user.me.path],
    queryFn: async () => {
      const res = await fetch(api.user.me.path, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401) return null;
        throw new Error('Failed to fetch user');
      }
      return api.user.me.responses[200].parse(await res.json());
    },
    retry: false,
  });
}
