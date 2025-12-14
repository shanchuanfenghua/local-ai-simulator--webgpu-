import { CreateMLCEngine, MLCEngine } from "@mlc-ai/web-llm";

export const AVAILABLE_MODELS = [
  { id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", name: "Qwen 2.5 1.5B (中文推荐/快)", size: "~1.6GB" },
  { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", name: "Llama 3.2 1B (轻量/英文强)", size: "~1.2GB" },
  { id: "Qwen2.5-7B-Instruct-q4f16_1-MLC", name: "Qwen 2.5 7B (更聪明/需8G显存)", size: "~5.2GB" },
  { id: "Llama-3.1-8B-Instruct-q4f32_1-MLC", name: "Llama 3.1 8B (均衡/需8G显存)", size: "~5.8GB" }
];

let engine: MLCEngine | null = null;
let currentModelId: string | null = null;

export interface InitProgressCallback {
  (progress: string): void;
}

export const initializeLocalModel = async (
  modelId: string, 
  onProgress: InitProgressCallback
) => {
  // If requesting the exact same model that is already loaded, just return
  if (engine && currentModelId === modelId) {
    onProgress("模型已就绪");
    return;
  }

  try {
    if (engine) {
        onProgress("正在卸载旧模型...");
        await engine.unload();
        engine = null;
    }

    onProgress(`正在初始化 ${modelId}... (首次加载需下载)`);
    
    // Create the engine and load the model
    engine = await CreateMLCEngine(
      modelId,
      {
        initProgressCallback: (report) => {
          onProgress(report.text);
        },
      }
    );
    currentModelId = modelId;
    onProgress("模型加载完成！现在可以断网使用了。");
  } catch (error) {
    console.error("Failed to load local model", error);
    onProgress(`错误: 你的浏览器可能不支持 WebGPU，或者显存不足。(${String(error)})`);
    currentModelId = null;
    engine = null;
    throw error;
  }
};

export const generateLocalResponse = async (
  chatHistory: { role: string, content: string }[],
  config: {
    personaName: string;
    trainingData: string;
  }
): Promise<string> => {
  if (!engine) {
    return "错误：模型尚未加载。请先在左侧选择模型并点击'加载'。";
  }

  try {
    const systemPrompt = `
You are a roleplay AI.
Your name is: ${config.personaName || "AI助手"}.

Task: Imitate the speaking style found in the training data below perfectly. 
Context (Training Data):
=== START DATA ===
${config.trainingData || "(No specific data provided, be gentle and helpful)"}
=== END DATA ===

Instructions:
1. Reply to the user's last message using the style from the data.
2. Keep it short and conversational (like a chat app).
3. Do NOT mention you are an AI or a language model.
4. If the data uses emojis, use them. If it's rude, be rude.
`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...chatHistory
    ];

    const reply = await engine.chat.completions.create({
      messages: messages as any,
      temperature: 1.1, // Slightly higher for more "human" variance
      max_tokens: 256, // Keep replies chat-length
    });

    return reply.choices[0].message.content || "...";
  } catch (error) {
    console.error("Local Inference Error:", error);
    return `(本地运算出错: ${String(error)})`;
  }
};