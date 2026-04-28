"use client";

import { useState } from "react";

type Props = {
  value: string;
};

export function CopyRedirectUrl({ value }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
      <code className="block flex-1 break-all rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-zinc-200">
        {value}
      </code>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold"
      >
        {copied ? "Kopiert" : "Kopieren"}
      </button>
    </div>
  );
}
