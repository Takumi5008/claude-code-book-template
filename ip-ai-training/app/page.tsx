import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>IP AI Training</h1>
      <p>管理者ダッシュボードは <Link href="/admin">こちら</Link></p>
    </main>
  );
}
