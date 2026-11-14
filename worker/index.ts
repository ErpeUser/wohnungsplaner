/** Cloudflare Worker entry point for the vinext-starter template. */
import path from "node:path";
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS?: Fetcher;
  DB?: D1Database;
  IMAGES?: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

function isPrivateReferencePath(pathname: string) {
  try {
    const normalized = path.posix.normalize(decodeURIComponent(pathname).replaceAll("\\", "/")).toLowerCase();
    return ["/planner-assets/private-reference", "/planner-assets/reference", "/planner-assets/local-sources", "/.codex-temp"].some(
      (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
    );
  } catch {
    return true;
  }
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (isPrivateReferencePath(url.pathname)) {
      return new Response("Not Found", { status: 404 });
    }

    if (url.pathname === "/_vinext/image") {
      if (!env.ASSETS || !env.IMAGES) return new Response("Image optimization is not configured", { status: 501 });
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (assetPath) => {
          if (!assetPath.startsWith("/planner-assets/") && !assetPath.startsWith("/assets/")) {
            return Promise.resolve(new Response("Asset path not allowed", { status: 400 }));
          }
          if (isPrivateReferencePath(assetPath)) {
            return Promise.resolve(new Response("Asset path not allowed", { status: 404 }));
          }
          if (assetPath.includes("..")) return Promise.resolve(new Response("Asset path not allowed", { status: 400 }));
          return env.ASSETS!.fetch(new Request(new URL(assetPath, request.url)));
        },
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES!.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
