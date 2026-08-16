import { useEffect, useState } from "react";
import { useItems, useUpdateItemStatus, useDeleteItem } from "@/hooks/use-items";
import { useAuth } from "@/hooks/use-auth";
import { format, differenceInDays } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MoreVertical,
  CheckCircle,
  Archive,
  Trash2,
  Search,
  Loader2,
  Clock,
  Package,
  AlertCircle,
  Download,
  ShieldCheck,
  XCircle,
  UserCheck,
} from "lucide-react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Claim = {
  id: number;
  item_id: number;
  claimant_name: string | null;
  claimant_email: string | null;
  claimed_details: string | null;
  match_score: number | null;
  status: string | null;
  created_at: string | null;
  reviewed_at: string | null;
  reviewer: string | null;
  notes: string | null;
};

export default function Admin() {
  const { user, isLoading: userLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const [reviewingClaimId, setReviewingClaimId] = useState<number | null>(null);
  const [claimError, setClaimError] = useState("");

  const { data: items, isLoading: itemsLoading } = useItems(undefined, search);
  const updateStatus = useUpdateItemStatus();
  const deleteItem = useDeleteItem();

  // Redirect if not logged in or not an admin.
  if (!userLoading && (!user || user.isAdmin !== "true")) {
    setLocation(user ? "/" : "/auth");
    return null;
  }

  // Load claims for the admin.
  const loadClaims = async () => {
    try {
      setClaimsLoading(true);
      setClaimError("");

      const response = await fetch("/api/claims", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Could not load claims");
      }

      const data = await response.json();
      setClaims(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load claims:", error);
      setClaimError("Could not load pending claims.");
    } finally {
      setClaimsLoading(false);
    }
  };

  useEffect(() => {
    if (!userLoading && user?.isAdmin === "true") {
      loadClaims();
    }
  }, [userLoading, user]);

  if (userLoading || itemsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleStatusUpdate = (
    id: number,
    status: "retrieved" | "donated"
  ) => {
    updateStatus.mutate({ id, status });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this record?")) {
      deleteItem.mutate(id);
    }
  };

  const handleClaimReview = async (
    claimId: number,
    action: "accept" | "reject"
  ) => {
    const message =
      action === "accept"
        ? "Accept this claim and verify the claimant?"
        : "Reject this claim?";

    if (!confirm(message)) {
      return;
    }

    try {
      setReviewingClaimId(claimId);
      setClaimError("");

      const response = await fetch(`/api/claims/${claimId}/review`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          notes:
            action === "accept"
              ? "Claim verified by authorized staff."
              : "Claim rejected by authorized staff.",
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "Claim review failed");
      }

      // Refresh claims so the reviewed claim disappears from pending.
      await loadClaims();

      // Refresh the page so the item status is immediately reflected
      // everywhere in the admin dashboard.
      window.location.reload();
    } catch (error: any) {
      console.error("Claim review failed:", error);
      setClaimError(
        error?.message || "Could not review this claim. Please try again."
      );
    } finally {
      setReviewingClaimId(null);
    }
  };

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case "reported":
        return "secondary";
      case "retrieved":
        return "default";
      case "donated":
        return "outline";
      default:
        return "secondary";
    }
  };

  const filteredItems = items?.filter((item) => {
    if (activeTab === "all") return true;
    if (activeTab === "lost") return item.type === "lost";
    if (activeTab === "found") return item.type === "found";
    if (activeTab === "claimed") {
      return (
        item.status === "claimed" ||
        item.status === "retrieved" ||
        item.status === "verified" ||
        item.status === "resolved"
      );
    }
    if (activeTab === "over30") {
      const baseDate = new Date(
        item.dateReported ||
          item.dateLost ||
          item.dateFound ||
          new Date()
      );

      return (
        differenceInDays(new Date(), baseDate) > 30 &&
        item.status !== "claimed" &&
        item.status !== "retrieved" &&
        item.status !== "donated" &&
        item.status !== "verified" &&
        item.status !== "resolved"
      );
    }

    return true;
  });

  const exportToCSV = () => {
    if (!filteredItems || filteredItems.length === 0) return;

    const headers = [
      "ID",
      "Type",
      "Description",
      "Location",
      "Category",
      "Status",
      "Date Reported",
      "Contact Name",
      "Contact Email",
      "Claimed By",
    ];

    const rows = filteredItems.map((item) => [
      item.id,
      item.type,
      `"${item.description?.replace(/"/g, '""') || ""}"`,
      `"${item.location?.replace(/"/g, '""') || ""}"`,
      item.category || "",
      item.status,
      format(
        new Date(item.dateReported || new Date()),
        "yyyy-MM-dd HH:mm:ss"
      ),
      `"${item.contactName?.replace(/"/g, '""') || ""}"`,
      item.contactEmail || "",
      `"${item.claimedBy?.replace(/"/g, '""') || ""}"`,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `lost-box-export-${format(new Date(), "yyyy-MM-dd")}.csv`
    );

    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Pending claims only.
  const pendingClaims = claims.filter(
    (claim) =>
      claim.status === "pending" ||
      claim.status === "needs_review" ||
      claim.status === "pending_verification"
  );

  // Metrics calculation.
  const totalItems = items?.length || 0;
  const lostCount = items?.filter((i) => i.type === "lost").length || 0;
  const foundCount = items?.filter((i) => i.type === "found").length || 0;

  const claimedCount =
    items?.filter(
      (i) =>
        i.status === "claimed" ||
        i.status === "retrieved" ||
        i.status === "verified" ||
        i.status === "resolved"
    ).length || 0;

  const itemsOver30Days =
    items?.filter((i) => {
      const baseDate = new Date(
        i.dateReported ||
          i.dateLost ||
          i.dateFound ||
          new Date()
      );

      return (
        differenceInDays(new Date(), baseDate) > 30 &&
        i.status !== "claimed" &&
        i.status !== "retrieved" &&
        i.status !== "donated" &&
        i.status !== "verified" &&
        i.status !== "resolved"
      );
    }).length || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="mesh-gradient py-12 px-8 border-b border-primary-border relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10 pointer-events-none" />

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <Badge className="bg-secondary text-white border-none mb-4 px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-lg">
              Authorized Personnel Only
            </Badge>

            <h1 className="text-4xl md:text-5xl font-black text-white text-glow tracking-tighter mb-2">
              Command Center
            </h1>

            <p className="text-white/70 font-medium text-lg">
              Managing {items?.length || 0} reports in the system.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="w-5 h-5 absolute left-4 top-4 text-white/40 group-focus-within:text-white transition-colors" />

              <Input
                placeholder="Search database..."
                className="pl-12 h-14 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-2xl w-full md:w-80 backdrop-blur-md focus:bg-white focus:text-slate-900 focus:ring-4 focus:ring-white/20 transition-all text-lg font-medium"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Metrics */}
      <div className="max-w-7xl mx-auto px-8 relative z-20 -mt-8 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="bg-white/90 backdrop-blur border border-slate-100 shadow-xl p-5 rounded-[1.5rem] hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-slate-100 rounded-lg">
                <Package className="w-4 h-4 text-slate-500" />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Total
              </h3>
            </div>
            <p className="text-3xl font-black text-slate-800 tracking-tighter">
              {totalItems}
            </p>
          </Card>

          <Card className="bg-white/90 backdrop-blur border border-slate-100 shadow-xl p-5 rounded-[1.5rem] hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-rose-50 rounded-lg">
                <AlertCircle className="w-4 h-4 text-rose-500" />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Lost
              </h3>
            </div>
            <p className="text-3xl font-black text-slate-800 tracking-tighter">
              {lostCount}
            </p>
          </Card>

          <Card className="bg-white/90 backdrop-blur border border-slate-100 shadow-xl p-5 rounded-[1.5rem] hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Search className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Found
              </h3>
            </div>
            <p className="text-3xl font-black text-slate-800 tracking-tighter">
              {foundCount}
            </p>
          </Card>

          <Card className="bg-white/90 backdrop-blur border border-slate-100 shadow-xl p-5 rounded-[1.5rem] hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-emerald-50 rounded-lg">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Claimed
              </h3>
            </div>
            <p className="text-3xl font-black text-slate-800 tracking-tighter">
              {claimedCount}
            </p>
          </Card>

          <Card className="bg-white/90 backdrop-blur border border-slate-100 shadow-xl p-5 rounded-[1.5rem]">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-blue-50 rounded-lg">
                <ShieldCheck className="w-4 h-4 text-blue-500" />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Pending Claims
              </h3>
            </div>
            <p className="text-3xl font-black text-slate-800 tracking-tighter">
              {pendingClaims.length}
            </p>
          </Card>

          <Card className="bg-gradient-to-br from-rose-50 to-red-50 border border-rose-100 shadow-xl p-5 rounded-[1.5rem] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 opacity-[0.03] group-hover:opacity-10 transition-opacity">
              <Clock className="w-32 h-32 text-rose-600" />
            </div>

            <div className="relative z-10 flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-white/60 shadow-sm rounded-lg backdrop-blur-md">
                <Clock className="w-4 h-4 text-rose-600" />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-rose-500">
                &gt; 30 Days
              </h3>
            </div>

            <p className="relative z-10 text-3xl font-black text-rose-600 tracking-tighter">
              {itemsOver30Days}
            </p>
          </Card>
        </div>
      </div>

      {/* Pending Claims */}
      <div className="max-w-7xl mx-auto px-8 pb-6 relative z-20">
        <Card className="premium-card overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-xl">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                </div>

                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Pending Claims
                </h2>

                {pendingClaims.length > 0 && (
                  <Badge className="bg-blue-100 text-blue-700 border-none rounded-full">
                    {pendingClaims.length}
                  </Badge>
                )}
              </div>

              <p className="text-sm text-slate-400 font-medium mt-1 ml-12">
                Review claimant information before releasing a found item.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={loadClaims}
              disabled={claimsLoading}
              className="rounded-xl"
            >
              {claimsLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>

          {claimError && (
            <div className="mx-6 mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-600">
              {claimError}
            </div>
          )}

          {claimsLoading ? (
            <div className="h-40 flex items-center justify-center">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
            </div>
          ) : pendingClaims.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-slate-300">
              <UserCheck className="w-10 h-10 mb-3 opacity-30" />
              <p className="font-black uppercase tracking-[0.15em] text-xs">
                No pending claims
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 border-none">
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-5 px-6">
                      Claimant
                    </TableHead>

                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-5">
                      Item
                    </TableHead>

                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-5">
                      Claim Status
                    </TableHead>

                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-5">
                      Submitted
                    </TableHead>

                    <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-400 py-5 px-6">
                      Verification
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {pendingClaims.map((claim) => {
                    const claimedItem = items?.find(
                      (item) => item.id === claim.item_id
                    );

                    const isReviewing = reviewingClaimId === claim.id;

                    return (
                      <TableRow
                        key={claim.id}
                        className="border-slate-100 hover:bg-slate-50/70 transition-all"
                      >
                        <TableCell className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                              <UserCheck className="w-5 h-5 text-blue-600" />
                            </div>

                            <div className="flex flex-col">
                              <span className="font-black text-slate-800">
                                {claim.claimant_name || "Unknown claimant"}
                              </span>

                              <span className="text-xs font-medium text-slate-400">
                                {claim.claimant_email || "No email"}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-black text-slate-700">
                              {claimedItem?.description ||
                                `Item #${claim.item_id}`}
                            </span>

                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Ref #{claim.item_id}
                            </span>

                            {claimedItem?.location && (
                              <span className="text-xs text-slate-400 mt-1">
                                {claimedItem.location}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge className="bg-amber-100 text-amber-700 border-none rounded-xl px-3 py-1 font-black text-[10px] uppercase tracking-widest">
                            {claim.status || "pending"}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <span className="text-xs font-bold text-slate-500">
                            {claim.created_at
                              ? format(
                                  new Date(claim.created_at),
                                  "MMM d, yyyy h:mm a"
                                )
                              : "Unknown"}
                          </span>
                        </TableCell>

                        <TableCell className="text-right px-6">
                          <div className="flex justify-end gap-2">
                            <Button
                              onClick={() =>
                                handleClaimReview(claim.id, "reject")
                              }
                              disabled={isReviewing}
                              variant="outline"
                              className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-bold"
                            >
                              {isReviewing ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <XCircle className="w-4 h-4 mr-2" />
                              )}
                              Reject
                            </Button>

                            <Button
                              onClick={() =>
                                handleClaimReview(claim.id, "accept")
                              }
                              disabled={isReviewing}
                              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            >
                              {isReviewing ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4 mr-2" />
                              )}
                              Accept
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      {/* Existing Reports */}
      <div className="max-w-7xl mx-auto px-8 pb-8 relative z-20">
        <Card className="premium-card overflow-hidden min-h-[600px]">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
              <TabsList className="bg-slate-100/50 p-1 rounded-xl flex-wrap h-auto">
                <TabsTrigger
                  value="all"
                  className="rounded-lg px-5 py-2 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm"
                >
                  All Reports
                </TabsTrigger>

                <TabsTrigger
                  value="lost"
                  className="rounded-lg px-5 py-2 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm"
                >
                  Lost Reports
                </TabsTrigger>

                <TabsTrigger
                  value="found"
                  className="rounded-lg px-5 py-2 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm"
                >
                  Found Items
                </TabsTrigger>

                <TabsTrigger
                  value="claimed"
                  className="rounded-lg px-5 py-2 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm"
                >
                  Claimed
                </TabsTrigger>

                <TabsTrigger
                  value="over30"
                  className="rounded-lg px-5 py-2 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm"
                >
                  &gt;30 Days
                </TabsTrigger>
              </TabsList>

              <Button
                onClick={exportToCSV}
                variant="outline"
                className="rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50 transition-all text-xs"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>

            <div className="m-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-none">
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6 px-8">
                        Information
                      </TableHead>

                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6">
                        Origin
                      </TableHead>

                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6">
                        Staff
                      </TableHead>

                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6">
                        Status
                      </TableHead>

                      <TableHead className="text-right py-6 px-8 font-black text-[10px] uppercase tracking-widest text-slate-400">
                        Control
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredItems?.map((item) => (
                      <TableRow
                        key={item.id}
                        className="group hover:bg-slate-50/80 transition-all border-slate-100 h-24"
                      >
                        <TableCell className="px-8">
                          <div className="flex items-center gap-4">
                            <div
                              className={cn(
                                "w-2 h-10 rounded-full shrink-0",
                                item.type === "found"
                                  ? "bg-primary shadow-[0_0_10px_rgba(0,85,164,0.3)]"
                                  : "bg-secondary shadow-[0_0_10px_rgba(183,18,52,0.3)]"
                              )}
                            />

                            <div className="flex flex-col">
                              <span className="font-black text-slate-900 group-hover:text-primary transition-colors text-lg tracking-tight leading-none mb-1">
                                {item.description}
                              </span>

                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 py-0.5 rounded-md bg-slate-100">
                                  {item.type}
                                </span>

                                <span className="text-xs text-slate-400 font-bold">
                                  Ref: #{item.id}
                                </span>
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-700 mb-0.5 tracking-tight">
                              {item.location}
                            </span>

                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-widest">
                              <Clock className="w-2.5 h-2.5" />

                              {format(
                                new Date(item.dateReported),
                                "MMM d, h:mm a"
                              )}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <a
                            href={`mailto:${item.contactEmail}`}
                            className="flex flex-col group/email"
                          >
                            <span className="text-sm font-black text-slate-700 group-hover/email:text-primary transition-colors">
                              {item.contactName}
                            </span>

                            <span className="text-[10px] font-bold text-slate-400 group-hover/email:underline">
                              {item.contactEmail}
                            </span>
                          </a>
                        </TableCell>

                        <TableCell>
                          <Badge
                            className={cn(
                              "px-4 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm",
                              item.status === "retrieved"
                                ? "bg-emerald-500 text-white"
                                : item.status === "verified"
                                  ? "bg-blue-500 text-white"
                                  : item.status === "resolved"
                                    ? "bg-emerald-600 text-white"
                                    : item.status === "donated"
                                      ? "bg-amber-500 text-white"
                                      : item.status === "pending_verification"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-slate-200 text-slate-600"
                            )}
                          >
                            {item.status}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right px-8">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className="h-10 w-10 p-0 rounded-xl hover:bg-slate-200 transition-all"
                              >
                                <MoreVertical className="h-5 w-5 text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                              align="end"
                              className="rounded-2xl p-2 border-slate-200 shadow-2xl min-w-[180px]"
                            >
                              <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-3 py-2">
                                Workflow Actions
                              </div>

                              <DropdownMenuItem
                                onClick={() =>
                                  updateStatus.mutate({
                                    id: item.id,
                                    status: "retrieved",
                                    claimedBy: "Student",
                                  })
                                }
                                className="rounded-xl py-3 cursor-pointer focus:bg-emerald-50 focus:text-emerald-600 font-bold text-xs"
                              >
                                <CheckCircle className="mr-3 h-4 w-4" />
                                Confirm Reunion (Student)
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() =>
                                  updateStatus.mutate({
                                    id: item.id,
                                    status: "retrieved",
                                    claimedBy: "Faculty",
                                  })
                                }
                                className="rounded-xl py-3 cursor-pointer focus:bg-emerald-50 focus:text-emerald-600 font-bold text-xs"
                              >
                                <CheckCircle className="mr-3 h-4 w-4" />
                                Confirm Reunion (Faculty)
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() =>
                                  handleStatusUpdate(item.id, "donated")
                                }
                                className="rounded-xl py-3 cursor-pointer focus:bg-amber-50 focus:text-amber-600 font-bold text-xs"
                              >
                                <Archive className="mr-3 h-4 w-4" />
                                Record Donation
                              </DropdownMenuItem>

                              <div className="h-px bg-slate-100 my-2" />

                              <DropdownMenuItem
                                onClick={() => handleDelete(item.id)}
                                className="rounded-xl py-3 cursor-pointer focus:bg-rose-50 focus:text-rose-600 font-bold text-xs text-rose-500"
                              >
                                <Trash2 className="mr-3 h-4 w-4" />
                                Permanent Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}

                    {filteredItems?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-64 text-center">
                          <div className="flex flex-col items-center justify-center text-slate-300">
                            <Search className="w-12 h-12 mb-4 opacity-20" />
                            <p className="font-black uppercase tracking-[0.2em] text-xs">
                              No matching records found
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
