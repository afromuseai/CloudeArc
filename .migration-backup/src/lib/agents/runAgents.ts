const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

async function call(model: string, messages: any[]) {
  const res = await fetch(NVIDIA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
    }),
  });

  const data = await res.json();
  return data.choices?.[0]?.message?.content;
}

export async function runAgents(prompt: string) {
  const system = {
    role: "system",
    content: "You are an expert software engineer agent.",
  };

  return {
    reasoning: await call("nemotron-3-nano-omni-30b-a3b-reasoning", [
      system,
      { role: "user", content: prompt },
    ]),

    ui: await call("gemma-4-31b-it", [
      system,
      { role: "user", content: prompt },
    ]),

    architecture: await call("glm-5.1", [
      system,
      { role: "user", content: prompt },
    ]),
  };
}