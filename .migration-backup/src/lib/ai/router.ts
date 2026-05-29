// src/lib/ai/router.ts

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY!;

const MODELS = [
  "stepfun-ai/step-3.5-flash",
  "mistralai/mistral-nemotron",
  "Qwen/qwen3-coder-480b-a35b-instruct",
  "bytedance/seed-oss-36b-instruct",
];

const NVIDIA_URL =
  "https://integrate.api.nvidia.com/v1/chat/completions";

function extractText(data: any) {
  return data?.choices?.[0]?.message?.content || "";
}

export async function callModel({
  system,
  prompt,
}: {
  system: string;
  prompt: string;
}) {
  let lastError: any = null;

  for (const model of MODELS) {
    try {
      console.log("USING MODEL:", model);

      // 90 second timeout
      const controller = new AbortController();


      const response = await fetch(NVIDIA_URL, {
        method: "POST",

        headers: {
          Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
          "Content-Type": "application/json",
        },

    

        signal: controller.signal,

        body: JSON.stringify({
          model,

          temperature: 0.2,

          top_p: 0.7,

          max_tokens: 4000,

          messages: [
            {
              role: "system",
              content: system,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      });


      if (!response.ok) {
        const text = await response.text();

        console.log("MODEL FAILED:", model);
        console.log(text);

        lastError = text;

        continue;
      }

      const data = await response.json();

      const text = extractText(data);

      if (!text) {
        lastError = "Empty response";
        continue;
      }

      console.log("MODEL SUCCESS:", model);

      return text;
    } catch (err) {
      console.log("MODEL ERROR:", model);
      console.log(err);

      lastError = err;

      continue;
    }
  }

  throw new Error(
    `All NVIDIA models failed.\n${String(lastError)}`
  );
}