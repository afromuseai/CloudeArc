import { motion, useAnimation } from "framer-motion";
import { useEffect, useRef } from "react";

/*
 * AgentLivenessIndicator
 *
 * Stage-aware logo animation. Center never moves.
 * Each outer block slides on a SINGLE AXIS toward the center, one at a time,
 * then returns in reverse. Animation speed and rhythm adapt to execution stage:
 *
 *   thinking  — slow, deliberate, longer pauses (planning feel)
 *   planning  — moderate, exploratory rhythm
 *   building  — fast, continuous, high-energy
 *   debugging — irregular pacing with hesitation pauses
 *   finalizing — smooth, calming, graceful slowdown
 *   idle      — stopped (returns to rest positions)
 *
 * Axes:
 *   TL → DOWN (+y)   BL → RIGHT (+x)   BR → UP (-y)   TR → LEFT (-x)
 */

export type ExecutionStage =
  | "thinking"
  | "planning"
  | "building"
  | "debugging"
  | "finalizing"
  | "idle";

interface StageParams {
  dur:        number;   // seconds per block move
  interBlock: number;   // ms between each block
  dockedPause:number;   // ms pause when all docked
  loopRest:   number;   // ms pause before next loop
}

const STAGE_PARAMS: Record<ExecutionStage, StageParams> = {
  thinking:   { dur: 0.52, interBlock: 160, dockedPause: 640, loopRest: 900 },
  planning:   { dur: 0.38, interBlock: 115, dockedPause: 420, loopRest: 580 },
  building:   { dur: 0.22, interBlock:  52, dockedPause: 130, loopRest: 160 },
  debugging:  { dur: 0.34, interBlock:  95, dockedPause: 380, loopRest: 650 },
  finalizing: { dur: 0.44, interBlock: 115, dockedPause: 520, loopRest: 820 },
  idle:       { dur: 0.35, interBlock:  80, dockedPause: 300, loopRest: 400 },
};

const FILL = "rgba(255,255,255,0.85)";
const MOVE = 6;
const EASE: [number, number, number, number] = [0.42, 0, 0.58, 1];

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

type Props = {
  active?: boolean;
  stage?:  ExecutionStage;
  size?:   number;
  className?: string;
};

export function AgentLivenessIndicator({
  active = false,
  stage  = "building",
  size   = 32,
  className,
}: Props) {
  const tl   = useAnimation();
  const tr   = useAnimation();
  const bl   = useAnimation();
  const br   = useAnimation();
  const alive     = useRef(false);
  const stageRef  = useRef<ExecutionStage>(stage);

  // Keep stageRef current without restarting the loop
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    const baseT = { ease: EASE };

    if (!active) {
      alive.current = false;
      const ret = { duration: 0.35, ease: EASE };
      tl.start({ y: 0, transition: ret });
      tr.start({ x: 0, transition: ret });
      bl.start({ x: 0, transition: ret });
      br.start({ y: 0, transition: ret });
      return;
    }

    alive.current = true;

    async function loop() {
      while (alive.current) {
        const p = STAGE_PARAMS[stageRef.current];
        const t = { ...baseT, duration: p.dur };

        // ── For debugging: occasionally add an extra hesitation ─────────────
        const isDebug = stageRef.current === "debugging";

        // Phase A: compress anti-clockwise  tl → bl → br → tr
        await tl.start({ y: MOVE, transition: t });
        await delay(isDebug && Math.random() > 0.6 ? p.interBlock * 2.4 : p.interBlock);
        if (!alive.current) break;

        await bl.start({ x: MOVE, transition: t });
        await delay(p.interBlock);
        if (!alive.current) break;

        await br.start({ y: -MOVE, transition: t });
        await delay(isDebug && Math.random() > 0.7 ? p.interBlock * 1.8 : p.interBlock);
        if (!alive.current) break;

        await tr.start({ x: -MOVE, transition: t });
        await delay(p.dockedPause);
        if (!alive.current) break;

        // Phase B: return clockwise  tr → br → bl → tl
        await tr.start({ x: 0, transition: t });
        await delay(p.interBlock);
        if (!alive.current) break;

        await br.start({ y: 0, transition: t });
        await delay(p.interBlock);
        if (!alive.current) break;

        await bl.start({ x: 0, transition: t });
        await delay(p.interBlock);
        if (!alive.current) break;

        await tl.start({ y: 0, transition: t });
        await delay(p.loopRest);
      }
    }

    loop();
    return () => { alive.current = false; };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ width: size, height: size, flexShrink: 0 }} className={className}>
      <svg viewBox="0 0 48 48" width={size} height={size} fill="none" overflow="visible">

        {/* ── Top-left L ── */}
        <motion.g animate={tl} initial={{ y: 0 }}>
          <rect x="0"  y="0"  width="9"  height="15" rx="2" fill={FILL} />
          <rect x="0"  y="0"  width="15" height="6"  rx="2" fill={FILL} />
        </motion.g>

        {/* ── Top-right square ── */}
        <motion.g animate={tr} initial={{ x: 0 }}>
          <rect x="33" y="0"  width="10" height="10" rx="2" fill={FILL} />
        </motion.g>

        {/* ── Center — NEVER moves ── */}
        <rect x="18" y="18" width="12" height="12" rx="2" fill={FILL} />

        {/* ── Bottom-left square ── */}
        <motion.g animate={bl} initial={{ x: 0 }}>
          <rect x="5"  y="33" width="10" height="10" rx="2" fill={FILL} />
        </motion.g>

        {/* ── Bottom-right L ── */}
        <motion.g animate={br} initial={{ y: 0 }}>
          <rect x="39" y="33" width="9"  height="15" rx="2" fill={FILL} />
          <rect x="33" y="42" width="15" height="6"  rx="2" fill={FILL} />
        </motion.g>

      </svg>
    </div>
  );
}
