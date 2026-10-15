import { GeneratorShell } from "@/components/generator/generator-shell";

export default function Home() {
  return (
    <main className="min-h-screen bg-background p-6 text-foreground md:p-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col gap-6 md:min-h-[calc(100vh-4rem)]">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">UIForge</h1>
          <p className="text-sm text-muted-foreground">
            Descreva um componente e veja o código React + Tailwind ser gerado
            ao vivo.
          </p>
        </header>

        <GeneratorShell />
      </div>
    </main>
  );
}
