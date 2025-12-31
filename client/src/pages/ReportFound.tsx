import { ReportForm } from "@/components/ReportForm";

export default function ReportFound() {
  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-10 animate-enter">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
          Report a Found Item
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Thank you for being a good citizen! Please provide details about the item you found so we can return it to its owner.
        </p>
      </div>
      
      <div className="animate-enter delay-100">
        <ReportForm type="found" />
      </div>
    </div>
  );
}
