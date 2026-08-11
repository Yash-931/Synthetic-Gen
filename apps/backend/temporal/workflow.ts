import {
  ApplicationFailure,
  ChildWorkflowCancellationType,
  executeChild,
  ParentClosePolicy,
  proxyActivities,
} from "@temporalio/workflow";
import * as activities from "./activities";

const { generateAndUploadImage, getBatchItems, updateRedisCounter } =
  proxyActivities<typeof activities>({
    startToCloseTimeout: "5 minutes",
    retry: {
      initialInterval: "1 second",
      maximumInterval: "30 seconds",
      backoffCoefficient: 2,
      maximumAttempts: 5,
    },
  });

export async function DatasetChildWorkflow(
  prompt: string,
  batchId: string,
  itemId: string,
) {
  //generate image, upload to gcs and return a public url
  const url = await generateAndUploadImage(prompt, itemId);
  //update the redis counter
  await updateRedisCounter(batchId);
}

export async function DatasetMasterWorkflow(batchId: string) {
  const items = await getBatchItems(batchId);

  if (!items || items.length == 0) {
    throw new ApplicationFailure("No items found for " + batchId);
  }
  let index = 0;

  const childPromises = items!.map((item, prompt) =>
    executeChild(DatasetChildWorkflow, {
      args: [prompt, batchId, item.id],
      cancellationType:
        ChildWorkflowCancellationType.WAIT_CANCELLATION_COMPLETED,
      parentClosePolicy: ParentClosePolicy.TERMINATE,
      workflowId: `${item.id}-childWorkflow-${index++}`,
    }),
  );

  //this will keep the master workflow in RUNNING state
  await Promise.all(childPromises);
  return "Master workflow started successfully";
}
