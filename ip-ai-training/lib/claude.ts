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
