export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28">
      {/* Background gradient orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute top-20 right-1/4 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 text-center">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5">
          <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-medium text-muted">
            100% Client-Side — No Server, No AI, No Data Leaves Your Org
          </span>
        </div>

        {/* Headline */}
        <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          Stop Deploying{' '}
          <span className="gradient-text">Blind</span>
          <br />
          Start Deploying{' '}
          <span className="gradient-text">Sovereign</span>
        </h1>

        {/* Subheading */}
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted md:text-xl">
          The DevOps Toolkit for Salesforce Flow Governance. Audit Flows,
          patch Permission Sets, and extract deterministic logic — all inside
          your org.
        </p>

        {/* CTA buttons */}
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href="#demo"
            className="rounded-lg bg-accent px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent-light hover:shadow-accent/40"
          >
            Try the Live Demo
          </a>
          <a
            href="#features"
            className="rounded-lg border border-border px-8 py-3.5 text-base font-semibold text-foreground transition-colors hover:border-accent/40 hover:bg-surface"
          >
            See What It Does
          </a>
        </div>

        {/* Social proof hint */}
        <p className="mt-12 text-sm text-muted">
          Built by a Salesforce Developer, for Salesforce teams.
        </p>
      </div>
    </section>
  );
}
