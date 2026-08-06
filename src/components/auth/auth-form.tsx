"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Mail, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "login" | "register";

function authErrorMessage(error: unknown, isLogin: boolean): string {
  const raw = error instanceof Error ? error.message : "Error de autenticación";
  const lower = raw.toLowerCase();

  if (lower.includes("invalid login credentials")) {
    return isLogin
      ? "Email o contraseña incorrectos. Si acabas de registrarte, puede que tengas que confirmar el email en Supabase (o desactivar «Confirm email»)."
      : raw;
  }
  if (lower.includes("email not confirmed")) {
    return "Tu email aún no está confirmado. Revisa tu correo o desactiva «Confirm email» en Supabase.";
  }
  return raw;
}

/** Tras login, navegación completa para que el middleware vea las cookies (móvil/Safari). */
function goHomeHard() {
  window.location.assign("/home");
}

export function AuthForm({ mode }: { mode: Mode }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isLogin = mode === "login";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    // FormData: en móvil el autofill a menudo no dispara onChange de React
    const formData = new FormData(e.currentTarget);
    const emailValue = String(formData.get("email") ?? email).trim();
    const passwordValue = String(formData.get("password") ?? password);

    if (!emailValue || !passwordValue) {
      setError("Introduce email y contraseña.");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    try {
      if (isLogin) {
        const { data, error: authError } =
          await supabase.auth.signInWithPassword({
            email: emailValue,
            password: passwordValue,
          });
        if (authError) throw authError;
        if (!data.session) {
          throw new Error(
            "No se pudo crear la sesión. Prueba de nuevo o usa el Magic Link.",
          );
        }
        // No usar router.push: en móvil las cookies a veces no llegan a tiempo
        goHomeHard();
        return;
      }

      const { data, error: authError } = await supabase.auth.signUp({
        email: emailValue,
        password: passwordValue,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (authError) throw authError;

      if (data.session) {
        goHomeHard();
        return;
      }

      setMessage(
        "Cuenta creada. Revisa tu correo y confirma el enlace antes de iniciar sesión. Si no te llega nada, en Supabase → Authentication → Providers → Email desactiva «Confirm email».",
      );
    } catch (err) {
      setError(authErrorMessage(err, isLogin));
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink() {
    setError(null);
    setMessage(null);
    const emailValue = email.trim();
    if (!emailValue) {
      setError("Introduce tu email para recibir el enlace mágico");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: emailValue,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (authError) throw authError;
      setMagicSent(true);
      setMessage("Enlace mágico enviado. Revisa tu bandeja de entrada.");
    } catch (err) {
      setError(authErrorMessage(err, true));
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
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
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
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="border-white/15 bg-slate-900/70 pr-11 text-slate-50 placeholder:text-slate-500 focus-visible:ring-sky-400/60"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:text-slate-100"
              aria-label={
                showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
              }
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-400/20 bg-red-950/50 px-3 py-2 text-sm text-red-300"
          >
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
