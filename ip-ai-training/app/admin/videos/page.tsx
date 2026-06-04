"use client";

import { useEffect, useRef, useState } from "react";

type Video = { id: string; title: string; category: string; url: string; createdAt: string };

const CATEGORIES = [
  { key: "スクリプト", label: "スクリプト練習動画" },
  { key: "白紙", label: "白紙の書き方" },
  { key: "同意書", label: "同意書の書き方" },
];

export default function AdminVideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = async () => {
    const res = await fetch("/api/admin/videos");
    setVideos(await res.json());
  };

  useEffect(() => { load(); }, []);

  const upload = async (category: string, label: string) => {
    const input = fileRefs.current[category];
    if (!input?.files?.[0]) return alert("ファイルを選択してください");
    const file = input.files[0];

    setUploading(category);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", label);
    fd.append("category", category);

    const res = await fetch("/api/admin/videos", { method: "POST", body: fd });
    if (res.ok) {
      input.value = "";
      await load();
    } else {
      alert("アップロードに失敗しました");
    }
    setUploading(null);
  };

  const deleteVideo = async (id: string) => {
    if (!confirm("この動画を削除しますか？")) return;
    await fetch("/api/admin/videos", { method: "DELETE", body: JSON.stringify({ id }), headers: { "Content-Type": "application/json" } });
    await load();
  };

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: 700 }}>
      <h1>動画ライブラリ管理</h1>
      <p style={{ color: "#666", fontSize: 14 }}>各カテゴリに動画をアップロードしてください。同じカテゴリは最新1本のみ保持されます。</p>

      {CATEGORIES.map(({ key, label }) => {
        const current = videos.find((v) => v.category === key);
        return (
          <div key={key} style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1rem", marginBottom: "1rem" }}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>{label}</h2>
            {current ? (
              <div style={{ marginBottom: "0.75rem" }}>
                <video src={current.url} controls style={{ width: "100%", maxHeight: 200, background: "#000", borderRadius: 4 }} />
                <p style={{ fontSize: 12, color: "#888", margin: "4px 0" }}>
                  アップロード日: {new Date(current.createdAt).toLocaleDateString("ja-JP")}
                </p>
                <button onClick={() => deleteVideo(current.id)} style={deleteBtn}>削除</button>
              </div>
            ) : (
              <p style={{ color: "#aaa", fontSize: 14 }}>未登録</p>
            )}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="file"
                accept="video/*"
                ref={(el) => { fileRefs.current[key] = el; }}
                style={{ flex: 1 }}
              />
              <button
                onClick={() => upload(key, label)}
                disabled={uploading === key}
                style={uploadBtn}
              >
                {uploading === key ? "アップロード中..." : "アップロード"}
              </button>
            </div>
          </div>
        );
      })}

      <p style={{ marginTop: "2rem" }}>
        <a href="/admin" style={{ color: "#0070f3" }}>← 管理者トップへ戻る</a>
      </p>
    </main>
  );
}

const uploadBtn: React.CSSProperties = {
  padding: "0.5rem 1rem",
  background: "#0070f3",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const deleteBtn: React.CSSProperties = {
  padding: "0.25rem 0.75rem",
  background: "#e53e3e",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 12,
  marginBottom: "0.5rem",
};
