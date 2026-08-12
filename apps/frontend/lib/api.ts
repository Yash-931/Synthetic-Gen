import type { Batch, BatchCounts, Item, Project, User } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";
const TOKEN_KEY = "syntheticgen_token";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("authorization", token);

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(body.message ?? "Request failed", res.status);
  }
  return body as T;
}

export const api = {
  signup: (email: string, password: string) =>
    request<{ message: string; user: User }>("/users/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  signin: (email: string, password: string) =>
    request<{ message: string; token: string }>("/users/signin", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<{ user: User }>("/users/me"),

  listProjects: () => request<{ projects: Project[] }>("/project"),

  getProject: (id: string) =>
    request<{ project: Project & { batches: Batch[] } }>(`/project/${id}`),

  createProject: (name: string, description: string) =>
    request<{ message: string; createdProject: Project }>("/project/create", {
      method: "POST",
      body: JSON.stringify({ name, description }),
    }),

  generateDataset: (
    project_id: string,
    base_prompt: string,
    variables: Record<string, string[]>,
  ) =>
    request<{ batchId: string }>("/dataset/generate", {
      method: "POST",
      body: JSON.stringify({ project_id, base_prompt, variables }),
    }),

  getBatch: (batchId: string) =>
    request<{ batch: Batch; items: Item[]; counts: BatchCounts }>(
      `/dataset/${batchId}`,
    ),
};
