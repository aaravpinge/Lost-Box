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

interface VerificationQuestion {
  q: string;
}

const isSchoolEmail = (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();

  return (
    normalizedEmail.endsWith("@bcchs.net") ||
    normalizedEmail.endsWith("@stu.birminghamcharter.com")
  );
};

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

  const [questions, setQuestions] = useState<VerificationQuestion[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);

  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (!isDialogOpen || !isFound) {
      return;
    }

    let cancelled = false;

    async function loadQuestions() {
      setIsLoadingQuestions(true);

      try {
        const response = await fetch(
          `/api/items/${item.id}/verification-questions`,
          {
            credentials: "omit",
            headers: {
              "bypass-tunnel-reminder": "true",
            },
          }
        );

        if (!response.ok) {
          if (!cancelled) {
            setQuestions([]);
            setAnswers([]);
          }
          return;
        }

        const data = await response.json();

        if (!cancelled) {
          const validQuestions: VerificationQuestion[] = Array.isArray(data)
            ? data
                .filter(
                  (question) =>
                    question &&
                    typeof question.q === "string" &&
                    question.q.trim().length > 0
                )
                .map((question) => ({
                  q: question.q.trim(),
                }))
            : [];

          setQuestions(validQuestions);
          setAnswers(new Array(validQuestions.length).fill(""));
        }
      } catch (error) {
        console.error("Failed to load verification questions:", error);

        if (!cancelled) {
          setQuestions([]);
          setAnswers([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingQuestions(false);
        }
      }
    }

    loadQuestions();

    return () => {
      cancelled = true;
    };
  }, [isDialogOpen, isFound, item.id]);

  const submitClaim = () => {
    const trimmedName = claimantName.trim();
    const trimmedEmail = claimantEmail.trim().toLowerCase();

    // Name is required.
    if (!trimmedName) {
      return;
    }

    // Email is required.
    if (!trimmedEmail) {
      return;
    }

    // Only allow Birmingham Community Charter school domains.
    if (!isSchoolEmail(trimmedEmail)) {
      return;
    }

    let claimAnswers: Array<{ q: string; a: string }> = [];

    if (questions.length > 0) {
      claimAnswers = questions.map((question, index) => ({
        q: question.q,
        a: (answers[index] || "").trim(),
      }));

      const answeredAtLeastOne = claimAnswers.some(
        (answer) => answer.a.length > 0
      );

      if (!answeredAtLeastOne) {
        return;
      }
    } else {
      const details = identifyingDetails.trim();

      if (!details) {
        return;
      }

      claimAnswers = [
        {
          q: "Identifying details",
          a: details,
        },
      ];
    }

    createClaim.mutate(
      {
        id: item.id,
        claimantName: trimmedName,
        claimantEmail: trimmedEmail,
        answers: claimAnswers,
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

  const resetClaimForm = () => {
    setClaimantName("");
    setClaimantEmail("");
    setIdentifyingDetails("");
    setQuestions([]);
    setAnswers([]);
  };

  const trimmedClaimantName = claimantName.trim();
  const trimmedClaimantEmail = claimantEmail.trim().toLowerCase();

  const nameIsValid = trimmedClaimantName.length > 0;
  const emailIsValid =
    trimmedClaimantEmail.length > 0 &&
    isSchoolEmail(trimmedClaimantEmail);

  const verificationIsValid =
    questions.length > 0
      ? answers.some((answer) => answer.trim().length > 0)
      : identifyingDetails.trim().length > 0;

  const canSubmitClaim =
    nameIsValid &&
    emailIsValid &&
    verificationIsValid &&
    !createClaim.isPending &&
    !isLoadingQuestions;

  return (
    <Card className="group overflow-hidden rounded-3xl border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {item.imageUrl ? (
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="h-full w-full cursor-zoom-in"
              >
                <img
                  src={item.imageUrl}
                  alt={item.description}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </button>
            </DialogTrigger>

            <DialogContent className="flex max-w-5xl items-center justify-center border-none bg-transparent p-0 shadow-none">
              <img
                src={item.imageUrl}
                alt={item.description}
                className="max-h-[85vh] w-full rounded-2xl object-contain drop-shadow-2xl"
              />
            </DialogContent>
          </Dialog>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center border-b bg-gradient-to-br from-slate-50 to-slate-100">
            <ImageOff className="mb-2 h-10 w-10 text-slate-200" />

            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">
              No Image Preview
            </span>
          </div>
        )}

        <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
          <Badge
            variant="outline"
            className="border-white/50 bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700 shadow-lg backdrop-blur-md"
          >
            {item.category || "Other"}
          </Badge>

          {isFound &&
            (item.status === "reported" ||
              item.status === "pending_verification") && (
              <div className="rounded-full border border-rose-200 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-rose-600 shadow-sm backdrop-blur-md">
                {daysLeft > 0 ? `${daysLeft} days left` : "Expired"}
              </div>
            )}
        </div>
      </div>

      <div className="p-6">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex items-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <Calendar className="mr-1.5 h-3 w-3 text-primary/40" />

            {format(new Date(baseDate), "MMMM d, yyyy")}
          </span>
        </div>

        <h3 className="mb-1 line-clamp-1 text-xl font-black leading-[1.2] text-slate-900 transition-colors group-hover:text-primary">
          {item.description}
        </h3>

        {item.additionalDetails && (
          <p className="mb-4 line-clamp-2 text-xs font-medium leading-relaxed text-slate-500">
            {item.additionalDetails}
          </p>
        )}

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border bg-slate-50">
              <MapPin className="h-4 w-4 text-primary" />
            </div>

            <div className="flex min-w-0 flex-col">
              <span className="mb-1 text-[10px] font-bold uppercase leading-none tracking-widest text-slate-400">
                Location
              </span>

              <span className="truncate text-sm font-bold text-slate-700">
                {item.location}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border bg-slate-50">
              <User className="h-4 w-4 text-secondary" />
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
              <span className="mb-1 text-[10px] font-bold uppercase leading-none tracking-widest text-slate-400">
                {item.status === "claimed" ? "Claimed By" : "Staff"}
              </span>

              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-bold text-slate-700">
                  {item.status === "claimed"
                    ? item.claimedBy || "Claimed"
                    : item.contactName}
                </span>

                {item.status !== "claimed" && item.contactEmail && (
                  <a
                    href={`mailto:${item.contactEmail}`}
                    className="rounded-lg bg-secondary/5 p-1.5 text-secondary transition-all hover:bg-secondary hover:text-white"
                    aria-label="Email contact"
                  >
                    <Mail className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CLAIM BUTTON */}
        {isFound &&
          (item.status === "reported" ||
            item.status === "pending_verification") && (
            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open);

                if (!open) {
                  resetClaimForm();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button
                  disabled={createClaim.isPending}
                  className="mt-6 h-12 w-full rounded-xl bg-primary text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-primary/20 transition-all duration-300 hover:bg-primary/90 hover:shadow-primary/40 active:scale-[0.98]"
                >
                  {createClaim.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}

                  Claim Item
                </Button>
              </DialogTrigger>

              <DialogContent className="rounded-2xl border-slate-200 bg-white shadow-2xl sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black text-slate-800">
                    Confirm Claim
                  </DialogTitle>

                  <DialogDescription className="text-sm font-medium text-slate-500">
                    Please provide your school information and verification
                    details to confirm that this item belongs to you.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <Input
                    className="rounded-xl border-slate-200 bg-slate-50/50 text-sm font-bold"
                    placeholder="Student or Staff Name"
                    value={claimantName}
                    onChange={(event) =>
                      setClaimantName(event.target.value)
                    }
                    required
                  />

                  <Input
                    type="email"
                    className="rounded-xl border-slate-200 bg-slate-50/50 text-sm font-bold"
                    placeholder="School Email"
                    value={claimantEmail}
                    onChange={(event) =>
                      setClaimantEmail(event.target.value)
                    }
                    required
                  />

                  {trimmedClaimantEmail.length > 0 &&
                    !isSchoolEmail(trimmedClaimantEmail) && (
                      <p className="text-xs font-medium text-red-600">
                        Please use your BCCHS school email
                        (@bcchs.net or @stu.birminghamcharter.com).
                      </p>
                    )}

                  {isLoadingQuestions ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading verification questions...
                    </div>
                  ) : questions.length > 0 ? (
                    <div className="space-y-4">
                      {questions.map((question, index) => (
                        <div key={`${question.q}-${index}`}>
                          <label className="mb-1.5 block text-xs font-bold text-slate-500">
                            {question.q}
                          </label>

                          <textarea
                            className="min-h-[80px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-medium outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                            placeholder="Your answer"
                            value={answers[index] || ""}
                            onChange={(event) => {
                              const updatedAnswers = [...answers];

                              updatedAnswers[index] =
                                event.target.value;

                              setAnswers(updatedAnswers);
                            }}
                          />
                        </div>
                      ))}

                      <p className="text-xs leading-relaxed text-slate-400">
                        Answer the questions above. Do not include passwords,
                        home addresses, SSNs, or other sensitive personal
                        information.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <textarea
                        className="min-h-[110px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-medium outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                        placeholder="Describe identifying details about the item. Do not include passwords, SSNs, or home addresses."
                        value={identifyingDetails}
                        onChange={(event) =>
                          setIdentifyingDetails(event.target.value)
                        }
                      />

                      <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-relaxed text-amber-700">
                        This is an older item that does not have verification
                        questions. Please provide identifying details that only
                        the owner would reasonably know.
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter className="gap-2 sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="rounded-xl border-slate-200 font-bold transition-all hover:bg-slate-50"
                  >
                    Cancel
                  </Button>

                  <Button
                    type="button"
                    onClick={submitClaim}
                    disabled={!canSubmitClaim}
                    className="rounded-xl bg-primary text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-primary/20 transition-all hover:-translate-y-0.5 hover:bg-primary/90 active:scale-95"
                  >
                    {createClaim.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
