"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  GameDestinationFields,
  gameDestinationToStatus,
  type GameDestination,
} from "@/components/games/game-destination-fields";
import { GameSearchPreview } from "@/components/games/game-search-preview";
import type { GameStorefront } from "@/components/games/game-storefront";
import { createClient } from "@/lib/supabase/client";
import type { GameShelfStatus, RawgGameResult } from "@/lib/types";
import {
  nextPricesSetAt,
  pricesDraftToDb,
  type GamePricesDraft,
} from "@/lib/game-prices";
import { insertHourLogIfIncreased, todayPlayedOn } from "@/lib/game-hour-logs";
import { cn } from "@/lib/utils";
import { submitFormOnEnter } from "@/lib/submit-form-on-enter";

type Props = {
  game: RawgGameResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSaved?: () => void;
};

export function SaveGameDialog({
  game,
  open,
  onOpenChange,
  userId,
  onSaved,
}: Props) {
  const [destination, setDestination] = useState<GameDestination | null>(null);
  const [shelfStatus, setShelfStatus] = useState<GameShelfStatus>("owned");
  const [storefronts, setStorefronts] = useState<GameStorefront[]>([]);
  const [playStorefront, setPlayStorefront] = useState<GameStorefront | null>(
    null,
  );
  const [prices, setPrices] = useState<GamePricesDraft>({});
  const [hoursPlayed, setHoursPlayed] = useState<number | "">("");
  const [startDate, setStartDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [finishDate, setFinishDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDestination(null);
    setShelfStatus("owned");
    setStorefronts([]);
    setPlayStorefront(null);
    setPrices({});
    setHoursPlayed("");
    setStartDate(new Date().toISOString().slice(0, 10));
    setFinishDate(new Date().toISOString().slice(0, 10));
    setError(null);
    setDone(false);
  }, [open, game?.rawgId]);

  async function handleSave() {
    if (!game || !destination) return;
    if (destination === "shelf" && storefronts.length === 0) {
      setError("Elige al menos una tienda (Steam, PlayStation…)");
      return;
    }

    const status = gameDestinationToStatus(destination, shelfStatus);
    const needsPlay =
      status === "playing" || status === "completed";
    const resolvedPlay =
      storefronts.length === 1
        ? storefronts[0]
        : playStorefront && storefronts.includes(playStorefront)
          ? playStorefront
          : null;
    if (needsPlay && storefronts.length > 1 && !resolvedPlay) {
      setError("Elige desde qué tienda estás jugando");
      return;
    }
    setSaving(true);
    setError(null);

    const hours =
      status === "playing" || status === "completed"
        ? Number(hoursPlayed) || 0
        : 0;

    const nextPrices =
      destination === "shelf" ? pricesDraftToDb(prices, storefronts) : {};

    const supabase = createClient();
    const { data: inserted, error: insertError } = await supabase
      .from("user_games")
      .insert({
        user_id: userId,
        rawg_id: game.rawgId,
        title: game.title,
        developers: game.developers,
        cover_url: game.coverUrl,
        platforms: game.platforms,
        storefronts: destination === "shelf" ? storefronts : [],
        play_storefront: needsPlay ? resolvedPlay : null,
        released: game.released,
        metacritic: game.metacritic,
        status,
        hours_played: hours,
        prices: nextPrices,
        prices_set_at: nextPricesSetAt({ nextPrices }),
        playtime_estimate: game.playtimeEstimate,
        start_date:
          status === "playing" || status === "completed" ? startDate : null,
        finish_date: status === "completed" ? finishDate : null,
        times_completed: status === "completed" ? 1 : 0,
      })
      .select("id")
      .single();

    setSaving(false);
    if (insertError) {
      setError(
        insertError.message.includes("play_storefront")
          ? "Falta actualizar Supabase. Ejecuta supabase/migrate-game-play-storefront.sql"
          : insertError.message.includes("storefront")
          ? "Falta actualizar Supabase. Ejecuta supabase/migrate-game-storefronts-multi.sql"
          : insertError.message.includes("prices_set_at")
            ? "Falta actualizar Supabase. Ejecuta supabase/migrate-game-prices-set-at.sql"
          : insertError.message.includes("prices")
            ? "Falta actualizar Supabase. Ejecuta supabase/migrate-game-prices-by-storefront.sql"
            : insertError.message.includes("start_date")
              ? "Falta actualizar Supabase. Ejecuta supabase/migrate-game-start-date.sql"
              : insertError.message,
      );
      return;
    }

    if (inserted?.id && hours > 0) {
      const { error: logError } = await insertHourLogIfIncreased(supabase, {
        userId,
        gameId: inserted.id as string,
        before: 0,
        after: hours,
        playedOn:
          (status === "completed" && finishDate) ||
          startDate ||
          todayPlayedOn(),
        source: "manual",
      });
      if (logError?.message.includes("user_game_hour_logs")) {
        setError(
          "Falta actualizar Supabase. Ejecuta supabase/migrate-game-hour-logs.sql",
        );
        return;
      }
    }

    setDone(true);
    onSaved?.();
    setTimeout(() => onOpenChange(false), 700);
  }

  if (!game) return null;

  const canSave =
    destination === "wishlist" ||
    (destination === "shelf" && storefronts.length > 0);
  const saveLabel =
    destination === "wishlist"
      ? "Añadir a Wishlist"
      : destination === "shelf"
        ? storefronts.length > 0
          ? "Añadir a la biblioteca"
          : "Elige tienda(s)"
        : "Elige una opción";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader onClose={() => onOpenChange(false)}>
        <DialogTitle>Guardar juego</DialogTitle>
      </DialogHeader>
      <DialogBody className="space-y-4">
        <form
          className="space-y-4"
          onKeyDown={submitFormOnEnter}
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
        >
          <GameSearchPreview game={game} />

          <GameDestinationFields
            destination={destination}
            onDestinationChange={setDestination}
            shelfStatus={shelfStatus}
            onShelfStatusChange={setShelfStatus}
            storefronts={storefronts}
            onStorefrontsChange={setStorefronts}
            playStorefront={playStorefront}
            onPlayStorefrontChange={setPlayStorefront}
            prices={prices}
            onPricesChange={setPrices}
            hoursPlayed={hoursPlayed}
            onHoursPlayedChange={setHoursPlayed}
            startDate={startDate}
            onStartDateChange={setStartDate}
            finishDate={finishDate}
            onFinishDateChange={setFinishDate}
          />

          {error && (
            <p className="rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
              {error}
            </p>
          )}
          {done && (
            <p className="rounded-lg bg-[var(--accent)]/12 px-3 py-2 text-sm text-[var(--accent)]">
              Guardado correctamente
            </p>
          )}

          <Button
            type="submit"
            className={cn(
              "w-full",
              destination === "wishlist" &&
                "bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-500",
            )}
            disabled={!canSave || saving || done}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saveLabel}
          </Button>
        </form>
      </DialogBody>
    </Dialog>
  );
}
