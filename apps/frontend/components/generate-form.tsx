"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";

const MAX_PERMUTATIONS = 500;

function extractVariables(prompt: string): string[] {
  const matches = [...prompt.matchAll(/\{([^}]+)\}/g)];
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const match of matches) {
    const key = match[1]!;
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  }
  return keys;
}

export function GenerateForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [basePrompt, setBasePrompt] = useState("");
  const [varInputs, setVarInputs] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const variableKeys = useMemo(() => extractVariables(basePrompt), [basePrompt]);

  const parsedValues = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const key of variableKeys) {
      map[key] = (varInputs[key] ?? "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    }
    return map;
  }, [variableKeys, varInputs]);

  const totalPermutations = variableKeys.length
    ? variableKeys.reduce((acc, key) => acc * (parsedValues[key]?.length || 0), 1)
    : basePrompt.trim()
      ? 1
      : 0;

  const missingValues = variableKeys.filter((key) => (parsedValues[key]?.length ?? 0) === 0);
  const overLimit = totalPermutations > MAX_PERMUTATIONS;
  const canSubmit =
    basePrompt.trim().length > 0 &&
    missingValues.length === 0 &&
    !overLimit &&
    totalPermutations > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const { batchId } = await api.generateDataset(projectId, basePrompt, parsedValues);
      router.push(`/projects/${projectId}/batches/${batchId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label htmlFor="base_prompt">Prompt template</Label>
        <Textarea
          id="base_prompt"
          rows={3}
          value={basePrompt}
          onChange={(e) => setBasePrompt(e.target.value)}
          placeholder="A high-resolution photo of a {animal} standing in a {setting}, natural light"
        />
        <p className="mt-1.5 text-xs text-[var(--color-text-faint)]">
          Wrap words in curly braces, like <code>{"{animal}"}</code>, to turn them into
          variables.
        </p>
      </div>

      {variableKeys.length > 0 && (
        <div className="space-y-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-4">
          {variableKeys.map((key) => (
            <div key={key}>
              <Label htmlFor={`var-${key}`}>{key}</Label>
              <Input
                id={`var-${key}`}
                value={varInputs[key] ?? ""}
                onChange={(e) =>
                  setVarInputs((prev) => ({ ...prev, [key]: e.target.value }))
                }
                placeholder="fox, deer, wolf"
              />
            </div>
          ))}
          <p className="text-xs text-[var(--color-text-faint)]">
            Comma-separate multiple values per variable.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between rounded-md bg-[var(--color-bg-subtle)] px-4 py-3 text-sm">
        <span className="text-[var(--color-text-muted)]">
          Will generate{" "}
          <span className="font-medium text-[var(--color-text)]">
            {totalPermutations} image{totalPermutations === 1 ? "" : "s"}
          </span>
        </span>
        {overLimit && (
          <span className="text-[var(--color-danger)]">Max {MAX_PERMUTATIONS} per batch</span>
        )}
      </div>

      {error && (
        <p className="rounded-md bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" loading={submitting} disabled={!canSubmit}>
        Generate images
      </Button>
    </form>
  );
}
