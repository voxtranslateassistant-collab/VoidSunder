export type JobProfile = "web_recon" | "authenticated_web" | "api_validation" | "llm_lab";
export type JobStatus = "queued" | "claimed" | "running" | "completed" | "failed" | "cancelled";

export const JOB_PROFILE_LABEL: Record<JobProfile, string> = {
  web_recon: "Reconhecimento Web",
  authenticated_web: "Aplicação autenticada",
  api_validation: "Validação de API",
  llm_lab: "Laboratório de IA",
};
