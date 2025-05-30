import { Connection, createConnection } from "mongoose";

import { whisper } from "@/lib/whisper";

const URI = process.env.MONGO_DB_URI as string;

const connections: Record<string, Connection> = {};

export async function dbConnect(dbName: string): Promise<Connection> {

    if (!dbName) { throw new Error("dbName is required for database connection.") }

    if (connections[dbName]) return connections[dbName];

    try {

        const connection = await createConnection(URI, { dbName }).asPromise();
        connections[dbName] = connection;

        whisper(`Connected to ${dbName}`);
        return connection;

    } catch (error) { throw new Error(`Failed to connect to ${dbName}`) }

}
