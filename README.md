# SyntheticGen

**Generate labelled synthetic image datasets for machine learning from a single prompt template.**

[![Bun](https://img.shields.io/badge/Bun-1.3-000000?logo=bun&logoColor=white)](https://bun.sh)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Temporal](https://img.shields.io/badge/Temporal-workflows-000000)](https://temporal.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-4169E1?logo=postgresql&logoColor=white)](https://www.prisma.io)
[![Google Cloud](https://img.shields.io/badge/Google%20Cloud-Vertex%20AI-4285F4?logo=googlecloud&logoColor=white)](https://cloud.google.com/vertex-ai)

SyntheticGen expands a prompt template across every combination of its variables, generates an image for each combination with Google's Gemini image model on Vertex AI, and stores each image together with the exact labels that produced it. Generation runs in parallel, progress is tracked live in a web UI, and the finished dataset is available through the API.

**Use cases**

- Training classifiers on controlled attributes, such as object, setting, and viewpoint
- Balancing rare combinations that are hard to collect in the real world
- Bootstrapping a dataset when labelled real data is scarce

## Table of contents

- [Features](#features)
- [How it works](#how-it-works)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [API reference](#api-reference)
- [Dataset output](#dataset-output)
- [Changing the image style](#changing-the-image-style)
- [Available scripts](#available-scripts)
- [Troubleshooting](#troubleshooting)
- [Limitations](#limitations)

## Features

- **Prompt templates:** Put `{placeholders}` in a prompt. Each placeholder becomes a variable with one or more values.
- **Combinatorial expansion:** Every combination of variable values becomes one image, up to 500 per batch.
- **Labels by construction:** Each image is stored with its resolved prompt and the variable values (`labels`) that produced it.
- **Parallel, durable generation:** Each image runs as its own Temporal child workflow. Temporal persists workflow state, so in-flight work survives worker restarts.
- **Live progress:** The batch page polls the API every 3 seconds and shows completed, failed, and pending counts alongside a gallery.
- **Accounts and projects:** Email and password sign-up, JWT-based sign-in, and projects that group related batches. Reads and batch creation are scoped to the signed-in user.
- **Cloud storage:** Images are uploaded to Google Cloud Storage and referenced by public URL.

## How it works

```mermaid
flowchart LR
    user([User]) --> ui["Next.js frontend<br/>localhost:3001"]
    ui -- "REST + JWT" --> api["Express API<br/>localhost:3000"]
    api -- "Prisma" --> db[("PostgreSQL")]
    api -- "start workflow" --> temporal["Temporal server"]
    api -- "progress counter" --> redis[("Redis")]
    temporal -- "task queue" --> worker["Temporal worker<br/>activities"]
    worker -- "Gemini 2.5 Flash Image" --> vertex["Vertex AI"]
    worker -- "upload PNG" --> gcs[("Cloud Storage")]
    worker -- "status and gcp_url" --> db
    worker -- "increment counter" --> redis
```

1. **Create a batch.** The client posts a prompt template and variable values to `POST /dataset/generate`. The API validates the input, expands the variables into one item per combination, and stores the batch and its items with status `PENDING`.
2. **Start orchestration.** The API starts a `DatasetMasterWorkflow` on Temporal, which fans out one `DatasetChildWorkflow` per item.
3. **Generate and store.** Each child workflow calls `gemini-2.5-flash-image` on Vertex AI with the resolved prompt and the style instruction from [`apps/backend/prompt.ts`](apps/backend/prompt.ts). It uploads the PNG to Cloud Storage and marks the item `COMPLETED` with its public URL. If generation fails, only that item is marked `FAILURE`, and the rest of the batch continues.
4. **Track progress.** Each finished item increments a Redis counter (`batch:<batchId>:progress`). The frontend polls `GET /dataset/:batchId` until no items remain `PENDING`.

Each batch appears in the Temporal Web UI as a `<batchId>-MasterWorkflow` run with one child workflow per image, which makes failures easy to inspect.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| API | Express 5 running on Bun, Zod validation, JWT (`jsonwebtoken`), bcrypt |
| Orchestration | Temporal TypeScript SDK (`@temporalio/*`) |
| Database | PostgreSQL with Prisma 7 and the `pg` driver adapter |
| Cache | Redis (`ioredis`) |
| AI model | Gemini 2.5 Flash Image via Google Vertex AI (`@google/genai`) |
| Storage | Google Cloud Storage (`@google-cloud/storage`) |
| Tooling | Bun workspaces, Turborepo, TypeScript 5.9, ESLint, Prettier |

## Project structure

```text
SyntheticGen/
├── apps/
│   ├── backend/                # Express API, Temporal workflows and worker
│   │   ├── index.ts            # API entry point (port 3000)
│   │   ├── prompt.ts           # Style instruction sent with every image request
│   │   ├── middleware/         # JWT authentication
│   │   ├── routes/             # /users, /project and /dataset endpoints
│   │   └── temporal/           # Workflows, activities, worker and client
│   └── frontend/               # Next.js app (port 3001 in development)
│       ├── app/                # Pages: login, signup, projects, batches
│       ├── components/         # UI components and the generation form
│       └── lib/                # API client, auth context, shared types
├── packages/
│   ├── db/                     # Prisma schema, migrations and client
│   ├── redisClient/            # Shared ioredis client
│   ├── eslint-config/          # Shared ESLint configuration
│   └── typescript-config/      # Shared TypeScript presets
├── turbo.json
└── package.json
```

## Getting started

### Prerequisites

| Requirement | Notes |
|---|---|
| [Bun](https://bun.sh) 1.3.14 | Package manager and runtime for the API and worker. The version matches `devEngines` in `package.json`. |
| [Node.js](https://nodejs.org) 20.9+ | Required by Next.js 16 for the frontend. |
| PostgreSQL | Install locally or run it with Docker. |
| Redis | Install locally or run it with Docker. |
| [Temporal CLI](https://docs.temporal.io/cli) | Runs a local Temporal dev server. |
| Google Cloud project | Vertex AI API enabled, billing enabled, and a Cloud Storage bucket. |

**Google Cloud setup**

1. Enable the **Vertex AI API** in your project.
2. Create a Cloud Storage bucket that allows public object access. Turn off uniform bucket-level access and don't enforce public access prevention, because each image is made public with `makePublic()`.
3. Provide credentials through Application Default Credentials. Either run `gcloud auth application-default login`, or create a service account with the *Vertex AI User* and *Storage Object Admin* roles and point `GOOGLE_APPLICATION_CREDENTIALS` at its JSON key. Never commit that key.

### 1. Clone and install

```bash
git clone https://github.com/Yash-931/Synthetic-Gen.git
cd Synthetic-Gen
bun install
```

### 2. Start PostgreSQL, Redis, and Temporal

```bash
# PostgreSQL
docker run -d --name syntheticgen-db -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=syntheticgen postgres:16

# Redis
docker run -d --name syntheticgen-redis -p 6379:6379 redis:7

# Temporal dev server (keep it running; Web UI at http://localhost:8233)
temporal server start-dev
```

### 3. Configure environment variables

Create `apps/backend/.env`. The API and the worker both read it, because Bun and `dotenv` load `.env` from the directory the process starts in.

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/syntheticgen
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=replace-with-a-long-random-string
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=default
TEMPORAL_TASK_QUEUE=dataset-generation
GCP_PROJECT=your-gcp-project-id
BUCKET_NAME=your-bucket-name
GOOGLE_APPLICATION_CREDENTIALS=./gcp-key.json
```

Drop the `GOOGLE_APPLICATION_CREDENTIALS` line if you use `gcloud auth application-default login`. A relative path is resolved from `apps/backend`. See [Configuration](#configuration) for every variable.

Also create `packages/db/.env` containing only `DATABASE_URL`, which the Prisma CLI reads. Optionally, copy the frontend example:

```bash
cp apps/frontend/.env.local.example apps/frontend/.env.local
```

### 4. Apply database migrations

```bash
cd packages/db
bunx prisma migrate deploy
cd ../..
```

### 5. Run the services

Run each command in its own terminal:

```bash
# API on http://localhost:3000
cd apps/backend && bun run index.ts

# Temporal worker that runs image generation
cd apps/backend && bun run temporal/worker.ts

# Frontend on http://localhost:3001
cd apps/frontend && bun run dev
```

Open http://localhost:3001, sign up, create a project, and generate your first batch. The batch stays `PENDING` until the worker is running.

## Configuration

| Variable | Read by | Required | Description |
|---|---|---|---|
| `DATABASE_URL` | API, worker, Prisma CLI | Yes | PostgreSQL connection string |
| `JWT_SECRET` | API | Yes | Secret used to sign and verify session tokens. Use a long random value. |
| `REDIS_HOST` | API, worker | Yes | Redis hostname |
| `REDIS_PORT` | API, worker | Yes | Redis port, for example `6379` |
| `TEMPORAL_ADDRESS` | API, worker | Yes | Temporal server address, for example `localhost:7233` |
| `TEMPORAL_NAMESPACE` | API, worker | Yes | Temporal namespace, for example `default` |
| `TEMPORAL_TASK_QUEUE` | API, worker | Yes | Task queue shared by the API and the worker |
| `GCP_PROJECT` | Worker | Yes | Google Cloud project ID used for Vertex AI |
| `BUCKET_NAME` | Worker | Yes | Cloud Storage bucket for generated images |
| `GOOGLE_APPLICATION_CREDENTIALS` | Worker | If not using `gcloud` ADC | Path to a service account key file |
| `NEXT_PUBLIC_API_URL` | Frontend | No | API base URL. Defaults to `http://localhost:3000/api/v1`. |

Notes:

- The API always listens on port 3000, set in `apps/backend/index.ts`.
- Keep `.env` files and service account keys out of version control. Git ignores `.env` files, and `apps/backend/.gitignore` also excludes `gcp-key.json`.

## API reference

Base URL: `http://localhost:3000/api/v1`

Sign in to get a JWT that expires after one hour. Send it as the raw `Authorization` header value, with no `Bearer` prefix:

```http
Authorization: <token>
```

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/users/signup` | No | Create an account from `email` and `password` |
| `POST` | `/users/signin` | No | Exchange credentials for a JWT |
| `GET` | `/users/me` | Yes | Get the signed-in user |
| `GET` | `/project` | Yes | List your projects with batch counts |
| `POST` | `/project/create` | Yes | Create a project from `name` and `description` |
| `GET` | `/project/:id` | Yes | Get a project with its batches and item counts |
| `POST` | `/dataset/generate` | Yes | Create a batch in one of your projects and start generation |
| `GET` | `/dataset/:batchId` | Yes | Get a batch, all of its items, and status counts |

Errors return JSON with a `message` field. Invalid project or generation requests return `400`. Missing or invalid tokens, and failed sign-in, return `401`. Resources that don't exist, or that belong to another user, return `404`.

### Start a batch

`POST /dataset/generate`

| Field | Type | Description |
|---|---|---|
| `project_id` | string | Project the batch belongs to |
| `base_prompt` | string | Prompt template. Each `{name}` is a variable. |
| `variables` | object | Maps each variable name to an array of non-empty values |

Rules:

- `project_id` must belong to the signed-in user. Otherwise the API returns `404`.
- Every `{name}` in `base_prompt` needs a matching key in `variables`.
- Each variable needs at least one value.
- The number of combinations (the product of all value counts) can't exceed 500.
- A template with no variables produces a single image.

The response is `200 OK` and includes the new batch ID as `batchId`.

### Example workflow

```bash
BASE_URL=http://localhost:3000/api/v1

# 1. Sign in (create an account first with POST /users/signup) and copy the token
curl -s -X POST $BASE_URL/users/signin \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "password": "your-password"}'

# 2. Create a project and copy its id from the response
curl -s -X POST $BASE_URL/project/create \
  -H "Content-Type: application/json" \
  -H "Authorization: <token>" \
  -d '{"name": "Wildlife", "description": "Animals in different settings"}'

# 3. Start a batch: 3 animals x 2 settings = 6 images
curl -s -X POST $BASE_URL/dataset/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: <token>" \
  -d '{
    "project_id": "<project-id>",
    "base_prompt": "A high-resolution photo of a {animal} in a {setting}",
    "variables": {
      "animal": ["fox", "deer", "wolf"],
      "setting": ["forest", "snowy field"]
    }
  }'

# 4. Check progress and read the labelled items
curl -s $BASE_URL/dataset/<batch-id> -H "Authorization: <token>"
```

A response from step 4 looks like this (truncated):

```jsonc
{
  "batch": {
    "id": "5f0b7c1e-2d3a-4b8e-9c61-7a2f4e9d1b03",
    "project_id": "a1c9e3d4-6b7f-4e2a-8d1c-0f5b9a7e6c28",
    "base_prompt": "A high-resolution photo of a {animal} in a {setting}",
    "variables": { "animal": ["fox", "deer", "wolf"], "setting": ["forest", "snowy field"] }
  },
  "items": [
    {
      "id": "3e8d2f1a-9b4c-4d7e-a6f0-2c5b8e1d7a94",
      "batch_id": "5f0b7c1e-2d3a-4b8e-9c61-7a2f4e9d1b03",
      "prompt": "A high-resolution photo of a fox in a forest",
      "labels": { "animal": "fox", "setting": "forest" },
      "gcp_url": "https://storage.googleapis.com/your-bucket-name/batches/5f0b7c1e-2d3a-4b8e-9c61-7a2f4e9d1b03/images/3e8d2f1a-9b4c-4d7e-a6f0-2c5b8e1d7a94-1759747200000",
      "status": "COMPLETED"
    }
    // ...5 more items
  ],
  "counts": { "total": 6, "completed": 1, "failed": 0, "pending": 5 }
}
```

## Dataset output

Each batch is stored as a `Batch` row, and each combination of variable values is stored as an `Items` row. Items expose the following fields:

| Field | Description |
|---|---|
| `id` | Unique item ID |
| `batch_id` | Batch the item belongs to |
| `prompt` | The fully resolved prompt sent to the model |
| `labels` | Variable values for this image, such as `{"animal": "fox", "setting": "forest"}` |
| `gcp_url` | Public URL of the image. `null` until generation succeeds. |
| `status` | `PENDING`, `COMPLETED`, or `FAILURE` |

Images are saved at `batches/<batchId>/images/<itemId>-<timestamp>` in your bucket. The objects have no file extension, and their content type is `image/png`. Because the images are public, anyone with a URL can view them.

To build a training set, fetch `GET /dataset/:batchId`, keep the items whose `status` is `COMPLETED`, download each `gcp_url`, and use `labels` as the ground-truth annotations.

## Changing the image style

Every request sends the same system instruction, defined in [`apps/backend/prompt.ts`](apps/backend/prompt.ts). The default asks for studio-style photographs with soft key light, a neutral background, and a sharp subject. Edit that string to match your domain. The worker reads it at startup, so restart the worker after you change it.

## Available scripts

Run these from the repository root:

| Command | Description |
|---|---|
| `bun run dev` | Run `dev` tasks through Turborepo. This currently starts the frontend; the API and worker are started separately. |
| `bun run build` | Build all apps and packages |
| `bun run lint` | Lint workspaces that define a `lint` script |
| `bun run check-types` | Type-check workspaces that define a `check-types` script |
| `bun run format` | Format TypeScript, TSX, and Markdown files with Prettier |

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Batch stays `PENDING` | The Temporal worker isn't running, or `TEMPORAL_TASK_QUEUE` doesn't match between the API and the worker. Check the `<batchId>-MasterWorkflow` run in the Temporal Web UI at http://localhost:8233. |
| Items end up as `FAILURE` | Check the worker logs. Common causes are the Vertex AI API not being enabled, a wrong `GCP_PROJECT`, missing credentials, or the model returning no image (for example, because of a safety block). |
| Uploads fail in the worker | The bucket rejects per-object public ACLs. Turn off uniform bucket-level access and public access prevention on the bucket. |
| `GCP_PROJECT or GEMINI_API_KEY is not set` | Set `GCP_PROJECT`. The client always uses Vertex AI, which requires a project ID. |
| `401` with `Token not present` or `Invalid token` | The token is missing, malformed, or expired (after one hour). Sign in again and send the raw token in the `Authorization` header. |
| `Error connecting the redis client` in logs | Redis isn't reachable at `REDIS_HOST` and `REDIS_PORT`. |
| Frontend requests fail | The API isn't running on port 3000, or `NEXT_PUBLIC_API_URL` points to the wrong address. |

## Limitations

- Image generation uses one model, `gemini-2.5-flash-image` on Vertex AI. There is no provider abstraction yet.
- A batch is capped at 500 images.
- Failed items are recorded as `FAILURE`, but they aren't retried automatically or from the UI.
- In the UI, variable values are comma-separated, so a value can't contain a comma there.
- There is no built-in export. Use the API to download labels and image URLs.
