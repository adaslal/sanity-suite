/**
 * ApexParser v3 — Functional Logic Summary
 *
 * Philosophy: Tell the STORY of what the code does, not trace every line.
 *
 * Rules:
 *   1. IGNORE structural noise: assignments, null checks, loops, variable declarations
 *   2. ACTION-ORIENTED nodes only: DML, SOQL, method calls, platform events
 *   3. STORY flow: linear sequence of major side effects
 *   4. DECISIONS only when an if-block contains DML/SOQL inside (a real branch)
 *   5. HUMANIZED labels: camelCase → Title Case, DML → "Create/Update [Object]"
 *
 * 100% client-side. No dependencies.
 */

// ─── Sample Apex ─────────────────────────────────────────────────────────────
export const SAMPLE_APEX = `public with sharing class OpportunityCloseHandler {

    /**
     * Called from a Record-Triggered Flow when Opp reaches Closed Won.
     * Validates line items, creates an Invoice, syncs to ERP, and
     * publishes a platform event for downstream listeners.
     */
    public static void handleClose(List<Opportunity> closedOpps) {
        if (closedOpps == null || closedOpps.isEmpty()) {
            throw new IllegalArgumentException('No opportunities provided');
        }

        Map<Id, Opportunity> oppMap = new Map<Id, Opportunity>(
            [SELECT Id, Amount, AccountId, StageName,
                    (SELECT Id, UnitPrice, Quantity FROM OpportunityLineItems)
             FROM Opportunity
             WHERE Id IN :closedOpps]
        );

        List<Invoice__c> invoicesToInsert = new List<Invoice__c>();
        List<ERP_Sync_Event__e> events = new List<ERP_Sync_Event__e>();

        for (Opportunity opp : oppMap.values()) {
            if (opp.OpportunityLineItems == null || opp.OpportunityLineItems.isEmpty()) {
                throw new OpportunityException('Opp ' + opp.Id + ' has no line items');
            }

            if (opp.Amount == null || opp.Amount <= 0) {
                throw new OpportunityException('Invalid amount for Opp ' + opp.Id);
            }

            Invoice__c inv = new Invoice__c(
                Opportunity__c = opp.Id,
                Account__c = opp.AccountId,
                Total_Amount__c = opp.Amount,
                Status__c = 'Pending'
            );
            invoicesToInsert.add(inv);

            events.add(new ERP_Sync_Event__e(
                Record_Id__c = opp.Id,
                Object_Type__c = 'Opportunity',
                Action__c = 'CLOSE_WON'
            ));
        }

        if (!invoicesToInsert.isEmpty()) {
            insert invoicesToInsert;
        }

        if (!events.isEmpty()) {
            List<Database.SaveResult> results = EventBus.publish(events);
            for (Database.SaveResult sr : results) {
                if (!sr.isSuccess()) {
                    System.debug(LoggingLevel.ERROR, 'Event publish failed: ' + sr.getErrors());
                }
            }
        }

        AccountService.updateLastClosedDate(oppMap.values());
    }

    public class OpportunityException extends Exception {}
}`;


// ─── Humanizer: camelCase / PascalCase → Title Case ──────────────────────────

function humanize(name) {
  if (!name) return '';
  // Strip Salesforce suffixes FIRST (before splitting)
  let cleaned = name
    .replace(/__e$/i, '_Event')
    .replace(/__c$/i, '')
    .replace(/__r$/i, '');
  return cleaned
    // Insert space before capitals in camelCase: "createAssets" → "create Assets"
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Insert space before sequences like "ID" after lowercase
    .replace(/([a-z])([A-Z]{2,})/g, '$1 $2')
    // Title-case each word
    .split(/[\s_]+/)
    .filter(w => w.length > 0)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .trim();
}

/** Clean an sObject name for display */
function cleanObject(name) {
  if (!name) return 'Records';
  return humanize(name).replace(/ Event$/, '');
}

/** Mermaid-safe label */
function safe(text, maxLen = 40) {
  return text
    .replace(/"/g, "'")
    .replace(/[<>{}[\]()]/g, '')
    .replace(/\|/g, '/')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}


// ─── Extract method body by brace-matching ───────────────────────────────────

function extractMethodBody(code, startIdx) {
  let braceCount = 0, bodyStart = -1, bodyEnd = -1;
  for (let i = startIdx; i < code.length; i++) {
    if (code[i] === '{') { if (bodyStart === -1) bodyStart = i; braceCount++; }
    else if (code[i] === '}') { braceCount--; if (braceCount === 0) { bodyEnd = i; break; } }
  }
  if (bodyStart === -1 || bodyEnd === -1) return null;
  return code.slice(bodyStart + 1, bodyEnd);
}

/** Check if an if-block body contains a DML/SOQL/event (a "major branch") */
function hasSideEffect(block) {
  return /\b(insert|update|delete|upsert)\s+\w/i.test(block)
    || /\[\s*SELECT/i.test(block)
    || /EventBus\.publish/i.test(block)
    || /Database\.(insert|update|delete|upsert)/i.test(block);
}

/** Extract the if-block body (brace-matched) starting from the if's position */
function extractIfBody(code, ifIdx) {
  const braceStart = code.indexOf('{', ifIdx);
  if (braceStart === -1) return '';
  let depth = 0;
  for (let i = braceStart; i < code.length; i++) {
    if (code[i] === '{') depth++;
    else if (code[i] === '}') { depth--; if (depth === 0) return code.slice(braceStart + 1, i); }
  }
  return '';
}


// ─── Regex patterns ──────────────────────────────────────────────────────────

const RE = {
  classDecl: /(?:public|private|global)\s+(?:with\s+sharing\s+|without\s+sharing\s+|inherited\s+sharing\s+)?(?:virtual\s+|abstract\s+)?class\s+(\w+)/,
  methodDecl: /(?:public|private|protected|global)\s+(?:static\s+)?(?:(?:void|String|Integer|Boolean|Decimal|Double|Long|Id|Date|DateTime|Time|Blob|List|Set|Map|SObject|\w+)\s*(?:<[^>]+>)?)\s+(\w+)\s*\(([^)]*)\)/g,
  soqlQuery: /\[\s*SELECT\s+[\s\S]*?\]/gi,
  dmlOps: /\b(insert|update|delete|upsert)\s+(\w+)/gi,
  databaseOp: /\bDatabase\.(insert|update|delete|upsert)\s*\(/gi,
  eventPublish: /EventBus\.publish\s*\(/g,
  methodCall: /(\w+)\.(\w+)\s*\(/g,
  ifBlock: /\bif\s*\(([^{]+?)\)\s*\{/g,
};

const FRAMEWORK_OBJECTS = new Set([
  'System', 'Database', 'EventBus', 'Test', 'Schema',
  'Math', 'String', 'JSON', 'Blob', 'Crypto', 'URL',
  'UserInfo', 'Limits', 'LoggingLevel', 'Type', 'Integer',
  'Decimal', 'Double', 'Boolean', 'Date', 'DateTime',
]);

const COLLECTION_METHODS = new Set([
  'add', 'put', 'get', 'size', 'isEmpty', 'values',
  'keySet', 'contains', 'containsKey', 'isSuccess',
  'getErrors', 'debug', 'remove', 'clear', 'addAll',
  'sort', 'clone', 'toString',
]);

const DML_VERBS = { insert: 'Create', update: 'Update', delete: 'Delete', upsert: 'Upsert' };


// ─── Main parser: Functional Logic Summary ───────────────────────────────────

export function parseApexToMermaid(apexCode) {
  if (!apexCode || !apexCode.trim()) return '';

  const out = [];
  const styleGroups = {};
  let nid = 0;

  function id() { return `n${++nid}`; }

  function node(nodeId, shape, label, style) {
    const s = safe(label);
    const shapes = {
      stadium:  `${nodeId}(["${s}"])`,
      rect:     `${nodeId}["${s}"]`,
      diamond:  `${nodeId}{"${s}"}`,
      circle:   `${nodeId}(("${s}"))`,
      hexagon:  `${nodeId}{{"${s}"}}`,
      subrect:  `${nodeId}[["${s}"]]`,
    };
    out.push(`    ${shapes[shape] || shapes.rect}`);
    if (!styleGroups[style]) styleGroups[style] = [];
    styleGroups[style].push(nodeId);
    return nodeId;
  }

  function edge(from, to, label) {
    out.push(label
      ? `    ${from} -->|${safe(label, 15)}| ${to}`
      : `    ${from} --> ${to}`
    );
  }

  // ── Extract class ──
  const classMatch = apexCode.match(RE.classDecl);
  const className = classMatch ? classMatch[1] : 'ApexClass';

  // ── Extract methods ──
  const methods = [];
  const methodRegex = new RegExp(RE.methodDecl.source, 'g');
  let mm;
  while ((mm = methodRegex.exec(apexCode)) !== null) {
    const name = mm[1];
    if (name === className) continue;
    const body = extractMethodBody(apexCode, mm.index);
    if (body) methods.push({ name, body });
  }

  if (methods.length === 0) {
    return `graph TD\n  n1[["${safe(humanize(className))}"]]\n  n2(["No methods found"])\n  n1 --> n2\n  classDef classNode fill:#312e81,stroke:#6366f1,stroke-width:2px,color:#e0e7ff\n  class n1 classNode`;
  }

  out.push('graph TD');
  out.push('');

  const classId = id();
  node(classId, 'subrect', humanize(className), 'classNode');
  out.push('');

  // ── Process each method ──
  methods.forEach((method) => {
    const sgId = `sg_${method.name}`;
    out.push(`  subgraph ${sgId}["${safe(humanize(method.name))}"]`);
    out.push(`    direction TB`);

    // Collect the "story actions" for this method
    const actions = [];
    const body = method.body;

    // 1. SOQL queries → "Fetch [Object] Data"
    const soqlRe = new RegExp(RE.soqlQuery.source, 'gi');
    let sq;
    while ((sq = soqlRe.exec(body)) !== null) {
      // Extract the LAST "FROM <Object>" which is the main query object (not subqueries)
      const fromMatches = [...sq[0].matchAll(/\bFROM\s+(\w+)/gi)];
      const mainObj = fromMatches.length > 0 ? fromMatches[fromMatches.length - 1][1] : 'Records';
      actions.push({ type: 'query', label: `Fetch ${cleanObject(mainObj)} Data`, pos: sq.index });
    }

    // 2. DML operations → "Create/Update/Delete [Object]"
    const dmlRe = new RegExp(RE.dmlOps.source, 'gi');
    let dm;
    while ((dm = dmlRe.exec(body)) !== null) {
      const verb = DML_VERBS[dm[1].toLowerCase()] || dm[1];
      // Try to resolve the variable to its declared type
      const varName = dm[2];
      const typeMatch = body.match(new RegExp(`List<(\\w+(?:__\\w+)?)>\\s+${varName}\\b`));
      const objName = typeMatch ? cleanObject(typeMatch[1]) : humanize(varName);
      actions.push({ type: 'dml', label: `${verb} ${objName}`, pos: dm.index });
    }

    // 2b. Database.* operations
    const dbRe = new RegExp(RE.databaseOp.source, 'gi');
    let dbm;
    while ((dbm = dbRe.exec(body)) !== null) {
      const verb = DML_VERBS[dbm[1].toLowerCase()] || dbm[1];
      actions.push({ type: 'dml', label: `${verb} Records`, pos: dbm.index });
    }

    // 3. Platform Events → "Publish Events"
    const evtRe = new RegExp(RE.eventPublish.source, 'g');
    let ev;
    while ((ev = evtRe.exec(body)) !== null) {
      actions.push({ type: 'event', label: 'Publish Platform Events', pos: ev.index });
    }

    // 4. External method calls → humanized name
    const callRe = new RegExp(RE.methodCall.source, 'g');
    let cm;
    const seenCalls = new Set();
    while ((cm = callRe.exec(body)) !== null) {
      const obj = cm[1], meth = cm[2];
      if (FRAMEWORK_OBJECTS.has(obj)) continue;
      if (COLLECTION_METHODS.has(meth)) continue;
      if (/^[a-z]/.test(obj)) continue;  // local variable

      const key = `${obj}.${meth}`;
      if (seenCalls.has(key)) continue;
      seenCalls.add(key);

      actions.push({ type: 'call', label: humanize(meth), pos: cm.index });
    }

    // 5. Check for meaningful if-branches (contain side effects)
    const ifRe = new RegExp(RE.ifBlock.source, 'g');
    let ifm;
    while ((ifm = ifRe.exec(body)) !== null) {
      const ifBody = extractIfBody(body, ifm.index);
      if (hasSideEffect(ifBody)) {
        // Only show the decision if it wraps something interesting
        const condRaw = ifm[1].trim();
        // Humanize the condition into a plain-English question
        let condLabel = condRaw
          // "!list.isEmpty()" → "Has records" (BEFORE stripping parens)
          .replace(/!\s*[\w.]+\.isEmpty\s*\(\)/g, 'Has records')
          // "list.isEmpty()" → "Is empty"
          .replace(/[\w.]+\.isEmpty\s*\(\)/g, 'Is empty')
          // "x != null" → "Has value"
          .replace(/[\w.]+\s*!=\s*null/gi, 'Has value')
          // "x == null" → "Is null"
          .replace(/[\w.]+\s*==\s*null/gi, 'Is null')
          // Strip parentheses AFTER semantic replacements
          .replace(/[()]/g, '')
          // "!x" → "Has value" (generic negated check)
          .replace(/!\s*[\w.]+/g, 'Has value')
          // Strip remaining method calls
          .replace(/\.[\w]+/g, '')
          .replace(/&&/g, ' and ')
          .replace(/\|\|/g, ' or ')
          .replace(/\s+/g, ' ')
          .trim();
        condLabel = safe(condLabel, 25);
        if (condLabel.length < 4) condLabel = 'Condition met?';

        actions.push({ type: 'decision', label: condLabel, pos: ifm.index });
      }
    }

    // Sort all actions by their position in the source code
    actions.sort((a, b) => a.pos - b.pos);

    // Deduplicate adjacent identical labels
    const deduped = [];
    for (const action of actions) {
      if (deduped.length > 0 && deduped[deduped.length - 1].label === action.label) continue;
      deduped.push(action);
    }

    // Build the flow
    const startId = id();
    node(startId, 'stadium', 'Start', 'startNode');
    let prevId = startId;

    const styleTypeMap = {
      query: 'queryNode',
      dml: 'dmlNode',
      event: 'eventNode',
      call: 'callNode',
      decision: 'decisionNode',
    };

    const shapeMap = {
      query: 'hexagon',
      dml: 'stadium',
      event: 'circle',
      call: 'rect',
      decision: 'diamond',
    };

    for (const action of deduped) {
      const nId = id();
      const shape = shapeMap[action.type] || 'rect';
      const style = styleTypeMap[action.type] || 'actionNode';
      node(nId, shape, action.label, style);
      edge(prevId, nId);
      prevId = nId;
    }

    const endId = id();
    node(endId, 'stadium', 'Done', 'endNode');
    edge(prevId, endId);

    out.push(`  end`);
    out.push('');

    // Connect class → subgraph start
    edge(classId, startId);
    out.push('');
  });

  // ── Styles ──
  const styleMap = {
    classNode:    'fill:#312e81,stroke:#6366f1,stroke-width:3px,color:#e0e7ff,font-weight:bold',
    startNode:    'fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#a7f3d0',
    endNode:      'fill:#1c1917,stroke:#78716c,stroke-width:2px,color:#d6d3d1',
    queryNode:    'fill:#0c4a6e,stroke:#0ea5e9,stroke-width:2px,color:#7dd3fc,font-weight:bold',
    dmlNode:      'fill:#7f1d1d,stroke:#ef4444,stroke-width:3px,color:#fecaca,font-weight:bold',
    decisionNode: 'fill:#713f12,stroke:#f59e0b,stroke-width:2px,color:#fde68a',
    callNode:     'fill:#164e63,stroke:#06b6d4,stroke-width:2px,color:#a5f3fc',
    eventNode:    'fill:#4a1d96,stroke:#8b5cf6,stroke-width:2px,color:#c4b5fd',
    actionNode:   'fill:#1e293b,stroke:#334155,stroke-width:1px,color:#94a3b8',
  };

  out.push('');
  Object.entries(styleGroups).forEach(([s, ids]) => {
    if (styleMap[s]) out.push(`  classDef ${s} ${styleMap[s]}`);
  });
  out.push('');
  Object.entries(styleGroups).forEach(([s, ids]) => {
    if (styleMap[s] && ids.length > 0) out.push(`  class ${ids.join(',')} ${s}`);
  });

  return out.join('\n');
}


// ─── Stats extractor ─────────────────────────────────────────────────────────

export function getApexStats(apexCode) {
  if (!apexCode || !apexCode.trim()) return null;

  const lines = apexCode.split('\n');
  const nonEmpty = lines.filter(l => l.trim() && !l.trim().startsWith('//') && !l.trim().startsWith('*'));

  const classMatch = apexCode.match(RE.classDecl);
  const methodRegex = new RegExp(RE.methodDecl.source, 'g');
  const methods = [];
  let m;
  while ((m = methodRegex.exec(apexCode)) !== null) methods.push(m[1]);

  const soqlCount = (apexCode.match(/\[\s*SELECT/gi) || []).length;
  const dmlCount = (apexCode.match(/\b(insert|update|delete|upsert)\s+\w/g) || []).length
    + (apexCode.match(/Database\.(insert|update|delete|upsert)/g) || []).length;
  const ifCount = (apexCode.match(/\bif\s*\(/g) || []).length;
  const loopCount = (apexCode.match(/\bfor\s*\(/g) || []).length;
  const throwCount = (apexCode.match(/\bthrow\s+new/g) || []).length;
  const eventCount = (apexCode.match(/EventBus\.publish/g) || []).length;

  return {
    className: classMatch ? classMatch[1] : 'Unknown',
    totalLines: lines.length,
    codeLines: nonEmpty.length,
    methods,
    methodCount: methods.length,
    soqlCount,
    dmlCount,
    ifCount,
    loopCount,
    throwCount,
    eventCount,
    complexity: ifCount + loopCount + throwCount,
  };
}
