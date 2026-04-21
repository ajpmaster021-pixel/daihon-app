"use client";

import { useState, useRef, useEffect } from "react";

interface FormData {
  deity: string;
  theme: string;
  keywords: string;
  style: string;
  length: string;
  targetAudience: string;
  includeCta: boolean;
}

const DEITY_PRESETS = [
  "アメノミナカヌシ",
  "天照大御神",
  "龍神",
  "大黒天",
  "弁財天",
  "不動明王",
  "高次元の存在",
  "守護霊",
];

const THEME_PRESETS = [
  "何もかも全てうまくいく・全方位好転",
  "金運・豊かさ・富",
  "愛・恋愛・人間関係",
  "健康・癒し・浄化",
  "仕事・使命・成功",
  "自己肯定感・自信",
  "運命の好転・潮目の変化",
];

export default function Home() {
  const [form, setForm] = useState<FormData>({
    deity: "アメノミナカヌシ",
    theme: "何もかも全てうまくいく・全方位好転",
    keywords: "黄金、宇宙、魂、好転、波動",
    style: "powerful",
    length: "medium",
    targetAudience: "人生に悩み、変化を求めている人",
    includeCta: true,
  });

  const [script, setScript] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCharCount(script.length);
    if (outputRef.current && isGenerating) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [script, isGenerating]);

  const handleGenerate = async () => {
    setScript("");
    setIsGenerating(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok || !res.body) {
        throw new Error("生成に失敗しました");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.text) setScript((prev) => prev + parsed.text);
          } catch {
            // skip malformed chunks
          }
        }
      }
    } catch (err) {
      setScript((prev) => prev + "\n\n⚠️ エラーが発生しました: " + (err instanceof Error ? err.message : "不明なエラー"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="min-h-screen py-10 px-4" style={{ background: "linear-gradient(180deg, #0a0a0f 0%, #0f0a1a 100%)" }}>
      {/* Header */}
      <div className="text-center mb-10">
        <div className="text-5xl mb-3">✨</div>
        <h1 className="text-3xl font-bold mb-2 gold-gradient">台本ジェネレーター</h1>
        <p style={{ color: "rgba(226,217,200,0.6)", fontSize: "14px" }}>
          神様・スピリチュアルメッセージ台本を自動生成
        </p>
      </div>

      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6">
        {/* Left: Form */}
        <div className="lg:w-2/5 flex-shrink-0">
          <div
            className="rounded-xl p-6 shimmer-border"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            <h2 className="font-bold mb-5" style={{ color: "#fbbf24", fontSize: "16px" }}>
              台本の設定
            </h2>

            {/* Deity */}
            <div className="mb-4">
              <label className="block mb-2" style={{ fontSize: "13px", color: "rgba(226,217,200,0.7)" }}>
                神様・存在の名前
              </label>
              <input
                type="text"
                value={form.deity}
                onChange={(e) => setForm({ ...form, deity: e.target.value })}
                placeholder="例: アメノミナカヌシ"
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {DEITY_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setForm({ ...form, deity: preset })}
                    className="text-xs px-2 py-1 rounded transition-colors"
                    style={{
                      background: form.deity === preset
                        ? "rgba(251,191,36,0.2)"
                        : "rgba(255,255,255,0.05)",
                      border: `1px solid ${form.deity === preset ? "rgba(251,191,36,0.5)" : "rgba(255,255,255,0.1)"}`,
                      color: form.deity === preset ? "#fbbf24" : "rgba(226,217,200,0.6)",
                      cursor: "pointer",
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme */}
            <div className="mb-4">
              <label className="block mb-2" style={{ fontSize: "13px", color: "rgba(226,217,200,0.7)" }}>
                テーマ・主題
              </label>
              <input
                type="text"
                value={form.theme}
                onChange={(e) => setForm({ ...form, theme: e.target.value })}
                placeholder="例: 金運アップ・豊かさ"
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {THEME_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setForm({ ...form, theme: preset })}
                    className="text-xs px-2 py-1 rounded transition-colors"
                    style={{
                      background: form.theme === preset
                        ? "rgba(251,191,36,0.2)"
                        : "rgba(255,255,255,0.05)",
                      border: `1px solid ${form.theme === preset ? "rgba(251,191,36,0.5)" : "rgba(255,255,255,0.1)"}`,
                      color: form.theme === preset ? "#fbbf24" : "rgba(226,217,200,0.6)",
                      cursor: "pointer",
                      fontSize: "11px",
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Keywords */}
            <div className="mb-4">
              <label className="block mb-2" style={{ fontSize: "13px", color: "rgba(226,217,200,0.7)" }}>
                メインキーワード（カンマ区切り）
              </label>
              <input
                type="text"
                value={form.keywords}
                onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                placeholder="例: 黄金、宇宙、魂、光"
              />
            </div>

            {/* Target Audience */}
            <div className="mb-4">
              <label className="block mb-2" style={{ fontSize: "13px", color: "rgba(226,217,200,0.7)" }}>
                ターゲット視聴者
              </label>
              <input
                type="text"
                value={form.targetAudience}
                onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
                placeholder="例: お金に悩む人、恋愛で傷ついた人"
              />
            </div>

            {/* Style */}
            <div className="mb-4">
              <label className="block mb-2" style={{ fontSize: "13px", color: "rgba(226,217,200,0.7)" }}>
                スタイル
              </label>
              <select
                value={form.style}
                onChange={(e) => setForm({ ...form, style: e.target.value })}
              >
                <option value="powerful">力強い・威厳（宣言型）</option>
                <option value="gentle">優しい・寄り添い（共感型）</option>
                <option value="mystical">神秘的・幻想的（宇宙型）</option>
                <option value="urgent">緊急性・高エネルギー（覚醒型）</option>
              </select>
            </div>

            {/* Length */}
            <div className="mb-4">
              <label className="block mb-2" style={{ fontSize: "13px", color: "rgba(226,217,200,0.7)" }}>
                台本の長さ
              </label>
              <select
                value={form.length}
                onChange={(e) => setForm({ ...form, length: e.target.value })}
              >
                <option value="short">短め（約1500〜2000文字）</option>
                <option value="medium">標準（約3000〜4000文字）</option>
                <option value="long">長め（約5000〜6000文字）</option>
              </select>
            </div>

            {/* CTA */}
            <div className="mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setForm({ ...form, includeCta: !form.includeCta })}
                  className="relative"
                  style={{
                    width: "44px",
                    height: "24px",
                    borderRadius: "12px",
                    background: form.includeCta ? "rgba(251,191,36,0.8)" : "rgba(255,255,255,0.15)",
                    transition: "background 0.2s",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "3px",
                      left: form.includeCta ? "22px" : "3px",
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      background: "white",
                      transition: "left 0.2s",
                    }}
                  />
                </div>
                <span style={{ fontSize: "13px", color: "rgba(226,217,200,0.7)" }}>
                  チャンネル登録への誘導を含める
                </span>
              </label>
            </div>

            <button
              className="btn-generate"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? "✨ 生成中..." : "✨ 台本を生成する"}
            </button>
          </div>
        </div>

        {/* Right: Output */}
        <div className="lg:flex-1">
          <div
            className="rounded-xl shimmer-border"
            style={{
              background: "rgba(255,255,255,0.02)",
              minHeight: "600px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Output Header */}
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: "1px solid rgba(251,191,36,0.15)" }}
            >
              <div className="flex items-center gap-3">
                <span style={{ color: "#fbbf24", fontSize: "16px", fontWeight: "bold" }}>
                  生成された台本
                </span>
                {charCount > 0 && (
                  <span
                    className="text-xs px-2 py-1 rounded"
                    style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24" }}
                  >
                    {charCount.toLocaleString()}文字
                  </span>
                )}
              </div>
              {script && !isGenerating && (
                <button className="btn-copy" onClick={handleCopy}>
                  {copied ? "✓ コピー済み" : "コピー"}
                </button>
              )}
            </div>

            {/* Output Body */}
            <div
              ref={outputRef}
              className="flex-1 overflow-y-auto p-6"
              style={{ maxHeight: "70vh" }}
            >
              {!script && !isGenerating ? (
                <div
                  className="flex flex-col items-center justify-center h-full py-20"
                  style={{ color: "rgba(226,217,200,0.25)" }}
                >
                  <div className="text-6xl mb-4">📜</div>
                  <p className="text-center text-sm">
                    左側のフォームで設定を入力し<br />
                    「台本を生成する」をクリックしてください
                  </p>
                </div>
              ) : (
                <div
                  className={`script-output ${isGenerating && script ? "cursor-blink" : ""}`}
                >
                  {script}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-10" style={{ color: "rgba(226,217,200,0.2)", fontSize: "12px" }}>
        Powered by Claude API
      </div>
    </main>
  );
}
