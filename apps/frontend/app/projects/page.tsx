"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Protected } from "@/components/protected";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { api, ApiError } from "@/lib/api";
import type { Project } from "@/lib/types";

function ProjectsList() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.listProjects().then(({ projects }) => setProjects(projects));
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { createdProject } = await api.createProject(name, description);
      router.push(`/projects/${createdProject.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">
            Projects
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Group your dataset generation runs by project.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>New project</Button>
      </div>

      {projects === null && (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 animate-shimmer rounded-lg" />
          ))}
        </div>
      )}

      {projects?.length === 0 && (
        <Card className="mt-8 flex flex-col items-center justify-center gap-3 border-dashed py-16 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            No projects yet. Create one to start generating images.
          </p>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            New project
          </Button>
        </Card>
      )}

      {projects && projects.length > 0 && (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="group cursor-pointer p-5 transition-colors hover:border-[var(--color-border-strong)]"
              onClick={() => router.push(`/projects/${project.id}`)}
            >
              <h3 className="truncate font-medium text-[var(--color-text)] group-hover:text-[var(--color-accent)]">
                {project.name}
              </h3>
              <p className="mt-1.5 line-clamp-2 text-sm text-[var(--color-text-muted)]">
                {project.description || "No description"}
              </p>
              <p className="mt-4 text-xs text-[var(--color-text-faint)]">
                {project._count?.batches ?? 0} batch
                {project._count?.batches === 1 ? "" : "es"}
              </p>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New project">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Warehouse defects"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this dataset for?"
            />
          </div>
          {error && (
            <p className="rounded-md bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Create project
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export default function ProjectsPage() {
  return (
    <Protected>
      <ProjectsList />
    </Protected>
  );
}
