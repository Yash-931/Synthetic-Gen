import { cn } from "@/lib/cn";
import type { CompletionStatus } from "@/lib/types";

const statusStyles: Record<CompletionStatus, string> = {
  PENDING: "bg-[var(--color-pending-bg)] text-[var(--color-pending)]",
  COMPLETED: "bg-[var(--color-success-bg)] text-[var(--color-success)]",
  FAILURE: "bg-[var(--color-danger-bg)] text-[var(--color-danger)]",
};

const statusLabels: Record<CompletionStatus, string> = {
  PENDING: "Pending",
  COMPLETED: "Completed",
  FAILURE: "Failed",
};

export function StatusBadge({ status }: { status: CompletionStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        statusStyles[status],
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full bg-current",
          status === "PENDING" && "animate-pulse",
        )}
      />
      {statusLabels[status]}
    </span>
  );
}
