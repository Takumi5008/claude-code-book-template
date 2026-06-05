import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

const NEXT_STEP: Record<number, string | null> = {
  1: "TEST_2", 2: "TEST_3", 3: "MEETING",
  4: null, 5: null, 6: null,
};

const CHECKLIST_ON_PASS: Record<number, number[]> = {
  1: [], 2: [], 3: [2], 4: [7], 5: [5], 6: [13],
};

const TEST_PATTERN: Record<number, string> = {
  1: "A", 2: "A", 3: "A", 4: "D", 5: "A", 6: "A",
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params;
  const { testNumber } = await req.json();

  // すでに合格済みならスキップ
  const already = await prisma.testResult.findFirst({
    where: { userId, testNumber, passed: true },
  });
  if (already) {
    return NextResponse.json({ ok: true, message: "already_passed" });
  }

  const attemptNumber =
    (await prisma.testResult.count({ where: { userId, testNumber } })) + 1;

  await prisma.testResult.create({
    data: {
      userId,
      testNumber,
      customerPattern: TEST_PATTERN[testNumber] as any,
      score: 100,
      passed: true,
      attemptNumber,
      feedbackJson: { note: "管理者が合格を登録" },
    },
  });

  // 進捗ステップを更新
  const nextStep = NEXT_STEP[testNumber];
  if (nextStep) {
    await prisma.progress.update({
      where: { userId },
      data: { currentStep: nextStep as any },
    });
  }

  // チェックリスト自動更新
  for (const itemNumber of CHECKLIST_ON_PASS[testNumber] ?? []) {
    await prisma.checklistItem.updateMany({
      where: { userId, itemNumber, completed: false },
      data: { completed: true, completedAt: new Date() },
    });
  }

  // LINEで合格通知を送る
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      const { pushText } = await import("@/lib/line");
      await pushText(
        user.lineUserId,
        `🎉 テスト${testNumber}合格おめでとうございます！\n管理者が合格を登録しました。\n\n「進捗確認」で現在地を確認してみましょう。`
      );
    }
  } catch {}

  return NextResponse.json({ ok: true });
}
