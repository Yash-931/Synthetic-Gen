import "dotenv/config"
import { NativeConnection, Worker } from "@temporalio/worker";
import * as activities from "./activities";

async function run() {
  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_ADDRESS,
  });

  try {
    const worker = await Worker.create({
      connection,
      namespace: process.env.TEMPORAL_NAMESPACE,
      taskQueue: process.env.TEMPORAL_TASK_QUEUE!,
      workflowsPath: require.resolve("./workflow"),
      activities,
    });

    await worker.run();
  } finally {
    await connection.close();
  }
}

run().catch((err) => {
  console.log(err);
  process.exit(1);
});
