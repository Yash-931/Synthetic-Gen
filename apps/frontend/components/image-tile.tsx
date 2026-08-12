import Image from "next/image";
import { StatusBadge } from "@/components/ui/badge";
import type { Item } from "@/lib/types";

export function ImageTile({ item }: { item: Item }) {
  const labelEntries = Object.entries(item.labels ?? {});

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="relative aspect-square bg-[var(--color-bg-subtle)]">
        {item.status === "COMPLETED" && item.gcp_url ? (
          <Image
            src={item.gcp_url}
            alt={item.prompt ?? "Generated image"}
            fill
            sizes="(min-width: 1024px) 25vw, 50vw"
            className="object-cover"
            unoptimized
          />
        ) : item.status === "FAILURE" ? (
          <div className="flex h-full w-full items-center justify-center text-[var(--color-danger)]">
            <span className="text-2xl">⚠</span>
          </div>
        ) : (
          <div className="h-full w-full animate-shimmer" />
        )}
        <div className="absolute left-2 top-2">
          <StatusBadge status={item.status} />
        </div>
      </div>
      {labelEntries.length > 0 && (
        <div className="flex flex-wrap gap-1 p-2.5">
          {labelEntries.map(([key, value]) => (
            <span
              key={key}
              className="rounded-full bg-[var(--color-bg-subtle)] px-2 py-0.5 text-[11px] text-[var(--color-text-muted)]"
            >
              {key}: {value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
