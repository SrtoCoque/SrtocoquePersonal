"use client";

import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { movieTrailerHref } from "@/lib/types";

export function MovieTrailerButton({
  title,
  youtubeKey,
  className,
}: {
  title: string;
  youtubeKey?: string | null;
  className?: string;
}) {
  const href = movieTrailerHref(title, youtubeKey);

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className={className}
      onClick={() => window.open(href, "_blank", "noopener,noreferrer")}
    >
      <Play className="h-4 w-4" />
      {youtubeKey ? "Ver trailer" : "Buscar trailer"}
    </Button>
  );
}
