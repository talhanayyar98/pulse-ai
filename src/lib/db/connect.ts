import mongoose from "mongoose";
import { env } from "@/lib/env";

const cache = globalThis as typeof globalThis & {
  __pulseMongoose?: Promise<typeof mongoose>;
};

/** One shared connection per process (survives dev hot reloads); retried after a failure. */
export function connectDb(): Promise<typeof mongoose> {
  cache.__pulseMongoose ??= mongoose
    .connect(env.mongodbUri, { serverSelectionTimeoutMS: 5_000 })
    .catch((error: unknown) => {
      cache.__pulseMongoose = undefined;
      throw error;
    });
  return cache.__pulseMongoose;
}
