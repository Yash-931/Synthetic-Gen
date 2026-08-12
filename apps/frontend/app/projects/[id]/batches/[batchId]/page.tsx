"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Protected } from "@/components/protected";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ImageTile } from "@/components/image-tile";
import { api } from "@/lib/api";
import type { Batch, BatchCounts, Item } from "@/lib/types";

const POLL_INTERVAL_MS = 3000;

function BatchDetail({ projectId, batchId }: { projectId: string; batchId: string }) {
  const router = useRouter();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [counts, setCounts] = useState<BatchCounts | null>(null);
  const [notFound, setNotFound] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const { batch, items, counts } = await api.getBatch(batchId);
      setBatch(batch);
      setItems(items);
      setCounts(counts);

      if (counts.pending > 0) {
        timerRef.current = setTimeout(load, POLL_INTERVAL_MS);
      }
    } catch {
      setNotFound(true);
    }
  }, [batchId]);

  useEffect(() => {
    load();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [load]);

  if (notFound) {
    return (
      <div className="text-center text-sm text-[var(--color-text-muted)]">Batch not found.</div>
    );
  }

  if (!batch || !counts) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="aspect-square animate-shimmer rounded-lg" />
        ))}
      </div>
    );
  }

  const progressPct = counts.total ? ((counts.completed + counts.failed) / counts.total) * 100 : 0;
  const isDone = counts.pending === 0;

  return (
    <div className="animate-fade-in">
      <button
        onClick={() => router.push(`/projects/${projectId}`)}
        className="text-sm text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)]"
      >
        ← Project
      </button>

      <div className="mt-3">
        <h1 className="max-w-3xl text-lg font-medium text-[var(--color-text)]">
          {batch.base_prompt}
        </h1>
        {Object.keys(batch.variables ?? {}).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.entries(batch.variables).map(([key, values]) => (
              <span
                key={key}
                className="rounded-full border border-[var(--color-border)] px-2.5 py-0.5 text-xs text-[var(--color-text-muted)]"
              >
                {key} · {values.length}
              </span>
            ))}
          </div>
        )}
      </div>

      <Card className="mt-6 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-[var(--color-text)]">
            {isDone ? "Generation complete" : "Generating…"}
          </span>
          <span className="text-[var(--color-text-muted)]">
            {counts.completed + counts.failed} / {counts.total}
            {counts.failed > 0 && (
              <span className="ml-2 text-[var(--color-danger)]">{counts.failed} failed</span>
            )}
          </span>
        </div>
        <div className="mt-3">
          <Progress value={progressPct} />
        </div>
      </Card>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <ImageTile key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

export default function BatchPage() {
  const { id, batchId } = useParams<{ id: string; batchId: string }>();
  return (
    <Protected>
      <BatchDetail projectId={id} batchId={batchId} />
    </Protected>
  );
}
