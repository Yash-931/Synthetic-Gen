import express from "express";
import z from "zod";
import { prisma } from "../../../packages/db/db";

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

datasetRouter.post("/generate", async (req, res) => {
  const { success, data } = generateInputSchema.safeParse(req.body);

  if (!success) {
    res.status(400).json({
      message: "Input validation failed",
    });
    return;
  }
  const { base_prompt, variables, project_id } = data;

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
 
  //todo
  await prisma.batch.create({
    data: {
      variables: variables,
      base_prompt: base_prompt,
      project_id: project_id,
    },
  });

  //todo to add the temporal AI logic
});
