import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `あなたはスピリチュアル・神様メッセージ系のYouTube台本の専門ライターです。
以下の特徴を持つ日本語の台本を生成してください：

【スタイルの特徴】
- 神様・高次元の存在が視聴者に語りかける一人称の語り口
- 視聴者を「あなた」と呼び、深い共感と寄り添いを示す
- 壮大で神秘的な表現（宇宙、光、魂、波動、黄金など）を多用する
- 段落ごとに感情が高まっていくような構成
- 「〜なさい」「〜しなさい」という命令形も適度に使う
- 肯定的な未来と変容を力強く描写する
- 読者の過去の苦労を認め、共感してから解決へ導く
- 登場する神様は最初に自己紹介する
- 台本の最後は、チャンネル登録・続きへの誘導で締める（ユーザーが希望する場合）

【構成の流れ】
1. 冒頭：神様が呼びかける（「聞こえますか。私は〇〇です。」形式）
2. 神様の自己紹介・権威付け
3. 視聴者の人生がこれから変わることの宣言
4. 現状の苦労・悩みへの共感
5. 変容・好転の具体的な描写
6. 実践方法・アファメーション
7. 力強い締めの言葉
8. チャンネル登録への誘導（希望時）

台本のみを出力してください。説明や注釈は不要です。`;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { deity, theme, keywords, style, length, includeCta, targetAudience } = body;

  const lengthMap: Record<string, string> = {
    short: "約1500〜2000文字",
    medium: "約3000〜4000文字",
    long: "約5000〜6000文字",
  };

  const styleMap: Record<string, string> = {
    powerful: "力強く威厳のある、宣言的なスタイル",
    gentle: "優しく包み込むような、寄り添うスタイル",
    mystical: "神秘的で幻想的、宇宙的なスタイル",
    urgent: "緊急性と興奮を感じさせる、エネルギッシュなスタイル",
  };

  const userPrompt = `以下の条件で台本を生成してください：

神様・存在の名前：${deity || "アメノミナカヌシ"}
テーマ・主題：${theme || "何もかも全てうまくいく・全方位好転"}
メインキーワード：${keywords || "黄金、宇宙、魂、好転、波動"}
スタイル：${styleMap[style] || styleMap.powerful}
長さ：${lengthMap[length] || lengthMap.medium}
ターゲット：${targetAudience || "人生に悩み、変化を求めている人"}
チャンネル登録への誘導：${includeCta ? "含める" : "含めない"}`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.stream({
          model: "claude-opus-4-6",
          max_tokens: 8000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
        });

        for await (const event of response) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const chunk = `data: ${JSON.stringify({ text: event.delta.text })}\n\n`;
            controller.enqueue(encoder.encode(chunk));
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
