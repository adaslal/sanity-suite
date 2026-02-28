const steps = [
  {
    step: '01',
    title: 'Paste or Upload',
    description:
      'Drop your Flow XML (.flow-meta.xml) or Permission Set XML directly into the component. No file ever leaves your browser.',
  },
  {
    step: '02',
    title: 'Instant Analysis',
    description:
      'The Sanity Engine parses the XML client-side using deterministic rules — no server calls, no AI inference, no API keys.',
  },
  {
    step: '03',
    title: 'Actionable Results',
    description:
      'Get severity-ranked findings, visual flowcharts, logic trace tables, and surgical permission patches — all in seconds.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">
            Simple by Design
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            How It Works
          </h2>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.step} className="relative text-center md:text-left">
              {/* Connector line (desktop only) */}
              {i < steps.length - 1 && (
                <div className="absolute right-0 top-8 hidden h-px w-full translate-x-1/2 bg-gradient-to-r from-border to-transparent md:block" />
              )}

              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface text-lg font-bold text-accent">
                {s.step}
              </div>
              <h3 className="text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {s.description}
              </p>
            </div>
          ))}
        </div>

        {/* Trust badge */}
        <div className="mt-16 rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-sm text-muted">
            <span className="font-semibold text-foreground">
              Zero data exposure.
            </span>{' '}
            Your Flow XML and Permission Set data never leave the browser. The
            entire analysis runs client-side using deterministic JavaScript — no
            network requests, no telemetry, no third-party dependencies.
          </p>
        </div>
      </div>
    </section>
  );
}
