"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Protected } from "@/components/protected";
import { Card } from "@/components/ui/card";
import { GenerateForm } from "@/components/generate-form";
import { api } from "@/lib/api";
import type { Batch, Project } from "@/lib/types";

function ProjectDetail({ id }: { id: string }) {
  const router = useRouter();
  const [project, setProject] = useState<(Project & { batches: Batch[] }) | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(() => {
    api
      .getProject(id)
      .then(({ project }) => setProject(project))
      .catch(() => setNotFound(true));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (notFound) {
    return (
      <div className="text-center text-sm text-[var(--color-text-muted)]">
        Project not found.{" "}
        <Link href="/projects" className="text-[var(--color-accent)] hover:underline">
          Back to projects
        </Link>
      </div>
    );
  }

  if (!project) {
    return <div className="h-40 animate-shimmer rounded-lg" />;
  }

  return (
    <div className="animate-fade-in">
      <button
        onClick={() => router.push("/projects")}
        className="text-sm text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)]"
      >
        ← Projects
      </button>

      <div className="mt-3">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">
          {project.name}
        </h1>
        {project.description && (
          <p className="mt-1.5 max-w-2xl text-sm text-[var(--color-text-muted)]">
            {project.description}
          </p>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-5">
        <Card className="p-6 lg:col-span-2 lg:sticky lg:top-20 lg:self-start">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Generate a batch</h2>
          <p className="mt-1 text-xs text-[var(--color-text-faint)]">
            Define a prompt template and variable values to fan out image generation.
          </p>
          <div className="mt-5">
            <GenerateForm projectId={project.id} />
          </div>
        </Card>

        <div className="lg:col-span-3">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Batches</h2>

          {project.batches.length === 0 && (
            <Card className="mt-3 border-dashed p-8 text-center">
              <p className="text-sm text-[var(--color-text-muted)]">
                No batches yet. Generate your first one.
              </p>
            </Card>
          )}

          <div className="mt-3 space-y-3">
            {project.batches.map((batch) => (
              <Card
                key={batch.id}
                className="group cursor-pointer p-4 transition-colors hover:border-[var(--color-border-strong)]"
                onClick={() => router.push(`/projects/${project.id}/batches/${batch.id}`)}
              >
                <p className="line-clamp-2 text-sm text-[var(--color-text)] group-hover:text-[var(--color-accent)]">
                  {batch.base_prompt}
                </p>
                <div className="mt-2 flex items-center gap-3 text-xs text-[var(--color-text-faint)]">
                  <span>
                    {batch._count?.items ?? 0} item{batch._count?.items === 1 ? "" : "s"}
                  </span>
                  {Object.keys(batch.variables ?? {}).length > 0 && (
                    <span>· {Object.keys(batch.variables).length} variable(s)</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <Protected>
      <ProjectDetail id={id} />
    </Protected>
  );
}
