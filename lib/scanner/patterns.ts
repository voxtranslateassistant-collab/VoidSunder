// ------------------------------------------------------------
// Padrões de detecção — segredos, caminhos sensíveis, tecnologia.
// Base para o recon profundo. Nada aqui ataca: são regex sobre
// conteúdo que o próprio alvo entregou e checagens de caminho por GET.
// ------------------------------------------------------------

import type { Severity } from "@/types";

export interface SecretPattern {
  id: string;
  label: string;
  regex: RegExp;
  severity: Severity;
  cwe: string;
  /** Reduz falso-positivo: exige contexto para padrões genéricos. */
  generic?: boolean;
}

export const SECRET_PATTERNS: SecretPattern[] = [
  {
    id: "aws-access-key",
    label: "AWS Access Key ID",
    regex: /\bAKIA[0-9A-Z]{16}\b/g,
    severity: "critical",
    cwe: "CWE-798",
  },
  {
    id: "aws-secret",
    label: "AWS Secret Access Key",
    regex: /aws(.{0,20})?(secret|private).{0,20}['"][0-9a-zA-Z/+]{40}['"]/gi,
    severity: "critical",
    cwe: "CWE-798",
  },
  {
    id: "private-key",
    label: "Chave privada (PEM)",
    regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g,
    severity: "critical",
    cwe: "CWE-321",
  },
  {
    id: "google-api-key",
    label: "Google API Key",
    regex: /\bAIza[0-9A-Za-z\-_]{35}\b/g,
    severity: "high",
    cwe: "CWE-798",
  },
  {
    id: "stripe-live",
    label: "Stripe Secret Key (live)",
    regex: /\bsk_live_[0-9a-zA-Z]{24,}\b/g,
    severity: "critical",
    cwe: "CWE-798",
  },
  {
    id: "github-token",
    label: "GitHub Token",
    regex: /\bgh[pousr]_[0-9A-Za-z]{36}\b/g,
    severity: "high",
    cwe: "CWE-798",
  },
  {
    id: "slack-token",
    label: "Slack Token",
    regex: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/g,
    severity: "high",
    cwe: "CWE-798",
  },
  {
    id: "sendgrid",
    label: "SendGrid API Key",
    regex: /\bSG\.[0-9A-Za-z_-]{22}\.[0-9A-Za-z_-]{43}\b/g,
    severity: "high",
    cwe: "CWE-798",
  },
  {
    id: "jwt",
    label: "JSON Web Token (JWT)",
    regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
    severity: "medium",
    cwe: "CWE-522",
  },
  {
    id: "generic-secret",
    label: "Credencial hardcoded",
    regex:
      /(?:api[_-]?key|apikey|secret|token|passwd|password|auth[_-]?token)['"\s]{0,3}[:=]['"\s]{0,3}['"][0-9a-zA-Z\-_!@#$%^&*.]{8,60}['"]/gi,
    severity: "high",
    cwe: "CWE-798",
    generic: true,
  },
];

export interface SensitivePath {
  path: string;
  label: string;
  severity: Severity;
  /** Se o corpo casar com isto, confirma exposição real (não só 200). */
  confirm?: RegExp;
  cwe: string;
}

export const SENSITIVE_PATHS: SensitivePath[] = [
  { path: "/.env", label: "Arquivo .env exposto", severity: "critical", confirm: /[A-Z_]+=/i, cwe: "CWE-538" },
  { path: "/.env.local", label: "Arquivo .env.local exposto", severity: "critical", confirm: /[A-Z_]+=/i, cwe: "CWE-538" },
  { path: "/.env.production", label: "Arquivo .env.production exposto", severity: "critical", confirm: /[A-Z_]+=/i, cwe: "CWE-538" },
  { path: "/.git/config", label: "Repositório .git exposto", severity: "critical", confirm: /\[core\]|repositoryformatversion/i, cwe: "CWE-527" },
  { path: "/.git/HEAD", label: "Repositório .git exposto (HEAD)", severity: "high", confirm: /ref:\s*refs\//i, cwe: "CWE-527" },
  { path: "/.svn/entries", label: "Repositório .svn exposto", severity: "high", cwe: "CWE-527" },
  { path: "/.aws/credentials", label: "Credenciais AWS expostas", severity: "critical", confirm: /aws_access_key_id/i, cwe: "CWE-538" },
  { path: "/.ssh/id_rsa", label: "Chave SSH privada exposta", severity: "critical", confirm: /PRIVATE KEY/i, cwe: "CWE-321" },
  { path: "/.htpasswd", label: "Arquivo .htpasswd exposto", severity: "high", cwe: "CWE-538" },
  { path: "/wp-config.php.bak", label: "Backup do wp-config exposto", severity: "critical", confirm: /DB_PASSWORD|DB_NAME/i, cwe: "CWE-530" },
  { path: "/config.php.bak", label: "Backup de config exposto", severity: "high", cwe: "CWE-530" },
  { path: "/web.config", label: "web.config acessível", severity: "medium", confirm: /<configuration/i, cwe: "CWE-538" },
  { path: "/appsettings.json", label: "appsettings.json exposto", severity: "high", confirm: /ConnectionStrings|"[A-Za-z]+":/i, cwe: "CWE-538" },
  { path: "/credentials.json", label: "credentials.json exposto", severity: "critical", cwe: "CWE-538" },
  { path: "/phpinfo.php", label: "phpinfo() exposto", severity: "medium", confirm: /phpinfo\(\)|PHP Version/i, cwe: "CWE-200" },
  { path: "/info.php", label: "phpinfo() exposto", severity: "medium", confirm: /PHP Version/i, cwe: "CWE-200" },
  { path: "/server-status", label: "Apache server-status exposto", severity: "medium", confirm: /Apache Server Status/i, cwe: "CWE-200" },
  { path: "/.DS_Store", label: "Arquivo .DS_Store exposto", severity: "low", cwe: "CWE-527" },
  { path: "/backup.zip", label: "Backup .zip acessível", severity: "high", cwe: "CWE-530" },
  { path: "/backup.sql", label: "Dump SQL acessível", severity: "critical", cwe: "CWE-530" },
  { path: "/database.sql", label: "Dump de banco acessível", severity: "critical", cwe: "CWE-530" },
  { path: "/dump.sql", label: "Dump SQL acessível", severity: "critical", cwe: "CWE-530" },
  { path: "/docker-compose.yml", label: "docker-compose.yml exposto", severity: "medium", confirm: /services:|image:/i, cwe: "CWE-538" },
  { path: "/swagger.json", label: "Especificação Swagger exposta", severity: "low", confirm: /swagger|openapi/i, cwe: "CWE-200" },
  { path: "/openapi.json", label: "Especificação OpenAPI exposta", severity: "low", confirm: /openapi/i, cwe: "CWE-200" },
  { path: "/graphql", label: "Endpoint GraphQL acessível", severity: "low", cwe: "CWE-200" },
  { path: "/phpmyadmin/", label: "phpMyAdmin acessível", severity: "medium", confirm: /phpMyAdmin/i, cwe: "CWE-284" },
  { path: "/.well-known/security.txt", label: "security.txt presente", severity: "info", cwe: "N/A" },
  { path: "/robots.txt", label: "robots.txt", severity: "info", cwe: "N/A" },
  { path: "/sitemap.xml", label: "sitemap.xml", severity: "info", cwe: "N/A" },
];

/** Redige um segredo, preservando só um prefixo curto para identificação. */
export function redactSecret(value: string): string {
  const clean = value.replace(/['"]/g, "");
  if (clean.length <= 8) return "****";
  return `${clean.slice(0, 4)}…${clean.slice(-2)} [${clean.length} chars — redigido]`;
}
