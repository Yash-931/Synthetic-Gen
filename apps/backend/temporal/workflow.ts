import {
  ApplicationFailure,
  ChildWorkflowCancellationType,
  executeChild,
  ParentClosePolicy,
} from "@temporalio/workflow";
import { getBatchItems } from "./activities";

async function DatasetChildWorkflow() {
  //generate image
  //upload to gcs
  //update the redis counter
}

export async function DatasetMasterWorkflow(batchId: string) {
  const prompts = await getBatchItems(batchId);

  if (!prompts || prompts.length == 0) {
    throw new ApplicationFailure("No items found for " + batchId);
  }
  let index = 0;

  const childPromises = prompts!.map((prompt) =>
    executeChild(DatasetChildWorkflow, {
      args: [prompt],
      cancellationType:
        ChildWorkflowCancellationType.WAIT_CANCELLATION_COMPLETED,
      parentClosePolicy: ParentClosePolicy.TERMINATE,
      workflowId: `${batchId}-childWorkflow-${index++}`,
    }),
  );

  //this will keep the master workflow in RUNNING state
  await Promise.all(childPromises);
  return "Master workflow started successfully";
}
