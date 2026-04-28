"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

type ProcessStatus = "idle" | "loading-ffmpeg" | "processing" | "done" | "error";

export default function VideoEditPage() {
  // FFmpeg
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [processStatus, setProcessStatus] = useState<ProcessStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  // 入力動画
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // 背景
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [bgPreviewUrl, setBgPreviewUrl] = useState<string | null>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  // グリーンバック設定
  const [chromaColor, setChromaColor] = useState("#00ff00");
  const [similarity, setSimilarity] = useState(0.15);
  const [blend, setBlend] = useState(0.05);

  // BGM
  const [bgmFile, setBgmFile] = useState<File | null>(null);
  const [bgmVolume, setBgmVolume] = useState(0.3);
  const bgmInputRef = useRef<HTMLInputElement>(null);

  // 出力
  const [outputUrl, setOutputUrl] = useState<string | null>(null);

  const addLog = (line: string) => setLogLines((prev) => [...prev.slice(-60), line]);

  // FFmpegロード
  const loadFfmpeg = useCallback(async () => {
    if (ffmpegRef.current) return;
    setProcessStatus("loading-ffmpeg");
    addLog("FFmpegを読み込んでいます...");
    try {
      const ffmpeg = new FFmpeg();
      ffmpeg.on("log", ({ message }) => addLog(message));
      ffmpeg.on("progress", ({ progress: p }) => setProgress(Math.round(p * 100)));

      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });

      ffmpegRef.current = ffmpeg;
      setFfmpegLoaded(true);
      setProcessStatus("idle");
      addLog("✅ FFmpegの読み込みが完了しました");
    } catch (err) {
      setProcessStatus("error");
      setErrorMsg("FFmpegの読み込みに失敗しました: " + (err instanceof Error ? err.message : String(err)));
    }
  }, []);

  useEffect(() => {
    loadFfmpeg();
  }, [loadFfmpeg]);

  const handleVideoFile = (file: File) => {
    setVideoFile(file);
    setVideoUrl("");
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoPreviewUrl(URL.createObjectURL(file));
    setOutputUrl(null);
  };

  const handleBgFile = (file: File) => {
    setBgFile(file);
    if (bgPreviewUrl) URL.revokeObjectURL(bgPreviewUrl);
    setBgPreviewUrl(URL.createObjectURL(file));
  };

  // hex → ffmpeg chromakey color (0xRRGGBB)
  const hexToFfmpegColor = (hex: string) => "0x" + hex.replace("#", "");

  const handleProcess = async () => {
    const ffmpeg = ffmpegRef.current;
    if (!ffmpeg) return;
    if (!videoFile && !videoUrl.trim()) {
      setErrorMsg("動画ファイルまたはURLを指定してください");
      return;
    }
    if (!bgFile) {
      setErrorMsg("背景画像を選択してください");
      return;
    }

    setProcessStatus("processing");
    setErrorMsg("");
    setOutputUrl(null);
    setProgress(0);
    addLog("処理を開始します...");

    try {
      // ファイル書き込み
      addLog("動画ファイルを読み込んでいます...");
      const videoData = videoFile ? await fetchFile(videoFile) : await fetchFile(videoUrl.trim());
      await ffmpeg.writeFile("input.mp4", videoData);

      addLog("背景画像を読み込んでいます...");
      const bgData = await fetchFile(bgFile);
      const bgExt = bgFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const bgIsVideo = ["mp4", "mov", "webm"].includes(bgExt);
      const bgFilename = bgIsVideo ? `bg.${bgExt}` : `bg.${bgExt}`;
      await ffmpeg.writeFile(bgFilename, bgData);

      let bgmFilename = "";
      if (bgmFile) {
        addLog("BGMファイルを読み込んでいます...");
        const bgmData = await fetchFile(bgmFile);
        bgmFilename = "bgm." + (bgmFile.name.split(".").pop() ?? "mp3");
        await ffmpeg.writeFile(bgmFilename, bgmData);
      }

      // FFmpegコマンド構築
      const chromaColorStr = hexToFfmpegColor(chromaColor);
      // 静止画背景は -loop 1 を使わず filter_complex 内でループさせる（-loop 1 だとduration=0になるバグ回避）
      const inputs: string[] = ["-i", "input.mp4"];
      if (bgIsVideo) {
        inputs.push("-stream_loop", "-1", "-i", bgFilename);
      } else {
        inputs.push("-i", bgFilename); // -loop 1 は使わない
      }
      if (bgmFilename) {
        inputs.push("-stream_loop", "-1", "-i", bgmFilename);
      }

      // フィルターグラフ
      const chromaFilter = `[0:v]chromakey=color=${chromaColorStr}:similarity=${similarity.toFixed(3)}:blend=${blend.toFixed(3)}[fg]`;

      // 静止画の場合: loop=-1 で無限ループ、eof_action=endall でfg終端に合わせて終了
      const bgPrep = bgIsVideo
        ? `[1:v]setpts=PTS-STARTPTS[bgv]`
        : `[1:v]loop=loop=-1:size=1:start=0,setpts=N/25/TB[bgv]`;

      const overlayFilter = `[bgv][fg]overlay=eof_action=endall[video]`;

      let filterComplex: string;
      let outputMaps: string[];

      if (bgmFilename) {
        const audioIdx = 2; // bgm is 3rd input (index 2)
        filterComplex = `${chromaFilter};${bgPrep};${overlayFilter};[0:a][${audioIdx}:a]amix=inputs=2:duration=first:weights=1 ${bgmVolume.toFixed(2)}[audio]`;
        outputMaps = ["-map", "[video]", "-map", "[audio]"];
      } else {
        filterComplex = `${chromaFilter};${bgPrep};${overlayFilter}`;
        outputMaps = ["-map", "[video]", "-map", "0:a?"];
      }

      addLog("FFmpegで動画を処理しています...");
      addLog(`フィルター: ${filterComplex}`);

      await ffmpeg.exec([
        ...inputs,
        "-filter_complex", filterComplex,
        ...outputMaps,
        "-c:v", "libx264",
        "-c:a", "aac",
        "-y",
        "output.mp4",
      ]);

      addLog("出力ファイルを読み込んでいます...");
      const data = await ffmpeg.readFile("output.mp4");
      // SharedArrayBufferを避けるため通常のArrayBufferにコピー
      const src = data as Uint8Array;
      const copy: Uint8Array<ArrayBuffer> = new Uint8Array(src.length);
      copy.set(src);
      const blob = new Blob([copy], { type: "video/mp4" });
      setOutputUrl(URL.createObjectURL(blob));
      setProcessStatus("done");
      addLog("✅ 処理完了！");
    } catch (err) {
      setProcessStatus("error");
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg("処理に失敗しました: " + msg);
      addLog("❌ エラー: " + msg);
    }
  };

  const cardStyle = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(251,191,36,0.15)",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "16px",
  };

  const labelStyle = { fontSize: "12px", color: "rgba(226,217,200,0.6)", display: "block", marginBottom: "8px" } as const;
  const sectionTitleStyle = { fontSize: "14px", color: "#fbbf24", fontWeight: "bold", marginBottom: "14px" } as const;

  return (
    <main className="min-h-screen py-10 px-4" style={{ background: "linear-gradient(180deg, #0a0a0f 0%, #0f0a1a 100%)" }}>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2" style={{ color: "#fbbf24" }}>🎬 動画編集</h1>
        <p style={{ fontSize: "13px", color: "rgba(226,217,200,0.5)" }}>
          グリーンバック除去・背景合成・BGMミックス（FFmpeg WASM）
        </p>
        <a href="/" style={{ fontSize: "12px", color: "rgba(139,92,246,0.8)", textDecoration: "underline", marginTop: "6px", display: "inline-block" }}>
          ← 台本ジェネレーターに戻る
        </a>
      </div>

      {/* FFmpeg status */}
      {!ffmpegLoaded && (
        <div className="max-w-3xl mx-auto mb-4 rounded-lg p-3" style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)" }}>
          <p style={{ fontSize: "12px", color: "rgba(251,191,36,0.8)" }}>
            ⏳ FFmpegを読み込み中... しばらくお待ちください（初回のみ）
          </p>
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        {/* 入力動画 */}
        <div style={cardStyle}>
          <p style={sectionTitleStyle}>📹 入力動画</p>
          <div className="flex flex-col gap-3">
            <div>
              <label style={labelStyle}>HeyGen動画URL（またはファイルをアップロード）</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => { setVideoUrl(e.target.value); setVideoFile(null); setVideoPreviewUrl(null); }}
                  placeholder="https://..."
                  style={{ flex: 1, fontSize: "13px", padding: "8px 12px" }}
                />
                <button
                  onClick={() => videoInputRef.current?.click()}
                  style={{
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "6px", padding: "8px 14px", color: "rgba(226,217,200,0.7)",
                    fontSize: "12px", cursor: "pointer", whiteSpace: "nowrap",
                  }}
                >
                  ファイルを選択
                </button>
              </div>
              <input ref={videoInputRef} type="file" accept="video/*" style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoFile(f); }} />
            </div>
            {(videoPreviewUrl || videoUrl) && (
              <video
                src={videoPreviewUrl ?? videoUrl}
                controls muted
                style={{ width: "100%", maxHeight: "200px", borderRadius: "8px", objectFit: "contain", background: "#000" }}
              />
            )}
          </div>
        </div>

        {/* グリーンバック設定 */}
        <div style={cardStyle}>
          <p style={sectionTitleStyle}>💚 グリーンバック除去設定</p>
          <div className="flex flex-wrap gap-4 items-start">
            <div style={{ flex: "0 0 auto" }}>
              <label style={labelStyle}>クロマキー色</label>
              <input
                type="color"
                value={chromaColor}
                onChange={(e) => setChromaColor(e.target.value)}
                style={{ width: "56px", height: "36px", padding: "2px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.2)", background: "transparent", cursor: "pointer" }}
              />
            </div>
            <div style={{ flex: "1 1 160px" }}>
              <label style={labelStyle}>類似度 (similarity): {similarity.toFixed(2)}</label>
              <input type="range" min="0.05" max="0.5" step="0.01"
                value={similarity} onChange={(e) => setSimilarity(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#fbbf24" }} />
              <p style={{ fontSize: "11px", color: "rgba(226,217,200,0.35)", marginTop: "4px" }}>小さいほど厳密に除去</p>
            </div>
            <div style={{ flex: "1 1 160px" }}>
              <label style={labelStyle}>エッジ滑らか度 (blend): {blend.toFixed(2)}</label>
              <input type="range" min="0" max="0.3" step="0.01"
                value={blend} onChange={(e) => setBlend(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#fbbf24" }} />
              <p style={{ fontSize: "11px", color: "rgba(226,217,200,0.35)", marginTop: "4px" }}>大きいほど境界が滑らか</p>
            </div>
          </div>
        </div>

        {/* 背景 */}
        <div style={cardStyle}>
          <p style={sectionTitleStyle}>🖼 背景（画像または動画）</p>
          <button
            onClick={() => bgInputRef.current?.click()}
            style={{
              background: bgFile ? "rgba(251,191,36,0.1)" : "rgba(255,255,255,0.04)",
              border: `1px dashed ${bgFile ? "rgba(251,191,36,0.4)" : "rgba(255,255,255,0.2)"}`,
              borderRadius: "8px", padding: "10px 20px", color: bgFile ? "#fbbf24" : "rgba(226,217,200,0.5)",
              fontSize: "13px", cursor: "pointer", width: "100%",
            }}
          >
            {bgFile ? `✅ ${bgFile.name}` : "📁 背景ファイルを選択（JPG / PNG / MP4）"}
          </button>
          <input ref={bgInputRef} type="file" accept="image/*,video/*" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBgFile(f); }} />
          {bgPreviewUrl && bgFile && (
            <div style={{ marginTop: "10px" }}>
              {bgFile.type.startsWith("video/") ? (
                <video src={bgPreviewUrl} muted loop autoPlay
                  style={{ width: "100%", maxHeight: "160px", borderRadius: "8px", objectFit: "cover" }} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={bgPreviewUrl} alt="background preview"
                  style={{ width: "100%", maxHeight: "160px", borderRadius: "8px", objectFit: "cover" }} />
              )}
            </div>
          )}
        </div>

        {/* BGM */}
        <div style={cardStyle}>
          <p style={sectionTitleStyle}>🎵 BGM（任意）</p>
          <button
            onClick={() => bgmInputRef.current?.click()}
            style={{
              background: bgmFile ? "rgba(139,92,246,0.1)" : "rgba(255,255,255,0.04)",
              border: `1px dashed ${bgmFile ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.2)"}`,
              borderRadius: "8px", padding: "10px 20px",
              color: bgmFile ? "#a78bfa" : "rgba(226,217,200,0.5)",
              fontSize: "13px", cursor: "pointer", width: "100%",
            }}
          >
            {bgmFile ? `✅ ${bgmFile.name}` : "📁 BGMファイルを選択（MP3 / WAV）"}
          </button>
          <input ref={bgmInputRef} type="file" accept="audio/*" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) setBgmFile(f); }} />
          {bgmFile && (
            <div style={{ marginTop: "12px" }}>
              <label style={labelStyle}>BGM音量: {Math.round(bgmVolume * 100)}%</label>
              <input type="range" min="0" max="1" step="0.05"
                value={bgmVolume} onChange={(e) => setBgmVolume(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#8b5cf6" }} />
            </div>
          )}
        </div>

        {/* エラー表示 */}
        {errorMsg && (
          <div className="rounded-lg p-3 mb-4" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <p style={{ fontSize: "13px", color: "#f87171" }}>⚠️ {errorMsg}</p>
          </div>
        )}

        {/* 処理ボタン */}
        <button
          onClick={handleProcess}
          disabled={!ffmpegLoaded || processStatus === "processing" || processStatus === "loading-ffmpeg"}
          style={{
            width: "100%",
            background: !ffmpegLoaded || processStatus === "processing"
              ? "rgba(255,255,255,0.05)"
              : "linear-gradient(135deg, #065f46, #047857, #059669)",
            color: !ffmpegLoaded || processStatus === "processing" ? "rgba(226,217,200,0.3)" : "#fff",
            fontWeight: "700", padding: "14px", borderRadius: "10px",
            border: "none", cursor: !ffmpegLoaded || processStatus === "processing" ? "default" : "pointer",
            fontSize: "15px", marginBottom: "16px",
          }}
        >
          {processStatus === "loading-ffmpeg" ? "⏳ FFmpeg読み込み中..."
            : processStatus === "processing" ? `⚙️ 処理中... ${progress}%`
            : "🎬 動画を処理する（グリーンバック除去・背景合成・BGM）"}
        </button>

        {/* 進捗バー */}
        {processStatus === "processing" && (
          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "6px", overflow: "hidden", marginBottom: "16px" }}>
            <div style={{
              height: "6px",
              background: "linear-gradient(90deg, #059669, #10b981)",
              width: `${progress}%`,
              transition: "width 0.3s",
            }} />
          </div>
        )}

        {/* 出力動画 */}
        {outputUrl && (
          <div style={{ ...cardStyle, border: "1px solid rgba(16,185,129,0.3)", background: "rgba(5,150,105,0.08)" }}>
            <div className="flex items-center justify-between mb-3">
              <p style={{ fontSize: "14px", color: "#6ee7b7", fontWeight: "bold" }}>✅ 処理完了</p>
              <a
                href={outputUrl}
                download="processed_video.mp4"
                style={{ fontSize: "12px", color: "#6ee7b7", textDecoration: "underline" }}
              >
                ↓ ダウンロード
              </a>
            </div>
            <video
              src={outputUrl}
              controls
              style={{ width: "100%", borderRadius: "8px", maxHeight: "360px" }}
            />
          </div>
        )}

        {/* ログ */}
        {logLines.length > 0 && (
          <div style={{ marginTop: "16px" }}>
            <p style={{ fontSize: "11px", color: "rgba(226,217,200,0.4)", marginBottom: "6px" }}>ログ</p>
            <div style={{
              background: "rgba(0,0,0,0.4)", borderRadius: "8px", padding: "10px 14px",
              maxHeight: "160px", overflowY: "auto", fontSize: "11px",
              color: "rgba(226,217,200,0.5)", fontFamily: "monospace", lineHeight: 1.6,
            }}>
              {logLines.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
