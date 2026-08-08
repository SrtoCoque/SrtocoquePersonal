"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Link2, RefreshCw, Unlink } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GameStorefrontIcon } from "@/components/games/game-storefront";

type SteamStatus = {
  configured: boolean;
  steamId: string | null;
  syncedAt: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSynced?: () => void;
};

function formatSyncedAt(iso: string | null): string {
  if (!iso) return "Nunca";
  try {
    return new Date(iso).toLocaleString("es-ES", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function SteamSyncDialog({ open, onOpenChange, onSynced }: Props) {
  const [status, setStatus] = useState<SteamStatus | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/steam/link");
    const data = (await res.json()) as SteamStatus & { error?: string };
    if (!res.ok) {
      setError(data.error ?? "No se pudo cargar el estado de Steam");
      return;
    }
    setStatus(data);
  }, []);

  useEffect(() => {
    if (!open) return;
    setResult(null);
    setError(null);
    void loadStatus();
  }, [open, loadStatus]);

  async function handleLink() {
    setLoading(true);
    setError(null);
    setResult(null);
    const res = await fetch("/api/steam/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
    });
    const data = (await res.json()) as { steamId?: string; error?: string };
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo vincular");
      return;
    }
    setInput("");
    setResult("Cuenta vinculada. Ya puedes sincronizar.");
    await loadStatus();
  }

  async function handleUnlink() {
    if (!confirm("¿Desvincular Steam? No se borrarán los juegos ya importados.")) {
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch("/api/steam/link", { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "No se pudo desvincular");
      return;
    }
    setResult("Steam desvinculado");
    await loadStatus();
  }

  async function handleSync() {
    setSyncing(true);
    setError(null);
    setResult(null);
    const res = await fetch("/api/steam/sync", { method: "POST" });
    const data = (await res.json()) as {
      error?: string;
      created?: number;
      updated?: number;
      totalSteam?: number;
      matched?: number;
      unmatched?: number;
    };
    setSyncing(false);
    if (!res.ok) {
      setError(data.error ?? "Error al sincronizar");
      return;
    }
    setResult(
      `Listo: ${data.totalSteam ?? 0} en Steam · ${data.created ?? 0} nuevos · ${data.updated ?? 0} actualizados` +
        (data.unmatched
          ? ` · ${data.unmatched} sin ficha IGDB (se guardaron igual)`
          : ""),
    );
    await loadStatus();
    onSynced?.();
  }

  const linked = Boolean(status?.steamId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader onClose={() => onOpenChange(false)}>
        <DialogTitle className="flex items-center gap-2">
          <GameStorefrontIcon storefront="steam" className="h-5 w-5" />
          Steam
        </DialogTitle>
      </DialogHeader>
      <DialogBody className="space-y-4">
        {!status ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--muted)]" />
          </div>
        ) : !status.configured ? (
          <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            Falta <code className="text-xs">STEAM_WEB_API_KEY</code> en el
            servidor. Consíguela en{" "}
            <a
              href="https://steamcommunity.com/dev/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              steamcommunity.com/dev/apikey
            </a>
            .
          </p>
        ) : (
          <>
            <p className="text-sm text-[var(--muted)]">
              Importa la biblioteca y reparte horas de Steam: solo escribe en la
              partida actual si el juego es solo Steam o si estás jugando en
              Steam. Si juegas en otra tienda, las horas de Steam se guardan
              aparte hasta que marques «Jugando en Steam». No cambia estados.
            </p>

            {linked ? (
              <div className="space-y-3 rounded-xl border border-[var(--border)] p-3">
                <div className="text-sm">
                  <p className="text-[var(--muted)]">SteamID</p>
                  <p className="font-mono text-xs">{status.steamId}</p>
                </div>
                <div className="text-sm">
                  <p className="text-[var(--muted)]">Última sync</p>
                  <p>{formatSyncedAt(status.syncedAt)}</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    className="flex-1"
                    disabled={syncing || loading}
                    onClick={() => void handleSync()}
                  >
                    {syncing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Sincronizar ahora
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={loading || syncing}
                    onClick={() => void handleUnlink()}
                  >
                    <Unlink className="h-4 w-4" />
                    Desvincular
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="steam-input">
                    URL de perfil o SteamID64
                  </Label>
                  <Input
                    id="steam-input"
                    placeholder="https://steamcommunity.com/id/tuusuario"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleLink();
                      }
                    }}
                  />
                </div>
                <Button
                  type="button"
                  className="w-full"
                  disabled={loading || !input.trim()}
                  onClick={() => void handleLink()}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Link2 className="h-4 w-4" />
                  )}
                  Vincular Steam
                </Button>
              </div>
            )}
          </>
        )}

        {error ? (
          <p className="rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}
        {result ? (
          <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
            {result}
          </p>
        ) : null}
      </DialogBody>
    </Dialog>
  );
}
