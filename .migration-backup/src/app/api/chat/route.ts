import { NextResponse } from "next/server";
import { callModel } from "../../../lib/llm/callModel";

function cleanJson(text: string) {
  return text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const prompt = body.prompt;

    console.log("USER REQUEST:", prompt);

    // =========================
    // 1. PLANNER
    // =========================

    const planResponse = await callModel({
      system: `
You are PLANNER AGENT.

Break user request into implementation steps.

Return Raw ONLY JSON:

{
  "steps": [
    "step 1",
    "step 2"
  ]
}
      `,
      prompt,
      model: process.env.MODEL_REASONER,
    });

    const plan = JSON.parse(
  cleanJson(planResponse)
);

    // =========================
    // 2. ARCHITECT
    // =========================

    const architectureResponse = await callModel({
      system: `
You are ARCHITECT AGENT.

Determine EXACT files to modify.

Return Raw ONLY JSON:

{
  "files": [
    "/src/app/page.tsx",
    "/src/components/Hero.tsx"
  ]
}
      `,
      prompt: JSON.stringify(plan),
      model: process.env.MODEL_GENERAL,
    });

    const architecture = JSON.parse(
  cleanJson(architectureResponse)
);

    // =========================
    // 3. CODER
    // =========================

    const codeResponse = await callModel({
      system: `
You are CODER AGENT.

Return Raw ONLY JSON array.

Allowed files:
${architecture.files.join("\n")}

FORMAT:

[
  {
    "type": "write_file",
    "path": "/src/app/page.tsx",
    "content": "FULL FILE CONTENT"
  }
]
      `,
      prompt,
      model: process.env.MODEL_CODER,
    });

    let actions = [];

    try {
      actions = JSON.parse(
  cleanJson(codeResponse)
);
    } catch {
      return NextResponse.json(
        [
          {
            type: "console_log",
            message: "Invalid coder JSON output",
          },
        ],
        { status: 500 }
      );
    }

    // =========================
    // VALIDATION
    // =========================

    const safeActions = actions.filter(
      (a: any) =>
        a.type === "write_file" &&
        typeof a.path === "string" &&
        typeof a.content === "string"
    );

    return NextResponse.json(safeActions);

  } catch (err: any) {

    console.error("ACOS ERROR:", err);

    return NextResponse.json(
      [
        {
          type: "console_log",
          message: err.message || "ACOS failure",
        },
      ],
      { status: 500 }
    );
  }
}