import { ReportForm } from "@/components/ReportForm";
import { motion } from "framer-motion";

export default function ReportFound() {
  return (
    <div className="min-h-screen bg-background py-16 px-4 md:py-24">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <ReportForm type="found" />
      </motion.div>
    </div>
  );
}
