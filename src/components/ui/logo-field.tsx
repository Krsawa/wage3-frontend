"use client";

import { useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const MIN = 400;
const STORED = 256;

/** Checks type and size, then shrinks to a 256px square (cover) so it stores small. */
async function toLogo(file: File): Promise<string | null> {
  if (!["image/png", "image/jpeg"].includes(file.type)) {
    toast.error("Use a PNG or JPEG");
    return null;
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    if (img.naturalWidth < MIN || img.naturalHeight < MIN) {
      toast.error(`Use an image at least ${MIN}×${MIN}px`);
      return null;
    }
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = Object.assign(document.createElement("canvas"), { width: STORED, height: STORED });
    canvas.getContext("2d")!.drawImage(
      img,
      (img.naturalWidth - side) / 2,
      (img.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      STORED,
      STORED,
    );
    return canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.9);
  } catch {
    toast.error("Couldn't read that image");
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Round logo preview: the image, or a quiet dotted placeholder until there is one. */
export function LogoPreview({ src, className }: { src: string | null; className?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={cn("size-12 shrink-0 rounded-full object-cover shadow-[inset_0_0_0_1px_oklch(0_0_0/0.08)]", className)} />
  ) : (
    <span
      aria-hidden
      className={cn("size-12 shrink-0 rounded-full", className)}
      style={{
        backgroundImage:
          "radial-gradient(circle, var(--blue-6) 1.2px, transparent 1.4px), radial-gradient(circle, var(--color-600) 1px, transparent 1.2px)",
        backgroundSize: "9px 9px, 6px 6px",
        backgroundPosition: "1px 2px, 0 0",
      }}
    />
  );
}

/** Logo picker after the "Company details" pattern: preview, Upload/Replace, Remove, the rules. */
export function LogoField({
  label = "Logo",
  value,
  onChange,
}: {
  label?: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] text-fg-muted">{label}</span>
      <div className="flex flex-wrap items-center gap-3">
        <LogoPreview src={value} />
        <Button variant="outline" size="sm" onClick={() => input.current?.click()}>
          {value ? "Replace" : "Upload"}
        </Button>
        {value ? (
          <button type="button" onClick={() => onChange(null)} className="text-[13px] text-fg-muted hover:text-fg">
            Remove
          </button>
        ) : (
          <span className="text-xs text-fg-subtle">PNG or JPEG, at least {MIN}×{MIN}px</span>
        )}
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            const logo = await toLogo(file);
            if (logo) onChange(logo);
          }}
        />
      </div>
    </div>
  );
}
