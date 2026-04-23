import { useQuery } from "@tanstack/react-query";

interface Stats {
    totalItems: number;
    lostItems: number;
    foundItems: number;
    claimedItems: number;
}

export function useStats() {
    return useQuery<Stats>({
        queryKey: ["/api/stats"],
    });
}
