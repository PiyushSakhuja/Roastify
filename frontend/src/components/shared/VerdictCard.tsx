import { useCallback, useRef, useState } from "react";
import { cx } from "../../lib/utils";

interface VerdictCardProps {
  platformName: string;
  /** Hex color, e.g. platform.accentColor from data/platforms.ts */
  accentColor: string;
  roastText: string;
  /** Short evidence lines shown under the verdict, e.g. top artists/repos.
   * Keep to real data only — this renders whatever is passed in verbatim. */
  evidence?: string[];
  sentence?: string;
}

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350; // 4:5, good for feed + story crops

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(/\s+/);
  let line = "";
  let cursorY = y;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      line = word;
      cursorY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, x, cursorY);
    cursorY += lineHeight;
  }
  return cursorY;
}

async function ensureFontsReady() {
  try {
    await Promise.all([
      document.fonts.load('900 64px "Anton"'),
      document.fonts.load('600 28px "Inter"'),
      document.fonts.load('500 24px "JetBrains Mono"'),
    ]);
  } catch {
    // Fonts may already be loaded, or the browser may not support the API —
    // either way, canvas falls back to system fonts rather than failing.
  }
}

function drawCard(
  canvas: HTMLCanvasElement,
  { platformName, accentColor, roastText, evidence, sentence }: VerdictCardProps
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;

  const padding = 72;
  const contentWidth = CARD_WIDTH - padding * 2;

  // Background
  ctx.fillStyle = "#0a0a0d";
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Subtle accent glow, top
  const glow = ctx.createRadialGradient(
    CARD_WIDTH / 2,
    120,
    0,
    CARD_WIDTH / 2,
    120,
    600
  );
  glow.addColorStop(0, `${accentColor}22`);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Top border accent
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 0, CARD_WIDTH, 6);

  let y = 140;

  // Eyebrow
  ctx.fillStyle = "#6b6c78";
  ctx.font = '600 26px "JetBrains Mono", monospace';
  ctx.textBaseline = "alphabetic";
  ctx.fillText("ROASTIFY CASE FILE", padding, y);

  y += 60;

  // Platform name, large
  ctx.fillStyle = accentColor;
  ctx.font = '900 76px "Anton", sans-serif';
  ctx.fillText(platformName.toUpperCase(), padding, y);

  y += 90;

  // "THE VERDICT" label
  ctx.fillStyle = "#e8e8ec";
  ctx.font = '700 30px "Inter", sans-serif';
  ctx.fillText("THE VERDICT", padding, y);

  y += 50;

  // Roast text, wrapped, italic feel via slight styling
  ctx.fillStyle = "#c7c7d1";
  ctx.font = '500 38px "Inter", sans-serif';
  y = wrapText(ctx, roastText, padding, y, contentWidth, 50);

  y += 20;

  // Evidence lines
  if (evidence && evidence.length > 0) {
    ctx.strokeStyle = "#2a2a32";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(CARD_WIDTH - padding, y);
    ctx.stroke();

    y += 44;
    ctx.fillStyle = "#6b6c78";
    ctx.font = '600 22px "JetBrains Mono", monospace';
    ctx.fillText("EVIDENCE", padding, y);
    y += 38;

    ctx.fillStyle = "#9a9aa5";
    ctx.font = '500 26px "Inter", sans-serif';
    for (const line of evidence.slice(0, 3)) {
      y = wrapText(ctx, line, padding, y, contentWidth, 34);
      y += 8;
    }
  }

  // Sentence line, bottom-anchored
  if (sentence) {
    ctx.fillStyle = accentColor;
    ctx.font = '700 26px "JetBrains Mono", monospace';
    ctx.fillText(sentence.toUpperCase(), padding, CARD_HEIGHT - 140);
  }

  // Footer wordmark
  ctx.fillStyle = "#4a4a54";
  ctx.font = '600 24px "Inter", sans-serif';
  ctx.fillText("ROASTIFY.APP", padding, CARD_HEIGHT - 72);

  ctx.fillStyle = "#4a4a54";
  ctx.font = '500 20px "JetBrains Mono", monospace';
  ctx.textAlign = "right";
  ctx.fillText("ZERO APPEALS", CARD_WIDTH - padding, CARD_HEIGHT - 72);
  ctx.textAlign = "left";
}

/**
 * Renders a courtroom-styled verdict card to canvas and offers download /
 * native share / clipboard copy. Draws real props only — no placeholder or
 * invented data is baked into the card.
 */
export function VerdictCard(props: VerdictCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"idle" | "rendering" | "ready" | "error">("idle");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const render = useCallback(async () => {
    if (!canvasRef.current) return;
    setStatus("rendering");
    await ensureFontsReady();
    drawCard(canvasRef.current, props);
    setStatus("ready");
  }, [props]);

  const getBlob = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!canvasRef.current) return resolve(null);
      canvasRef.current.toBlob((blob) => resolve(blob), "image/png");
    });
  }, []);

  const handleDownload = useCallback(async () => {
    const blob = await getBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `roastify-${props.platformName.toLowerCase()}-verdict.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, [getBlob, props.platformName]);

  const handleShare = useCallback(async () => {
    const blob = await getBlob();
    if (!blob) return;
    const file = new File([blob], `roastify-${props.platformName.toLowerCase()}-verdict.png`, {
      type: "image/png",
    });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text: "I got roasted on Roastify." });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard.
      }
    }

    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setActionMessage("Image copied to clipboard.");
      setTimeout(() => setActionMessage(null), 2500);
    } catch {
      // Clipboard image write isn't supported everywhere — download instead
      // of failing silently.
      handleDownload();
    }
  }, [getBlob, props.platformName, handleDownload]);

  return (
    <div className="mx-auto max-w-sm">
      {status === "idle" && (
        <button
          type="button"
          onClick={render}
          className="w-full rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-paper hover:border-smoke-dim transition-colors"
        >
          Generate Verdict Card
        </button>
      )}

      {status === "rendering" && (
        <div className="flex items-center justify-center py-6 text-sm text-smoke font-mono">
          Rendering card...
        </div>
      )}

      <canvas
        ref={canvasRef}
        className={cx(
          "w-full rounded-lg border border-line",
          status === "ready" ? "block" : "hidden"
        )}
        style={{ aspectRatio: `${CARD_WIDTH} / ${CARD_HEIGHT}` }}
        aria-label={`Shareable verdict card for ${props.platformName} roast`}
      />

      {status === "ready" && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="flex-1 rounded-md bg-paper text-ink px-4 py-2 text-sm font-semibold hover:bg-white transition-colors"
          >
            Share Card
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="rounded-md border border-line px-4 py-2 text-sm text-paper hover:border-smoke-dim transition-colors"
          >
            Download
          </button>
        </div>
      )}

      {actionMessage && (
        <p className="mt-2 text-center text-xs text-acid font-mono" role="status">
          {actionMessage}
        </p>
      )}
    </div>
  );
}
