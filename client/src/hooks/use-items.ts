import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import type { InsertItem } from "@shared/schema";

export function useItems(type?: 'lost' | 'found', search?: string) {
  return useQuery({
    queryKey: [api.items.list.path, type, search],
    queryFn: async () => {
      const url = buildUrl(api.items.list.path);
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (search) params.append('search', search);
      
      const res = await fetch(`${url}?${params.toString()}`, { 
        credentials: "omit",
        headers: { "bypass-tunnel-reminder": "true" }
      });
      if (!res.ok) throw new Error('Failed to fetch items');
      return api.items.list.responses[200].parse(await res.json());
    },
  });
}

export function useItem(id: number) {
  return useQuery({
    queryKey: [api.items.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.items.get.path, { id });
      const res = await fetch(url, { 
        credentials: "omit",
        headers: { "bypass-tunnel-reminder": "true" }
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Failed to fetch item');
      return api.items.get.responses[200].parse(await res.json());
    },
    enabled: !!id
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: InsertItem) => {
      const validated = api.items.create.input.parse(data);
      const url = buildUrl(api.items.create.path);
      const res = await fetch(url, {
        method: api.items.create.method,
        headers: { 
          'Content-Type': 'application/json',
          'bypass-tunnel-reminder': 'true'
        },
        body: JSON.stringify(validated),
        credentials: "omit",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.items.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error('Failed to create item');
      }
      return api.items.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.items.list.path] });
      toast({
        title: "Report Submitted",
        description: "Your item has been successfully reported.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
}

export function useUpdateItemStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status, claimedBy }: { id: number, status: 'reported' | 'retrieved' | 'donated' | 'claimed', claimedBy?: string }) => {
      const url = buildUrl(api.items.updateStatus.path, { id });
      const res = await fetch(url, {
        method: api.items.updateStatus.method,
        headers: { 
          'Content-Type': 'application/json',
          'bypass-tunnel-reminder': 'true'
        },
        body: JSON.stringify({ status, claimedBy }),
        credentials: "include",
      });

      if (!res.ok) throw new Error('Failed to update status');
      return api.items.updateStatus.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.items.list.path] });
      toast({
        title: "Status Updated",
        description: "Item status has been changed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Could not update item status.",
        variant: "destructive",
      });
    }
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.items.delete.path, { id });
      const res = await fetch(url, { 
        method: api.items.delete.method,
        credentials: "include",
        headers: { "bypass-tunnel-reminder": "true" }
      });
      if (!res.ok) throw new Error('Failed to delete item');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.items.list.path] });
      toast({
        title: "Item Deleted",
        description: "The report has been removed.",
      });
    },
  });
}
