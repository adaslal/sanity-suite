'use client';
import { useState } from 'react';

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <processType>AutoLaunchedFlow</processType>
    <status>Active</status>
    <apiVersion>58.0</apiVersion>
    <start>
        <connector>
            <targetReference>Get_Accounts</targetReference>
        </connector>
    </start>
    <recordLookups>
        <name>Get_Accounts</name>
        <connector>
            <targetReference>Loop_Accounts</targetReference>
        </connector>
        <object>Account</object>
    </recordLookups>
    <loops>
        <name>Loop_Accounts</name>
        <connector>
            <targetReference>Update_Account</targetReference>
        </connector>
        <noMoreValuesConnector>
            <targetReference>Final_Assignment</targetReference>
        </noMoreValuesConnector>
        <collectionReference>Get_Accounts</collectionReference>
    </loops>
    <recordUpdates>
        <name>Update_Account</name>
        <connector>
            <targetReference>Loop_Accounts</targetReference>
        </connector>
        <object>Account</object>
    </recordUpdates>
    <assignments>
        <name>Final_Assignment</name>
        <assignmentItems>
            <assignToReference>varOutput</assignToReference>
            <operator>Assign</operator>
            <value><stringValue>Done</stringValue></value>
        </assignmentItems>
    </assignments>
</Flow>`;

export default function Demo() {
  const [xml, setXml] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  function handleAnalyze() {
    setError(null);
    setResult(null);

    const input = xml.trim();
    if (!input) {
      setError('Please paste some Flow XML first.');
      return;
    }

    setLoading(true);

    // Use dynamic import so the engine only loads when needed
    import('@/lib/sanityEngine')
      .then(({ SanityEngine }) => {
        const engine = new SanityEngine();
        const analysis = engine.analyzeFlow(input);
        setResult(analysis);
      })
      .catch((err) => {
        setError('Analysis failed: ' + err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  function handleLoadSample() {
    setXml(SAMPLE_XML);
    setResult(null);
    setError(null);
  }

  return (
    <section id="demo" className="py-20 md:py-28">
      <div className="mx-auto max-w-4xl px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">
            Try It Now
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Live Demo — Runs in Your Browser
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            Paste any Salesforce Flow XML below and see the Sanity Engine in
            action. Nothing is uploaded — the analysis runs entirely
            client-side.
          </p>
        </div>

        <div className="mt-10 rounded-xl border border-border bg-surface p-6">
          {/* Toolbar */}
          <div className="mb-3 flex items-center justify-between">
            <label className="text-sm font-medium text-muted">
              Flow XML (.flow-meta.xml)
            </label>
            <button
              onClick={handleLoadSample}
              className="text-xs font-medium text-accent hover:text-accent-light transition-colors"
            >
              Load sample Flow
            </button>
          </div>

          {/* Textarea */}
          <textarea
            value={xml}
            onChange={(e) => setXml(e.target.value)}
            placeholder="Paste your Flow XML here..."
            rows={10}
            className="w-full rounded-lg border border-border bg-background p-4 font-mono text-sm text-foreground placeholder-muted/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />

          {/* Analyze button */}
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="mt-4 w-full rounded-lg bg-accent px-6 py-3 text-base font-semibold text-white transition-all hover:bg-accent-light disabled:opacity-50 sm:w-auto"
          >
            {loading ? 'Analyzing...' : 'Run Analysis'}
          </button>

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Results */}
          {result && result.success && (
            <div className="mt-6 space-y-4">
              {/* Summary bar */}
              <div className="flex flex-wrap gap-3">
                <div className="rounded-lg border border-border bg-background px-4 py-2">
                  <span className="text-xs text-muted">Elements</span>
                  <p className="text-lg font-bold">{result.stats?.totalElements ?? '—'}</p>
                </div>
                <div className="rounded-lg border border-border bg-background px-4 py-2">
                  <span className="text-xs text-muted">Warnings</span>
                  <p className="text-lg font-bold text-amber-400">
                    {result.warnings ? result.warnings.length : 0}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background px-4 py-2">
                  <span className="text-xs text-muted">Process Type</span>
                  <p className="text-lg font-bold">
                    {result.flowType ?? '—'}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background px-4 py-2">
                  <span className="text-xs text-muted">Analysis Time</span>
                  <p className="text-lg font-bold">
                    {result.stats?.processingTimeMs ?? '—'}ms
                  </p>
                </div>
              </div>

              {/* Warnings list */}
              {result.warnings && result.warnings.length > 0 && (
                <div className="rounded-lg border border-border bg-background p-4">
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
                    Audit Findings
                  </h4>
                  <div className="space-y-2">
                    {result.warnings.map((w, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 rounded-lg border border-border/50 bg-surface p-3"
                      >
                        <span
                          className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${
                            w.severity === 'Critical'
                              ? 'bg-red-500'
                              : w.severity === 'High'
                              ? 'bg-orange-500'
                              : w.severity === 'Medium'
                              ? 'bg-yellow-500'
                              : 'bg-blue-500'
                          }`}
                        />
                        <div>
                          <p className="text-sm font-medium">
                            <span className={`mr-2 inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${
                              w.severity === 'Critical' ? 'bg-red-500/20 text-red-400' :
                              w.severity === 'High' ? 'bg-orange-500/20 text-orange-400' :
                              w.severity === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>{w.severity}</span>
                            {w.type}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            {w.message}
                          </p>
                          {w.remediation && (
                            <p className="mt-1 text-xs text-green-400/80">
                              Fix: {w.remediation}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trace table preview */}
              {result.trace && result.trace.length > 0 && (
                <div className="rounded-lg border border-border bg-background p-4">
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
                    Logic Trace (first 5 steps)
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-border text-xs text-muted">
                          <th className="pb-2 pr-4">Step</th>
                          <th className="pb-2 pr-4">Meaning</th>
                          <th className="pb-2">Impact</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.trace.slice(0, 5).map((t, i) => (
                          <tr key={i} className="border-b border-border/30">
                            <td className="py-2 pr-4 font-mono text-accent">
                              {t.step ?? i + 1}
                            </td>
                            <td className="py-2 pr-4">{t.explanation ?? '—'}</td>
                            <td className="py-2 text-muted">
                              {t.impact ?? '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Engine returned an error */}
          {result && !result.success && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {result.error || 'Analysis could not complete.'}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
