"use client";

import { useState } from "react";

type Props = {
  userId: string;
  passedTests: number[];
  testHistory: { testNumber: number; score: number; attemptNumber: number }[];
};

export default function TestCards({ userId, passedTests, testHistory }: Props) {
  const [passed, setPassed] = useState(new Set(passedTests));
  const [loading, setLoading] = useState<number | null>(null);

  const markPass = async (testNumber: number) => {
    if (!confirm(`テスト${testNumber}を合格にしますか？`)) return;
    setLoading(testNumber);
    const res = await fetch(`/api/admin/users/${userId}/test-pass`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testNumber }),
    });
    if (res.ok) {
      setPassed((prev) => new Set([...prev, testNumber]));
    } else {
      alert("エラーが発生しました");
    }
    setLoading(null);
  };

  return (
    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
      {[1, 2, 3].map((n) => {
        const isPassed = passed.has(n);
        const attempts = testHistory.filter((t) => t.testNumber === n);
        const best = attempts.length > 0 ? Math.max(...attempts.map((t) => t.score)) : null;
        return (
          <div key={n} style={{
            border: `2px solid ${isPassed ? "#16a34a" : "#e5e7eb"}`,
            borderRadius: 8, padding: "0.75rem 1rem", minWidth: 110, textAlign: "center",
            background: isPassed ? "#f0fdf4" : "#f9fafb",
          }}>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>テスト{n}</div>
            <div style={{ fontSize: 22, margin: "4px 0" }}>{isPassed ? "✅" : "⬜"}</div>
            {best !== null && <div style={{ fontSize: 12, color: "#374151" }}>最高{best}点</div>}
            {attempts.length > 0 && <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>{attempts.length}回受験</div>}
            {!isPassed && (
              <button
                onClick={() => markPass(n)}
                disabled={loading === n}
                style={{
                  marginTop: 4, padding: "4px 10px", fontSize: 12,
                  background: "#16a34a", color: "#fff", border: "none",
                  borderRadius: 4, cursor: "pointer", width: "100%",
                }}
              >
                {loading === n ? "処理中..." : "合格にする"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
