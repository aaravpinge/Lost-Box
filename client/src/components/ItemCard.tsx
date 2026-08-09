import { useState, useEffect } from "react";
import { format, differenceInDays, addDays } from "date-fns";
import { Item } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Calendar,
  Mail,
  ImageOff,
  CheckCircle2,
  Loader2,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCreateClaim } from "@/hooks/use-items";

interface ItemCardProps {
  item: Item;
  showAdminControls?: boolean;
}

export function ItemCard({ item, showAdminControls }: ItemCardProps) {
  const isFound = item.type === "found";
  const baseDate = isFound
    ? item.dateFound || item.dateReported
    : item.dateLost || item.dateReported;
  const deadline = addDays(new Date(baseDate), 30);
  const daysLeft = differenceInDays(deadline, new Date());
  const createClaim = useCreateClaim();

  const [claimantName, setClaimantName] = useState("");
  const [claimantEmail, setClaimantEmail] = useState("");
  const [identifyingDetails, setIdentifyingDetails] = useState("");
  const [questions, setQuestions] = useState<Array<{ q: string }>>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!isDialogOpen) return;

    (async () => {
      setIsLoadingQuestions(true);

      try {
        const res = await fetch(
          `/api/items/${item.id}/verification-questions`,
          {
            credentials: "omit",
            headers: {
              "bypass-tunnel-reminder": "true",
            },
          }
        );

        if (res.ok) {
          const q = await res.json();

          if (!cancelled) {
            setQuestions(Array.isArray(q) ? q : []);
            setAnswers(
              Array.isArray(q) ? new Array(q.length).fill("") : []
            );
          }
        } else {
          if (!cancelled) {
            setQuestions([]);
            setAnswers([]);
          }
        }
      } catch {
        if (!cancelled) {
          setQuestions([]);
          setAnswers([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingQuestions(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isDialogOpen, item.id]);

  const submitClaim = () => {
    let payloadAnswers: Array<{ q: string; a: string }> = [];

    if (questions.length > 0) {
      for (let i = 0; i < questions.length; i++) {
        payloadAnswers.push({
          q: questions[i].q,
          a: (answers[i] || "").trim(),
        });
      }

      if (!payloadAnswers.some((a) => a.a.length > 0)) {
        return;
      }
    } else {
      if (!identifyingDetails.trim()) {
        return;
      }

      payloadAnswers = [
        {
          q: "claim",
          a: identifyingDetails.trim(),
        },
      ];
    }

    createClaim.mutate(
      {
        id: item.id,
        claimantName: claimantName.trim() || undefined,
        claimantEmail: claimantEmail.trim() || undefined,
        answers: payloadAnswers,
      },
      {
        onSuccess: () => {
          setIsDialogOpen(false);
          setClaimantName("");
          setClaimantEmail("");
          setIdentifyingDetails("");
          setQuestions([]);
          setAnswers([]);
        },
      }
    );
  };

  return (
    <Card className="group overflow-hidden">
      <div className="aspect-[2.2/1] w-full bg-slate-100 relative overflow-hidden">
        {item.imageUrl ? (
          <Dialog>
            <DialogTrigger asChild>
              <img
                src={item.imageUrl}
                alt={item.description}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 cursor-zoom-in"
              />
            </DialogTrigger>

            <DialogContent className="max-w-5xl border-none bg-transparent shadow-none p-0 flex justify-center items-center">
              <img
                src={item.imageUrl}
                alt={item.description}
                className="w-full max-h-[85vh] object-contain drop-shadow-2xl rounded-2xl"
              />
            </DialogContent>
          </Dialog>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 border-b">
            <ImageOff className="w-10 h-10 mb-2 text-slate-200" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">
              No Image Preview
            </span>
          </div>
        )}

        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
          <Badge
            variant="outline"
            className="px-3 py-1 font-bold text-[10px] uppercase tracking-wider shadow-lg border-white/50 bg-white/80 backdrop-blur-md text-slate-700"
          >
            {item.category || "Other"}
          </Badge>

          {isFound && item.status === "reported" && (
            <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md bg-white/40 text-rose-600 border border-rose-200 shadow-sm transition-all group-hover:bg-rose-500 group-hover:text-white">
              {daysLeft > 0 ? `${daysLeft} days left` : "Expired"}
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] font-bold text-slate-400 flex items-center uppercase tracking-wider">
            <Calendar className="w-3 h-3 mr-1.5 text-primary/40" />
            {format(new Date(baseDate), "MMMM d, yyyy")}
          </span>
        </div>

        <h3 className="font-black text-xl mb-1 text-slate-900 group-hover:text-primary transition-colors line-clamp-1 leading-[1.2]">
          {item.description}
        </h3>

        {item.additionalDetails && (
          <p className="text-xs font-medium text-slate-500 mb-4 line-clamp-2 leading-relaxed">
            {item.additionalDetails}
          </p>
        )}

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-50 group-hover:bg-primary/5 flex items-center justify-center shrink-0 transition-colors border">
              <MapPin className="w-4 h-4 text-primary" />
            </div>

            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                Location
              </span>
              <span className="text-sm font-bold text-slate-700 truncate">
                {item.location}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-50 group-hover:bg-secondary/5 flex items-center justify-center shrink-0 transition-colors border">
              <User className="w-4 h-4 text-secondary" />
            </div>

            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                {item.status === "claimed" ? "Claimed By" : "Staff"}
              </span>

              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-700 truncate">
                  {item.status === "claimed"
                    ? item.claimedBy
                    : item.contactName}
                </span>

                {item.status !== "claimed" && (
                  <a
                    href={`mailto:${item.contactEmail}`}
                    className="p-1.5 rounded-lg bg-secondary/5 text-secondary hover:bg-secondary hover:text-white transition-all shadow-sm"
                  >
                    <Mail className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {isFound && item.status === "reported" && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                disabled={createClaim.isPending}
                className="w-full mt-6 h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-xl shadow-primary/20 hover:shadow-primary/40 border-none active:scale-[0.98]"
              >
                {createClaim.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Claim Item
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md rounded-2xl bg-white border-slate-200 shadow-2xl">
              <DialogHeader>
                <DialogTitle className="font-black text-xl text-slate-800">
                  Confirm Claim
                </DialogTitle>

                <DialogDescription className="font-medium text-slate-500 text-sm">
                  Please provide information to verify that this item belongs
                  to you.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-4">
                <Input
                  className="rounded-xl border-slate-200 bg-slate-50/50 text-sm font-bold"
                  placeholder="Student or Staff Name (optional)"
                  value={claimantName}
                  onChange={(e) => setClaimantName(e.target.value)}
                />

                <Input
                  className="rounded-xl border-slate-200 bg-slate-50/50 text-sm font-bold"
                  placeholder="Email (optional)"
                  value={claimantEmail}
                  onChange={(e) => setClaimantEmail(e.target.value)}
                />

                {isLoadingQuestions ? (
                  <div className="text-sm text-slate-500">
                    Loading verification questions…
                  </div>
                ) : questions.length > 0 ? (
                  <div className="space-y-2">
                    {questions.map((qObj, idx) => (
                      <div key={idx}>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">
                          {qObj.q}
                        </label>

                        <textarea
                          className="w-full rounded-xl border-slate-200 bg-slate-50/50 text-sm font-medium p-3 resize-none"
                          placeholder="Answer"
                          rows={2}
                          value={answers[idx] || ""}
                          onChange={(e) => {
                            const copy = answers.slice();
                            copy[idx] = e.target.value;
                            setAnswers(copy);
                          }}
                        />
                      </div>
                    ))}

                    <div className="text-xs text-slate-400">
                      Answer the questions above. Do NOT include passwords,
                      home addresses, SSNs, or other sensitive personal data.
                    </div>
                  </div>
                ) : (
                  <>
                    <textarea
                      className="w-full rounded-xl border-slate-200 bg-slate-50/50 text-sm font-medium p-3 resize-none"
                      placeholder="Enter identifying details. Do NOT include passwords, SSNs, or home addresses."
                      value={identifyingDetails}
                      onChange={(e) =>
                        setIdentifyingDetails(e.target.value)
                      }
                      rows={4}
                    />

                    <div className="text-xs text-slate-400">
                      No verification questions were provided for this item;
                      provide identifying details above.
                    </div>
                  </>
                )}
              </div>

              <DialogFooter className="sm:justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="rounded-xl font-bold hover:bg-slate-50 border-slate-200 transition-all"
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  onClick={submitClaim}
                  disabled={createClaim.isPending}
                  className="rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-xs transition-all hover:-translate-y-0.5 active:scale-95 shadow-xl shadow-primary/20"
                >
                  {createClaim.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Submit Claim
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </Card>
  );
}
