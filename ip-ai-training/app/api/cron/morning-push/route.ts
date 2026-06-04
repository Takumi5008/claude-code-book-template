import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pushText } from "@/lib/line";
import { getTodayTask } from "@/lib/estimator";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Vercel Cron の認証チェック
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: { role: "TRAINEE" },
    include: {
      progress: true,
      testResults: { where: { passed: true }, select: { testNumber: true } },
    },
  });

  const results = { sent: 0, failed: 0 };

  for (const user of users) {
    try {
      const progress = user.progress;
      if (!progress) continue;

      const currentStep = progress.currentStep;
      if (currentStep === "FIRST_WORK" || currentStep === "COMPLETED") continue;

      const joinedDays = Math.floor(
        (Date.now() - user.joinedAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      const passedTests = user.testResults.map((r) => r.testNumber);
      const todayTask = getTodayTask(currentStep, passedTests);

      const estimatedDate = progress.estimatedFirstWorkAt;
      const estimatedLine = estimatedDate
        ? `⏱️ 推定初稼働日：${estimatedDate.toLocaleDateString("ja-JP")}`
        : "";

      const message = [
        `おはようございます、${user.name}さん！🌅`,
        `研修開始から${joinedDays}日目です。`,
        "",
        `📍 現在地：${STEP_LABELS[currentStep] ?? currentStep}`,
        estimatedLine,
        "",
        `📌 今日やること`,
        todayTask,
      ]
        .filter(Boolean)
        .join("\n");

      await pushText(user.lineUserId, message);
      results.sent++;
    } catch {
      results.failed++;
    }
  }

  return NextResponse.json(results);
}

const STEP_LABELS: Record<string, string> = {
  SCRIPT_LEARNING: "スクリプト学習",
  TEST_1: "テスト1",
  TEST_2: "テスト2",
  TEST_3: "テスト3",
  MEETING: "ミーティング参加",
  OBSERVATION: "見学",
  ASSIGNMENT_MEETING: "配属面談",
  PRACTICE_1: "実践1",
  PRACTICE_2: "実践2",
  FIRST_WORK: "初稼働",
  COMPLETED: "完了",
};
