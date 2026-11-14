"use client";

import { useProgress } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { PLANNER_TEXTURE_READY_EVENT } from "./materials.ts";

/** Reports an actual settled WebGL render, never just that a canvas mounted. */
export function RenderReady({ renderKey }: { renderKey: string }) {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const active = useProgress((state) => state.active);
  const errors = useProgress((state) => state.errors);
  const frames = useRef(0);
  const ready = useRef(false);

  useEffect(() => {
    const canvas = gl.domElement;
    const reset = () => {
      frames.current = 0;
      ready.current = false;
      canvas.setAttribute("data-render-ready", "false");
      canvas.setAttribute("data-render-key", renderKey);
      invalidate();
    };
    const lost = () => {
      ready.current = false;
      canvas.setAttribute("data-render-ready", "false");
      canvas.setAttribute("data-render-error", "webglcontextlost");
    };
    reset();
    canvas.addEventListener("webglcontextlost", lost);
    window.addEventListener(PLANNER_TEXTURE_READY_EVENT, reset);
    return () => {
      canvas.removeEventListener("webglcontextlost", lost);
      window.removeEventListener(PLANNER_TEXTURE_READY_EVENT, reset);
      canvas.setAttribute("data-render-ready", "false");
    };
  }, [gl, invalidate, renderKey]);

  useFrame(() => {
    if (ready.current) return;
    if (errors.length || gl.getContext().isContextLost()) {
      gl.domElement.setAttribute("data-render-error", errors.join("; ") || "webglcontextlost");
      return;
    }
    if (active) {
      frames.current = 0;
      invalidate();
      return;
    }
    frames.current += 1;
    if (frames.current >= 4 && gl.info.render.calls > 0) {
      gl.domElement.setAttribute("data-render-ready", "true");
      gl.domElement.setAttribute("data-render-key", renderKey);
      ready.current = true;
      gl.domElement.dispatchEvent(new CustomEvent("planner:render-ready", { bubbles: true }));
    } else invalidate();
  });
  return null;
}
