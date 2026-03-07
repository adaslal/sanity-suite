/**
 * ApexParser v4 — Business Process Map
 *
 * Philosophy: Each method = ONE milestone node showing its business intent.
 * No guards, no SOQL nodes, no decision diamonds. Just the story.
 *
 * Rules:
 *   1. MILESTONE ONLY: Each method collapses into its primary DML/intent
 *   2. HUMANIZED LABELS: Variable-aware — "insert invoicesToInsert" resolves
 *      to "Create Invoice for the Opportunity" using List<Type> declarations
 *   3. STRICTLY LINEAR: Top-down vertical sequence, no branching
 *   4. SEMANTIC MAPPING: DML + variable context → business-language label
 *      e.g. "insert provisioningCase" → "Create Provisioning Case"
 *      e.g. "update orderProducts"    → "Update Related Order Products"
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
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([a-z])([A-Z]{2,})/g, '$1 $2')
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

/** Strip common method prefixes to find the core intent */
function stripMethodPrefix(name) {
  return name
    .replace(/^(handle|process|execute|run|do|perform|on|before|after)/i, '')
    .trim();
}

/** Mermaid-safe label */
function safe(text, maxLen = 45) {
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


// ─── Regex patterns ──────────────────────────────────────────────────────────

const RE = {
  classDecl: /(?:public|private|global)\s+(?:with\s+sharing\s+|without\s+sharing\s+|inherited\s+sharing\s+)?(?:virtual\s+|abstract\s+)?class\s+(\w+)/,
  methodDecl: /(?:public|private|protected|global)\s+(?:static\s+)?(?:(?:void|String|Integer|Boolean|Decimal|Double|Long|Id|Date|DateTime|Time|Blob|List|Set|Map|SObject|\w+)\s*(?:<[^>]+>)?)\s+(\w+)\s*\(([^)]*)\)/g,
  dmlOps: /\b(insert|update|delete|upsert)\s+(\w+)/gi,
  databaseOp: /\bDatabase\.(insert|update|delete|upsert)\s*\(/gi,
  eventPublish: /EventBus\.publish\s*\(/g,
  methodCall: /(\w+)\.(\w+)\s*\(/g,
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
  'sort', 'clone', 'toString', 'addError',
]);

const DML_VERBS = { insert: 'Create', update: 'Update', delete: 'Delete', upsert: 'Upsert' };


// ─── Milestone extractor: one label per method ───────────────────────────────

/**
 * Analyzes a method body and returns an array of milestone labels.
 * Each milestone is a business-language description of a side effect.
 *
 * Priority order:
 *   1. DML operations (insert/update/delete/upsert) → "Create/Update/Delete [Object]"
 *   2. Platform events → "Publish [Event Name] Events"
 *   3. External service calls → humanized method name
 *   4. Fallback: humanized method name itself
 */
function extractMilestones(methodName, body) {
  const milestones = [];
  const seen = new Set();

  // Build a type map: variableName → sObject type from List<Type> declarations
  const typeMap = {};
  const listDeclRe = /\bList<(\w+(?:__\w+)?)>\s+(\w+)\b/g;
  let ld;
  while ((ld = listDeclRe.exec(body)) !== null) {
    typeMap[ld[2]] = ld[1];
  }
  // Also map from Map<Id, Type> declarations
  const mapDeclRe = /\bMap<\w+,\s*(\w+(?:__\w+)?)>\s+(\w+)\b/g;
  let md;
  while ((md = mapDeclRe.exec(body)) !== null) {
    typeMap[md[2]] = md[1];
  }
  // Also map from single-object declarations: Type varName = new Type(...)
  const singleDeclRe = /\b(\w+(?:__\w+)?)\s+(\w+)\s*=\s*new\s+\1/g;
  let sd;
  while ((sd = singleDeclRe.exec(body)) !== null) {
    typeMap[sd[2]] = sd[1];
  }

  // 1. DML operations → semantic business label
  const dmlRe = /\b(insert|update|delete|upsert)\s+(\w+)/gi;
  let dm;
  while ((dm = dmlRe.exec(body)) !== null) {
    const verb = DML_VERBS[dm[1].toLowerCase()] || dm[1];
    const varName = dm[2];

    // Resolve variable → declared type
    const declaredType = typeMap[varName];
    const objName = declaredType ? cleanObject(declaredType) : humanize(varName);

    const label = `${verb} ${objName}`;
    if (!seen.has(label)) {
      seen.add(label);
      milestones.push({ label, type: 'dml', pos: dm.index });
    }
  }

  // 1b. Database.* operations
  const dbRe = /\bDatabase\.(insert|update|delete|upsert)\s*\(\s*(\w+)/gi;
  let dbm;
  while ((dbm = dbRe.exec(body)) !== null) {
    const verb = DML_VERBS[dbm[1].toLowerCase()] || dbm[1];
    const varName = dbm[2];
    const declaredType = typeMap[varName];
    const objName = declaredType ? cleanObject(declaredType) : humanize(varName);

    const label = `${verb} ${objName}`;
    if (!seen.has(label)) {
      seen.add(label);
      milestones.push({ label, type: 'dml', pos: dbm.index });
    }
  }

  // 2. Platform Events → "Publish [Event] Events"
  const evtRe = /EventBus\.publish\s*\(\s*(\w+)/g;
  let ev;
  while ((ev = evtRe.exec(body)) !== null) {
    const varName = ev[1];
    const declaredType = typeMap[varName];
    let eventName = 'Platform';
    if (declaredType) {
      eventName = cleanObject(declaredType).replace(/ Event$/, '');
    }
    const label = `Publish ${eventName} Events`;
    if (!seen.has(label)) {
      seen.add(label);
      milestones.push({ label, type: 'event', pos: ev.index });
    }
  }

  // 3. External service/utility calls → humanized
  const callRe = /(\w+)\.(\w+)\s*\(/g;
  let cm;
  while ((cm = callRe.exec(body)) !== null) {
    const obj = cm[1], meth = cm[2];
    if (FRAMEWORK_OBJECTS.has(obj)) continue;
    if (COLLECTION_METHODS.has(meth)) continue;
    if (/^[a-z]/.test(obj)) continue; // local variable

    const label = `${humanize(meth)}`;
    const key = `${obj}.${meth}`;
    if (!seen.has(key)) {
      seen.add(key);
      milestones.push({ label, type: 'call', pos: cm.index });
    }
  }

  // Sort by position in source
  milestones.sort((a, b) => a.pos - b.pos);

  // 4. Fallback: if no milestones found, use the method name itself
  if (milestones.length === 0) {
    const core = stripMethodPrefix(humanize(methodName));
    milestones.push({ label: core || humanize(methodName), type: 'fallback', pos: 0 });
  }

  return milestones;
}


// ─── Main parser: Business Process Map ───────────────────────────────────────

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
      rounded:  `${nodeId}("${s}")`,
      circle:   `${nodeId}(("${s}"))`,
      hexagon:  `${nodeId}{{"${s}"}}`,
      subrect:  `${nodeId}[["${s}"]]`,
    };
    out.push(`    ${shapes[shape] || shapes.rect}`);
    if (!styleGroups[style]) styleGroups[style] = [];
    styleGroups[style].push(nodeId);
    return nodeId;
  }

  function edge(from, to) {
    out.push(`    ${from} --> ${to}`);
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
    if (name === className) continue; // skip constructor
    const body = extractMethodBody(apexCode, mm.index);
    if (body) methods.push({ name, body });
  }

  if (methods.length === 0) {
    return `graph TD\n    n1[["${safe(humanize(className))}"]]\n    n2(["No business logic found"])\n    n1 --> n2\n  classDef classNode fill:#312e81,stroke:#6366f1,stroke-width:2px,color:#e0e7ff\n  class n1 classNode`;
  }

  out.push('graph TD');
  out.push('');

  // ── Title node ──
  const titleId = id();
  node(titleId, 'subrect', humanize(className), 'classNode');
  out.push('');

  // ── Build the linear story ──
  let prevId = titleId;

  methods.forEach((method) => {
    const milestones = extractMilestones(method.name, method.body);

    for (const ms of milestones) {
      const nId = id();
      const styleType = {
        dml: 'dmlNode',
        event: 'eventNode',
        call: 'callNode',
        fallback: 'fallbackNode',
      }[ms.type] || 'fallbackNode';

      const shape = {
        dml: 'stadium',
        event: 'hexagon',
        call: 'rounded',
        fallback: 'rect',
      }[ms.type] || 'rect';

      node(nId, shape, ms.label, styleType);
      edge(prevId, nId);
      prevId = nId;
    }
  });

  // ── End node ──
  const endId = id();
  node(endId, 'circle', 'Done', 'endNode');
  edge(prevId, endId);

  // ── Styles ──
  const styleMap = {
    classNode:    'fill:#312e81,stroke:#6366f1,stroke-width:3px,color:#e0e7ff,font-weight:bold',
    dmlNode:      'fill:#7f1d1d,stroke:#ef4444,stroke-width:3px,color:#fecaca,font-weight:bold',
    eventNode:    'fill:#4a1d96,stroke:#8b5cf6,stroke-width:2px,color:#c4b5fd,font-weight:bold',
    callNode:     'fill:#164e63,stroke:#06b6d4,stroke-width:2px,color:#a5f3fc',
    fallbackNode: 'fill:#1e293b,stroke:#475569,stroke-width:2px,color:#cbd5e1',
    endNode:      'fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#a7f3d0',
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
