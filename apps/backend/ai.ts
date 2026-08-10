import { GoogleGenAI } from "@google/genai";
import { IMAGE_GENERATION_SYSTEM_PROMPT } from "./prompt";
import {Storage} from "@google-cloud/storage"


const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GCP_PROJECT,
    location: 'us-central1'
})

const storage = new Storage()
const bucketName = process.env.BUCKET_NAME

async function generateImage(prompt: string) {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: prompt,
        config: {
            systemInstruction: IMAGE_GENERATION_SYSTEM_PROMPT
        }
    })

    const imagePart = response.candidates?.[0]?.content?.parts?.find( (part) => part.inlineData);

    if(!imagePart || !imagePart.inlineData?.data){
        throw new Error("Model failed to generate the image")
    }

    const {data, mimeType} = imagePart.inlineData;
    return {
        data,
        mimeType,
        buffer: Buffer.from(data, "base64")
    }
}


async function uploadImage(imageBuffer: Buffer, destinationName: string) {
    const bucket = storage.bucket(bucketName!);
    const file = bucket.file(destinationName)
    
    await file.save(imageBuffer, {
        metadata: {
            contentType: 'image/png'
        },
        resumable: false
    })

    console.log("Image uploaded to bucket successfully")
}


