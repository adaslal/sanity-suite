/**
 * Sanity Checks — Static analysis rules that detect common Apex anti-patterns.
 * Returns an array of { severity, title, detail } findings.
 * Severity: 'critical' | 'warning' | 'info'
 */

export function runSanityChecks(apexCode) {
  if (!apexCode || !apexCode.trim()) return [];

  const findings = [];

  // ── 1. DML inside a loop ──────────────────────────────────────────────────
  const loopRe = /\b(for|while)\s*\([^)]*\)\s*\{/gi;
  let loopMatch;
  while ((loopMatch = loopRe.exec(apexCode)) !== null) {
    const loopBody = extractBraceBlock(apexCode, loopMatch.index);
    if (/\b(insert|update|delete|upsert)\s+\w/i.test(loopBody)) {
      findings.push({
        severity: 'critical',
        title: 'DML Inside a Loop',
        detail: 'A DML statement (insert/update/delete) was found inside a loop. This will hit governor limits in bulk scenarios. Collect records in a List and perform DML after the loop.',
      });
      break; // one finding is enough
    }
  }

  // ── 2. SOQL inside a loop ─────────────────────────────────────────────────
  loopRe.lastIndex = 0;
  while ((loopMatch = loopRe.exec(apexCode)) !== null) {
    const loopBody = extractBraceBlock(apexCode, loopMatch.index);
    if (/\[\s*SELECT/i.test(loopBody)) {
      findings.push({
        severity: 'critical',
        title: 'SOQL Inside a Loop',
        detail: 'A SOQL query was found inside a loop. Salesforce enforces a 100-query limit per transaction. Move the query outside the loop and use a Map for lookups.',
      });
      break;
    }
  }

  // ── 3. Hardcoded IDs ──────────────────────────────────────────────────────
  if (/['"][a-zA-Z0-9]{15,18}['"]/.test(apexCode) && /['"]0[0-9a-zA-Z]{14,17}['"]/.test(apexCode)) {
    findings.push({
      severity: 'warning',
      title: 'Hardcoded Salesforce ID',
      detail: 'A hardcoded 15/18-character Salesforce ID was detected. IDs differ between orgs. Use Custom Labels, Custom Metadata, or Custom Settings instead.',
    });
  }

  // ── 4. No bulkification (single record trigger assumption) ────────────────
  const methodParams = apexCode.match(/\(\s*((?:Trigger\.new|Trigger\.old)\s*)/gi);
  const hasSingleRecordPattern = /Trigger\.new\[0\]/i.test(apexCode) || /Trigger\.old\[0\]/i.test(apexCode);
  if (hasSingleRecordPattern) {
    findings.push({
      severity: 'warning',
      title: 'Single-Record Trigger Pattern',
      detail: 'Accessing Trigger.new[0] suggests this trigger only handles one record. Use a for-loop over Trigger.new to handle bulk operations safely.',
    });
  }

  // ── 5. Missing null checks before DML ─────────────────────────────────────
  const dmlRe = /\b(insert|update|delete|upsert)\s+(\w+)/gi;
  let dmlMatch;
  while ((dmlMatch = dmlRe.exec(apexCode)) !== null) {
    const varName = dmlMatch[2];
    // Check if there's a preceding isEmpty() or != null check within ~300 chars before
    const preceding = apexCode.slice(Math.max(0, dmlMatch.index - 300), dmlMatch.index);
    if (!preceding.includes(`${varName}.isEmpty`) && !preceding.includes(`${varName} != null`)) {
      findings.push({
        severity: 'info',
        title: 'DML Without Guard Check',
        detail: `The DML on '${varName}' doesn't appear to have an isEmpty() or null check nearby. Adding a guard prevents unnecessary DML calls on empty collections.`,
      });
      break;
    }
  }

  // ── 6. System.debug in production code ────────────────────────────────────
  const debugCount = (apexCode.match(/System\.debug/g) || []).length;
  if (debugCount > 3) {
    findings.push({
      severity: 'info',
      title: 'Excessive Debug Statements',
      detail: `Found ${debugCount} System.debug() calls. Excessive logging impacts performance. Consider using a logging framework or removing debug statements before deployment.`,
    });
  }

  // ── 7. No error handling (no try/catch) ───────────────────────────────────
  const hasDml = /\b(insert|update|delete|upsert)\s+\w/i.test(apexCode);
  const hasTryCatch = /\btry\s*\{/i.test(apexCode);
  if (hasDml && !hasTryCatch) {
    findings.push({
      severity: 'warning',
      title: 'No Try-Catch Around DML',
      detail: 'DML operations can throw exceptions (e.g., validation rules, duplicate rules). Wrapping them in try-catch blocks gives you control over error handling.',
    });
  }

  // ── 8. Future method calling another future ───────────────────────────────
  if (/@future/i.test(apexCode) && /System\.enqueueJob/i.test(apexCode)) {
    findings.push({
      severity: 'warning',
      title: 'Mixed Async Patterns',
      detail: 'Using both @future and Queueable in the same class can cause governor limit issues. Consider standardizing on Queueable for better control.',
    });
  }

  return findings;
}


/** Extract the brace-matched block starting from the nearest { after startIdx */
function extractBraceBlock(code, startIdx) {
  const braceStart = code.indexOf('{', startIdx);
  if (braceStart === -1) return '';
  let depth = 0;
  for (let i = braceStart; i < code.length; i++) {
    if (code[i] === '{') depth++;
    else if (code[i] === '}') {
      depth--;
      if (depth === 0) return code.slice(braceStart + 1, i);
    }
  }
  return '';
}
