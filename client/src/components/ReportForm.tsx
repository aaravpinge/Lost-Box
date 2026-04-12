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
  const [showSuccess, setShowSuccess] = useState(false);

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
    const searchWords = watchDesc.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
    const itemDesc = item.description.toLowerCase();
    return searchWords.some((word) => itemDesc.includes(word));
  });

  const onSubmit = (data: InsertItem) => {
    mutate(data, {
      onSuccess: () => {
        setShowSuccess(true);
        setTimeout(() => {
          form.reset();
          setLocation("/");
        }, 3000);
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

  const ConfettiCannon = () => {
    const particles = Array.from({ length: 50 });
    return (
      <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
        {particles.map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              top: "50%", 
              left: "50%", 
              scale: 0,
              rotate: 0 
            }}
            animate={{ 
              top: `${Math.random() * 100}%`, 
              left: `${Math.random() * 100}%`, 
              scale: [0, 1, 0.5],
              rotate: 360,
              opacity: [1, 1, 0]
            }}
            transition={{ 
              duration: 2 + Math.random() * 2,
              ease: "easeOut",
            }}
            className="absolute w-2 h-2 rounded-sm"
            style={{ 
              backgroundColor: ['#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#ffffff'][i % 5]
            }}
          />
        ))}
      </div>
    );
  };

  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-2xl">
        <ConfettiCannon />
        <motion.div 
          initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-dark p-12 rounded-[2.5rem] text-center shadow-[0_0_50px_rgba(255,255,255,0.1)] border-white/20 max-w-sm mx-4"
        >
          <div className="w-24 h-24 bg-primary rounded-full mx-auto mb-6 flex items-center justify-center shadow-[0_0_30px_rgba(100,100,250,0.5)] pulse-gold">
            <motion.div
              initial={{ rotate: -45, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Loader2 className="w-12 h-12 text-white animate-spin duration-[3000ms]" />
            </motion.div>
          </div>
          <h2 className="text-3xl font-black text-white mb-2 tracking-tighter uppercase italic text-glow">
            {type === "found" ? "Campus Hero!" : "Report Sent!"}
          </h2>
          <p className="text-slate-300 text-sm font-medium leading-relaxed">
            {type === "found" 
              ? "You're a legend! We're scanning for the owner right now. Redirecting you home..." 
              : "We've received your report. If anyone finds it, we'll email you immediately. Redirecting home..."}
          </p>
          <div className="flex gap-2 justify-center mt-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <motion.div
                key={i}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 * i, repeat: Infinity, repeatType: "reverse", duration: 1 }}
                className="w-2 h-2 rounded-full bg-primary/40"
              />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto glass border-white/20 shadow-2xl rounded-[2.5rem] overflow-hidden mb-8 ring-1 ring-white/10">
      <div className="mesh-gradient h-24 flex items-center justify-center relative border-b border-white/10">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="text-center relative z-10">
          <CardTitle className="text-3xl font-black text-white text-glow tracking-tighter uppercase italic leading-none mb-1">
            Report {type === "lost" ? "Lost" : "Found"} Item
          </CardTitle>
          <CardDescription className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em]">
            BWS Lost & Found System
          </CardDescription>
        </div>
      </div>
      <CardContent className="p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <div className="flex justify-between items-end mb-2">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">What did you {type}?</FormLabel>
                      {watchDesc && watchDesc.length >= 3 && (
                        <motion.span 
                          initial={{ opacity: 0 }} 
                          animate={{ opacity: 1 }}
                          className="text-[9px] font-black text-primary uppercase tracking-tighter flex items-center gap-1.5"
                        >
                          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
                          Intelligent Scanning...
                        </motion.span>
                      )}
                    </div>
                    <FormControl>
                      <Input placeholder="e.g. Blue Hydro Flask, Calculus Textbook..." {...field} className="h-12 rounded-xl border-white/10 bg-white/5 text-sm focus:bg-white/10 transition-all placeholder:text-slate-600 border shadow-inner" />
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
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Location</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 rounded-xl border-white/10 bg-white/5 text-sm">
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-2xl border-white/10 shadow-2xl glass-dark">
                        {LOCATIONS.map((loc) => (
                          <SelectItem key={loc} value={loc} className="rounded-lg py-2 cursor-pointer text-sm text-slate-200 focus:bg-primary/20">
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
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 rounded-xl border-white/10 bg-white/5 text-sm">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-2xl border-white/10 shadow-2xl glass-dark">
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat} className="rounded-lg py-2 cursor-pointer text-sm text-slate-200 focus:bg-primary/20">
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
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date Reported</FormLabel>
                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "h-12 w-full pl-3 text-left font-medium rounded-xl border-white/10 bg-white/5 text-sm",
                              !field.value && "text-slate-500"
                            )}
                          >
                            {field.value ? format(new Date(field.value), "PP") : "Select date"}
                            <CalendarIcon className="ml-auto h-4 w-4 text-primary/40" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-2xl border-white/10 shadow-2xl" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => {
                            field.onChange(date?.toISOString());
                            setDatePickerOpen(false);
                          }}
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                          initialFocus
                          className="glass-dark border-transparent rounded-2xl"
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
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Doe" {...field} className="h-12 rounded-xl border-white/10 bg-white/5 text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Official Campus Email (@bwscampus.com)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="student@bwscampus.com" {...field} className="h-12 rounded-xl border-white/10 bg-white/5 text-sm" />
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
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Photo Proof (Optional)</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      <div className="relative group overflow-hidden rounded-xl">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={isUploading}
                          className="h-16 cursor-pointer opacity-0 absolute inset-0 z-20"
                        />
                        <div className="h-16 flex items-center justify-center border-dashed border-2 border-white/10 bg-white/5 group-hover:bg-white/10 transition-all gap-3 rounded-xl border-spacing-4">
                          {isUploading ? (
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                          ) : (
                            <>
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                <ImageIcon className="w-4 h-4 text-primary" />
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Drop or Click to Upload</span>
                            </>
                          )}
                        </div>
                      </div>
                      {field.value && (
                        <div className="relative aspect-video max-h-32 rounded-2xl overflow-hidden border border-white/20 shadow-xl group">
                          <img src={field.value} alt="Preview" className="object-cover w-full h-full" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="rounded-full px-4 font-black text-[10px] uppercase h-8"
                              onClick={() => form.setValue("imageUrl", "")}
                            >
                              Replace Photo
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {potentialMatches.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-primary/5 border border-primary/20 rounded-2xl p-6 shadow-sm ring-1 ring-primary/10 overflow-hidden relative"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -z-10"></div>
                <div className="flex items-center gap-3 text-primary font-black uppercase tracking-tighter text-sm mb-4">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <AlertCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                  System Match Detected!
                </div>
                <div className="space-y-3">
                  {potentialMatches.slice(0, 2).map(match => (
                    <div key={match.id} className="glass p-4 rounded-xl flex items-center justify-between gap-4 border-white/10">
                      <div className="flex items-center gap-3">
                        {match.imageUrl ? (
                           <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/20 shadow-sm shrink-0">
                             <img src={match.imageUrl} className="w-full h-full object-cover" />
                           </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                            <AlertCircle className="w-4 h-4 text-white/20" />
                          </div>
                        )}
                        <div>
                          <p className="font-black text-[11px] text-white uppercase tracking-tight">{match.description}</p>
                          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">{match.location}</p>
                        </div>
                      </div>
                      <a href={`mailto:${match.contactEmail}`} className="text-[9px] font-black uppercase tracking-[0.2em] text-white bg-primary hover:bg-primary/80 px-4 py-2.5 rounded-lg shadow-lg shadow-primary/20 transition-all border border-white/10 active:scale-95">
                        Contact
                      </a>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            <Button
              type="submit"
              className="w-full h-14 text-xs font-black uppercase tracking-[0.2em] bg-primary hover:bg-primary/90 shadow-[0_0_30px_rgba(37,99,235,0.3)] rounded-2xl transition-all active:scale-[0.97] border border-white/10"
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

