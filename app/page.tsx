"use client";

import { useState, useRef, useEffect } from "react";

const ELEVENLABS_VOICES = [
  { id: "21m00Tcm4TlvDq8ikWAM", label: "Rachel（落ち着いた女性）" },
  { id: "EXAVITQu4vr4xnSDxMaL", label: "Bella（柔らかい女性）" },
  { id: "MF3mGyEYCl7XYWbV9V6O", label: "Elli（若い女性）" },
  { id: "piTKgcLEGmPE4e6mEKli", label: "Nicole（ウィスパー女性）" },
  { id: "pNInz6obpgDQGcFmaJgB", label: "Adam（深みのある男性）" },
  { id: "ErXwobaYiN019PkySvjV", label: "Antoni（穏やかな男性）" },
  { id: "TxGEqnHWrfWFTfGW9XjX", label: "Josh（力強い男性）" },
  { id: "VR6AewLTigWG4xSOukaG", label: "Arnold（威厳のある男性）" },
  { id: "custom", label: "カスタムVoice ID..." },
];

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

const DEFAULT_THEME_PRESETS = [
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
  const [themePresets, setThemePresets] = useState(DEFAULT_THEME_PRESETS);
  const [newTheme, setNewTheme] = useState("");
  const outputRef = useRef<HTMLDivElement>(null);

  // ElevenLabs TTS
  const [selectedVoice, setSelectedVoice] = useState(ELEVENLABS_VOICES[0].id);
  const [customVoiceId, setCustomVoiceId] = useState("");
  const [customVoiceName, setCustomVoiceName] = useState("");
  const [savedVoices, setSavedVoices] = useState<{ id: string; label: string }[]>([]);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioError, setAudioError] = useState("");
  const [audioProgress, setAudioProgress] = useState<{ current: number; total: number } | null>(null);

  // HeyGen
  const [savedPhotoAvatars, setSavedPhotoAvatars] = useState<{ id: string; label: string; previewUrl?: string }[]>([]);
  const [selectedPhotoAvatarId, setSelectedPhotoAvatarId] = useState("");
  const [newPhotoAvatarId, setNewPhotoAvatarId] = useState("");
  const [newPhotoAvatarLabel, setNewPhotoAvatarLabel] = useState("");
  const [newPhotoAvatarPreview, setNewPhotoAvatarPreview] = useState<string | null>(null);
  const avatarPreviewInputRef = useRef<HTMLInputElement>(null);
  const [heygenUploadStatus, setHeygenUploadStatus] = useState<"idle" | "uploading" | "uploading-bg" | "mixing">("idle");
  const [heygenBgColor, setHeygenBgColor] = useState("#1a0a2e");
  const [heygenBgType, setHeygenBgType] = useState<"color" | "image">("color");
  const [heygenBgImageFile, setHeygenBgImageFile] = useState<File | null>(null);
  const [heygenBgImagePreview, setHeygenBgImagePreview] = useState<string | null>(null);
  const [heygenBgImageUrl, setHeygenBgImageUrl] = useState<string | null>(null);
  const bgImageInputRef = useRef<HTMLInputElement>(null);
  const [heygenDimension, setHeygenDimension] = useState("1280x720");
  const [heygenVideoId, setHeygenVideoId] = useState("");
  const [heygenStatus, setHeygenStatus] = useState<"idle" | "pending" | "processing" | "completed" | "failed">("idle");
  const [heygenVideoUrl, setHeygenVideoUrl] = useState("");
  const [heygenThumbnail, setHeygenThumbnail] = useState("");
  const [heygenError, setHeygenError] = useState("");
  const heygenPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // BGM
  const [bgmFile, setBgmFile] = useState<File | null>(null);
  const [bgmVolume, setBgmVolume] = useState(0.3);
  const bgmInputRef = useRef<HTMLInputElement>(null);

  // 約8分相当の文字数（日本語TTSは約300〜350字/分）
  const CHUNK_CHAR_LIMIT = 2500;

  /** テキストを「。」区切りで CHUNK_CHAR_LIMIT 以内に分割する */
  const splitTextAtPeriod = (text: string): string[] => {
    const sentences = text.split(/(?<=。)/); // 「。」の後で分割、「。」は前の文に残す
    const chunks: string[] = [];
    let current = "";
    for (const sentence of sentences) {
      if ((current + sentence).length > CHUNK_CHAR_LIMIT && current.length > 0) {
        chunks.push(current);
        current = sentence;
      } else {
        current += sentence;
      }
    }
    if (current.trim()) chunks.push(current);
    return chunks;
  };

  useEffect(() => {
    const stored = localStorage.getItem("savedCustomVoices");
    if (stored) {
      try { setSavedVoices(JSON.parse(stored)); } catch { /* ignore */ }
    }
    const storedAvatars = localStorage.getItem("savedPhotoAvatars");
    if (storedAvatars) {
      try {
        const parsed = JSON.parse(storedAvatars);
        setSavedPhotoAvatars(parsed);
        if (parsed[0]) setSelectedPhotoAvatarId(parsed[0].id);
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    setCharCount(script.length);
    if (outputRef.current && isGenerating) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [script, isGenerating]);

  const handleSavePhotoAvatar = () => {
    const id = newPhotoAvatarId.trim();
    const label = newPhotoAvatarLabel.trim();
    if (!id || !label) return;
    if (savedPhotoAvatars.some((a) => a.id === id)) return;
    const updated = [...savedPhotoAvatars, { id, label, previewUrl: newPhotoAvatarPreview ?? undefined }];
    setSavedPhotoAvatars(updated);
    localStorage.setItem("savedPhotoAvatars", JSON.stringify(updated));
    setSelectedPhotoAvatarId(id);
    setNewPhotoAvatarId("");
    setNewPhotoAvatarLabel("");
    setNewPhotoAvatarPreview(null);
  };

  const handleAvatarPreviewFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setNewPhotoAvatarPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDeletePhotoAvatar = (id: string) => {
    const updated = savedPhotoAvatars.filter((a) => a.id !== id);
    setSavedPhotoAvatars(updated);
    localStorage.setItem("savedPhotoAvatars", JSON.stringify(updated));
    if (selectedPhotoAvatarId === id) setSelectedPhotoAvatarId(updated[0]?.id ?? "");
  };

  /** AudioBuffer → WAV ArrayBuffer */
  const audioBufferToWav = (buf: AudioBuffer): ArrayBuffer => {
    const numCh = buf.numberOfChannels;
    const sr = buf.sampleRate;
    const len = buf.length;
    const bps = 2; // 16-bit
    const dataSize = numCh * len * bps;
    const ab = new ArrayBuffer(44 + dataSize);
    const v = new DataView(ab);
    const ws = (off: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
    ws(0, "RIFF"); v.setUint32(4, 36 + dataSize, true);
    ws(8, "WAVE"); ws(12, "fmt ");
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, numCh, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * numCh * bps, true);
    v.setUint16(32, numCh * bps, true); v.setUint16(34, 16, true);
    ws(36, "data"); v.setUint32(40, dataSize, true);
    let off = 44;
    for (let i = 0; i < len; i++) {
      for (let ch = 0; ch < numCh; ch++) {
        const s = Math.max(-1, Math.min(1, buf.getChannelData(ch)[i]));
        v.setInt16(off, s < 0 ? s * 32768 : s * 32767, true);
        off += 2;
      }
    }
    return ab;
  };

  /** 音声（MP3）とBGMをOfflineAudioContextでミックスしてWAVを返す */
  const mixAudioWithBgm = async (voiceArrayBuffer: ArrayBuffer, bgm: File, vol: number): Promise<ArrayBuffer> => {
    const tempCtx = new AudioContext();
    const voiceDecoded = await tempCtx.decodeAudioData(voiceArrayBuffer.slice(0));
    const bgmDecoded = await tempCtx.decodeAudioData(await bgm.arrayBuffer());
    await tempCtx.close();

    const duration = voiceDecoded.duration;
    const sr = voiceDecoded.sampleRate;
    const offline = new OfflineAudioContext(2, Math.ceil(sr * duration), sr);

    // ボイス
    const voiceSrc = offline.createBufferSource();
    voiceSrc.buffer = voiceDecoded;
    voiceSrc.connect(offline.destination);
    voiceSrc.start(0);

    // BGM（ループ）
    const bgmGain = offline.createGain();
    bgmGain.gain.value = vol;
    bgmGain.connect(offline.destination);
    const bgmSrc = offline.createBufferSource();
    bgmSrc.buffer = bgmDecoded;
    bgmSrc.loop = true;
    bgmSrc.connect(bgmGain);
    bgmSrc.start(0);

    const rendered = await offline.startRendering();
    return audioBufferToWav(rendered);
  };

  const handleGenerateVideo = async () => {
    if (!selectedPhotoAvatarId) {
      setHeygenError("Photo Avatar IDを設定してください");
      return;
    }
    if (!audioUrl) {
      setHeygenError("先にElevenLabsで音声を生成してください");
      return;
    }
    setHeygenError("");
    setHeygenVideoUrl("");
    setHeygenThumbnail("");
    if (heygenPollRef.current) clearInterval(heygenPollRef.current);

    try {
      // Step 1: ElevenLabs blob → HeyGen CDN
      setHeygenUploadStatus("uploading");
      const blobRes = await fetch(audioUrl);
      const audioBuffer = await blobRes.arrayBuffer();
      const uploadRes = await fetch("/api/heygen/upload-audio", {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: audioBuffer,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error ?? "音声アップロードに失敗しました");
      const heygenAudioUrl = uploadData.audioUrl;
      setHeygenUploadStatus("idle");

      // Step 2: Generate video with uploaded photo + audio URL
      setHeygenStatus("pending");
      const res = await fetch("/api/heygen/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoId: selectedPhotoAvatarId,
          audioUrl: heygenAudioUrl,
          bgColor: heygenBgColor,
          dimension: heygenDimension,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = typeof data.error === "string" ? data.error : JSON.stringify(data.error);
        throw new Error(errMsg || "動画生成に失敗しました");
      }
      setHeygenVideoId(data.videoId);

      // ポーリング開始（10秒ごと）
      heygenPollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/heygen/status?videoId=${data.videoId}`);
          const statusData = await statusRes.json();
          if (statusData.status === "completed") {
            setHeygenStatus("completed");
            setHeygenVideoUrl(statusData.videoUrl);
            setHeygenThumbnail(statusData.thumbnailUrl ?? "");
            if (heygenPollRef.current) clearInterval(heygenPollRef.current);
          } else if (statusData.status === "failed") {
            setHeygenStatus("failed");
            setHeygenError(statusData.failureMessage ?? "動画生成に失敗しました");
            if (heygenPollRef.current) clearInterval(heygenPollRef.current);
          } else {
            setHeygenStatus(statusData.status ?? "processing");
          }
        } catch { /* ignore poll errors */ }
      }, 10000);
    } catch (err) {
      setHeygenUploadStatus("idle");
      setHeygenStatus("failed");
      setHeygenError(err instanceof Error ? err.message : "動画生成に失敗しました");
    }
  };

  const handleSaveVoice = () => {
    const id = customVoiceId.trim();
    const label = customVoiceName.trim();
    if (!id || !label) return;
    if (savedVoices.some((v) => v.id === id)) return;
    const updated = [...savedVoices, { id, label }];
    setSavedVoices(updated);
    localStorage.setItem("savedCustomVoices", JSON.stringify(updated));
    setSelectedVoice(id);
    setCustomVoiceId("");
    setCustomVoiceName("");
  };

  const handleDeleteSavedVoice = (id: string) => {
    const updated = savedVoices.filter((v) => v.id !== id);
    setSavedVoices(updated);
    localStorage.setItem("savedCustomVoices", JSON.stringify(updated));
    if (selectedVoice === id) setSelectedVoice(ELEVENLABS_VOICES[0].id);
  };

  const handleGenerateAudio = async () => {
    const voiceId = selectedVoice === "custom" ? customVoiceId.trim() : selectedVoice;
    if (!voiceId || voiceId === "custom") {
      setAudioError("Voice IDを入力してください。");
      return;
    }
    setIsGeneratingAudio(true);
    setAudioError("");
    setAudioProgress(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    try {
      const chunks = splitTextAtPeriod(script);
      const isMultiChunk = chunks.length > 1;

      if (isMultiChunk) {
        setAudioProgress({ current: 0, total: chunks.length });
      }

      const buffers: ArrayBuffer[] = [];

      for (let i = 0; i < chunks.length; i++) {
        if (isMultiChunk) {
          setAudioProgress({ current: i + 1, total: chunks.length });
        }

        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: chunks[i], voiceId }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(`パート${i + 1}の生成に失敗: ${data.error ?? "不明なエラー"}`);
        }

        buffers.push(await res.arrayBuffer());
      }

      // MP3バッファを結合して単一のBlobを作成
      const totalLength = buffers.reduce((sum, b) => sum + b.byteLength, 0);
      const merged = new Uint8Array(totalLength);
      let offset = 0;
      for (const buf of buffers) {
        merged.set(new Uint8Array(buf), offset);
        offset += buf.byteLength;
      }

      const blob = new Blob([merged], { type: "audio/mpeg" });
      setAudioUrl(URL.createObjectURL(blob));
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : "音声生成に失敗しました");
    } finally {
      setIsGeneratingAudio(false);
      setAudioProgress(null);
    }
  };

  const handleGenerate = async () => {
    setScript("");
    setIsGenerating(true);
    setAudioUrl(null);
    setAudioError("");

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

  const handleAddTheme = () => {
    const trimmed = newTheme.trim();
    if (!trimmed || themePresets.includes(trimmed)) return;
    setThemePresets((prev) => [...prev, trimmed]);
    setForm({ ...form, theme: trimmed });
    setNewTheme("");
  };

  const handleRemoveTheme = (theme: string) => {
    if (DEFAULT_THEME_PRESETS.includes(theme)) return;
    setThemePresets((prev) => prev.filter((t) => t !== theme));
    if (form.theme === theme) setForm({ ...form, theme: themePresets[0] });
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
        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/login";
          }}
          style={{
            marginTop: "10px",
            fontSize: "11px",
            color: "rgba(226,217,200,0.3)",
            background: "none",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "6px",
            padding: "4px 12px",
            cursor: "pointer",
          }}
        >
          ログアウト
        </button>
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
                {themePresets.map((preset) => {
                  const isCustom = !DEFAULT_THEME_PRESETS.includes(preset);
                  const isActive = form.theme === preset;
                  return (
                    <div key={preset} className="relative group" style={{ display: "inline-flex" }}>
                      <button
                        onClick={() => setForm({ ...form, theme: preset })}
                        className="text-xs px-2 py-1 rounded transition-colors"
                        style={{
                          background: isActive ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.05)",
                          border: `1px solid ${isActive ? "rgba(251,191,36,0.5)" : "rgba(255,255,255,0.1)"}`,
                          color: isActive ? "#fbbf24" : "rgba(226,217,200,0.6)",
                          cursor: "pointer",
                          fontSize: "11px",
                          paddingRight: isCustom ? "20px" : undefined,
                        }}
                      >
                        {preset}
                      </button>
                      {isCustom && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveTheme(preset); }}
                          title="削除"
                          style={{
                            position: "absolute",
                            right: "3px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "rgba(226,217,200,0.4)",
                            fontSize: "10px",
                            lineHeight: 1,
                            padding: 0,
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Add custom theme */}
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={newTheme}
                  onChange={(e) => setNewTheme(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTheme()}
                  placeholder="テーマを追加..."
                  style={{ fontSize: "12px", padding: "4px 8px", flex: 1 }}
                />
                <button
                  onClick={handleAddTheme}
                  disabled={!newTheme.trim()}
                  style={{
                    background: newTheme.trim() ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${newTheme.trim() ? "rgba(251,191,36,0.5)" : "rgba(255,255,255,0.1)"}`,
                    color: newTheme.trim() ? "#fbbf24" : "rgba(226,217,200,0.3)",
                    cursor: newTheme.trim() ? "pointer" : "default",
                    borderRadius: "6px",
                    padding: "4px 10px",
                    fontSize: "12px",
                    whiteSpace: "nowrap",
                  }}
                >
                  ＋ 追加
                </button>
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
              style={{ maxHeight: "60vh" }}
            >
              {isGenerating ? (
                <div className={`script-output ${script ? "cursor-blink" : ""}`}>
                  {script}
                </div>
              ) : (
                <textarea
                  value={script}
                  onChange={(e) => {
                    setScript(e.target.value);
                    setAudioUrl(null);
                  }}
                  placeholder="ここに台本を直接入力できます。左のフォームで自動生成することもできます。"
                  style={{
                    whiteSpace: "pre-wrap",
                    lineHeight: 2,
                    fontSize: "15px",
                    color: "#f0e8d8",
                    minHeight: "400px",
                    resize: "vertical",
                    background: "transparent",
                    border: "1px solid rgba(251,191,36,0.15)",
                    padding: "0",
                    borderRadius: "0",
                    width: "100%",
                    outline: "none",
                  }}
                />
              )}
            </div>

            {/* ElevenLabs TTS Section */}
            {!isGenerating && (
              <div
                className="px-6 py-5"
                style={{ borderTop: "1px solid rgba(251,191,36,0.15)" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span style={{ fontSize: "13px", color: "#fbbf24", fontWeight: "bold" }}>
                    🎙 ElevenLabs 音声生成
                  </span>
                  <span style={{ fontSize: "11px", color: "rgba(226,217,200,0.4)" }}>
                    台本を確認・編集後に音声を生成できます
                  </span>
                </div>

                <div className="flex flex-wrap gap-3 items-end mb-3">
                  <div style={{ flex: "1 1 200px", minWidth: "180px" }}>
                    <label style={{ fontSize: "12px", color: "rgba(226,217,200,0.6)", display: "block", marginBottom: "6px" }}>
                      ボイス選択
                    </label>
                    <select
                      value={selectedVoice}
                      onChange={(e) => {
                        setSelectedVoice(e.target.value);
                        setAudioUrl(null);
                      }}
                      style={{ fontSize: "13px", padding: "8px 12px" }}
                    >
                      <optgroup label="プリセット">
                        {ELEVENLABS_VOICES.filter((v) => v.id !== "custom").map((v) => (
                          <option key={v.id} value={v.id}>{v.label}</option>
                        ))}
                      </optgroup>
                      {savedVoices.length > 0 && (
                        <optgroup label="カスタム（保存済み）">
                          {savedVoices.map((v) => (
                            <option key={v.id} value={v.id}>{v.label}</option>
                          ))}
                        </optgroup>
                      )}
                      <option value="custom">＋ 新しいカスタムVoice IDを追加...</option>
                    </select>
                  </div>

                  {selectedVoice === "custom" && (
                    <div style={{ flex: "1 1 340px", minWidth: "280px" }}>
                      <label style={{ fontSize: "12px", color: "rgba(226,217,200,0.6)", display: "block", marginBottom: "6px" }}>
                        新しいカスタムボイスを登録
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={customVoiceId}
                          onChange={(e) => setCustomVoiceId(e.target.value)}
                          placeholder="Voice ID（ElevenLabs）"
                          style={{ fontSize: "13px", padding: "8px 12px", flex: 1 }}
                        />
                        <input
                          type="text"
                          value={customVoiceName}
                          onChange={(e) => setCustomVoiceName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSaveVoice()}
                          placeholder="名前（例: 桜の声）"
                          style={{ fontSize: "13px", padding: "8px 12px", flex: 1 }}
                        />
                        <button
                          onClick={handleSaveVoice}
                          disabled={!customVoiceId.trim() || !customVoiceName.trim()}
                          style={{
                            background: customVoiceId.trim() && customVoiceName.trim()
                              ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.05)",
                            border: `1px solid ${customVoiceId.trim() && customVoiceName.trim() ? "rgba(251,191,36,0.5)" : "rgba(255,255,255,0.1)"}`,
                            color: customVoiceId.trim() && customVoiceName.trim() ? "#fbbf24" : "rgba(226,217,200,0.3)",
                            padding: "8px 14px",
                            borderRadius: "6px",
                            cursor: customVoiceId.trim() && customVoiceName.trim() ? "pointer" : "default",
                            fontSize: "13px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          保存
                        </button>
                      </div>
                      <p style={{ fontSize: "11px", color: "rgba(226,217,200,0.35)" }}>
                        保存するとドロップダウンに追加され、次回から選択できます
                      </p>
                    </div>
                  )}

                  {/* 保存済みカスタムボイス管理 */}
                  {savedVoices.length > 0 && selectedVoice !== "custom" && (
                    <div style={{ flex: "1 1 100%", marginTop: "4px" }}>
                      <div className="flex flex-wrap gap-1">
                        {savedVoices.map((v) => (
                          <div
                            key={v.id}
                            className="flex items-center gap-1 px-2 py-1 rounded"
                            style={{
                              background: selectedVoice === v.id ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.04)",
                              border: `1px solid ${selectedVoice === v.id ? "rgba(251,191,36,0.4)" : "rgba(255,255,255,0.1)"}`,
                              fontSize: "11px",
                            }}
                          >
                            <span style={{ color: selectedVoice === v.id ? "#fbbf24" : "rgba(226,217,200,0.5)" }}>
                              {v.label}
                            </span>
                            <button
                              onClick={() => handleDeleteSavedVoice(v.id)}
                              title="削除"
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "rgba(226,217,200,0.35)",
                                fontSize: "11px",
                                padding: "0 0 0 2px",
                                lineHeight: 1,
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", flexShrink: 0 }}>
                    <button
                      onClick={handleGenerateAudio}
                      disabled={isGeneratingAudio || !script.trim()}
                      style={{
                        background: isGeneratingAudio
                          ? "rgba(255,255,255,0.05)"
                          : "linear-gradient(135deg, #6d28d9, #7c3aed, #8b5cf6)",
                        color: isGeneratingAudio ? "rgba(226,217,200,0.4)" : "#fff",
                        fontWeight: "700",
                        padding: "10px 24px",
                        borderRadius: "8px",
                        border: "none",
                        cursor: isGeneratingAudio ? "not-allowed" : "pointer",
                        fontSize: "14px",
                        whiteSpace: "nowrap",
                        transition: "opacity 0.2s",
                      }}
                    >
                      {isGeneratingAudio
                        ? audioProgress
                          ? `⏳ パート ${audioProgress.current}/${audioProgress.total} 生成中...`
                          : "⏳ 生成中..."
                        : "🎙 音声を生成する"}
                    </button>
                    {script.length > CHUNK_CHAR_LIMIT && (
                      <p style={{ fontSize: "11px", color: "rgba(251,191,36,0.6)", textAlign: "center" }}>
                        ※ 長文のため{splitTextAtPeriod(script).length}パートに分けて生成します
                      </p>
                    )}
                  </div>
                </div>

                {audioError && (
                  <p style={{ fontSize: "13px", color: "#f87171", marginBottom: "8px" }}>
                    ⚠️ {audioError}
                  </p>
                )}

                {audioUrl && (
                  <div
                    className="rounded-lg p-4"
                    style={{ background: "rgba(109,40,217,0.1)", border: "1px solid rgba(139,92,246,0.3)" }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span style={{ fontSize: "13px", color: "#a78bfa", fontWeight: "bold" }}>
                        ✅ 音声生成完了
                      </span>
                      <a
                        href={audioUrl}
                        download="daihon_audio.mp3"
                        style={{
                          fontSize: "12px",
                          color: "#a78bfa",
                          textDecoration: "underline",
                          cursor: "pointer",
                        }}
                      >
                        ↓ ダウンロード
                      </a>
                    </div>
                    <audio controls style={{ width: "100%", accentColor: "#8b5cf6" }}>
                      <source src={audioUrl} type="audio/mpeg" />
                    </audio>
                  </div>
                )}
              </div>
            )}
          {/* HeyGen 動画生成 */}
          {!isGenerating && (
            <div
              className="px-6 py-5"
              style={{ borderTop: "1px solid rgba(251,191,36,0.15)" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <span style={{ fontSize: "13px", color: "#fbbf24", fontWeight: "bold" }}>
                  🎬 HeyGen 動画生成
                </span>
              </div>

              {heygenError && (
                <p style={{ fontSize: "13px", color: "#f87171", marginBottom: "10px" }}>
                  ⚠️ {heygenError}
                </p>
              )}

              {/* Photo Avatar ID 設定 */}
              <div className="mb-4">
                <label style={{ fontSize: "12px", color: "rgba(226,217,200,0.6)", display: "block", marginBottom: "8px" }}>
                  Photo Avatar
                </label>

                {/* 保存済みアバター選択（画像グリッド） */}
                {savedPhotoAvatars.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {savedPhotoAvatars.map((a) => {
                      const isSelected = selectedPhotoAvatarId === a.id;
                      return (
                        <div key={a.id} style={{ position: "relative" }}>
                          <button
                            onClick={() => setSelectedPhotoAvatarId(a.id)}
                            title={a.label}
                            style={{
                              width: "72px", height: "72px", borderRadius: "10px",
                              overflow: "hidden", padding: 0,
                              border: `2px solid ${isSelected ? "#fbbf24" : "rgba(255,255,255,0.15)"}`,
                              background: "rgba(255,255,255,0.05)", cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              flexDirection: "column", gap: "4px",
                            }}
                          >
                            {a.previewUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={a.previewUrl} alt={a.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <span style={{ fontSize: "10px", color: "rgba(226,217,200,0.4)", textAlign: "center", padding: "4px" }}>
                                {a.label}
                              </span>
                            )}
                          </button>
                          {isSelected && (
                            <div style={{ position: "absolute", bottom: "2px", right: "2px", background: "#fbbf24", borderRadius: "50%", width: "14px", height: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span style={{ fontSize: "9px", color: "#000", fontWeight: "bold" }}>✓</span>
                            </div>
                          )}
                          <button
                            onClick={() => handleDeletePhotoAvatar(a.id)}
                            title="削除"
                            style={{
                              position: "absolute", top: "-4px", right: "-4px",
                              background: "rgba(239,68,68,0.8)", border: "none", borderRadius: "50%",
                              width: "16px", height: "16px", cursor: "pointer",
                              color: "#fff", fontSize: "10px", lineHeight: 1,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              padding: 0,
                            }}
                          >×</button>
                          <p style={{ fontSize: "9px", color: isSelected ? "#fbbf24" : "rgba(226,217,200,0.4)", textAlign: "center", marginTop: "3px", maxWidth: "72px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {a.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 新規登録フォーム */}
                <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p style={{ fontSize: "11px", color: "rgba(226,217,200,0.4)", marginBottom: "8px" }}>
                    ＋ 新しいアバターを登録
                  </p>
                  <div className="flex gap-2 items-start mb-2">
                    {/* プレビュー画像選択 */}
                    <div
                      onClick={() => avatarPreviewInputRef.current?.click()}
                      style={{
                        width: "56px", height: "56px", borderRadius: "8px", flexShrink: 0,
                        border: "2px dashed rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.03)",
                        cursor: "pointer", overflow: "hidden",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      {newPhotoAvatarPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={newPhotoAvatarPreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: "9px", color: "rgba(226,217,200,0.3)", textAlign: "center" }}>📷<br/>画像</span>
                      )}
                    </div>
                    <input ref={avatarPreviewInputRef} type="file" accept="image/*" style={{ display: "none" }}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarPreviewFile(f); }} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                      <input type="text" value={newPhotoAvatarId} onChange={(e) => setNewPhotoAvatarId(e.target.value)}
                        placeholder="Photo Avatar ID" style={{ fontSize: "12px", padding: "6px 10px" }} />
                      <input type="text" value={newPhotoAvatarLabel} onChange={(e) => setNewPhotoAvatarLabel(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSavePhotoAvatar()}
                        placeholder="名前（例: 仏像アバター）" style={{ fontSize: "12px", padding: "6px 10px" }} />
                    </div>
                    <button
                      onClick={handleSavePhotoAvatar}
                      disabled={!newPhotoAvatarId.trim() || !newPhotoAvatarLabel.trim()}
                      style={{
                        background: newPhotoAvatarId.trim() && newPhotoAvatarLabel.trim() ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.05)",
                        border: `1px solid ${newPhotoAvatarId.trim() && newPhotoAvatarLabel.trim() ? "rgba(251,191,36,0.5)" : "rgba(255,255,255,0.1)"}`,
                        color: newPhotoAvatarId.trim() && newPhotoAvatarLabel.trim() ? "#fbbf24" : "rgba(226,217,200,0.3)",
                        padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", whiteSpace: "nowrap", alignSelf: "center",
                      }}
                    >保存</button>
                  </div>
                  <p style={{ fontSize: "10px", color: "rgba(226,217,200,0.25)" }}>
                    HeyGenダッシュボード → Photo Avatars でIDを確認できます
                  </p>
                </div>
              </div>

              {/* 音声ステータス */}
              {!audioUrl && (
                <div className="rounded-lg p-3 mb-3" style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)" }}>
                  <p style={{ fontSize: "12px", color: "rgba(251,191,36,0.7)" }}>
                    ⚠️ 先に上の「ElevenLabs 音声生成」で音声を生成してください。
                  </p>
                </div>
              )}
              {audioUrl && (
                <div className="rounded-lg p-3 mb-3" style={{ background: "rgba(109,40,217,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
                  <p style={{ fontSize: "12px", color: "#a78bfa" }}>✅ ElevenLabsの音声を使用します</p>
                </div>
              )}

              {/* 設定 + 生成ボタン */}
              <div className="flex flex-wrap gap-3 mb-4">
                <div style={{ flex: "1 1 120px" }}>
                  <label style={{ fontSize: "12px", color: "rgba(226,217,200,0.6)", display: "block", marginBottom: "6px" }}>サイズ</label>
                  <select value={heygenDimension} onChange={(e) => setHeygenDimension(e.target.value)} style={{ fontSize: "12px", padding: "7px 10px" }}>
                    <option value="1280x720">横型 16:9 (1280×720)</option>
                    <option value="720x1280">縦型 9:16 (720×1280)</option>
                    <option value="1080x1080">正方形 1:1 (1080×1080)</option>
                  </select>
                </div>
                <div style={{ flex: "0 0 auto" }}>
                  <label style={{ fontSize: "12px", color: "rgba(226,217,200,0.6)", display: "block", marginBottom: "6px" }}>背景色</label>
                  <input type="color" value={heygenBgColor} onChange={(e) => setHeygenBgColor(e.target.value)}
                    style={{ width: "48px", height: "36px", padding: "2px", borderRadius: "6px", border: "1px solid rgba(251,191,36,0.3)", background: "transparent", cursor: "pointer" }} />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", flexShrink: 0 }}>
                  <button
                    onClick={handleGenerateVideo}
                    disabled={!selectedPhotoAvatarId || !audioUrl || heygenUploadStatus === "uploading" || heygenStatus === "pending" || heygenStatus === "processing"}
                    style={{
                      background: !selectedPhotoAvatarId || !audioUrl || heygenUploadStatus === "uploading" || heygenStatus === "pending" || heygenStatus === "processing"
                        ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #065f46, #047857, #059669)",
                      color: !selectedPhotoAvatarId || !audioUrl ? "rgba(226,217,200,0.3)" : "#fff",
                      fontWeight: "700", padding: "9px 20px", borderRadius: "8px", border: "none",
                      cursor: !selectedPhotoAvatarId || !audioUrl ? "default" : "pointer", fontSize: "13px", whiteSpace: "nowrap",
                    }}
                  >
                    {heygenUploadStatus === "uploading" ? "⏫ 音声をアップロード中..."
                      : heygenStatus === "pending" || heygenStatus === "processing" ? `⏳ 生成中 (${heygenStatus})...`
                      : "🎬 動画を生成する"}
                  </button>
                </div>
              </div>

              {heygenUploadStatus === "uploading" && (
                <div className="rounded-lg p-3 mb-3" style={{ background: "rgba(109,40,217,0.1)", border: "1px solid rgba(139,92,246,0.3)" }}>
                  <p style={{ fontSize: "13px", color: "#a78bfa" }}>⏫ 音声をHeyGenにアップロードしています...</p>
                </div>
              )}
              {(heygenStatus === "pending" || heygenStatus === "processing") && (
                <div className="rounded-lg p-3 mb-3" style={{ background: "rgba(5,150,105,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}>
                  <p style={{ fontSize: "13px", color: "#6ee7b7" }}>
                    ⏳ HeyGenで動画を生成しています。完了まで数分かかります。このページを開いたままにしてください。
                  </p>
                </div>
              )}

              {heygenStatus === "completed" && heygenVideoUrl && (
                <div className="rounded-lg p-4" style={{ background: "rgba(5,150,105,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <span style={{ fontSize: "13px", color: "#6ee7b7", fontWeight: "bold" }}>✅ 動画生成完了</span>
                    <a href={heygenVideoUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: "#6ee7b7", textDecoration: "underline" }}>
                      ↗ HeyGenで開く / ダウンロード
                    </a>
                  </div>
                  <video controls poster={heygenThumbnail || undefined} style={{ width: "100%", borderRadius: "8px", maxHeight: "300px" }}>
                    <source src={heygenVideoUrl} type="video/mp4" />
                  </video>
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-10" style={{ color: "rgba(226,217,200,0.2)", fontSize: "12px" }}>
        <a
          href="/video-edit"
          style={{
            display: "inline-block", marginBottom: "12px",
            background: "rgba(5,150,105,0.1)", border: "1px solid rgba(16,185,129,0.3)",
            borderRadius: "8px", padding: "8px 20px",
            color: "#6ee7b7", fontSize: "13px", textDecoration: "none",
          }}
        >
          🎬 動画編集（グリーンバック除去・背景合成・BGM）
        </a>
        <br />
        Powered by Claude API
      </div>
    </main>
  );
}
