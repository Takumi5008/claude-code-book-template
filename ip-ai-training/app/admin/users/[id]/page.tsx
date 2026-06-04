import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const STEP_LABELS: Record<string, string> = {
  ASSIGNED: "配属", SCRIPT_LEARNING: "スクリプト学習",
  TEST_1: "テスト1", TEST_2: "テスト2", TEST_3: "テスト3",
  MEETING: "ミーティング", OBSERVATION: "見学",
  ASSIGNMENT_MEETING: "配属面談", PRACTICE_1: "実践1",
  PRACTICE_2: "実践2", FIRST_WORK: "初稼働", COMPLETED: "完了",
};

const CHECKLIST_LABELS: Record<number, string> = {
  1: "LINE登録完了", 2: "スクリプトスラスラ", 3: "白紙の書き方",
  4: "同意書書き方", 5: "アトカク退出時トーク", 6: "アウトがきてもスクリプトに戻れる",
  7: "基礎アウト返し", 8: "見学同行", 9: "配属面談", 10: "実践1", 11: "実践2",
  12: "実践3", 13: "解除のやり方わかる",
};

type Props = { params: Promise<{ id: string }> };

export default async function UserDetailPage({ params }: Props) {
  const { id } = await params;

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { id },
      include: {
        progress: true,
        testResults: { orderBy: { createdAt: "asc" } },
        practiceSessions: {
          where: { score: { not: null } },
          orderBy: { createdAt: "asc" },
          select: { score: true, createdAt: true, customerPattern: true },
        },
        checklistItems: { orderBy: { itemNumber: "asc" } },
      },
    });
  } catch (e) {
    return (
      <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
        <p><a href="/admin">← 一覧に戻る</a></p>
        <h1>エラーが発生しました</h1>
        <pre style={{ color: "red", fontSize: 13 }}>{String(e)}</pre>
      </main>
    );
  }

  if (!user) {
    return (
      <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
        <p><a href="/admin">← 一覧に戻る</a></p>
        <p>ユーザーが見つかりません（ID: {id}）</p>
      </main>
    );
  }

  const days = Math.floor((Date.now() - user.joinedAt.getTime()) / 86400000);
  const step = user.progress?.currentStep ?? "ASSIGNED";
  const passedTests = new Set(
    user.testResults.filter((t) => t.passed).map((t) => t.testNumber)
  );
  const scores = user.practiceSessions.map((s) => s.score ?? 0);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const completedChecklist = user.checklistItems.filter((c) => c.completed).length;

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: 800 }}>
      <p style={{ marginBottom: "1rem" }}>
        <a href="/admin" style={{ color: "#0070f3", fontSize: 14 }}>← 一覧に戻る</a>
      </p>

      {/* ヘッダー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ margin: 0 }}>{user.name}</h1>
          <p style={{ color: "#6b7280", margin: "4px 0 0" }}>
            入社{days}日目　|　{user.team ?? "チーム未設定"}　|　{STEP_LABELS[step] ?? step}
          </p>
        </div>
        {user.progress?.estimatedFirstWorkAt && (
          <div style={{ textAlign: "right", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "0.75rem 1rem" }}>
            <div style={{ fontSize: 12, color: "#3b82f6" }}>推定初稼働日</div>
            <div style={{ fontWeight: "bold", fontSize: 18 }}>
              {user.progress.estimatedFirstWorkAt.toLocaleDateString("ja-JP")}
            </div>
          </div>
        )}
      </div>

      {/* テスト結果 */}
      <Section title="テスト結果">
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {[1, 2, 3, 4, 5, 6].map((n) => {
            const passed = passedTests.has(n);
            const attempts = user.testResults.filter((t) => t.testNumber === n);
            const best = attempts.length > 0 ? Math.max(...attempts.map((t) => t.score)) : null;
            return (
              <div key={n} style={{
                border: `2px solid ${passed ? "#16a34a" : "#e5e7eb"}`,
                borderRadius: 8, padding: "0.75rem 1rem", minWidth: 100, textAlign: "center",
                background: passed ? "#f0fdf4" : "#f9fafb",
              }}>
                <div style={{ fontSize: 13, color: "#6b7280" }}>テスト{n}</div>
                <div style={{ fontSize: 22, margin: "4px 0" }}>{passed ? "✅" : "⬜"}</div>
                {best !== null && <div style={{ fontSize: 12, color: "#374151" }}>最高{best}点</div>}
                {attempts.length > 0 && <div style={{ fontSize: 11, color: "#9ca3af" }}>{attempts.length}回受験</div>}
              </div>
            );
          })}
        </div>
      </Section>

      {/* 練習スコア推移 */}
      <Section title={`練習スコア推移（全${scores.length}回・平均${avgScore ?? "-"}点）`}>
        {scores.length === 0 ? (
          <p style={{ color: "#9ca3af" }}>練習記録なし</p>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80 }}>
            {scores.slice(-20).map((score, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                <div style={{ fontSize: 9, color: "#6b7280", marginBottom: 2 }}>{score}</div>
                <div style={{
                  width: "100%", background: score >= 70 ? "#3b82f6" : "#fca5a5",
                  borderRadius: "3px 3px 0 0", height: `${score * 0.6}px`,
                }} />
              </div>
            ))}
          </div>
        )}
        {scores.length > 0 && (
          <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 12, color: "#6b7280" }}>
            <span>🔵 合格（70点以上）</span><span>🔴 不合格</span>
          </div>
        )}
      </Section>

      {/* チェックリスト */}
      <Section title={`チェックリスト（${completedChecklist}/13項目完了）`}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
          {user.checklistItems.map((item) => (
            <div key={item.itemNumber} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
              <span>{item.completed ? "✅" : "⬜"}</span>
              <span style={{ color: item.completed ? "#111" : "#9ca3af" }}>
                {CHECKLIST_LABELS[item.itemNumber] ?? `項目${item.itemNumber}`}
              </span>
              {item.completedAt && (
                <span style={{ fontSize: 11, color: "#9ca3af" }}>
                  {item.completedAt.toLocaleDateString("ja-JP")}
                </span>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* テスト受験履歴 */}
      {user.testResults.length > 0 && (
        <Section title="テスト受験履歴">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                <th style={th}>テスト</th><th style={th}>結果</th>
                <th style={th}>スコア</th><th style={th}>受験日</th>
              </tr>
            </thead>
            <tbody>
              {user.testResults.map((r) => (
                <tr key={r.id}>
                  <td style={td}>テスト{r.testNumber}（{r.attemptNumber}回目）</td>
                  <td style={td}>{r.passed ? "✅合格" : "❌不合格"}</td>
                  <td style={{ ...td, fontWeight: "bold", color: r.score >= 70 ? "#16a34a" : "#dc2626" }}>{r.score}点</td>
                  <td style={td}>{r.createdAt.toLocaleDateString("ja-JP")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <h2 style={{ fontSize: 16, borderBottom: "2px solid #e5e7eb", paddingBottom: "0.5rem", marginBottom: "1rem" }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

const th: React.CSSProperties = { padding: "0.4rem 0.75rem", textAlign: "left", border: "1px solid #e5e7eb" };
const td: React.CSSProperties = { padding: "0.4rem 0.75rem", border: "1px solid #e5e7eb" };
