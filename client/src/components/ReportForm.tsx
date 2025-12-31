import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertItemSchema, LOCATIONS, type InsertItem } from "@shared/schema";
import { useCreateItem } from "@/hooks/use-items";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Upload } from "lucide-react";
import { z } from "zod";

interface ReportFormProps {
  type: "lost" | "found";
}

// Extend schema for frontend validation
const formSchema = insertItemSchema.extend({
  imageUrl: z.string().optional(),
});

export function ReportForm({ type }: ReportFormProps) {
  const { mutate, isPending } = useCreateItem();
  
  const form = useForm<InsertItem>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type,
      description: "",
      location: "",
      contactName: "",
      contactEmail: "",
      imageUrl: "",
    },
  });

  const onSubmit = (data: InsertItem) => {
    mutate(data, {
      onSuccess: () => {
        form.reset();
      }
    });
  };

  return (
    <Card className="max-w-2xl mx-auto border-none shadow-xl shadow-black/5 bg-white/80 backdrop-blur-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-display text-primary">
          Report {type === "lost" ? "Lost" : "Found"} Item
        </CardTitle>
        <CardDescription>
          Please provide details to help us {type === "lost" ? "locate your item" : "return this item to its owner"}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What is the item?</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Blue Hydro Flask, Calculus Textbook..." {...field} className="h-12" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location {type === "lost" ? "Last Seen" : "Found"}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LOCATIONS.map((loc) => (
                          <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Doe" {...field} className="h-12" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="jane@school.edu" {...field} className="h-12" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL (Optional)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input placeholder="https://..." {...field} className="h-12 pl-10" />
                      <Upload className="w-4 h-4 absolute left-3 top-4 text-muted-foreground" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                `Submit ${type === "lost" ? "Lost" : "Found"} Report`
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
