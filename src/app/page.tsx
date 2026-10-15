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

        <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-2">
          <section
            aria-label="Prompt"
            className="flex min-h-64 flex-col rounded-xl border border-border bg-card p-4"
          >
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">
              Prompt
            </h2>
            <div className="flex-1 rounded-lg border border-dashed border-border bg-muted/30" />
          </section>

          <section
            aria-label="Generated code"
            className="flex min-h-64 flex-col rounded-xl border border-border bg-card p-4"
          >
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">
              Código gerado
            </h2>
            <pre className="flex-1 overflow-auto rounded-lg border border-dashed border-border bg-muted/30 p-3 font-mono text-xs text-muted-foreground">
              {`// O código gerado aparece aqui`}
            </pre>
          </section>
        </div>
      </div>
    </main>
  );
}
