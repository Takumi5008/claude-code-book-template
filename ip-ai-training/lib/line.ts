import {
  messagingApi,
  validateSignature,
  WebhookEvent,
} from "@line/bot-sdk";

export const lineClient = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
});

const lineBlobClient = new messagingApi.MessagingApiBlobClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
});

export function verifySignature(body: string, signature: string): boolean {
  return validateSignature(body, process.env.LINE_CHANNEL_SECRET!, signature);
}

export async function replyText(replyToken: string, text: string) {
  return lineClient.replyMessage({
    replyToken,
    messages: [{ type: "text", text }],
  });
}

export async function replyMessages(
  replyToken: string,
  messages: messagingApi.Message[]
) {
  return lineClient.replyMessage({ replyToken, messages });
}

export async function pushText(userId: string, text: string) {
  return lineClient.pushMessage({
    to: userId,
    messages: [{ type: "text", text }],
  });
}

export async function pushMessages(userId: string, messages: any[]) {
  return lineClient.pushMessage({ to: userId, messages });
}

export function extractTextFromEvent(event: WebhookEvent): string | null {
  if (event.type === "message" && event.message.type === "text") {
    return event.message.text;
  }
  return null;
}

export function extractAudioFromEvent(event: WebhookEvent): string | null {
  if (event.type === "message" && event.message.type === "audio") {
    return event.message.id;
  }
  return null;
}

export async function downloadAudioContent(messageId: string): Promise<Buffer> {
  const stream = await lineBlobClient.getMessageContent(messageId);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
