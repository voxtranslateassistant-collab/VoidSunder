import { createCipheriv, createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type FormLoginCredentialInput = {
  loginUrl: string;
  username: string;
  password: string;
  postLoginPath?: string;
};

function encryptionKey() {
  const secret = process.env.ASSET_CREDENTIAL_ENCRYPTION_SECRET;
  if (!secret) throw new Error("Defina ASSET_CREDENTIAL_ENCRYPTION_SECRET no Vercel e no Railway antes de cadastrar uma credencial de teste.");
  return createHash("sha256").update(secret).digest();
}

export function validateFormLoginCredential(input: FormLoginCredentialInput, assetTarget: string) {
  const loginUrl = new URL(input.loginUrl);
  const target = new URL(assetTarget);
  if (loginUrl.origin !== target.origin) throw new Error("A URL de login precisa pertencer ao mesmo domínio do ativo aprovado.");
  if (!input.username.trim() || !input.password) throw new Error("Informe a identificação e a senha da conta de teste.");
  if (input.password.length < 8) throw new Error("A senha de teste precisa ter pelo menos 8 caracteres.");
  if (input.postLoginPath && (!input.postLoginPath.startsWith("/") || input.postLoginPath.startsWith("//"))) throw new Error("A rota pós-login deve começar com / e permanecer no mesmo domínio.");
  return { loginUrl: loginUrl.toString(), username: input.username.trim(), password: input.password, postLoginPath: input.postLoginPath?.trim() || undefined };
}

function encrypt(value: FormLoginCredentialInput) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const plaintext = JSON.stringify(value);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [iv.toString("base64"), cipher.getAuthTag().toString("base64"), ciphertext.toString("base64")].join(".");
}

export async function saveFormLoginCredential(supabase: SupabaseClient, assetId: string, assetTarget: string, input: FormLoginCredentialInput) {
  const credential = validateFormLoginCredential(input, assetTarget);
  const { error } = await supabase.from("asset_credentials").upsert({
    asset_id: assetId,
    label: "form-login",
    kind: "form_login",
    encrypted_value: encrypt(credential),
    updated_at: new Date().toISOString(),
  }, { onConflict: "asset_id,label" });
  if (error) throw error;
}
