import { GoogleGenAI } from "@google/genai";
import type { GenerateContentResponse } from "@google/genai";

// Ensure API_KEY is available in the environment.
if (!process.env.API_KEY) {
  // In a real app, you might want to handle this more gracefully.
  // For this environment, we assume it's set.
  console.warn("API_KEY environment variable not set. Using a placeholder.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const META_PROMPT_TEMPLATE = `
你是一个专家级 AI 软件工程师，精通 Claude Skill 和 Gemini CLI。
你的任务是将一个 Claude Skill 的全部上下文，转换（编译）为一个 Gemini CLI 的 .toml 自定义命令文件。

**Claude Skill 结构 (输入):**
我将为你提供一个 "上下文包" (Context Blob)，它用 \`--- BEGIN FILE: [filename] ---\` 这样的分隔符来打包 Skill 的所有文件。\`SKILL.MD\` 是主指令，其他文件是它引用的资源。

**Gemini CLI TOML 结构 (输出):**
你必须生成一个 .toml 文件格式的字符串，它必须包含：

1.  \`description = "..."\`: 一句简短的描述，从 \`SKILL.MD\` 的意图中提炼。
2.  \`prompt = """..."""\`: 一个**单一的、完整的**提示词。

**转换规则:**

1.  **内联所有内容:** 你必须将 \`SKILL.MD\` 的指令和所有资源文件（\`.js\`, \`.html\` 等）的**全部内容**都**内联（inline）**到这个单一的 \`prompt\` 字段中。
2.  **重构指令:** 将 \`SKILL.MD\` 中对人类的描述（“这是一个 Skill...”）改写为对 Gemini 模型的**直接指令**（例如：“你是一个算法艺术家...”）。
3.  **提供上下文:** 在 \`prompt\` 中，必须明确告诉 Gemini：“你将使用以下代码：...[粘贴 code.js 内容]... 你将使用以下 HTML 结构：...[粘贴 style.html 内容]...”。
4.  **处理参数:** \`prompt\` 的最后必须包含一个占位符，用于接收用户在 CLI 中输入的参数。例如：“现在，请根据用户的以下请求执行任务：”
5.  **格式:** 你的输出**必须且只能**是 TOML 格式的原始文本，以 \`description =\` 开头。不要包含任何“好的，这是您的文件”之类的寒暄语。

**[输入] 上下文包:**

\`\`\`
{{context_blob}}
\`\`\`

**[输出] TOML 文件内容:**
`;


/**
 * Calls the Gemini API to convert the context blob into a TOML string.
 * @param contextBlob The string containing all skill file contents.
 * @returns A promise that resolves to the generated TOML string.
 */
export async function compileSkillWithGemini(contextBlob: string): Promise<string> {
    const prompt = META_PROMPT_TEMPLATE.replace('{{context_blob}}', contextBlob);
    
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
        });

        let rawResponse = response.text;
        
        // The model might wrap the TOML in markdown backticks or add extra text.
        // We need to robustly extract the content starting from `description =`.
        const tomlStartIndex = rawResponse.indexOf('description =');
        
        if (tomlStartIndex === -1) {
            console.error("Invalid response from Gemini. Could not find 'description ='. Full response:", rawResponse);
            throw new Error('API did not return a valid TOML format. The `description` field was not found.');
        }
        
        // Extract the TOML content, starting from 'description ='
        let tomlContent = rawResponse.substring(tomlStartIndex);
        
        // Clean up trailing markdown backticks if present
        const trimmedContent = tomlContent.trim();
        if (trimmedContent.endsWith("```")) {
            tomlContent = trimmedContent.slice(0, -3).trim();
        }
        
        return tomlContent;

    } catch (error) {
        // If it's one of our custom parsing errors, just re-throw it so it can be displayed in the UI.
        if (error instanceof Error && error.message.includes('TOML format')) {
            throw error;
        }

        // Otherwise, it's likely a network/API key error.
        console.error("Error calling Gemini API:", error);
        throw new Error("Failed to communicate with the Gemini API. Check your API key and network connection.");
    }
}