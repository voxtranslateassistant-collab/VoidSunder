"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KeyRound, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecoveryReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function requestRecovery(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true); setError(null); setMessage(null);
    const supabase = createClient();
    const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setLoading(false);
    if (recoveryError) { setError(recoveryError.message); return; }
    setMessage("Se existir uma conta para este e-mail, enviamos um link seguro de recuperação.");
  }

  async function updatePassword(event: React.FormEvent) {
    event.preventDefault();
    setError(null); setMessage(null);
    if (password.length < 12) { setError("Use uma senha com pelo menos 12 caracteres."); return; }
    if (password !== confirmation) { setError("As senhas não coincidem."); return; }
    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) { setError(updateError.message); return; }
    setMessage("Senha atualizada. Você já pode voltar ao login.");
  }

  const heading = recoveryReady ? "Definir nova senha" : "Recuperar acesso";
  const description = recoveryReady ? "Crie uma senha nova e exclusiva para o VoidSunder." : "Informe seu e-mail para receber um link único de recuperação.";
  return <main className="tactical-grid flex min-h-screen items-center justify-center p-6"><Card className="w-full max-w-md prism-glow"><CardHeader><div className="mb-3 flex size-10 items-center justify-center border border-prism-cyan/40 bg-prism-cyan/10"><KeyRound className="size-5 text-prism-cyan" /></div><CardTitle>{heading}</CardTitle><p className="text-sm text-fog-blue">{description}</p></CardHeader><CardContent>{recoveryReady ? <form onSubmit={updatePassword} className="space-y-4"><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nova senha (mínimo 12 caracteres)" autoComplete="new-password" required /><Input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Confirmar nova senha" autoComplete="new-password" required />{error && <p className="text-xs text-prism-red">{error}</p>}{message && <p className="text-xs text-prism-lime">{message}</p>}<Button type="submit" variant="primary" disabled={loading} className="w-full">{loading ? <><Loader2 className="size-4 animate-spin" />Atualizando…</> : "Atualizar senha"}</Button></form> : <form onSubmit={requestRecovery} className="space-y-4"><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu-email@dominio.com" autoComplete="email" required />{error && <p className="text-xs text-prism-red">{error}</p>}{message && <p className="text-xs text-prism-lime">{message}</p>}<Button type="submit" variant="primary" disabled={loading} className="w-full">{loading ? <><Loader2 className="size-4 animate-spin" />Enviando…</> : "Enviar link de recuperação"}</Button></form>}<Link href="/login" className="mt-4 block text-center text-xs text-prism-cyan transition-colors hover:text-bone-white">Voltar ao login</Link></CardContent></Card></main>;
}
