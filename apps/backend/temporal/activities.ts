import { prisma } from "../../../packages/db/db";

export async function getBatchItems(batchId: string) {
    try{
        const items = await prisma.items.findMany({
        where: {
            batch_id: batchId
        }
    })

    const prompts = items.map( (item) => item.prompt)
    return prompts
    } catch(e) {
        console.log("Error getting items for that batch " + e)
    }
}
