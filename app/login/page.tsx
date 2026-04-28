"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "ログインに失敗しました");
    }
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(180deg, #0a0a0f 0%, #0f0a1a 100%)" }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(251,191,36,0.2)",
          borderRadius: "16px",
          padding: "40px 36px",
          width: "100%",
          maxWidth: "360px",
        }}
      >
        <div className="text-center mb-8">
          <div style={{ fontSize: "40px", marginBottom: "10px" }}>✨</div>
          <h1 style={{ fontSize: "20px", fontWeight: "bold", color: "#fbbf24" }}>
            台本ジェネレーター
          </h1>
          <p style={{ fontSize: "13px", color: "rgba(226,217,200,0.4)", marginTop: "6px" }}>
            パスワードを入力してください
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワード"
            autoFocus
            style={{
              width: "100%",
              fontSize: "15px",
              padding: "12px 16px",
              marginBottom: "12px",
              textAlign: "center",
              letterSpacing: "0.1em",
            }}
          />

          {error && (
            <p style={{ fontSize: "13px", color: "#f87171", textAlign: "center", marginBottom: "10px" }}>
              ⚠️ {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            style={{
              width: "100%",
              background: loading || !password.trim()
                ? "rgba(255,255,255,0.05)"
                : "linear-gradient(135deg, #92400e, #b45309, #d97706)",
              color: loading || !password.trim() ? "rgba(226,217,200,0.3)" : "#fff",
              fontWeight: "700",
              padding: "12px",
              borderRadius: "8px",
              border: "none",
              cursor: loading || !password.trim() ? "default" : "pointer",
              fontSize: "14px",
            }}
          >
            {loading ? "確認中..." : "ログイン"}
          </button>
        </form>
      </div>
    </main>
  );
}
