export default function CTA() {
  return (
    <section id="cta" className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-12 text-center md:p-16">
          {/* Background gradient */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -bottom-20 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-accent/15 blur-3xl" />
          </div>

          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to Take Control of Your{' '}
              <span className="gradient-text">Salesforce Deployments</span>?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted">
              Get the Sanity Suite LWC for your org and start governing
              Flows and Permission Sets with confidence. Zero external
              dependencies, zero server calls.
            </p>

            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <a
                href="https://abhilash38.gumroad.com/l/jdenr?wanted=true"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-accent px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent-light"
              >
                Get It — $29
              </a>
              <a
                href="https://github.com/adaslal/sanity-suite"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-border px-8 py-3.5 text-base font-semibold text-foreground transition-colors hover:border-accent/40 hover:bg-surface-light"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                View on GitHub
              </a>
            </div>

            <p className="mt-6 text-xs text-muted">
              Deploy to your org in under 5 minutes with{' '}
              <code className="rounded bg-background px-1.5 py-0.5 text-accent">sf project deploy start</code>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
