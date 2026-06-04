import { NextRequest, NextResponse } from "next/server";
import { WebhookEvent } from "@line/bot-sdk";
import { verifySignature, replyText, extractTextFromEvent } from "@/lib/line";
import { handleMessage } from "./handlers";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-line-signature") ?? "";

  if (!verifySignature(body, signature)) {
    console.error("Signature mismatch", {
      signatureLength: signature.length,
      bodyLength: body.length,
      secretLength: (process.env.LINE_CHANNEL_SECRET ?? "").length,
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const { events } = JSON.parse(body) as { events: WebhookEvent[] };

  await Promise.all(
    events.map(async (event) => {
      try {
        await handleMessage(event);
      } catch (err) {
        const msg = err instanceof Error ? err.message + "\n" + err.stack : String(err);
        console.error("Event handling error:", msg);
        if (event.type === "message" && "replyToken" in event) {
          await replyText(
            event.replyToken,
            "エラー: " + (err instanceof Error ? err.message : String(err))
          );
        }
      }
    })
  );

  return NextResponse.json({ ok: true });
}
