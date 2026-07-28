"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError(null);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) { setError(signInError.message); setLoading(false); return; }
    router.replace("/dashboard"); router.refresh();
  }
  return <main className="tactical-grid flex min-h-screen items-center justify-center p-6"><Card className="w-full max-w-md prism-glow"><CardHeader><div className="mb-3 flex size-10 items-center justify-center border border-prism-cyan/40 bg-prism-cyan/10"><ShieldCheck className="size-5 text-prism-cyan" /></div><CardTitle>Acesso do operador</CardTitle><p className="text-sm text-fog-blue">Entre com o usuário autorizado no Supabase.</p></CardHeader><CardContent><form onSubmit={submit} className="space-y-4"><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu-email@dominio.com" required /><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Senha" required />{error && <p className="text-xs text-prism-red">{error}</p>}<Button type="submit" variant="primary" disabled={loading} className="w-full">{loading ? <><Loader2 className="size-4 animate-spin" />Entrando…</> : "Entrar"}</Button></form></CardContent></Card></main>;
}
