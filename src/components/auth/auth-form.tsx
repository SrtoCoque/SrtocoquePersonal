"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isLogin = mode === "login";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const supabase = createClient();

    try {
      if (isLogin) {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;
        router.push("/library");
        router.refresh();
      } else {
        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (authError) throw authError;
        setMessage(
          "Cuenta creada. Si hace falta confirmar el email, revisa tu correo. Si no, inicia sesión.",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de autenticación");
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink() {
    setError(null);
    setMessage(null);
    if (!email.trim()) {
      setError("Introduce tu email para recibir el enlace mágico");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (authError) throw authError;
      setMagicSent(true);
      setMessage("Enlace mágico enviado. Revisa tu bandeja de entrada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el enlace");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md animate-fade-in">
      <div className="mb-8 text-center">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.35em] text-slate-300/80">
          Bienvenido al
        </p>
        <h1 className="auth-sign-title font-[family-name:var(--font-wizard)] text-[2.35rem] leading-none text-slate-50 sm:text-5xl">
          Callejón Diagon
        </h1>
        <div className="mx-auto mt-3 h-px w-28 bg-gradient-to-r from-transparent via-sky-300/70 to-transparent" />
        <p className="mt-4 text-sm text-slate-300/90">
          {isLogin
            ? "Cruza el umbral hacia tu biblioteca mágica"
            : "Abre tu cuenta y empieza a llenar tu historia"}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="auth-shop-panel space-y-4 rounded-2xl border border-white/20 bg-slate-950/80 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-[background-color,backdrop-filter,border-color,box-shadow] duration-300 ease-out focus-within:border-white/30 focus-within:bg-slate-950/95 focus-within:shadow-[0_24px_70px_rgba(0,0,0,0.65)] focus-within:backdrop-blur-2xl"
      >
        <div className="space-y-2">
          <Label htmlFor="email" className="text-slate-200">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="border-white/15 bg-slate-900/70 text-slate-50 placeholder:text-slate-500 focus-visible:ring-sky-400/60"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-slate-200">
            Contraseña
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            className="border-white/15 bg-slate-900/70 text-slate-50 placeholder:text-slate-500 focus-visible:ring-sky-400/60"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-red-400/20 bg-red-950/50 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-lg border border-sky-400/25 bg-sky-950/40 px-3 py-2 text-sm text-sky-200">
            {message}
          </p>
        )}

        <Button
          type="submit"
          className="w-full bg-sky-500 text-slate-950 hover:bg-sky-400"
          disabled={loading}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isLogin ? "Entrar al callejón" : "Crear cuenta"}
        </Button>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/15" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-950/80 px-2 text-slate-400">o</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full border-white/20 bg-transparent text-slate-100 hover:bg-white/10 hover:text-white"
          disabled={loading || magicSent}
          onClick={handleMagicLink}
        >
          {magicSent ? (
            <Mail className="h-4 w-4" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {magicSent ? "Hechizo enviado" : "Entrar con Magic Link"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-300">
        {isLogin ? (
          <>
            ¿Primera visita?{" "}
            <Link
              href="/register"
              className="font-medium text-sky-300 hover:underline"
            >
              Regístrate
            </Link>
          </>
        ) : (
          <>
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/login"
              className="font-medium text-sky-300 hover:underline"
            >
              Entra al callejón
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
