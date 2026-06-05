import { WebhookEvent } from "@line/bot-sdk";
import { ConversationState, User } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { replyText, extractAudioFromEvent, downloadAudioContent } from "@/lib/line";
import {
  chatWithCustomer,
  buildCustomerSystemPrompt,
  scoreConversation,
  transcribeAudio,
  CustomerPattern,
} from "@/lib/claude";

const PATTERN_LABELS: Record<string, string> = {
  A: "NTT系", B: "JCOM", C: "ホームルーター", D: "アウト多め", E: "au/UQ",
};

type PracticeContext = {
  pattern: CustomerPattern;
  sessionId: string;
  conversationLog: Array<{ role: "user" | "assistant"; content: string }>;
};

export async function handlePractice(
  event: WebhookEvent,
  user: User,
  state: ConversationState
) {
  if (event.type !== "message" || !("replyToken" in event)) return;

  // 音声メッセージの場合は文字起こし
  let text: string | null = null;
  if (event.message.type === "text") {
    text = event.message.text.trim();
  } else if (event.message.type === "audio") {
    await replyText(event.replyToken, "🎤 音声を認識中...");
    const audioBuffer = await downloadAudioContent(event.message.id);
    text = await transcribeAudio(audioBuffer);
    // 音声の場合はreplyTokenが使えないのでpushで返す
    const { pushText } = await import("@/lib/line");
    const ctx2 = state.contextJson as unknown as PracticeContext;
    if (ctx2?.sessionId) {
      await continuePracticeByPush(event.source.userId!, user, state, ctx2, text);
    }
    return;
  }

  if (!text) return;

  const ctx = state.contextJson as unknown as PracticeContext;

  // 練習終了コマンド
  if (text === "練習終了" || text === "採点して" || text === "終了") {
    await endPractice(event, user, state, ctx);
    return;
  }

  // パターン選択
  if (text.startsWith("練習_")) {
    const patternMap: Record<string, CustomerPattern> = {
      "NTT系": "A",
      "JCOM": "B",
      "ホームルーター": "C",
      "アウト多め": "D",
      "auUQ": "E",
      // 旧形式との互換
      "A": "A", "B": "B", "C": "C", "D": "D", "E": "E",
    };
    const key = text.replace("練習_", "");
    const pattern = patternMap[key];
    if (!pattern) return;
    await startPractice(event, user, pattern);
    return;
  }

  // 練習中の会話を継続
  await continuePractice(event, user, state, ctx, text);
}

async function startPractice(
  event: WebhookEvent & { type: "message"; replyToken: string },
  user: User,
  pattern: CustomerPattern
) {
  const session = await prisma.practiceSession.create({
    data: { userId: user.id, mode: "TEXT", customerPattern: pattern },
  });

  const ctx: PracticeContext = {
    pattern,
    sessionId: session.id,
    conversationLog: [],
  };

  await prisma.conversationState.update({
    where: { userId: user.id },
    data: { currentMode: "practice", contextJson: ctx as any },
  });

  // AIが最初の一言（インターホン）
  const aiText = await chatWithCustomer(
    buildCustomerSystemPrompt(pattern),
    [],
    "（インターホンが鳴った）"
  );

  ctx.conversationLog.push(
    { role: "user", content: "（インターホンが鳴った）" },
    { role: "assistant", content: aiText }
  );

  await prisma.conversationState.update({
    where: { userId: user.id },
    data: { contextJson: ctx as any },
  });

  await replyText(
    event.replyToken,
    `練習開始！（${PATTERN_LABELS[pattern]}）\n終了するには「練習終了」と送ってください。\n\n【お客様】\n${aiText}`
  );
}

async function continuePractice(
  event: WebhookEvent & { type: "message"; replyToken: string },
  user: User,
  state: ConversationState,
  ctx: PracticeContext,
  userText: string
) {
  ctx.conversationLog.push({ role: "user", content: userText });

  const aiText = await chatWithCustomer(
    buildCustomerSystemPrompt(ctx.pattern),
    ctx.conversationLog.slice(0, -1),
    userText
  );

  ctx.conversationLog.push({ role: "assistant", content: aiText });

  await prisma.conversationState.update({
    where: { userId: user.id },
    data: { contextJson: ctx as any },
  });

  await replyText(event.replyToken, `【お客様】\n${aiText}`);
}

async function endPractice(
  event: WebhookEvent & { type: "message"; replyToken: string },
  user: User,
  state: ConversationState,
  ctx: PracticeContext
) {
  const { pushText } = await import("@/lib/line");
  const lineUserId = event.source.userId!;

  // replyTokenで「採点中」を返し、結果はpushで送る
  await replyText(event.replyToken, "採点中...少しお待ちください⏳");

  const conversationText = ctx.conversationLog
    .map((m) => `${m.role === "user" ? "販売員" : "お客様"}: ${m.content}`)
    .join("\n");

  const result = await scoreConversation(conversationText, 0);

  await prisma.practiceSession.update({
    where: { id: ctx.sessionId },
    data: {
      score: result.score,
      feedbackJson: result as any,
      conversationLog: ctx.conversationLog as any,
      completedAt: new Date(),
    },
  });

  await prisma.conversationState.update({
    where: { userId: user.id },
    data: { currentMode: null, contextJson: Prisma.JsonNull },
  });

  const feedback = [
    `【採点結果】${result.score}点 ${result.passed ? "✅合格" : "❌不合格"}`,
    "",
    "👍 よかった点",
    result.goodPoints.map((p) => `・${p}`).join("\n"),
    "",
    "📝 改善点",
    result.improvements.map((p) => `・${p}`).join("\n"),
    "",
    `🎯 次に意識すること\n${result.focusNext}`,
  ].join("\n");

  await pushText(lineUserId, feedback);
}

// 音声メッセージはreplyTokenが使えないのでpush送信
async function continuePracticeByPush(
  lineUserId: string,
  user: User,
  state: ConversationState,
  ctx: PracticeContext,
  transcribedText: string
) {
  const { pushText } = await import("@/lib/line");

  // 文字起こし結果を表示
  await pushText(lineUserId, `🎤 認識結果：「${transcribedText}」`);

  ctx.conversationLog.push({ role: "user", content: transcribedText });

  const aiText = await chatWithCustomer(
    buildCustomerSystemPrompt(ctx.pattern),
    ctx.conversationLog.slice(0, -1),
    transcribedText
  );

  ctx.conversationLog.push({ role: "assistant", content: aiText });

  await prisma.conversationState.update({
    where: { userId: user.id },
    data: { contextJson: ctx as any },
  });

  await pushText(lineUserId, `【お客様】\n${aiText}`);
}
