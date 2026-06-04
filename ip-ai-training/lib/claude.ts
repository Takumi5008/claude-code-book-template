import Groq from "groq-sdk";
import { toFile } from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export type CustomerPattern = "A" | "B" | "C" | "D" | "E";

const CUSTOMER_DESCRIPTIONS: Record<CustomerPattern, string> = {
  A: "NTT系回線（フレッツ光など）を契約中のお客様",
  B: "JCOMを契約中のお客様",
  C: "ホームルーターまたはポケットWi-Fiをご利用中のお客様",
  D: "断り文句（アウト）が多いお客様。強めの拒否反応を示す",
  E: "au/UQ mobileをご利用中のお客様",
};

export function buildCustomerSystemPrompt(pattern: CustomerPattern): string {
  return `あなたは訪問販売員が練習するためのロールプレイ用AIです。
以下のお客様を演じてください。

お客様の設定：${CUSTOMER_DESCRIPTIONS[pattern]}
※この設定は、販売員から質問されたときに初めて自然に出す情報です。最初から自分で言わないこと。

【返答の長さのルール】
- インターホンに出た直後〜販売員の自己紹介が終わるまで：「はい？」「はい」「え？」「そうですか」など一言〜二言の相槌のみ
- 販売員が用件を説明し始めたら：少しずつ反応を増やしてよい
- 販売員から質問されたとき：初めて自分の状況（回線・契約など）を答える

【その他のルール】
- 玄関先でインターホンに出るお客様として自然に会話する
- 最初は少し警戒気味にしてOK
- 販売員が正しい手順でトークを進めていれば、徐々に話を聞いてくれるようになる
- パターンDの場合は「結構です」「いらないです」などのアウトを自然なタイミングで入れる
- 実際のお客様らしい自然な日本語で話す
- 練習終了の合図（「練習終了」「採点して」「終了」）があれば「採点します」とだけ答える`;
}

export type ConversationMessage = { role: "user" | "assistant"; content: string };

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const file = await toFile(audioBuffer, "audio.m4a", { type: "audio/m4a" });
  const transcription = await groq.audio.transcriptions.create({
    file,
    model: "whisper-large-v3",
    language: "ja",
  });
  return transcription.text;
}

export async function chatWithCustomer(
  systemPrompt: string,
  history: ConversationMessage[],
  userMessage: string
): Promise<string> {
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userMessage },
    ],
    max_tokens: 512,
  });

  return response.choices[0]?.message?.content ?? "...";
}

const TEST_REQUIREMENTS: Record<number, string> = {
  1: `【テスト範囲】インターホン応対〜「お待たせいたしました！」まで
【必須セリフ】
・こんにちは、お世話になっております
・回線設備のご連絡でお伺いしております（用件を伝える）
・担当者名を名乗る（〇〇と申します）
・玄関先でのご対応をお願いする
・お待たせいたしました！`,

  2: `【テスト範囲】インターホン応対〜機械説明まで（テスト1の内容含む通し）
【必須セリフ】
・テスト1の全セリフ
・回線機械の確認依頼（機械を見せてもらう）
・作業内容・所要時間の説明`,

  3: `【テスト範囲】インターホン応対〜同意書まで（完全通し）
【必須セリフ】
・テスト1・2の全セリフ
・クロージング
・同意書の記入依頼`,

  4: `【テスト範囲】アウト返し（断り文句への切り返し）
【評価ポイント】
・「結構です」「いらないです」などの断りに対して適切に切り返せているか
・感情的にならず落ち着いて対応できているか
・スクリプトに戻れているか`,

  5: `【テスト範囲】同意書記入後〜退出まで
【必須セリフ】
・同意書記入後のお礼・確認
・退出時の挨拶・次回連絡の案内`,

  6: `【テスト範囲】後確（後日確認）〜今後の流れ説明まで
【必須セリフ】
・後確の説明
・今後のスケジュール・流れの案内`,
};

export function buildTestCustomerPrompt(testNumber: number): string {
  const descriptions: Record<number, string> = {
    1: "NTT系回線を契約中の普通のお客様",
    2: "NTT系回線を契約中の普通のお客様",
    3: "NTT系回線を契約中の普通のお客様",
    4: "断り文句が多く、警戒心が強いお客様。「結構です」「いらないです」「忙しい」などを複数回使う",
    5: "同意書に署名したばかりのお客様",
    6: "後確の連絡を受けたお客様",
  };

  return `あなたは訪問販売員のテスト練習相手のAIです。
お客様の設定：${descriptions[testNumber] ?? "普通のお客様"}
※この設定は販売員に質問されたときだけ自然に出す情報です。

【返答ルール】
- インターホン直後〜自己紹介中は「はい？」「はい」など相槌のみ
- 販売員が用件を説明し始めたら少しずつ反応を増やす
- 質問されたときだけ自分の状況を答える
- テスト4の場合は自然なタイミングで「結構です」「いらないです」などを入れる
- 販売員のセリフが途切れたり「テスト終了」と言われたら「わかりました」とだけ答える

実際のお客様らしい自然な日本語で話してください。`;
}

export type ScoreResult = {
  score: number;
  passed: boolean;
  goodPoints: string[];
  improvements: string[];
  focusNext: string;
  missedPhrases: string[];
};

export async function scoreTestConversation(
  conversation: string,
  testNumber: number
): Promise<ScoreResult> {
  const requirements = TEST_REQUIREMENTS[testNumber] ?? "";

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "user",
        content: `以下は新人訪問販売員のテスト${testNumber}の会話ログです。採点してください。

${requirements}

会話ログ：
${conversation}

採点基準（100点満点）：
- 必須セリフが全て含まれている：60点
- お客様の反応に対して適切に対応できている：20点
- 自然な話し方・丁寧な言葉遣い：20点

【重要なルール】
- 会話ログに実際にあった内容のみに基づいてフィードバックすること
- 会話ログにない問題は絶対に指摘しないこと
- missedPhrasesは実際に抜けていたセリフのみ（全部言えていれば空配列）
- 70点以上を合格とする

以下のJSON形式のみで返してください（他の文字列不要）：
{"score":数値,"passed":true/false,"goodPoints":["よかった点"],"improvements":["改善点"],"focusNext":"次に意識すること","missedPhrases":["抜けたセリフ"]}`,
      },
    ],
    max_tokens: 1024,
  });

  const text = response.choices[0]?.message?.content ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("採点結果のパースに失敗しました");
  return JSON.parse(jsonMatch[0]);
}

export async function scoreConversation(
  conversation: string,
  testNumber: number
): Promise<{
  score: number;
  passed: boolean;
  goodPoints: string[];
  improvements: string[];
  focusNext: string;
  missedPhrases: string[];
}> {
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "user",
        content: `以下は新人訪問販売員のスクリプト練習の会話ログです。テスト${testNumber || "練習"}の採点をしてください。

会話ログ：
${conversation}

採点基準（100点満点）：
- 必須セリフ（自己紹介・会社名・担当者名・用件・玄関先への誘導）が全て含まれている：60点
- お客様の反応に対して適切に返答できている：20点
- 自然な話し方・丁寧な言葉遣い：20点

【重要なルール】
- goodPoints・improvements・focusNextは、必ず上記の会話ログの内容に基づいて記述すること
- 会話ログに存在しない問題（例：えーあのーが多い、など）は絶対に指摘しないこと
- 会話ログに実際にあった発言を根拠にして、具体的にフィードバックすること
- missedPhrasesには会話ログに実際に含まれていなかった必須セリフのみを列挙すること（含まれていれば空配列）
- 70点以上を合格とする

以下のJSON形式のみで返してください（他の文字列不要）：
{"score":数値,"passed":true/false,"goodPoints":["よかった点"],"improvements":["改善点"],"focusNext":"次に意識すること","missedPhrases":["抜けたセリフ"]}`,
      },
    ],
    max_tokens: 1024,
  });

  const text = response.choices[0]?.message?.content ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("採点結果のパースに失敗しました");

  return JSON.parse(jsonMatch[0]);
}
