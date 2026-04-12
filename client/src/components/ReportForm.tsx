import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertItemSchema, LOCATIONS, CATEGORIES, type InsertItem } from "@shared/schema";
import { useCreateItem, useItems } from "@/hooks/use-items";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CalendarIcon, Image as ImageIcon, AlertCircle } from "lucide-react";
import { z } from "zod";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useUpload } from "@/hooks/use-upload";
import { motion } from "framer-motion";

interface ReportFormProps {
  type: "lost" | "found";
}

// Extend schema for frontend validation
const formSchema = insertItemSchema;

export function ReportForm({ type }: ReportFormProps) {
  const { mutate, isPending } = useCreateItem();
  const { uploadFile, isUploading } = useUpload();
  const [, setLocation] = useLocation();
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const oppositeType = type === "lost" ? "found" : "lost";
  const { data: oppositeItems = [] } = useItems(oppositeType);

  const form = useForm<InsertItem>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type,
      description: "",
      category: "",
      location: "",
      contactName: "",
      contactEmail: "",
      imageUrl: "",
      dateLost: null,
      dateFound: null,
    },
  });

  const watchDesc = form.watch("description");
  
  const potentialMatches = oppositeItems.filter((item) => {
    if (item.status !== "reported") return false;
    if (!watchDesc || watchDesc.length < 3) return false;
    
    // Split on non-alphanumeric and keep words > 2 chars
    const searchWords = watchDesc.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
    const itemDesc = item.description.toLowerCase();
    
    // basic text matching: true if any significant word from search string appears in item description
    return searchWords.some((word) => itemDesc.includes(word));
  });

  const onSubmit = (data: InsertItem) => {
    mutate(data, {
      onSuccess: () => {
        form.reset();
        setLocation("/");
      }
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const response = await uploadFile(file);
      if (response) {
        form.setValue("imageUrl", response.objectPath);
      }
    }
  };

  return (
    <Card className="max-w-2xl mx-auto glass border-white/40 shadow-2xl rounded-2xl overflow-hidden mb-8">
      <div className="mesh-gradient h-16 flex items-center justify-center relative">
        <div className="absolute inset-0 bg-black/10"></div>
        <CardTitle className="text-xl font-black text-white relative z-10 text-glow tracking-tighter uppercase mb-0">
          Report {type === "lost" ? "Lost" : "Found"} Item
        </CardTitle>
      </div>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-[10px] font-black uppercase tracking-wider text-slate-400">Description</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Blue Hydro Flask, Calculus Textbook..." {...field} className="h-10 rounded-lg border-slate-200 bg-slate-50/50 text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-wider text-slate-400">Location</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10 rounded-lg border-slate-200 bg-slate-50/50 text-sm">
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl border-slate-200 shadow-2xl">
                        {LOCATIONS.map((loc) => (
                          <SelectItem key={loc} value={loc} className="rounded-lg py-2 cursor-pointer text-sm">
                            {loc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-wider text-slate-400">Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10 rounded-lg border-slate-200 bg-slate-50/50 text-sm">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl border-slate-200 shadow-2xl">
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat} className="rounded-lg py-2 cursor-pointer text-sm">
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={type === "lost" ? "dateLost" : "dateFound"}
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-[10px] font-black uppercase tracking-wider text-slate-400">Date</FormLabel>
                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "h-10 w-full pl-3 text-left font-medium rounded-lg border-slate-200 bg-slate-50/50 text-sm",
                              !field.value && "text-slate-400"
                            )}
                          >
                            {field.value ? format(new Date(field.value), "PP") : "Select date"}
                            <CalendarIcon className="ml-auto h-4 w-4 text-primary/40" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-2xl border-slate-200 shadow-2xl" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => {
                            field.onChange(date?.toISOString());
                            setDatePickerOpen(false);
                          }}
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                          initialFocus
                          className="p-3"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-wider text-slate-400">Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Doe" {...field} className="h-10 rounded-lg border-slate-200 bg-slate-50/50 text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-wider text-slate-400">Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="student@bwscampus.com" {...field} className="h-10 rounded-lg border-slate-200 bg-slate-50/50 text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-wider text-slate-400">Photo Proof (Optional)</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <div className="relative group">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={isUploading}
                          className="h-12 cursor-pointer pt-3.5 pr-10 rounded-lg border-dashed border bg-slate-50/50 hover:bg-slate-100 transition-all text-center"
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 group-hover:text-primary transition-colors gap-2">
                          {isUploading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <ImageIcon className="w-4 h-4" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Upload Photo</span>
                            </>
                          )}
                        </div>
                      </div>
                      {field.value && (
                        <div className="relative aspect-video max-h-24 max-w-[200px] rounded-lg overflow-hidden border shadow-sm mx-auto">
                          <img src={field.value} alt="Preview" className="object-cover w-full h-full" />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-1 right-1 rounded-lg font-black text-[8px] uppercase h-5 px-2"
                            onClick={() => form.setValue("imageUrl", "")}
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {potentialMatches.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-start sm:items-center gap-2 text-amber-600 font-bold mb-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 sm:mt-0" />
                  Wait! Someone {type === "lost" ? "reported finding" : "reported losing"} similar items:
                </div>
                <div className="space-y-2">
                  {potentialMatches.slice(0, 3).map(match => (
                    <div key={match.id} className="bg-white p-3 rounded-lg border border-amber-100 flex flex-col sm:flex-row sm:items-center justify-between shadow-sm gap-3">
                      <div>
                        <p className="font-bold text-sm text-slate-800">{match.description}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mt-1">{match.location} • {format(new Date(match.dateReported || new Date()), "MMM d")}</p>
                      </div>
                      <a href={`mailto:${match.contactEmail}`} className="text-[11px] font-black uppercase tracking-widest text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-4 py-2 rounded-md text-center transition-colors border border-amber-200">
                        Contact {type === "lost" ? "Finder" : "Owner"}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-xs font-black uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 rounded-xl transition-all active:scale-[0.98]"
              disabled={isPending || isUploading}
            >
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Submit {type === "lost" ? "Lost" : "Found"} Report
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
