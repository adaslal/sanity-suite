/**
 * ApexParser v2 — Surgical Grouping Edition
 *
 * Converts Apex source code into Mermaid.js flowchart syntax with:
 *   - Subgraphs per method (contained, readable)
 *   - Guard nodes for simple null/empty checks (compact)
 *   - Grouped assignment blocks (no 10 separate boxes)
 *   - High-contrast DML/SOQL nodes
 *   - Semantic flow: queries → guards → loops → logic → DML → calls → end
 *
 * 100% client-side. No dependencies beyond this file.
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


// ─── Helpers ─────────────────────────────────────────────────────────────────

function sanitize(text, maxLen = 35) {
  return text
    .replace(/"/g, '#quot;')
    .replace(/[<>]/g, '')
    .replace(/\|/g, '/')
    .replace(/[{}[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

/** Is this condition just a null/empty/size guard? */
function isGuardCondition(cond) {
  // Strip parens and whitespace for easier matching
  const c = cond.trim().toLowerCase().replace(/\(\)/g, '').replace(/\s+/g, ' ');

  // Single null check:  x == null  or  x != null
  if (/^!?\w+(\.\w+)*\s*[!=]=\s*null$/.test(c)) return true;

  // Single isEmpty:  x.isEmpty  or  !x.isEmpty
  if (/^!?\w+(\.\w+)*\.isempty$/.test(c)) return true;

  // Single isSuccess / isBlank / isNotBlank
  if (/^!?\w+(\.\w+)*\.(issuccess|isblank|isnotblank)$/.test(c)) return true;

  // Single size check:  x.size > 0
  if (/^!?\w+(\.\w+)*\.size\s*[><=!]+\s*\d+$/.test(c)) return true;

  // Compound null + isEmpty:  x == null || x.isEmpty
  if (/^!?\w+(\.\w+)*\s*[!=]=\s*null\s*(\|\||&&)\s*!?\w+(\.\w+)*\.isempty$/.test(c)) return true;

  // Compound null + comparison:  x == null || x <= 0
  if (/^!?\w+(\.\w+)*\s*[!=]=\s*null\s*(\|\||&&)\s*!?\w+(\.\w+)*\s*[><=!]+\s*\d+$/.test(c)) return true;

  return false;
}

/** Extract method body by brace-matching from a starting index */
function extractMethodBody(code, startIdx) {
  let braceCount = 0;
  let bodyStart = -1;
  let bodyEnd = -1;
  for (let i = startIdx; i < code.length; i++) {
    if (code[i] === '{') {
      if (bodyStart === -1) bodyStart = i;
      braceCount++;
    } else if (code[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        bodyEnd = i;
        break;
      }
    }
  }
  if (bodyStart === -1 || bodyEnd === -1) return null;
  return code.slice(bodyStart + 1, bodyEnd);
}


// ─── Regex patterns ──────────────────────────────────────────────────────────

const RE = {
  classDecl: /(?:public|private|global)\s+(?:with\s+sharing\s+|without\s+sharing\s+|inherited\s+sharing\s+)?(?:virtual\s+|abstract\s+)?class\s+(\w+)/,
  methodDecl: /(?:public|private|protected|global)\s+(?:static\s+)?(?:(?:void|String|Integer|Boolean|Decimal|Double|Long|Id|Date|DateTime|Time|Blob|List|Set|Map|SObject|\w+)\s*(?:<[^>]+>)?)\s+(\w+)\s*\(([^)]*)\)/g,
  soqlQuery: /\[\s*SELECT\s+[\s\S]*?FROM\s+(\w+)[\s\S]*?\]/gi,
  forLoop: /\bfor\s*\(\s*\w+(?:\s*<[^>]+>)?\s+(\w+)\s*:\s*([^)]+)\)/g,
  ifBlock: /\bif\s*\(([^{]+?)\)\s*\{/g,
  throwStmt: /\bthrow\s+new\s+(\w+)\s*\(/g,
  dmlOps: /\b(insert|update|delete|upsert)\s+(\w+)/g,
  databaseOp: /\bDatabase\.(insert|update|delete|upsert)\s*\(/g,
  eventPublish: /EventBus\.publish\s*\(/g,
  methodCall: /(\w+)\.(\w+)\s*\(/g,
  assignment: /^\s*(\w+(?:__\w)?)\s+\w+\s*=\s*/,
  listInit: /^\s*(?:List|Set|Map)<[^>]+>\s+(\w+)\s*=\s*new\s/,
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
  'sort', 'clone',
]);


// ─── Main parser ─────────────────────────────────────────────────────────────

export function parseApexToMermaid(apexCode) {
  if (!apexCode || !apexCode.trim()) return '';

  const out = [];        // output lines
  const styleGroups = {}; // styleName -> [nodeId, ...]
  let nid = 0;

  function id() { return `n${++nid}`; }

  function node(nodeId, shape, label, style) {
    const safe = sanitize(label);
    const shapes = {
      stadium:  `${nodeId}(["${safe}"])`,
      rect:     `${nodeId}["${safe}"]`,
      diamond:  `${nodeId}{"${safe}"}`,
      pill:     `${nodeId}(["${safe}"])`,
      circle:   `${nodeId}(("${safe}"))`,
      subrect:  `${nodeId}[["${safe}"]]`,
      guard:    `${nodeId}(["${safe}"])`,   // small guard — styled differently
    };
    out.push(`    ${shapes[shape] || shapes.rect}`);
    if (!styleGroups[style]) styleGroups[style] = [];
    styleGroups[style].push(nodeId);
    return nodeId;
  }

  function edge(from, to, label) {
    if (label) {
      out.push(`    ${from} -->|${sanitize(label)}| ${to}`);
    } else {
      out.push(`    ${from} --> ${to}`);
    }
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
    if (name === className) continue; // skip inner class constructors
    const params = mm[2].trim();
    const body = extractMethodBody(apexCode, mm.index);
    if (body) {
      methods.push({
        name,
        params: params
          ? params.split(',').map(p => p.trim().split(/\s+/).pop()).join(', ')
          : '',
        body,
      });
    }
  }

  if (methods.length === 0) {
    return `graph TD\n  n1[["${sanitize(className)}"]]\n  n2(["No methods found"])\n  n1 --> n2\n  classDef classNode fill:#312e81,stroke:#6366f1,stroke-width:2px,color:#e0e7ff\n  class n1 classNode`;
  }

  // ── Start building diagram ──
  out.push('graph TD');
  out.push('');

  const classId = id();
  node(classId, 'subrect', className, 'classNode');
  out.push('');

  // ── Process each method as a subgraph ──
  methods.forEach((method) => {
    const sgId = `sg_${method.name}`;
    const paramHint = method.params ? `${method.params}` : '';

    out.push(`  subgraph ${sgId}["${sanitize(method.name, 25)}"]`);
    out.push(`    direction TB`);

    const startId = id();
    node(startId, 'stadium', `Start`, 'startNode');

    let prevId = startId;
    const body = method.body;
    const bodyLines = body.split('\n');

    // ──── Phase 1: SOQL queries ────
    const soqlRe = new RegExp(RE.soqlQuery.source, 'gi');
    let sq;
    const soqlNodes = [];
    while ((sq = soqlRe.exec(body)) !== null) {
      const qId = id();
      node(qId, 'stadium', `SOQL: ${sq[1]}`, 'queryNode');
      edge(prevId, qId);
      prevId = qId;
      soqlNodes.push(qId);
    }

    // ──── Phase 2: Collection initializations (group into one block) ────
    const initLines = [];
    for (const line of bodyLines) {
      const trimmed = line.trim();
      if (RE.listInit.test(trimmed)) {
        const m = trimmed.match(/(?:List|Set|Map)<[^>]+>\s+(\w+)/);
        if (m) initLines.push(m[1]);
      }
    }
    if (initLines.length > 1) {
      const initId = id();
      const shortNames = initLines.slice(0, 3).map(n => n.slice(0, 12));
      const label = `Init: ${shortNames.join(', ')}${initLines.length > 3 ? ' +more' : ''}`;
      node(initId, 'rect', label, 'actionNode');
      edge(prevId, initId);
      prevId = initId;
    }

    // ──── Phase 3: For loops (with nested content) ────
    const forRe = new RegExp(RE.forLoop.source, 'g');
    let fm;
    while ((fm = forRe.exec(body)) !== null) {
      const varName = fm[1];
      const collection = fm[2].trim().split(/\s/).pop().replace(/[()]/g, '');
      const loopId = id();
      node(loopId, 'stadium', `Loop: ${varName}`, 'loopNode');
      edge(prevId, loopId);
      prevId = loopId;
    }

    // ──── Phase 4: If/guard conditions ────
    const ifRe = new RegExp(RE.ifBlock.source, 'g');
    let ifm;
    while ((ifm = ifRe.exec(body)) !== null) {
      const rawCond = ifm[1].trim();
      const condText = sanitize(rawCond);

      if (isGuardCondition(rawCond)) {
        // Render as compact guard node
        const guardId = id();
        node(guardId, 'guard', `Guard: ${condText.slice(0, 25)}`, 'guardNode');
        edge(prevId, guardId);

        // Check for throw inside the guard block
        const afterIf = body.slice(ifm.index);
        const throwMatch = afterIf.match(/\bthrow\s+new\s+(\w+)/);
        if (throwMatch) {
          const errId = id();
          node(errId, 'stadium', `Throw ${throwMatch[1]}`, 'errorNode');
          edge(guardId, errId, 'fail');
        }

        prevId = guardId;
      } else {
        // Full decision diamond
        const decId = id();
        node(decId, 'diamond', condText.slice(0, 30), 'decisionNode');
        edge(prevId, decId);

        // Check for throw
        const afterIf = body.slice(ifm.index);
        const throwMatch = afterIf.match(/\bthrow\s+new\s+(\w+)/);
        if (throwMatch) {
          const errId = id();
          node(errId, 'stadium', `Throw ${throwMatch[1]}`, 'errorNode');
          edge(decId, errId, 'fail');
        }

        prevId = decId;
      }
    }

    // ──── Phase 5: DML operations (high contrast) ────
    const dmlRe = new RegExp(RE.dmlOps.source, 'g');
    let dm;
    while ((dm = dmlRe.exec(body)) !== null) {
      const dmlId = id();
      const op = dm[1].toUpperCase();
      node(dmlId, 'stadium', `${op}: ${dm[2]}`, 'dmlNode');
      edge(prevId, dmlId);
      prevId = dmlId;
    }

    const dbRe = new RegExp(RE.databaseOp.source, 'g');
    let dbm;
    while ((dbm = dbRe.exec(body)) !== null) {
      const dmlId = id();
      node(dmlId, 'stadium', `Database.${dbm[1].toUpperCase()}`, 'dmlNode');
      edge(prevId, dmlId);
      prevId = dmlId;
    }

    // ──── Phase 6: Platform Events ────
    if (RE.eventPublish.test(body)) {
      const evtId = id();
      node(evtId, 'circle', 'EventBus.publish', 'eventNode');
      edge(prevId, evtId);
      prevId = evtId;
    }

    // ──── Phase 7: External method calls ────
    const callRe = new RegExp(RE.methodCall.source, 'g');
    let cm;
    const seenCalls = new Set();
    while ((cm = callRe.exec(body)) !== null) {
      const obj = cm[1];
      const meth = cm[2];
      if (FRAMEWORK_OBJECTS.has(obj)) continue;
      if (COLLECTION_METHODS.has(meth)) continue;
      if (/^[a-z]/.test(obj)) continue; // skip local variable calls

      const key = `${obj}.${meth}`;
      if (seenCalls.has(key)) continue;
      seenCalls.add(key);

      const callId = id();
      const callLabel = `${obj.slice(0,15)}.${meth.slice(0,12)}`;
      node(callId, 'rect', callLabel, 'callNode');
      edge(prevId, callId);
      prevId = callId;
    }

    // ──── End node ────
    const endId = id();
    node(endId, 'stadium', 'End', 'endNode');
    edge(prevId, endId);

    out.push(`  end`);
    out.push('');

    // Connect class to this subgraph's start
    edge(classId, startId);
    out.push('');
  });

  // ── Style definitions ──
  const styleMap = {
    classNode:    'fill:#312e81,stroke:#6366f1,stroke-width:3px,color:#e0e7ff,font-weight:bold',
    startNode:    'fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#a7f3d0',
    endNode:      'fill:#1c1917,stroke:#78716c,stroke-width:2px,color:#d6d3d1',
    queryNode:    'fill:#0c4a6e,stroke:#0ea5e9,stroke-width:2px,color:#7dd3fc,font-weight:bold',
    dmlNode:      'fill:#7f1d1d,stroke:#ef4444,stroke-width:3px,color:#fecaca,font-weight:bold',
    decisionNode: 'fill:#713f12,stroke:#f59e0b,stroke-width:2px,color:#fde68a',
    guardNode:    'fill:#1e293b,stroke:#64748b,stroke-width:1px,color:#94a3b8,font-size:11px',
    errorNode:    'fill:#7f1d1d,stroke:#ef4444,stroke-width:2px,color:#fecaca',
    loopNode:     'fill:#3b0764,stroke:#a855f7,stroke-width:2px,color:#d8b4fe',
    callNode:     'fill:#164e63,stroke:#06b6d4,stroke-width:2px,color:#a5f3fc',
    eventNode:    'fill:#4a1d96,stroke:#8b5cf6,stroke-width:2px,color:#c4b5fd',
    actionNode:   'fill:#1e293b,stroke:#334155,stroke-width:1px,color:#94a3b8',
  };

  out.push('');
  Object.entries(styleGroups).forEach(([style, ids]) => {
    if (styleMap[style]) {
      out.push(`  classDef ${style} ${styleMap[style]}`);
    }
  });
  out.push('');
  Object.entries(styleGroups).forEach(([style, ids]) => {
    if (styleMap[style] && ids.length > 0) {
      out.push(`  class ${ids.join(',')} ${style}`);
    }
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
