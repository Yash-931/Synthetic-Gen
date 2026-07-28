import express from "express";
import z from "zod";

export const datasetRouter = express.Router();

function extractVariablesFromPrompt(prompt: string) {
  const regex = /\{([^}]+)\}/g;

  const matches = [...prompt.matchAll(regex)];

  return matches.map((match) => match[1]);
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
  project: z.string(),
});

datasetRouter.post("/generate", async (req, res) => {
  const { success, data } = generateInputSchema.safeParse(req.body);

  if (!success) {
    res.status(400).json({
      message: "Input validation failed",
    });
    return;
  }
  const { base_prompt, variables, project } = data;

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
  console.log(allLabels);
  res.status(200).json({
    allLabels,
  });
});
