import { prisma } from "../../../packages/db/db";

import { GoogleGenAI } from "@google/genai";
import { IMAGE_GENERATION_SYSTEM_PROMPT } from "../prompt";
import { Storage } from "@google-cloud/storage";
import { redisClient } from "../../../packages/redisClient/client";
import { CompletionStatus } from "../../../packages/db/generated/prisma/enums";

const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GCP_PROJECT,
  location: "us-central1",
});

const storage = new Storage();
const bucketName = process.env.BUCKET_NAME;

async function generateImage(prompt: string) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: prompt,
    config: {
      systemInstruction: IMAGE_GENERATION_SYSTEM_PROMPT,
    },
  });

  const imagePart = response.candidates?.[0]?.content?.parts?.find(
    (part) => part.inlineData,
  );

  if (!imagePart || !imagePart.inlineData?.data) {
    throw new Error("Model failed to generate the image");
  }

  const { data, mimeType } = imagePart.inlineData;
  return {
    data,
    mimeType,
    buffer: Buffer.from(data, "base64"),
  };
}

async function uploadImage(imageBuffer: Buffer, destinationName: string) {
  const bucket = storage.bucket(bucketName!);
  const file = bucket.file(destinationName);

  await file.save(imageBuffer, {
    metadata: {
      contentType: "image/png",
    },
    resumable: false,
  });

  console.log("Image uploaded to bucket successfully");
  const url = file.publicUrl()
  return url
}


//TODO: UPDATING THE STATUS IN THE DB ACCORDINGLY
async function generateAndUploadImage(prompt: string, batchId: string) {
    try {
        const imageBuffer = await generateImage(prompt);
        const destinationPath = `batches/images/${batchId}-${Date.now()}`
        const url = await uploadImage(imageBuffer.buffer, destinationPath)

        await prisma.items.updateMany({
            where: {
                batch_id: batchId,
                prompt: prompt
            },

            data: {
                gcp_url: url,
                status: CompletionStatus.COMPLETED
            }
        })
        return url;
    } catch(error){
        console.log("Error in generation or the uploading of the image: " + error)
        await prisma.items.updateMany({
            where: {
                batch_id: batchId,
                prompt: prompt
            },

            data: {
                status: CompletionStatus.FAILURE
            }
        })
    }
}

async function updateRedisCounter(batchId: string) {
    const key = `batch:${batchId}:progress`

    try{
        const newCount = await redisClient.incr(key);

        if(newCount === 1) {
            await redisClient.expire(key, 86400)
        }
    } catch(error){
        console.log("Redis counter increment failed: " + error)
        return -1
    }
}

export async function getBatchItems(batchId: string) {
  const items = await prisma.items.findMany({
    where: {
      batch_id: batchId,
    },
  });

  const prompts = items.map((item) => item.prompt);
  return prompts;
}
