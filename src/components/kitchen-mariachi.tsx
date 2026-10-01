"use client";
import { useEffect, useRef, useState } from "react";
export type MariachiState = "idle" | "new" | "ready" | "delay" | "closed";
type RiveInstance = {
  cleanup: () => void;
  play: () => void;
  pause: () => void;
  resizeDrawingSurfaceToCanvas: () => void;
  stateMachineInputs: (
    name: string,
  ) => { name: string; value: number | boolean }[];
};
type RiveRuntime = {
  Rive: new (options: {
    canvas: HTMLCanvasElement;
    src: string;
    stateMachines: string;
    autoplay: boolean;
    onLoad: () => void;
    onLoadError: () => void;
  }) => RiveInstance;
  RuntimeLoader?: { setWasmUrl: (url: string) => void };
};
export function KitchenMariachi({
  state,
  enabled,
  resource,
}: {
  state: MariachiState;
  enabled: boolean;
  resource: string | null;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    instance = useRef<RiveInstance | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!resource || !canvas.current || !enabled) return;
    let active = true;
    const runtimePath =
      process.env.NEXT_PUBLIC_RIVE_RUNTIME_PATH ?? "/vendor/rive.js";
    const start = () => {
      if (!active || !canvas.current) return;
      const runtime = (window as unknown as { rive?: RiveRuntime }).rive;
      if (!runtime) return;
      runtime.RuntimeLoader?.setWasmUrl(
        process.env.NEXT_PUBLIC_RIVE_WASM_PATH ?? "/vendor/rive.wasm",
      );
      instance.current = new runtime.Rive({
        canvas: canvas.current,
        src: resource,
        stateMachines: "Kitchen",
        autoplay: true,
        onLoad: () => {
          if (!active) return;
          instance.current?.resizeDrawingSurfaceToCanvas();
          setLoaded(true);
        },
        onLoadError: () => setLoaded(false),
      });
    };
    const script = document.createElement("script");
    script.src = runtimePath;
    script.onload = start;
    document.head.appendChild(script);
    return () => {
      active = false;
      instance.current?.cleanup();
      instance.current = null;
      setLoaded(false);
      script.remove();
    };
  }, [resource, enabled]);
  useEffect(() => {
    if (!instance.current || !loaded) return;
    const input = instance.current
      .stateMachineInputs("Kitchen")
      .find((i) => i.name === "state");
    if (input)
      input.value = { idle: 0, new: 1, ready: 2, delay: 3, closed: 4 }[state];
    if (enabled) instance.current.play();
    else instance.current.pause();
  }, [state, enabled, loaded]);
  return (
    <div
      className={`kitchen-mariachi mariachi-${state} ${enabled ? "" : "mariachi-static"}`}
      aria-hidden="true"
    >
      {resource && (
        <canvas
          ref={canvas}
          width={130}
          height={130}
          style={{ display: loaded ? "block" : "none" }}
        />
      )}
      {!loaded && (
        <svg viewBox="0 0 130 130" width="110" height="110">
          <g className="mariachi-body">
            <path d="M40 118L45 77Q65 63 85 77L91 118Z" fill="#234c3d" />
            <path d="M58 77L65 91 73 77" fill="#fbf7ef" />
            <path d="M57 78L65 83 73 78 73 86 65 83 57 86Z" fill="#c85b40" />
            <ellipse cx="65" cy="53" rx="22" ry="25" fill="#dcb78f" />
            <path
              d="M45 53Q44 32 65 31 88 31 86 53L83 46Q63 45 47 48Z"
              fill="#262920"
            />
            <ellipse cx="65" cy="32" rx="47" ry="11" fill="#e4bf62" />
            <path d="M42 31L49 10Q65 2 81 10L88 31Z" fill="#e4bf62" />
            <path
              d="M45 25Q65 33 85 25"
              fill="none"
              stroke="#c85b40"
              strokeWidth="5"
            />
            <circle cx="57" cy="54" r="2" />
            <circle cx="73" cy="54" r="2" />
            <path
              d="M65 63Q55 57 50 64 58 70 65 65 72 70 80 64 76 57 65 63Z"
              fill="#262920"
            />
            <path
              d="M57 70Q65 75 73 70"
              fill="none"
              stroke="#8c513a"
              strokeWidth="2"
            />
            <g className="mariachi-guitar">
              <ellipse cx="69" cy="102" rx="19" ry="16" fill="#c85b40" />
              <ellipse cx="79" cy="92" rx="12" ry="11" fill="#c85b40" />
              <path d="M80 91L107 63" stroke="#ba8555" strokeWidth="8" />
              <circle cx="74" cy="98" r="5" fill="#262920" />
              <path d="M65 109L104 68" stroke="#e4bf62" strokeWidth="1" />
              <path
                d="M48 88L73 99"
                stroke="#dcb78f"
                strokeWidth="8"
                strokeLinecap="round"
              />
            </g>
          </g>
        </svg>
      )}
    </div>
  );
}
