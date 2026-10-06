import express from "express";
import z from "zod";
import { prisma } from "../../../packages/db/db";
import {redisClient} from "../../../packages/redisClient/client"
import { DatasetMasterWorkflow } from "../temporal/workflow";
import { get_temporal_client } from "../temporal/client";
import { authMiddleware, type AuthenticationRequest } from "../middleware/auth";

export const datasetRouter = express.Router();

function extractVariablesFromPrompt(prompt: string) {
  const regex = /\{([^}]+)\}/g;

  const matches = [...prompt.matchAll(regex)];

  return matches.map((match) => match[1]);
}

function resolvePrompt(
  basePrompt: string,
  labels: Record<string, string>,
): string {
  return basePrompt.replace(/\{([^}]+)\}/g, (_, key) => {
    return labels[key] || `{${key}}`;
  });
}

function generatePermutations(
  variables: Record<string, string[]>,
): Record<string, string>[] {
  const keys = Object.keys(variables);
  const values = Object.values(variables);

  if (keys.length === 0) return [{}];

  const combinations = values.reduce<string[][]>(
    (acc, currArray) => {
      const temp: string[][] = [];
      acc.forEach((existingCombo) => {
        currArray.forEach((newValue) => {
          temp.push([...existingCombo, newValue]);
        });
      });
      return temp;
    },
    [[]],
  );

  return combinations.map((combo) => {
    const labelObj: Record<string, string> = {};
    keys.forEach((key, index) => {
      labelObj[key] = combo[index]!;
    });
    return labelObj;
  });
}

const generateInputSchema = z.object({
  base_prompt: z.string(),
  variables: z.record(
    z.string(),
    z
      .array(z.string().min(1, "Variable values cannot be empty strings"))
      .min(1, "Each variable array must contain at least one value"),
  ),
  project_id: z.string(),
});

datasetRouter.post(
  "/generate",
  authMiddleware,
  async (req: AuthenticationRequest, res) => {
    const { success, data } = generateInputSchema.safeParse(req.body);

    if (!success) {
      res.status(400).json({
        message: "Input validation failed",
      });
      return;
    }
    const { base_prompt, variables, project_id } = data;

    const project = await prisma.project.findFirst({
      where: { id: project_id, user_id: req.userId! },
    });

    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    console.log(base_prompt);
    console.log(variables);

    const prompt_vars = extractVariablesFromPrompt(base_prompt);
    const provided_vars = Object.keys(variables);

    console.log(prompt_vars);
    console.log(provided_vars);

    const missingKeys = prompt_vars.filter(
      (key) => !provided_vars.includes(key!),
    );

    if (missingKeys.length > 0) {
      res.status(400).json({
        message: "Some keys missing in the provided variables",
        missingKeys: missingKeys,
      });
      return;
    }

    const allLabels = generatePermutations(variables);
    const totalPermutations = allLabels.length;

    if (totalPermutations > 500) {
      res.status(400).json({
        message: "Too many permutations. Max allowed is 500",
      });
      return;
    }

    const dbBatch = await prisma.batch.create({
      data: {
        variables: variables,
        base_prompt: base_prompt,
        project_id: project_id,
      },
    });

    const itemsToCreate = allLabels.map((labelObj) => ({
      batch_id: dbBatch.id,
      prompt: resolvePrompt(base_prompt, labelObj),
      labels: labelObj,
      status: "PENDING",
    }));

    await prisma.items.createMany({
      data: itemsToCreate,
    });

    //count in the redis client
    redisClient.set(`batch:${dbBatch.id}:progress`, 0);

    //trigger the temporal workflow
    const temporal_client = await get_temporal_client()

    await temporal_client.workflow.start(DatasetMasterWorkflow, {
      args: [dbBatch.id],
      workflowId: `${dbBatch.id}-MasterWorkflow`,
      taskQueue: process.env.TEMPORAL_TASK_QUEUE!
    })

    return res.status(200).json({
      messgae: success,
      batchId: dbBatch.id
    });
  },
);

datasetRouter.get(
  "/:batchId",
  authMiddleware,
  async (req: AuthenticationRequest, res) => {
    const batch = await prisma.batch.findUnique({
      where: { id: req.params.batchId as string },
      include: { items: true, project: true },
    });

    if (!batch || batch.project.user_id !== req.userId) {
      res.status(404).json({ message: "Batch not found" });
      return;
    }

    const counts = { total: batch.items.length, completed: 0, failed: 0, pending: 0 };
    for (const item of batch.items) {
      if (item.status === "COMPLETED") counts.completed++;
      else if (item.status === "FAILURE") counts.failed++;
      else counts.pending++;
    }

    res.status(200).json({
      batch: {
        id: batch.id,
        project_id: batch.project_id,
        base_prompt: batch.base_prompt,
        variables: batch.variables,
      },
      items: batch.items,
      counts,
    });
  },
);
