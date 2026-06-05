import { WebhookEvent } from "@line/bot-sdk";
import { ConversationState, User } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { replyText, replyMessages } from "@/lib/line";
import { chatWithCustomer } from "@/lib/claude";

type MemoryContext = {
  category: "アウト返し" | "同意書後" | "後確";
  conversationLog: Array<{ role: "user" | "assistant"; content: string }>;
};

const MEMORY_PROMPTS: Record<string, string> = {
  アウト返し: `あなたは訪問販売員の練習相手AIです。
断り文句（アウト）を出すお客様を演じてください。

ルール：
- 「結構です」「いらないです」「忙しい」「他で契約してる」などのアウトを自然に出す
- 販売員が適切に切り返したら、少し態度を和らげる
- 切り返しが不十分なら同じアウトや別のアウトを繰り返す
- 短い返答で話しかけてくること
- 「練習終了」「終了」と言われたら「お疲れ様でした」とだけ答える`,

  同意書後: `あなたは同意書に署名したばかりのお客様です。
販売員が退出するまでのやり取りを自然に演じてください。

ルール：
- 署名後のお客様として「これからどうなるの？」「工事はいつ？」などを自然に聞く
- 販売員の説明に対して「わかった」「そうなんですね」など自然に反応する
- 「練習終了」「終了」と言われたら「お疲れ様でした」とだけ答える`,

  後確: `あなたは後日確認の電話を受けたお客様です。

ルール：
- 「あのときの人ね」「どういう内容でしたっけ？」など自然な反応をする
- 販売員の説明に対して自然に反応する
- 「練習終了」「終了」と言われたら「お疲れ様でした」とだけ答える`,
};

export async function startMemory(
  event: WebhookEvent & { type: "message"; replyToken: string },
  user: User,
  category: "アウト返し" | "同意書後" | "後確"
) {
  const ctx: MemoryContext = { category, conversationLog: [] };

  await prisma.conversationState.upsert({
    where: { userId: user.id },
    update: { currentMode: `memory_${category}`, contextJson: ctx as any },
    create: { userId: user.id, currentMode: `memory_${category}`, contextJson: ctx as any },
  });

  const systemPrompt = MEMORY_PROMPTS[category];
  const firstLine =
    category === "アウト返し" ? "（インターホンが鳴った）" :
    category === "同意書後" ? "（お客様が同意書に署名した直後）" :
    "（後確の電話をかけた）";

  const aiText = await chatWithCustomer(systemPrompt, [], firstLine);

  ctx.conversationLog.push(
    { role: "user", content: firstLine },
    { role: "assistant", content: aiText }
  );

  await prisma.conversationState.update({
    where: { userId: user.id },
    data: { contextJson: ctx as any },
  });

  await replyText(
    event.replyToken,
    `💪 ${category}練習開始！\n「練習終了」で終了します。\n\n【お客様】\n${aiText}`
  );
}

export async function handleMemory(
  event: WebhookEvent,
  user: User,
  state: ConversationState
) {
  if (event.type !== "message" || !("replyToken" in event)) return;
  if (event.message.type !== "text") return;

  const text = event.message.text.trim();
  const ctx = state.contextJson as unknown as MemoryContext;

  if (text === "練習終了" || text === "終了") {
    await prisma.conversationState.update({
      where: { userId: user.id },
      data: { currentMode: null, contextJson: Prisma.JsonNull },
    });
    await replyText(event.replyToken, "お疲れ様でした！💪\nもう一度練習するには「暗記」と送ってください。");
    return;
  }

  ctx.conversationLog.push({ role: "user", content: text });

  const aiText = await chatWithCustomer(
    MEMORY_PROMPTS[ctx.category],
    ctx.conversationLog.slice(0, -1),
    text
  );

  ctx.conversationLog.push({ role: "assistant", content: aiText });

  await prisma.conversationState.update({
    where: { userId: user.id },
    data: { contextJson: ctx as any },
  });

  await replyText(event.replyToken, `【お客様】\n${aiText}`);
}
