import { Client, Connection } from "@temporalio/client";

let clientInstance: Client | undefined;

export async function get_temporal_client() {
    if(!clientInstance) {
        const connection = await Connection.connect({
            address: process.env.TEMPORAL_ADDRESS
        })

        clientInstance = new Client({
            connection,
            namespace: process.env.TEMPORAL_NAMESPACE
        })
    }
    return clientInstance
}