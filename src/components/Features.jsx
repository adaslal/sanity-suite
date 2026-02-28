const features = [
  {
    title: 'Flow Health',
    subtitle: 'The Diagnostic Shield',
    description:
      'Instant health scoring for your Flows. Detects missing descriptions, hardcoded IDs, DML-in-loops, unhandled faults, and naming violations — before they hit production.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="2">
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      </svg>
    ),
    color: 'from-green-500/20 to-emerald-500/20',
    borderColor: 'group-hover:border-green-500/30',
    items: [
      '9 deterministic audit rules',
      'Severity-ranked findings',
      'Zero false positives',
    ],
  },
  {
    title: 'PermSet PatchMaster',
    subtitle: 'The Security Scalpel',
    description:
      'Surgical permission set merging. Identifies the true delta between source and destination, then patches only what changed — no overwrites, no surprises.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: 'from-blue-500/20 to-cyan-500/20',
    borderColor: 'group-hover:border-blue-500/30',
    items: [
      'Field, object & user permissions',
      'Visual diff with add/remove/keep',
      'Copy-paste ready XML output',
    ],
  },
  {
    title: 'Sanity Engine',
    subtitle: 'The Meaning Extractor',
    description:
      'Translates raw Flow XML into human-readable logic. Generates deterministic flowcharts, logic trace tables, and structural hashes — no LLM, pure analysis.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="2">
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: 'from-purple-500/20 to-violet-500/20',
    borderColor: 'group-hover:border-purple-500/30',
    items: [
      'SVG flowchart with shape vocabulary',
      'Step-by-step logic trace',
      'Downloadable HTML report',
    ],
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        {/* Section header */}
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">
            Three Modules, One Mission
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Everything You Need to{' '}
            <span className="gradient-text">Govern Flows</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted">
            Each module solves a distinct pain point in the Salesforce DevOps
            lifecycle. Together, they give you complete visibility and control.
          </p>
        </div>

        {/* Feature cards */}
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className={`card-glow group rounded-xl border border-border bg-surface p-8 ${f.borderColor}`}
            >
              {/* Icon with gradient background */}
              <div
                className={`mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${f.color} text-foreground`}
              >
                {f.icon}
              </div>

              <h3 className="text-xl font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm font-medium text-accent">
                {f.subtitle}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {f.description}
              </p>

              {/* Capability list */}
              <ul className="mt-5 space-y-2">
                {f.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-muted"
                  >
                    <span className="mt-1 text-accent">&#10003;</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
