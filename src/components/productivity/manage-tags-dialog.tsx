"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Plus, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { ProductivityTag } from "@/lib/productivity";
import { cn } from "@/lib/utils";

export function ManageTagsDialog({
  open,
  onOpenChange,
  userId,
  tags,
  colors,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  tags: ProductivityTag[];
  colors: readonly string[];
  onChanged: () => void | Promise<void>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(colors[0] ?? "#0d9488");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    resetForm();
  }, [open]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setColor(colors[0] ?? "#0d9488");
    setError(null);
    setSaving(false);
  }

  function startEdit(tag: ProductivityTag) {
    setEditingId(tag.id);
    setName(tag.name);
    setColor(tag.color);
    setError(null);
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();

    if (editingId) {
      const { error: updateError } = await supabase
        .from("user_productivity_tags")
        .update({ name: trimmed, color })
        .eq("id", editingId)
        .eq("user_id", userId);
      setSaving(false);
      if (updateError) {
        setError(
          updateError.message.includes("unique")
            ? "Ya tienes una etiqueta con ese nombre"
            : updateError.message,
        );
        return;
      }
      resetForm();
      await onChanged();
      return;
    }

    const { error: insertError } = await supabase
      .from("user_productivity_tags")
      .insert({ user_id: userId, name: trimmed, color });
    setSaving(false);
    if (insertError) {
      setError(
        insertError.message.includes("user_productivity")
          ? "Falta actualizar Supabase. Ejecuta supabase/schema-productivity.sql"
          : insertError.message.includes("unique")
            ? "Ya tienes una etiqueta con ese nombre"
            : insertError.message,
      );
      return;
    }
    resetForm();
    await onChanged();
    onOpenChange(false);
  }

  async function removeTag(id: string) {
    if (!confirm("¿Eliminar etiqueta y todas sus sesiones?")) return;
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("user_productivity_tags")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    if (editingId === id) resetForm();
    await onChanged();
  }

  const isEditing = editingId != null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader onClose={() => onOpenChange(false)}>
        <DialogTitle>Etiquetas</DialogTitle>
      </DialogHeader>
      <DialogBody className="space-y-4">
        <ul className="space-y-2">
          {tags.length === 0 ? (
            <li className="text-sm text-[var(--muted)]">
              Crea etiquetas como Trabajo, Estudio, Side project…
            </li>
          ) : (
            tags.map((t) => {
              const active = editingId === t.id;
              return (
                <li
                  key={t.id}
                  className={cn(
                    "flex items-center gap-1 rounded-xl border px-1 py-1",
                    active
                      ? "border-teal-700 bg-teal-700/10"
                      : "border-[var(--border)]",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => startEdit(t)}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-[var(--surface-2)]/70"
                  >
                    <span
                      className="h-3.5 w-3.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: t.color }}
                    />
                    <span className="truncate">{t.name}</span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Eliminar ${t.name}`}
                    onClick={() => void removeTag(t.id)}
                  >
                    <Trash2 className="h-4 w-4 text-[var(--danger)]" />
                  </Button>
                </li>
              );
            })
          )}
        </ul>

        <div className="space-y-3 border-t border-[var(--border)] pt-4">
          <div className="space-y-2">
            <Label htmlFor="tag-name">
              {isEditing ? "Editar etiqueta" : "Nueva etiqueta"}
            </Label>
            <Input
              id="tag-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (name.trim() && !saving) void save();
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <ColorPicker
              colors={colors}
              color={color}
              onChange={setColor}
            />
          </div>
          {error ? (
            <p className="text-sm text-[var(--danger)]">{error}</p>
          ) : null}
        </div>
      </DialogBody>
      <DialogFooter className="flex flex-wrap items-center justify-end gap-2">
        {isEditing ? (
          <Button type="button" variant="secondary" onClick={resetForm}>
            <X className="h-4 w-4" />
            Cancelar
          </Button>
        ) : null}
        <Button
          type="button"
          onClick={() => void save()}
          disabled={saving || !name.trim()}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isEditing ? (
            <Check className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {isEditing ? "Guardar" : "Añadir"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function ColorPicker({
  colors,
  color,
  onChange,
}: {
  colors: readonly string[];
  color: string;
  onChange: (color: string) => void;
}) {
  const isPreset = colors.some(
    (c) => c.toLowerCase() === color.toLowerCase(),
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={c}
          onClick={() => onChange(c)}
          className={cn(
            "h-8 w-8 rounded-lg ring-offset-2 ring-offset-[var(--surface)]",
            color.toLowerCase() === c.toLowerCase() &&
              "ring-2 ring-[var(--foreground)]",
          )}
          style={{ backgroundColor: c }}
        />
      ))}
      <label
        className={cn(
          "relative flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-lg ring-offset-2 ring-offset-[var(--surface)]",
          !isPreset && "ring-2 ring-[var(--foreground)]",
        )}
        style={{
          background: isPreset
            ? "conic-gradient(from 0deg, #ef4444, #eab308, #22c55e, #3b82f6, #a855f7, #ef4444)"
            : color,
        }}
        title="Paleta de colores"
      >
        <span className="sr-only">Paleta de colores</span>
        <input
          type="color"
          value={normalizeHex(color)}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}

function normalizeHex(value: string): string {
  const v = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    const [, r, g, b] = v;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return "#0d9488";
}
