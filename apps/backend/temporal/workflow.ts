import {
  ChildWorkflowCancellationType,
  executeChild,
  ParentClosePolicy,
} from "@temporalio/workflow";
import { getBatchItems } from "./activities";

async function DatasetChildWorkflow() {
    try {
        //generate image

        //upload to gcs

        //update the redis counter
    }
}

export async function DatasetMasterWorkflow(batchId: string) {
  try {
    const prompts = await getBatchItems(batchId);
    let index = 0;

    prompts!.map((prompt) =>
      executeChild(DatasetChildWorkflow, {
        args: [prompt],
        cancellationType:
          ChildWorkflowCancellationType.WAIT_CANCELLATION_COMPLETED,
        parentClosePolicy: ParentClosePolicy.TERMINATE,
        workflowId: `batchId-childWorkflow-${index++}`,
      }),
    );
    return "Master workflow started successfully";
  } catch (e) {
    console.log("Error starting the master workflow " + e);
  }
}
