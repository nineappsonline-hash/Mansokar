import { z } from "zod";
import { readLimited } from "@/lib/body";
import { configured, service } from "@/lib/db";
import { enforceRate } from "@/lib/rate-limit";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  try {
    const input = z
      .object({
        email: z
          .email()
          .max(254)
          .transform((v) => v.toLowerCase()),
        locale: z.enum(["ar", "en"]),
        consent: z.literal(true),
      })
      .parse(JSON.parse((await readLimited(request, 4096)).toString()));
    await enforceRate(request, "newsletter", 5);
    if (!configured())
      return Response.json(
        { error: "Subscriptions are temporarily unavailable" },
        { status: 503 },
      );
    const { error } = await service()
      .from("newsletter_subscribers")
      .upsert(
        { email: input.email, locale: input.locale },
        { onConflict: "email", ignoreDuplicates: true },
      );
    if (error) throw error;
    return Response.json(
      { message: "Subscribed" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return Response.json(
        { error: "Enter a valid email address and agree to receive offers" },
        { status: 422 },
      );
    return Response.json(
      { error: "Unable to subscribe. Please try again later." },
      {
        status:
          error instanceof Error && error.message.includes("Too many")
            ? 429
            : 400,
      },
    );
  }
}
