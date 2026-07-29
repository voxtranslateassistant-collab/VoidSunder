import Link from "next/link";
import { TopBar } from "@/components/layout/topbar";

export default function NotFound() {
  return (
    <>
      <TopBar title="Achado não encontrado" />
      <main className="tactical-grid flex flex-1 items-center justify-center p-8">
        <div className="max-w-sm border border-ash-border bg-surface-1 p-8 text-center">
          <p className="text-micro-caps text-graphite-veil">404</p>
          <h2 className="mt-3 text-xl font-medium tracking-tight">
            Este achado não existe
          </h2>
          <p className="mt-2 text-sm text-fog-blue">
            Ele pode ter sido removido ou o identificador está incorreto.
          </p>
          <Link
            href="/findings"
            className="mt-5 inline-flex h-9 items-center bg-bone-white px-4 text-xs font-medium text-pure-black transition-colors hover:bg-white"
          >
            Voltar para Findings
          </Link>
        </div>
      </main>
    </>
  );
}
