import { WebhookEvent } from "@line/bot-sdk";
import { User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { replyText } from "@/lib/line";
import { getTodayTask, updateEstimatedFirstWork } from "@/lib/estimator";

const STEP_LABELS: Record<string, string> = {
  ASSIGNED: "配属",
  SCRIPT_LEARNING: "スクリプト学習",
  TEST_1: "テスト1",
  TEST_2: "テスト2",
  TEST_3: "テスト3",
  MEETING: "ミーティング参加",
  OBSERVATION: "見学",
  ASSIGNMENT_MEETING: "配属面談",
  PRACTICE_1: "実践1",
  PRACTICE_2: "実践2",
  FIRST_WORK: "初稼働（実践3）",
  COMPLETED: "完了",
};

const STEP_ORDER = Object.keys(STEP_LABELS);

export async function handleProgress(event: WebhookEvent, user: User) {
  if (event.type !== "message" || !("replyToken" in event)) return;

  // 推定初稼働日を最新化
  const currentProgress = await prisma.progress.findUnique({ where: { userId: user.id } });
  if (currentProgress && !currentProgress.estimatedFirstWorkAt) {
    await updateEstimatedFirstWork(user.id, currentProgress.currentStep);
  }

  const [progress, checklist, testResults, practiceSessions] = await Promise.all([
    prisma.progress.findUnique({ where: { userId: user.id } }),
    prisma.checklistItem.findMany({ where: { userId: user.id } }),
    prisma.testResult.findMany({
      where: { userId: user.id, passed: true },
      distinct: ["testNumber"],
      orderBy: { testNumber: "asc" },
    }),
    prisma.practiceSession.findMany({
      where: { userId: user.id, score: { not: null } },
      orderBy: { createdAt: "asc" },
      select: { score: true, createdAt: true },
    }),
  ]);

  if (!progress) {
    await replyText(event.replyToken, "進捗データが見つかりません。");
    return;
  }

  const currentStep = progress.currentStep;
  const currentIdx = STEP_ORDER.indexOf(currentStep);

  const joinedDays = Math.floor(
    (Date.now() - user.joinedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  // チェックリスト進捗
  const completedItems = checklist.filter((c) => c.completed).length;

  // 合格テスト
  const passedTests = testResults.map((t) => `テスト${t.testNumber}`).join("・");

  // スコア推移（直近3回）
  const recentScores = practiceSessions
    .slice(-3)
    .map((s, i) => `${i + 1}回目: ${s.score}点`)
    .join(" → ");

  // ステップ表示
  const stepProgress = STEP_ORDER.slice(0, currentIdx + 2)
    .map((s, i) => {
      const done = i < currentIdx;
      const current = i === currentIdx;
      return `${done ? "✅" : current ? "▶" : "⬜"} ${STEP_LABELS[s]}`;
    })
    .join("\n");

  const message = [
    `📅 研修開始から${joinedDays}日目`,
    "",
    "【現在地】",
    stepProgress,
    "",
    `📋 チェックリスト: ${completedItems}/13項目完了`,
    passedTests ? `🎯 合格済テスト: ${passedTests}` : "",
    recentScores ? `📈 直近スコア: ${recentScores}` : "",
    progress.estimatedFirstWorkAt
      ? `⏱️ 推定初稼働日: ${progress.estimatedFirstWorkAt.toLocaleDateString("ja-JP")}`
      : "",
    "",
    `📌 今日やること`,
    getTodayTask(currentStep, testResults.map((t) => t.testNumber)),
  ]
    .filter(Boolean)
    .join("\n");

  await replyText(event.replyToken, message);
}
