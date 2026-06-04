import { prisma } from "@/lib/db";

// 各ステップの目標所要日数
const STEP_DAYS: Record<string, number> = {
  SCRIPT_LEARNING: 5,
  TEST_1: 4,
  TEST_2: 4,
  TEST_3: 7,
  MEETING: 3,
  OBSERVATION: 3,
  ASSIGNMENT_MEETING: 3,
  PRACTICE_1: 7,
  PRACTICE_2: 7,
  FIRST_WORK: 0,
  COMPLETED: 0,
};

const STEP_ORDER = [
  "SCRIPT_LEARNING",
  "TEST_1",
  "TEST_2",
  "TEST_3",
  "MEETING",
  "OBSERVATION",
  "ASSIGNMENT_MEETING",
  "PRACTICE_1",
  "PRACTICE_2",
  "FIRST_WORK",
  "COMPLETED",
];

export function calcEstimatedFirstWork(currentStep: string): Date {
  const idx = STEP_ORDER.indexOf(currentStep);
  const remainingDays = STEP_ORDER.slice(idx).reduce(
    (sum, step) => sum + (STEP_DAYS[step] ?? 0),
    0
  );
  const date = new Date();
  date.setDate(date.getDate() + remainingDays);
  return date;
}

export async function updateEstimatedFirstWork(userId: string, currentStep: string) {
  if (currentStep === "FIRST_WORK" || currentStep === "COMPLETED") return;
  const estimated = calcEstimatedFirstWork(currentStep);
  await prisma.progress.update({
    where: { userId },
    data: { estimatedFirstWorkAt: estimated },
  });
}

// 進捗確認用：今日やるべきことのメッセージ
export function getTodayTask(currentStep: string, passedTests: number[]): string {
  switch (currentStep) {
    case "SCRIPT_LEARNING":
      return "スクリプトを読んで練習しよう！準備ができたら「テスト」でテスト1に挑戦。";
    case "TEST_1":
      return passedTests.includes(1)
        ? "テスト1合格済み！「テスト」でテスト2に挑戦しよう。"
        : "「練習」でウォームアップしてから「テスト」でテスト1に挑戦しよう。";
    case "TEST_2":
      return passedTests.includes(2)
        ? "テスト2合格済み！「テスト」でテスト3に挑戦しよう。"
        : "「練習」で机械説明まで通しで練習してからテスト2に挑戦しよう。";
    case "TEST_3":
      return passedTests.includes(3)
        ? "テスト3合格済み！ミーティング参加を待とう。"
        : "「練習」で同意書まで完全通し練習してからテスト3に挑戦しよう。";
    case "MEETING":
      return "ミーティング参加を待ちながら、アウト返し（テスト4）の練習をしよう。";
    case "OBSERVATION":
      return "見学同行の準備を整えよう。スクリプトを声に出して練習しておこう。";
    case "ASSIGNMENT_MEETING":
      return "配属面談の準備をしよう。テスト4・5・6にも挑戦してみよう。";
    case "PRACTICE_1":
    case "PRACTICE_2":
      return "実践頑張れ！不安なところは「練習」で確認しよう。";
    default:
      return "「練習」でスクリプトを練習しよう！";
  }
}
