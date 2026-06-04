import { WebhookEvent } from "@line/bot-sdk";
import { ConversationState, User } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { replyText, replyMessages } from "@/lib/line";
import { generateQuizQuestions, judgeAnswer, QuizQuestion } from "@/lib/quiz";

type QuizContext = {
  category: string;
  questions: QuizQuestion[];
  currentIndex: number;
  correctCount: number;
};

// クイズ合格時に更新するチェックリスト項目
const QUIZ_CHECKLIST: Record<string, number> = {
  白紙: 3,
  同意書: 4,
};

export async function startQuiz(
  event: WebhookEvent & { type: "message"; replyToken: string },
  user: User,
  category: string
) {
  await replyText(event.replyToken, `📝 ${category}クイズを準備中...少しお待ちください`);

  const { pushText, pushMessages } = await import("@/lib/line");
  const lineUserId = event.source.userId!;

  try {
    const questions = await generateQuizQuestions(category);

    const ctx: QuizContext = { category, questions, currentIndex: 0, correctCount: 0 };

    await prisma.conversationState.upsert({
      where: { userId: user.id },
      update: { currentMode: `quiz_${category}`, contextJson: ctx as any },
      create: { userId: user.id, currentMode: `quiz_${category}`, contextJson: ctx as any },
    });

    await pushMessages(lineUserId, [
      {
        type: "text",
        text: `📝 ${category}クイズ（全3問）\nA・B・Cのいずれかで答えてください。\n\n【問1】\n${questions[0].question}`,
        quickReply: {
          items: [
            { type: "action", action: { type: "message", label: "A", text: "A" } },
            { type: "action", action: { type: "message", label: "B", text: "B" } },
            { type: "action", action: { type: "message", label: "C", text: "C" } },
          ],
        },
      },
    ]);
  } catch {
    await pushText(lineUserId, "クイズの準備に失敗しました。もう一度お試しください。");
  }
}

export async function handleQuiz(
  event: WebhookEvent,
  user: User,
  state: ConversationState
) {
  if (event.type !== "message" || !("replyToken" in event)) return;
  if (event.message.type !== "text") return;

  const userAnswer = event.message.text.trim();
  const ctx = state.contextJson as unknown as QuizContext;
  const question = ctx.questions[ctx.currentIndex];

  const correct = judgeAnswer(userAnswer, question.correctAnswer);
  if (correct) ctx.correctCount++;

  const resultLine = correct
    ? `⭕ 正解！　${question.hint}`
    : `❌ 不正解。正解は ${question.correctAnswer}。${question.hint}`;

  ctx.currentIndex++;

  // 次の問題がある場合
  if (ctx.currentIndex < ctx.questions.length) {
    await prisma.conversationState.update({
      where: { userId: user.id },
      data: { contextJson: ctx as any },
    });

    const nextQ = ctx.questions[ctx.currentIndex];
    await replyMessages(event.replyToken, [
      {
        type: "text",
        text: `${resultLine}\n\n【問${ctx.currentIndex + 1}】\n${nextQ.question}`,
        quickReply: {
          items: [
            { type: "action", action: { type: "message", label: "A", text: "A" } },
            { type: "action", action: { type: "message", label: "B", text: "B" } },
            { type: "action", action: { type: "message", label: "C", text: "C" } },
          ],
        },
      },
    ]);
    return;
  }

  // 全問終了
  await prisma.conversationState.update({
    where: { userId: user.id },
    data: { currentMode: null, contextJson: Prisma.JsonNull },
  });

  const passed = ctx.correctCount >= 2; // 3問中2問以上で合格
  const passIcon = passed ? "✅合格" : "❌不合格";

  // 合格時はチェックリスト更新
  if (passed) {
    const itemNumber = QUIZ_CHECKLIST[ctx.category];
    if (itemNumber) {
      await prisma.checklistItem.updateMany({
        where: { userId: user.id, itemNumber, completed: false },
        data: { completed: true, completedAt: new Date() },
      });
    }

    await prisma.quizResult.create({
      data: { userId: user.id, quizType: ctx.category, score: ctx.correctCount, passed: true },
    });
  }

  const summary = [
    resultLine,
    "",
    `📊 クイズ結果：${ctx.correctCount}/3問正解　${passIcon}`,
    passed
      ? `🎉 合格！チェックリスト「${ctx.category}の書き方」が完了しました。`
      : `もう一度動画を見てから「クイズ開始_${ctx.category}」で再挑戦できます。`,
  ].join("\n");

  await replyText(event.replyToken, summary);
}
