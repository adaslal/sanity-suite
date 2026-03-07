'use client';
/**
 * ApexVisualizerTool — Lead magnet free tool for sanity-suite.vercel.app
 *
 * Split view: Apex code editor (left) + Mermaid flowchart (right)
 * Features: reactive rendering, PNG/SVG download, LinkedIn share, Sanity Suite CTA
 * Design: dark SaaS aesthetic matching the existing site theme
 */
import { useState, useEffect, useRef, useCallback, useId } from 'react';
import { parseApexToMermaid, getApexStats, SAMPLE_APEX } from '@/lib/apexParser';

// ─── Mermaid initialisation (client-side only) ───────────────────────────────
let mermaidModule = null;
let mermaidReady = false;

async function ensureMermaid() {
  if (mermaidReady) return mermaidModule;
  const mod = await import('mermaid');
  mermaidModule = mod.default;
  mermaidModule.initialize({
    startOnLoad: false,
    theme: 'dark',
    themeVariables: {
      darkMode: true,
      background: '#0a0a0f',
      primaryColor: '#4f46e5',
      primaryTextColor: '#e2e8f0',
      primaryBorderColor: '#2a2a3a',
      secondaryColor: '#111118',
      tertiaryColor: '#0a0a0f',
      lineColor: '#6366f1',
      textColor: '#e2e8f0',
      mainBkg: '#1a1a24',
      nodeBorder: '#6366f1',
      clusterBkg: '#0a0a0f',
      titleColor: '#ededed',
      edgeLabelBackground: '#111118',
    },
    flowchart: {
      htmlLabels: false,
      curve: 'basis',
      rankSpacing: 60,
      nodeSpacing: 40,
      padding: 20,
    },
    securityLevel: 'loose',
  });
  mermaidReady = true;
  return mermaidModule;
}

// ─── Stat badge component ────────────────────────────────────────────────────
function StatBadge({ label, value, color = 'accent' }) {
  const colorMap = {
    accent: 'text-accent',
    green: 'text-green-400',
    amber: 'text-amber-400',
    cyan: 'text-cyan-400',
    purple: 'text-purple-400',
    red: 'text-red-400',
  };
  return (
    <div className="flex flex-col items-center rounded-lg border border-border bg-background px-3 py-2 min-w-[70px]">
      <span className={`text-lg font-bold ${colorMap[color] || colorMap.accent}`}>{value}</span>
      <span className="text-[10px] uppercase tracking-wider text-muted">{label}</span>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function ApexVisualizerTool() {
  const [apexCode, setApexCode] = useState('');
  const [mermaidCode, setMermaidCode] = useState('');
  const [svgContent, setSvgContent] = useState('');
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [isRendering, setIsRendering] = useState(false);
  const [copied, setCopied] = useState(false);

  const containerRef = useRef(null);
  const renderIdRef = useRef(0);
  const uniqueId = useId().replace(/:/g, '_');

  // ── Parse Apex → Mermaid → SVG (reactive, debounced) ──
  const renderDiagram = useCallback(async (code) => {
    const trimmed = (code || '').trim();
    if (!trimmed) {
      setMermaidCode('');
      setSvgContent('');
      setStats(null);
      setError(null);
      return;
    }

    // Parse Apex to Mermaid syntax
    const mermaid_output = parseApexToMermaid(trimmed);
    setMermaidCode(mermaid_output);

    // Extract stats
    const codeStats = getApexStats(trimmed);
    setStats(codeStats);

    if (!mermaid_output) {
      setError('Could not parse any Apex constructs. Make sure you paste a valid Apex class.');
      setSvgContent('');
      return;
    }

    // Render Mermaid to SVG
    setIsRendering(true);
    setError(null);
    const thisRender = ++renderIdRef.current;

    try {
      const mermaid = await ensureMermaid();
      const graphId = `viz_${uniqueId}_${thisRender}`;
      const { svg } = await mermaid.render(graphId, mermaid_output);
      if (thisRender === renderIdRef.current) {
        setSvgContent(svg);
        setError(null);
      }
    } catch (err) {
      if (thisRender === renderIdRef.current) {
        setError(err?.message || 'Mermaid rendering failed');
        setSvgContent('');
      }
    } finally {
      if (thisRender === renderIdRef.current) {
        setIsRendering(false);
      }
    }
  }, [uniqueId]);

  // Debounce input changes
  useEffect(() => {
    const timeout = setTimeout(() => renderDiagram(apexCode), 400);
    return () => clearTimeout(timeout);
  }, [apexCode, renderDiagram]);

  // ── Load sample ──
  function handleLoadSample() {
    setApexCode(SAMPLE_APEX);
  }

  // ── Clear ──
  function handleClear() {
    setApexCode('');
  }

  // ── Download SVG ──
  function handleDownloadSvg() {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${stats?.className || 'apex'}-flowchart.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Download PNG ──
  function handleDownloadPng() {
    if (!svgContent) return;

    // Parse SVG and prepare a clean version for canvas rendering
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svgEl = svgDoc.querySelector('svg');
    if (!svgEl) return;

    // Ensure SVG has explicit xmlns for standalone rendering
    svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgEl.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

    // Remove any foreignObject elements (they taint the canvas)
    svgEl.querySelectorAll('foreignObject').forEach(fo => {
      const text = fo.textContent || '';
      const parent = fo.parentNode;
      if (parent && text.trim()) {
        const svgText = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'text');
        svgText.setAttribute('fill', '#e2e8f0');
        svgText.setAttribute('font-size', '14');
        svgText.setAttribute('font-family', 'sans-serif');
        svgText.textContent = text.trim().slice(0, 40);
        parent.appendChild(svgText);
      }
      fo.remove();
    });

    const scale = 2;
    const vb = svgEl.getAttribute('viewBox');
    let width = parseFloat(svgEl.getAttribute('width')) || 800;
    let height = parseFloat(svgEl.getAttribute('height')) || 600;
    if (vb) {
      const parts = vb.split(/[\s,]+/);
      width = parseFloat(parts[2]) || width;
      height = parseFloat(parts[3]) || height;
    }

    // Serialize the cleaned SVG
    const serializer = new XMLSerializer();
    const cleanSvgStr = serializer.serializeToString(svgEl);

    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    // Use data URI to avoid cross-origin tainting
    const svgB64 = btoa(unescape(encodeURIComponent(cleanSvgStr)));
    const dataUri = `data:image/svg+xml;base64,${svgB64}`;

    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const pngUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `${stats?.className || 'apex'}-flowchart.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(pngUrl);
      }, 'image/png');
    };

    img.onerror = () => {
      // Fallback: open SVG in new tab for manual save
      const blob = new Blob([cleanSvgStr], { type: 'image/svg+xml' });
      window.open(URL.createObjectURL(blob), '_blank');
    };

    img.src = dataUri;
  }

  // ── Copy Mermaid code ──
  function handleCopyMermaid() {
    if (!mermaidCode) return;
    navigator.clipboard.writeText(mermaidCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ── Share to LinkedIn ──
  function handleShareLinkedIn() {
    const text = encodeURIComponent(
      `I just visualized my Apex class as a flowchart using this free tool — no login, no server, runs entirely in your browser.\n\nPaste any Apex class and see the control flow instantly.\n\nTry it here: https://sanity-suite.vercel.app/tools/apex-visualizer\n\n#Salesforce #ApexDev #SalesforceDeveloper #DevOps #SanitySuite`
    );
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://sanity-suite.vercel.app/tools/apex-visualizer')}&summary=${text}`, '_blank');
  }

  const hasOutput = svgContent || error;
  const lineCount = apexCode.split('\n').length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Hero banner ── */}
      <section className="relative overflow-hidden border-b border-border pt-28 pb-12 md:pt-32 md:pb-16">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-1/3 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute top-10 right-1/4 h-56 w-56 rounded-full bg-purple-500/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-medium text-muted">Free Tool — No Login Required</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Apex <span className="gradient-text">Visualizer</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-muted">
            Paste any Apex class and see its control flow as an interactive flowchart.
            100% client-side — your code never leaves your browser.
          </p>
        </div>
      </section>

      {/* ── Toolbar ── */}
      <div className="sticky top-16 z-30 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadSample}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent/40 hover:text-foreground"
            >
              Load Sample
            </button>
            <button
              onClick={handleClear}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-red-500/40 hover:text-red-400"
            >
              Clear
            </button>
            {stats && (
              <span className="ml-2 hidden text-xs text-muted sm:inline">
                {stats.className} &middot; {stats.codeLines} lines &middot; {stats.methodCount} method{stats.methodCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyMermaid}
              disabled={!mermaidCode}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
              title="Copy Mermaid code"
            >
              {copied ? (
                <svg className="h-3.5 w-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              )}
              {copied ? 'Copied' : 'Mermaid'}
            </button>
            <button
              onClick={handleDownloadSvg}
              disabled={!svgContent}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              SVG
            </button>
            <button
              onClick={handleDownloadPng}
              disabled={!svgContent}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              PNG
            </button>
            <div className="mx-1 h-4 w-px bg-border" />
            <button
              onClick={handleShareLinkedIn}
              className="flex items-center gap-1.5 rounded-lg bg-[#0A66C2] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              Share
            </button>
          </div>
        </div>
      </div>

      {/* ── Split View ── */}
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="grid gap-4 lg:grid-cols-2" style={{ minHeight: '65vh' }}>

          {/* Left: Code Editor */}
          <div className="flex flex-col rounded-xl border border-border bg-surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-red-500/60" />
                  <span className="h-3 w-3 rounded-full bg-yellow-500/60" />
                  <span className="h-3 w-3 rounded-full bg-green-500/60" />
                </div>
                <span className="ml-2 text-xs font-medium text-muted">
                  {stats?.className ? `${stats.className}.cls` : 'Apex Class'}
                </span>
              </div>
              <span className="text-[10px] text-muted/60">{lineCount} lines</span>
            </div>
            <div className="relative flex-1">
              {/* Line numbers */}
              <div className="pointer-events-none absolute top-0 left-0 bottom-0 w-12 border-r border-border/30 bg-background/30">
                <div className="p-4 font-mono text-xs leading-[1.7rem] text-muted/30 select-none">
                  {Array.from({ length: Math.max(lineCount, 20) }, (_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
              </div>
              <textarea
                value={apexCode}
                onChange={(e) => setApexCode(e.target.value)}
                placeholder="Paste your Apex class here...&#10;&#10;Or click 'Load Sample' to see it in action."
                spellCheck={false}
                className="h-full w-full resize-none bg-transparent py-4 pr-4 pl-14 font-mono text-sm leading-[1.7rem] text-foreground placeholder-muted/40 focus:outline-none"
                style={{ minHeight: '500px', tabSize: 4 }}
              />
            </div>
          </div>

          {/* Right: Flowchart Viewer */}
          <div className="flex flex-col rounded-xl border border-border bg-surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-accent shadow-sm shadow-accent/40" />
                <span className="text-xs font-medium tracking-wide text-muted uppercase">
                  Control Flow
                </span>
                {isRendering && (
                  <span className="ml-2 text-xs text-muted animate-pulse">Rendering...</span>
                )}
              </div>
            </div>

            <div className="relative flex-1 overflow-auto" style={{ minHeight: '500px' }}>
              {error ? (
                <div className="m-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-red-300">Parse Error</p>
                      <pre className="mt-1.5 whitespace-pre-wrap text-xs text-red-400/80 font-mono">{error}</pre>
                    </div>
                  </div>
                </div>
              ) : svgContent ? (
                <div
                  ref={containerRef}
                  className="flex justify-center p-6 [&_svg]:max-w-full [&_svg]:h-auto"
                  dangerouslySetInnerHTML={{ __html: svgContent }}
                />
              ) : isRendering ? (
                <div className="flex items-center justify-center h-full">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
                </div>
              ) : (
                /* Empty state */
                <div className="flex flex-col items-center justify-center h-full text-center px-8">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-light border border-border">
                    <svg className="h-8 w-8 text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                    </svg>
                  </div>
                  <p className="text-sm text-muted">Paste an Apex class on the left to visualize its control flow.</p>
                  <button
                    onClick={handleLoadSample}
                    className="mt-3 text-xs font-medium text-accent hover:text-accent-light transition-colors"
                  >
                    Or try with a sample class &rarr;
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Stats bar (appears when code is parsed) ── */}
        {stats && (
          <div className="mt-4 rounded-xl border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <StatBadge label="Lines" value={stats.codeLines} color="accent" />
              <StatBadge label="Methods" value={stats.methodCount} color="green" />
              <StatBadge label="SOQL" value={stats.soqlCount} color="cyan" />
              <StatBadge label="DML" value={stats.dmlCount} color="purple" />
              <StatBadge label="Branches" value={stats.ifCount} color="amber" />
              <StatBadge label="Loops" value={stats.loopCount} color="purple" />
              <StatBadge label="Throws" value={stats.throwCount} color="red" />
              {stats.eventCount > 0 && (
                <StatBadge label="Events" value={stats.eventCount} color="accent" />
              )}
              <div className="ml-2 flex flex-col items-center rounded-lg border border-accent/30 bg-accent/10 px-4 py-2">
                <span className="text-lg font-bold text-accent">{stats.complexity}</span>
                <span className="text-[10px] uppercase tracking-wider text-accent/80">Complexity</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── CTA Banner — Conversion Layer ── */}
      <section className="border-t border-border py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-10 text-center md:p-14">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -bottom-16 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-accent/15 blur-3xl" />
            </div>
            <div className="relative">
              <p className="text-sm font-semibold uppercase tracking-widest text-accent">
                Go Deeper
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                Want Full Flow Governance &amp;{' '}
                <span className="gradient-text">Security Audits</span>?
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-sm text-muted leading-relaxed">
                The Sanity Suite LWC runs inside your Salesforce org — audit Flow XML,
                patch Permission Sets, extract deterministic logic hashes, and score
                your Flow health. All client-side, zero data exposure.
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <a
                  href="https://abhilash38.gumroad.com/l/jdenr?wanted=true"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-accent px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent-light hover:shadow-accent/40"
                >
                  Get Sanity Suite — $29
                </a>
                <a
                  href="/"
                  className="rounded-lg border border-border px-8 py-3.5 text-sm font-semibold text-foreground transition-colors hover:border-accent/40 hover:bg-surface-light"
                >
                  Learn More
                </a>
              </div>
              <p className="mt-4 text-xs text-muted">
                Installs in under 5 minutes. No external dependencies.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
