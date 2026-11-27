import mongoose from "mongoose";
import { E2E_MONGODB_URI } from "./env";

/** Start every run from an empty database so the smoke test is repeatable. */
export default async function globalSetup(): Promise<void> {
  const connection = await mongoose
    .createConnection(E2E_MONGODB_URI, { serverSelectionTimeoutMS: 5_000 })
    .asPromise();
  await connection.dropDatabase();
  await connection.close();
}
