"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

export function DeleteScanButton({
  scanId,
  redirectTo,
  label = "Apagar",
}: {
  scanId: string;
  redirectTo?: string;
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function remove() {
    setLoading(true);
    try {
      await fetch(`/api/scans/${scanId}`, { method: "DELETE" });
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-2">
        <button
          onClick={remove}
          disabled={loading}
          className="inline-flex items-center gap-1 text-micro-caps text-prism-red transition-colors hover:text-white"
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" strokeWidth={1.5} />
          ) : (
            <Trash2 className="size-3.5" strokeWidth={1.5} />
          )}
          Confirmar
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-micro-caps text-graphite-veil hover:text-fog-blue"
        >
          Cancelar
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-1 text-micro-caps text-graphite-veil transition-colors hover:text-prism-red"
    >
      <Trash2 className="size-3.5" strokeWidth={1.5} />
      {label}
    </button>
  );
}
