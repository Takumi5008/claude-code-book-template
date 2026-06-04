import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const users = await prisma.user.findMany({
    where: { role: "TRAINEE" },
    include: { progress: true },
    orderBy: { joinedAt: "desc" },
  });

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>管理者ダッシュボード</h1>
      <p><a href="/admin/videos" style={{ color: "#0070f3" }}>📹 動画ライブラリ管理</a></p>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
            <th style={th}>名前</th>
            <th style={th}>チーム</th>
            <th style={th}>入社日</th>
            <th style={th}>現在のステップ</th>
            <th style={th}>詳細</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td style={td}>{user.name}</td>
              <td style={td}>{user.team ?? "-"}</td>
              <td style={td}>{user.joinedAt.toLocaleDateString("ja-JP")}</td>
              <td style={td}>{user.progress?.currentStep ?? "-"}</td>
              <td style={td}>
                <a href={`/admin/users/${user.id}`}>詳細 →</a>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={5} style={{ ...td, textAlign: "center", color: "#999" }}>
                登録済みの新人はいません
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}

const th: React.CSSProperties = { padding: "0.5rem 1rem", textAlign: "left", border: "1px solid #ddd" };
const td: React.CSSProperties = { padding: "0.5rem 1rem", border: "1px solid #ddd" };
