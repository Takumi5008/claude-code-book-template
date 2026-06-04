import { WebhookEvent } from "@line/bot-sdk";
import { prisma } from "@/lib/db";
import { lineClient, replyMessages, replyText, extractTextFromEvent } from "@/lib/line";
import { handleRegistration } from "./flows/registration";
import { handlePractice } from "./flows/practice";
import { handleProgress } from "./flows/progress";

export async function handleMessage(event: WebhookEvent) {
  if (event.type === "follow") {
    await handleFollow(event);
    return;
  }

  if (event.type !== "message") return;

  const lineUserId = event.source.userId;
  if (!lineUserId) return;

  const user = await prisma.user.findUnique({ where: { lineUserId } });

  // 未登録ユーザー → 登録フローへ
  if (!user) {
    await handleRegistration(event);
    return;
  }

  const text = extractTextFromEvent(event)?.trim() ?? "";
  const state = await prisma.conversationState.findUnique({
    where: { userId: user.id },
  });

  const currentMode = state?.currentMode ?? null;

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

  const nextTest = [1, 2, 3, 4, 5, 6].find((n) => !passedNums.has(n)) ?? null;

  if (!nextTest) {
    await replyText(event.replyToken, "全テスト合格済みです！おめでとうございます🎉");
    return;
  }

  await replyText(
    event.replyToken,
    `次のテストはテスト${nextTest}です。\n「テスト${nextTest}開始」と送ってください。`
  );
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

  await replyText(event.replyToken, `📹 ${video.title}\n\n${video.url}`);
}
