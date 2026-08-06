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
        <p className="auth-sign-eyebrow mb-3 text-[11px] font-medium uppercase tracking-[0.35em] text-[#e0b84a]/80">
          Bienvenido al
        </p>
        <h1 className="auth-sign-title font-[family-name:var(--font-wizard)] text-[2.35rem] leading-none text-[#f3d98a] sm:text-5xl">
          Callejón Diagon
        </h1>
        <div className="mx-auto mt-3 h-px w-28 bg-gradient-to-r from-transparent via-[#e0b84a] to-transparent" />
        <p className="mt-4 text-sm text-[#d6c4a3]/85">
          {isLogin
            ? "Cruza el umbral hacia tu biblioteca mágica"
            : "Abre tu cuenta y empieza a llenar los estantes"}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="auth-shop-panel space-y-4 rounded-2xl border border-[#e0b84a]/25 bg-[#1a100e]/80 p-6 shadow-[0_0_40px_rgba(224,184,74,0.08)] backdrop-blur-md"
      >
        <div className="space-y-2">
          <Label htmlFor="email" className="text-[#e8d7b5]">
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
            className="border-[#e0b84a]/20 bg-[#0f0908]/70 text-[#f5ebd4] placeholder:text-[#a8926f] focus-visible:ring-[#e0b84a]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-[#e8d7b5]">
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
            className="border-[#e0b84a]/20 bg-[#0f0908]/70 text-[#f5ebd4] placeholder:text-[#a8926f] focus-visible:ring-[#e0b84a]"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-red-400/20 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-lg border border-[#e0b84a]/25 bg-[#e0b84a]/10 px-3 py-2 text-sm text-[#f0d78a]">
            {message}
          </p>
        )}

        <Button
          type="submit"
          className="w-full bg-[#c8962e] text-[#1a100e] hover:bg-[#e0b84a]"
          disabled={loading}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isLogin ? "Entrar al callejón" : "Crear cuenta"}
        </Button>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-[#e0b84a]/20" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#1a100e] px-2 text-[#a8926f]">o</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full border-[#e0b84a]/30 bg-transparent text-[#f0d78a] hover:bg-[#e0b84a]/10 hover:text-[#f5e6b8]"
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

      <p className="mt-6 text-center text-sm text-[#b9a488]">
        {isLogin ? (
          <>
            ¿Primera visita?{" "}
            <Link
              href="/register"
              className="font-medium text-[#e0b84a] hover:underline"
            >
              Regístrate
            </Link>
          </>
        ) : (
          <>
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/login"
              className="font-medium text-[#e0b84a] hover:underline"
            >
              Entra al callejón
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
