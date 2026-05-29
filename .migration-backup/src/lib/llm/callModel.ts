const NVIDIA_URL =
  "https://integrate.api.nvidia.com/v1/chat/completions";

export async function callModel({
  system,
  prompt,
  model,
}: {
  system: string;
  prompt: string;
  model?: string;
}) {
  const apiKey = process.env.NVIDIA_API_KEY;

  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY missing");
  }

 const primaryModel =
  model ||
  process.env.MODEL_GENERAL ||
  "meta/llama-3.3-70b-instruct";

  const fallbackModel =
    process.env.MODEL_FAST;

  async function request(modelName: string) {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 900000);

    try {
      const res = await fetch(NVIDIA_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          temperature: 0.2,
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
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const err = await res.text();

        console.error("NVIDIA STATUS:", res.status);
        console.error("NVIDIA RESPONSE:", err);

        throw new Error(
          `NVIDIA API ERROR: ${res.status} ${err}`
        );
      }

      const data = await res.json();

      return (
        data.choices?.[0]?.message?.content || ""
      );
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  try {
    return await request(primaryModel);
  } catch (primaryError) {
    console.error(
      "PRIMARY MODEL FAILED:",
      primaryError
    );

    if (
      fallbackModel &&
      fallbackModel !== primaryModel
    ) {
      console.log(
        "FALLING BACK TO:",
        fallbackModel
      );

      return await request(fallbackModel);
    }

    throw primaryError;
  }
}