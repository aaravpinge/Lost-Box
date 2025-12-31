import { useState } from "react";
import { useItems, useUpdateItemStatus, useDeleteItem } from "@/hooks/use-items";
import { useUser } from "@/hooks/use-user";
import { format } from "date-fns";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
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
  Filter
} from "lucide-react";
import { useLocation } from "wouter";

export default function Admin() {
  const { user, isLoading: userLoading } = useUser();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const { data: items, isLoading: itemsLoading } = useItems(undefined, search);
  const updateStatus = useUpdateItemStatus();
  const deleteItem = useDeleteItem();

  // Redirect if not logged in
  if (!userLoading && !user) {
    window.location.href = "/api/login";
    return null;
  }

  if (userLoading || itemsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleStatusUpdate = (id: number, status: 'retrieved' | 'donated') => {
    updateStatus.mutate({ id, status });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this record?")) {
      deleteItem.mutate(id);
    }
  };

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case 'reported': return 'secondary';
      case 'retrieved': return 'default'; // Using default for success-like green in our theme
      case 'donated': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage lost and found items, track status, and donations.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input 
                placeholder="Search items..." 
                className="pl-9 bg-white w-64"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <Tabs defaultValue="all" className="w-full">
            <div className="p-4 border-b bg-muted/10">
              <TabsList>
                <TabsTrigger value="all">All Items</TabsTrigger>
                <TabsTrigger value="lost">Lost Reports</TabsTrigger>
                <TabsTrigger value="found">Found Items</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="m-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Date Reported</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {item.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{item.description}</TableCell>
                      <TableCell>{item.location}</TableCell>
                      <TableCell>{format(new Date(item.dateReported), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          <span>{item.contactName}</span>
                          <span className="text-muted-foreground text-xs">{item.contactEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(item.status) as any}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleStatusUpdate(item.id, 'retrieved')}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Mark Retrieved
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusUpdate(item.id, 'donated')}>
                              <Archive className="mr-2 h-4 w-4" />
                              Mark Donated
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(item.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Record
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {items?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        No items found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
            {/* Can replicate content for other tabs filtered by type if needed, 
                or just filter the `items` array above based on active tab state */}
          </Tabs>
        </div>
      </div>
    </div>
  );
}
