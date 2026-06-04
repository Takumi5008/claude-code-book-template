import { WebhookEvent } from "@line/bot-sdk";
import { prisma } from "@/lib/db";
import { replyText, extractTextFromEvent } from "@/lib/line";

export async function handleRegistration(event: WebhookEvent) {
  if (event.type !== "message" || !("replyToken" in event)) return;

  const lineUserId = event.source.userId;
  if (!lineUserId) return;

  const text = extractTextFromEvent(event)?.trim() ?? "";

  // 登録中の一時状態をconversationStateで管理（userIdなしで）
  const tempKey = `reg_${lineUserId}`;
  const tempState = await prisma.conversationState.findFirst({
    where: { user: { lineUserId } },
  });

  // 名前入力待ちかどうかをcontextJsonで判断
  // まだconversationStateがない = 名前入力待ち
  if (!text) {
    await replyText(event.replyToken, "名前を入力してください。");
    return;
  }

  // 名前として登録してユーザー作成
  const name = text;
  const user = await prisma.user.create({
    data: {
      lineUserId,
      name,
      joinedAt: new Date(),
      progress: { create: { currentStep: "ASSIGNED" } },
      conversationState: { create: {} },
    },
  });

  // チェックリスト13項目を初期化
  await prisma.checklistItem.createMany({
    data: Array.from({ length: 13 }, (_, i) => ({
      userId: user.id,
      itemNumber: i + 1,
      completed: false,
    })),
  });

  // 入社マイルストーン記録
  await prisma.milestone.create({
    data: { userId: user.id, milestoneType: "JOINED" },
  });

  await replyText(
    event.replyToken,
    `${name}さん、登録完了です！🎉\n\nIP事業部 AI新人コーチを始めましょう。\n\nできること：\n・練習 → AIとスクリプト練習\n・テスト → 合否テスト受験\n・進捗確認 → 現在地と推定初稼働日\n・動画 → 手順動画を見る\n\nまずは「練習」と送ってみてください！`
  );
}
