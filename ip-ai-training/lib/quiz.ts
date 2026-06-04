import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export type QuizQuestion = {
  question: string;
  correctAnswer: string;
  hint: string;
};

const QUIZ_TOPICS: Record<string, string> = {
  スクリプト: `訪問販売員のインターホントーク〜同意書までのスクリプト。
主な内容：自己紹介の仕方・用件の伝え方・玄関先への誘導・機械説明・同意書の流れ`,

  白紙: `訪問販売の白紙（工事申込書・申込書）の書き方。
主な内容：お客様の氏名・住所・電話番号・現在の回線情報・工事希望日の記入方法・記入上の注意点`,

  同意書: `訪問販売の同意書の書き方・説明の仕方。
主な内容：同意書の各項目の説明・お客様のサインをもらう手順・記入してはいけない箇所・控えの渡し方`,
};

// カテゴリ別に3問生成
export async function generateQuizQuestions(category: string): Promise<QuizQuestion[]> {
  const topic = QUIZ_TOPICS[category] ?? category;

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "user",
        content: `あなたは訪問販売員の研修担当者です。以下のトピックについて、新人が理解できているか確認する3択クイズを3問作成してください。

トピック：${topic}

【ルール】
- 実務的で具体的な問題にする
- 正解は一つ、選択肢はA・B・Cの3択
- hintは正解の理由を簡潔に（30文字以内）

以下のJSON形式のみで返してください（他の文字列不要）：
[
  {"question":"問題文（選択肢A/B/Cを含む）","correctAnswer":"A","hint":"正解の理由"},
  {"question":"問題文（選択肢A/B/Cを含む）","correctAnswer":"B","hint":"正解の理由"},
  {"question":"問題文（選択肢A/B/Cを含む）","correctAnswer":"C","hint":"正解の理由"}
]`,
      },
    ],
    max_tokens: 1024,
  });

  const text = response.choices[0]?.message?.content ?? "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("クイズ生成に失敗しました");
  return JSON.parse(jsonMatch[0]);
}

// ユーザーの回答が正解かどうかを判定（A/B/Cの表記ゆれに対応）
export function judgeAnswer(userAnswer: string, correctAnswer: string): boolean {
  const normalized = userAnswer.trim().toUpperCase().replace(/[ａ-ｃ]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xfee0)
  );
  return normalized.startsWith(correctAnswer.toUpperCase());
}
