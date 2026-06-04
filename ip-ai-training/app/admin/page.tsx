import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const STEP_LABELS: Record<string, string> = {
  ASSIGNED: "配属",
  SCRIPT_LEARNING: "スクリプト学習",
  TEST_1: "テスト1",
  TEST_2: "テスト2",
  TEST_3: "テスト3",
  MEETING: "ミーティング",
  OBSERVATION: "見学",
  ASSIGNMENT_MEETING: "配属面談",
  PRACTICE_1: "実践1",
  PRACTICE_2: "実践2",
  FIRST_WORK: "初稼働",
  COMPLETED: "完了",
};

const STEP_ORDER = Object.keys(STEP_LABELS);

export default async function AdminPage() {
  const users = await prisma.user.findMany({
    where: { role: "TRAINEE" },
    include: {
      progress: true,
      testResults: { where: { passed: true }, distinct: ["testNumber"], select: { testNumber: true } },
      practiceSessions: { where: { score: { not: null } }, orderBy: { createdAt: "desc" }, take: 1, select: { score: true, createdAt: true } },
    },
    orderBy: { joinedAt: "desc" },
  });

  const totalUsers = users.length;
  const avgDays = totalUsers > 0
    ? Math.round(users.reduce((s, u) => s + Math.floor((Date.now() - u.joinedAt.getTime()) / 86400000) + 1, 0) / totalUsers)
    : 0;
  const test3Passed = users.filter((u) => u.testResults.some((t) => t.testNumber === 3)).length;

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: 960 }}>
      <h1 style={{ marginBottom: "0.25rem" }}>管理者ダッシュボード</h1>
      <p style={{ marginBottom: "1.5rem" }}>
        <a href="/admin/videos" style={{ color: "#0070f3", fontSize: 14 }}>📹 動画ライブラリ管理</a>
      </p>

      {/* サマリーカード */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" }}>
        <StatCard label="在籍中の新人" value={`${totalUsers}人`} />
        <StatCard label="平均研修日数" value={`${avgDays}日`} />
        <StatCard label="テスト3合格済" value={`${test3Passed}人`} />
      </div>

      {/* 新人一覧 */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            <th style={th}>名前</th>
            <th style={th}>研修日数</th>
            <th style={th}>現在地</th>
            <th style={th}>テスト合格</th>
            <th style={th}>直近スコア</th>
            <th style={th}>推定初稼働</th>
            <th style={th}>詳細</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const days = Math.floor((Date.now() - user.joinedAt.getTime()) / 86400000) + 1;
            const step = user.progress?.currentStep ?? "ASSIGNED";
            const stepIdx = STEP_ORDER.indexOf(step);
            const progressPct = Math.round((stepIdx / (STEP_ORDER.length - 1)) * 100);
            const passedCount = user.testResults.length;
            const lastScore = user.practiceSessions[0]?.score ?? null;
            const estimated = user.progress?.estimatedFirstWorkAt;

            return (
              <tr key={user.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={td}><strong>{user.name}</strong></td>
                <td style={td}>研修{days}日目</td>
                <td style={td}>
                  <div style={{ fontSize: 12, marginBottom: 4 }}>{STEP_LABELS[step] ?? step}</div>
                  <div style={{ background: "#e5e7eb", borderRadius: 4, height: 6, width: 120 }}>
                    <div style={{ background: "#3b82f6", borderRadius: 4, height: 6, width: `${progressPct}%` }} />
                  </div>
                </td>
                <td style={{ ...td, textAlign: "center" }}>{passedCount}/6</td>
                <td style={{ ...td, textAlign: "center" }}>
                  {lastScore !== null ? (
                    <span style={{ color: lastScore >= 70 ? "#16a34a" : "#dc2626", fontWeight: "bold" }}>
                      {lastScore}点
                    </span>
                  ) : "-"}
                </td>
                <td style={{ ...td, fontSize: 13 }}>
                  {estimated ? estimated.toLocaleDateString("ja-JP") : "-"}
                </td>
                <td style={td}>
                  <a href={`/admin/users/${user.id}`} style={{ color: "#0070f3" }}>詳細 →</a>
                </td>
              </tr>
            );
          })}
          {users.length === 0 && (
            <tr>
              <td colSpan={7} style={{ ...td, textAlign: "center", color: "#999", padding: "2rem" }}>
                登録済みの新人はいません
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "1rem 1.5rem", minWidth: 140 }}>
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: "bold", color: "#111" }}>{value}</div>
    </div>
  );
}

const th: React.CSSProperties = { padding: "0.6rem 1rem", textAlign: "left", border: "1px solid #e5e7eb", fontSize: 13, color: "#374151" };
const td: React.CSSProperties = { padding: "0.6rem 1rem", border: "1px solid #e5e7eb", verticalAlign: "middle" };
