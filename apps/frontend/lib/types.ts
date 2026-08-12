export type CompletionStatus = "PENDING" | "COMPLETED" | "FAILURE";

export interface User {
  id: string;
  email: string;
  credits: number;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string;
  _count?: { batches: number };
}

export interface Batch {
  id: string;
  project_id: string;
  status?: CompletionStatus;
  base_prompt: string;
  variables: Record<string, string[]>;
  _count?: { items: number };
}

export interface Item {
  id: string;
  batch_id: string;
  prompt: string | null;
  labels: Record<string, string>;
  gcp_url: string | null;
  status: CompletionStatus;
}

export interface BatchCounts {
  total: number;
  completed: number;
  failed: number;
  pending: number;
}
