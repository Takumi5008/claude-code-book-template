import { WebhookEvent } from "@line/bot-sdk";
import { ConversationState, User } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { replyText } from "@/lib/line";
import {
  chatWithCustomer,
  buildTestCustomerPrompt,
  scoreTestConversation,
  CustomerPattern,
} from "@/lib/claude";
import { updateEstimatedFirstWork } from "@/lib/estimator";

type TestContext = {
  testNumber: number;
  attemptNumber: number;
  conversationLog: Array<{ role: "user" | "assistant"; content: string }>;
};

// テストの前提条件（何のテストに合格してからでないと受けられないか）
const PREREQUISITES: Record<number, number | null> = {
  1: null,
  2: 1,
  3: 2,
  4: 3,
  5: 3,
  6: 3,
};

// テスト合格時に進むステップ
const NEXT_STEP: Record<number, string | null> = {
  1: "TEST_2",
  2: "TEST_3",
  3: "MEETING",
  4: null,
  5: null,
  6: null,
};

// テスト合格時に自動完了するチェックリスト項目
const CHECKLIST_ON_PASS: Record<number, number[]> = {
  1: [],
  2: [],
  3: [2],       // スクリプトスラスラ（テスト1・2・3合格で完了）
  4: [7],       // 基礎アウト返し
  5: [5],       // アトカク退出時トーク
  6: [13],      // 解除のやり方わかる
};

// テストで使うお客様パターン
const TEST_PATTERN: Record<number, CustomerPattern> = {
  1: "A", 2: "A", 3: "A",
  4: "D",
  5: "A", 6: "A",
};

export async function startTest(
  event: WebhookEvent & { type: "message"; replyToken: string },
  user: User,
  testNumber: number
) {
  // 前提条件チェック
  const prerequisite = PREREQUISITES[testNumber];
  if (prerequisite !== null) {
    const prereqPassed = await prisma.testResult.findFirst({
      where: { userId: user.id, testNumber: prerequisite, passed: true },
    });
    if (!prereqPassed) {
      await replyText(
        event.replyToken,
        `テスト${testNumber}を受けるには、先にテスト${prerequisite}に合格してください。`
      );
      return;
    }
  }

  const attemptNumber =
    (await prisma.testResult.count({ where: { userId: user.id, testNumber } })) + 1;

  const ctx: TestContext = { testNumber, attemptNumber, conversationLog: [] };

  await prisma.conversationState.upsert({
    where: { userId: user.id },
    update: { currentMode: `test_${testNumber}`, contextJson: ctx as any },
    create: { userId: user.id, currentMode: `test_${testNumber}`, contextJson: ctx as any },
  });

  const aiText = await chatWithCustomer(
    buildTestCustomerPrompt(testNumber),
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
    `📋 テスト${testNumber}開始！（${attemptNumber}回目の挑戦）\n「テスト終了」で採点します。\n\n【お客様】\n${aiText}`
  );
}

export async function handleTest(
  event: WebhookEvent,
  user: User,
  state: ConversationState
) {
  if (event.type !== "message" || !("replyToken" in event)) return;
  if (event.message.type !== "text") return;

  const text = event.message.text.trim();
  const ctx = state.contextJson as unknown as TestContext;

  if (text === "テスト終了" || text === "終了") {
    await endTest(event, user, state, ctx);
    return;
  }

  // 会話継続
  ctx.conversationLog.push({ role: "user", content: text });

  const aiText = await chatWithCustomer(
    buildTestCustomerPrompt(ctx.testNumber),
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

async function endTest(
  event: WebhookEvent & { type: "message"; replyToken: string },
  user: User,
  state: ConversationState,
  ctx: TestContext
) {
  const { pushText } = await import("@/lib/line");
  const lineUserId = event.source.userId!;

  await replyText(event.replyToken, "採点中...少しお待ちください⏳");

  const conversationText = ctx.conversationLog
    .map((m) => `${m.role === "user" ? "販売員" : "お客様"}: ${m.content}`)
    .join("\n");

  const result = await scoreTestConversation(conversationText, ctx.testNumber);

  // テスト結果をDBに保存
  await prisma.testResult.create({
    data: {
      userId: user.id,
      testNumber: ctx.testNumber,
      customerPattern: TEST_PATTERN[ctx.testNumber],
      score: result.score,
      passed: result.passed,
      attemptNumber: ctx.attemptNumber,
      feedbackJson: result as any,
    },
  });

  // 合格時の処理
  if (result.passed) {
    // 進捗ステップを更新
    const nextStep = NEXT_STEP[ctx.testNumber];
    if (nextStep) {
      await prisma.progress.update({
        where: { userId: user.id },
        data: { currentStep: nextStep as any },
      });
      await updateEstimatedFirstWork(user.id, nextStep);
    }

    // チェックリスト自動更新
    const checklistItems = CHECKLIST_ON_PASS[ctx.testNumber] ?? [];
    for (const itemNumber of checklistItems) {
      await prisma.checklistItem.updateMany({
        where: { userId: user.id, itemNumber, completed: false },
        data: { completed: true, completedAt: new Date() },
      });
    }
  }

  // 会話状態をリセット
  await prisma.conversationState.update({
    where: { userId: user.id },
    data: { currentMode: null, contextJson: Prisma.JsonNull },
  });

  const passIcon = result.passed ? "✅合格" : "❌不合格";
  const feedback = [
    `📋 テスト${ctx.testNumber}　【採点結果】${result.score}点 ${passIcon}`,
    "",
    "👍 よかった点",
    result.goodPoints.map((p) => `・${p}`).join("\n"),
    "",
    "📝 改善点",
    result.improvements.length > 0
      ? result.improvements.map((p) => `・${p}`).join("\n")
      : "・特になし",
    "",
    `🎯 次に意識すること\n${result.focusNext}`,
    result.missedPhrases.length > 0
      ? `\n⚠️ 抜けていたセリフ\n${result.missedPhrases.map((p) => `・${p}`).join("\n")}`
      : "",
    result.passed
      ? `\n🎉 合格おめでとうございます！${NEXT_STEP[ctx.testNumber] ? `\n次は「テスト」と送って続けましょう。` : ""}`
      : `\n再挑戦するには「テスト${ctx.testNumber}開始」と送ってください。`,
  ]
    .filter((l) => l !== "")
    .join("\n");

  await pushText(lineUserId, feedback);
}
