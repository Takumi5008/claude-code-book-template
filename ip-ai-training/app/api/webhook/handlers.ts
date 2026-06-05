import { WebhookEvent } from "@line/bot-sdk";
import { prisma } from "@/lib/db";
import { lineClient, replyMessages, replyText, extractTextFromEvent } from "@/lib/line";
import { handleRegistration } from "./flows/registration";
import { handlePractice } from "./flows/practice";
import { handleTest, startTest } from "./flows/test";
import { startQuiz, handleQuiz } from "./flows/quiz";
import { handleProgress } from "./flows/progress";

export async function handleMessage(event: WebhookEvent) {
  if (event.type === "follow") {
    await handleFollow(event);
    return;
  }

  if (event.type !== "message") return;

  const lineUserId = event.source.userId;
  if (!lineUserId) return;

  let user = await prisma.user.findUnique({ where: { lineUserId } });

  // 未登録ユーザー → 登録フローへ
  if (!user) {
    await handleRegistration(event);
    return;
  }

  // LINEプロフィール名が変わっていれば自動更新
  try {
    const profile = await lineClient.getProfile(lineUserId);
    if (profile.displayName !== user.name) {
      user = await prisma.user.update({
        where: { lineUserId },
        data: { name: profile.displayName },
      });
    }
  } catch {}


  const text = extractTextFromEvent(event)?.trim() ?? "";
  const state = await prisma.conversationState.findUnique({
    where: { userId: user.id },
  });

  const currentMode = state?.currentMode ?? null;

  // クイズ開始
  if (text.startsWith("クイズ開始_")) {
    const category = text.replace("クイズ開始_", "");
    await startQuiz(event as any, user, category);
    return;
  }

  // クイズ中は継続処理
  if (currentMode?.startsWith("quiz_")) {
    await handleQuiz(event, user, state!);
    return;
  }

  // テスト開始（テストN開始）
  const testStartMatch = text.match(/^テスト([1-6])開始$/);
  if (testStartMatch) {
    const testNumber = parseInt(testStartMatch[1]);
    await startTest(event as any, user, testNumber);
    return;
  }

  // テスト中は継続処理
  if (currentMode?.startsWith("test_")) {
    await handleTest(event, user, state!);
    return;
  }

  // 動画配信
  if (text.startsWith("動画_")) {
    const category = text.replace("動画_", "");
    await handleVideoDelivery(event, category);
    return;
  }

  // パターン選択（練習_A〜E）は練習開始
  if (text.startsWith("練習_")) {
    await handlePractice(event, user, state ?? { id: "", userId: user.id, currentMode: null, contextJson: null, updatedAt: new Date() });
    return;
  }

  // 練習中・テスト中は継続処理
  if (currentMode === "practice" || currentMode?.startsWith("test_")) {
    await handlePractice(event, user, state!);
    return;
  }

  // メニューコマンド
  switch (text) {
    case "練習":
    case "AI練習":
      await startPracticeMenu(event);
      break;
    case "テスト":
      await startTestMenu(event, user);
      break;
    case "進捗確認":
    case "進捗":
      await handleProgress(event, user);
      break;
    case "動画":
      await handleVideoMenu(event);
      break;
    default:
      await replyText(
        event.replyToken,
        "メニューから選んでください：\n・練習\n・テスト\n・進捗確認\n・動画"
      );
  }
}

async function handleFollow(event: WebhookEvent & { type: "follow" }) {
  const lineUserId = event.source.userId;
  if (!lineUserId) return;

  const existing = await prisma.user.findUnique({ where: { lineUserId } });
  if (existing) return;

  // LINEプロフィールから名前を自動取得
  let name = "新人";
  try {
    const profile = await lineClient.getProfile(lineUserId);
    name = profile.displayName;
  } catch {}

  const user = await prisma.user.create({
    data: {
      lineUserId,
      name,
      joinedAt: new Date(),
      progress: { create: { currentStep: "SCRIPT_LEARNING" } },
      conversationState: { create: {} },
    },
  });

  await prisma.checklistItem.createMany({
    data: Array.from({ length: 13 }, (_, i) => ({
      userId: user.id,
      itemNumber: i + 1,
      completed: false,
    })),
  });

  await prisma.milestone.create({
    data: { userId: user.id, milestoneType: "JOINED" },
  });

  await replyText(
    event.replyToken,
    `${name}さん、IP事業部 AI新人コーチへようこそ！🎉\n\nできること：\n・練習 → AIとスクリプト練習\n・テスト → 合否テスト受験\n・進捗確認 → 現在地と推定初稼働日\n・動画 → 手順動画を見る\n\nまずは「練習」と送ってみてください！`
  );
}

async function startPracticeMenu(event: WebhookEvent) {
  if (event.type !== "message" || !("replyToken" in event)) return;

  await replyMessages(event.replyToken, [
    {
      type: "text",
      text: "練習するお客様パターンを選んでください：",
      quickReply: {
        items: [
          { type: "action", action: { type: "message", label: "NTT系", text: "練習_NTT系" } },
          { type: "action", action: { type: "message", label: "JCOM", text: "練習_JCOM" } },
          { type: "action", action: { type: "message", label: "ホームルーター", text: "練習_ホームルーター" } },
          { type: "action", action: { type: "message", label: "アウト多め", text: "練習_アウト多め" } },
          { type: "action", action: { type: "message", label: "au/UQ", text: "練習_auUQ" } },
        ],
      },
    },
  ]);
}

async function startTestMenu(
  event: WebhookEvent,
  user: { id: string }
) {
  if (event.type !== "message" || !("replyToken" in event)) return;

  const passed = await prisma.testResult.findMany({
    where: { userId: user.id, passed: true },
    distinct: ["testNumber"],
    select: { testNumber: true },
  });
  const passedNums = new Set(passed.map((r) => r.testNumber));

  const lines = [1, 2, 3, 4, 5, 6].map(
    (n) => `${passedNums.has(n) ? "✅" : "⬜"} テスト${n}`
  );

  const nextTest = [1, 2, 3, 4, 5, 6].find((n) => !passedNums.has(n)) ?? null;
  const footer = nextTest
    ? `\n次はテスト${nextTest}です。\nオンラインで実施後、管理者が合否を登録します。`
    : "\n🎉 全テスト合格済みです！おめでとうございます！";

  await replyText(event.replyToken, `📋 テスト合否状況\n\n${lines.join("\n")}${footer}`);
}

async function handleVideoMenu(event: WebhookEvent) {
  if (event.type !== "message" || !("replyToken" in event)) return;

  await replyMessages(event.replyToken, [
    {
      type: "text",
      text: "見たい動画を選んでください：",
      quickReply: {
        items: [
          { type: "action", action: { type: "message", label: "スクリプト練習動画", text: "動画_スクリプト" } },
          { type: "action", action: { type: "message", label: "白紙の書き方", text: "動画_白紙" } },
          { type: "action", action: { type: "message", label: "同意書の書き方", text: "動画_同意書" } },
        ],
      },
    },
  ]);
}

async function handleVideoDelivery(event: WebhookEvent, category: string) {
  if (event.type !== "message" || !("replyToken" in event)) return;

  const video = await prisma.video.findFirst({ where: { category } });

  if (!video) {
    await replyText(event.replyToken, `「${category}」の動画はまだ登録されていません。管理者にお問い合わせください。`);
    return;
  }

  const hasQuiz = ["白紙", "同意書", "スクリプト"].includes(category);

  if (hasQuiz) {
    await replyMessages(event.replyToken, [
      {
        type: "text",
        text: `📹 ${video.title}\n\n${video.url}\n\n動画を見たらクイズで理解を確認しましょう！`,
        quickReply: {
          items: [
            {
              type: "action",
              action: { type: "message", label: "クイズに挑戦", text: `クイズ開始_${category}` },
            },
          ],
        },
      },
    ]);
  } else {
    await replyText(event.replyToken, `📹 ${video.title}\n\n${video.url}`);
  }
}
