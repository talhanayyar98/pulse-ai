import { ZodError } from "zod";
import { auth } from "@/auth";
import { HttpError } from "@/lib/server/errors";

type Handler = (request: Request) => Promise<Response>;

/**
 * Wraps a route handler: maps validation and HTTP errors to JSON responses, and requires
 * JSON bodies on writes (a cross-site <form> can't send application/json without CORS).
 */
export function route(handler: Handler): Handler {
  return async (request) => {
    try {
      if (
        request.method !== "GET" &&
        !request.headers.get("content-type")?.includes("application/json")
      ) {
        throw new HttpError(415, "Expected application/json");
      }
      return await handler(request);
    } catch (error) {
      if (error instanceof HttpError) {
        return Response.json({ error: error.message }, { status: error.status });
      }
      if (error instanceof ZodError) {
        return Response.json({ error: "Invalid request", issues: error.issues }, { status: 400 });
      }
      if (error instanceof SyntaxError) {
        return Response.json({ error: "Malformed JSON" }, { status: 400 });
      }
      console.error(error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}

export async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new HttpError(401, "Not signed in");
  return userId;
}
