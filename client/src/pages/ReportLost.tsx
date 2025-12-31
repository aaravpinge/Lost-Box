import { ReportForm } from "@/components/ReportForm";

export default function ReportLost() {
  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-10 animate-enter">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
          Report a Lost Item
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          We'll add your item to our tracking system. If it's found and turned in, we'll match it with your report.
        </p>
      </div>
      
      <div className="animate-enter delay-100">
        <ReportForm type="lost" />
      </div>
    </div>
  );
}
