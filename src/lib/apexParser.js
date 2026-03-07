/**
 * ApexParser v5 — Collaborative Business Process Map
 *
 * Philosophy: Give the developer a 90% accurate business-language map,
 * then let them refine the last 10%.
 *
 * Three accuracy layers:
 *   1. @intent COMMENTS (developer-led override)
 *      // @intent Create Provisioning Case for the Order
 *      insert provisioningCases;
 *      → The @intent label wins over any machine guess.
 *
 *   2. OBJECT DICTIONARY (system-led semantic mapping)
 *      Maps standard + common custom sObjects to business-domain verbs.
 *      Asset → "Provision Asset", Case → "Open Support Case", etc.
 *
 *   3. VARIABLE RESOLUTION (existing v4 logic)
 *      Resolves List<Invoice__c> invoicesToInsert → "Create Invoice"
 *
 *   4. USER REFINEMENT (collaborative — handled in the UI component)
 *      Users can click any node and rename it before downloading.
 *
 * 100% client-side. No dependencies.
 */

// ─── Sample Apex (now with @intent demo) ────────────────────────────────────
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

        // @intent Generate Invoices for Closed Opportunities
        if (!invoicesToInsert.isEmpty()) {
            insert invoicesToInsert;
        }

        // @intent Notify ERP System via Platform Event
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


// ─── sObject → Business Domain Dictionary ───────────────────────────────────
// Maps sObject API names to a { domain, defaultVerb } that produces
// more meaningful labels than raw "Create [Object]".

const OBJECT_DICTIONARY = {
  // ── Standard Objects ──
  Account:            { domain: 'Account',                verb: 'Manage' },
  Contact:            { domain: 'Contact',                verb: 'Manage' },
  Lead:               { domain: 'Lead',                   verb: 'Process' },
  Opportunity:        { domain: 'Opportunity',            verb: 'Process' },
  Case:               { domain: 'Support Case',           verb: 'Open' },
  Task:               { domain: 'Follow-Up Task',         verb: 'Create' },
  Event:              { domain: 'Calendar Event',         verb: 'Schedule' },
  Order:              { domain: 'Order',                  verb: 'Process' },
  OrderItem:          { domain: 'Order Line Item',        verb: 'Update' },
  Contract:           { domain: 'Contract',               verb: 'Generate' },
  Quote:              { domain: 'Quote',                  verb: 'Generate' },
  QuoteLineItem:      { domain: 'Quote Line Item',        verb: 'Manage' },
  Product2:           { domain: 'Product',                verb: 'Manage' },
  PricebookEntry:     { domain: 'Price Book Entry',       verb: 'Manage' },
  Asset:              { domain: 'Assets',                  verb: 'Provision' },
  Campaign:           { domain: 'Campaign',               verb: 'Manage' },
  CampaignMember:     { domain: 'Campaign Membership',    verb: 'Assign' },
  ContentVersion:     { domain: 'File Attachment',        verb: 'Upload' },
  ContentDocumentLink:{ domain: 'File Link',              verb: 'Attach' },
  Attachment:         { domain: 'Attachment',             verb: 'Attach' },
  FeedItem:           { domain: 'Chatter Post',           verb: 'Post' },
  EmailMessage:       { domain: 'Email',                  verb: 'Send' },
  CaseComment:        { domain: 'Case Comment',           verb: 'Add' },
  // ── Common Custom Patterns ──
  // The parser will also check for partial matches like "Invoice", "Payment", etc.
};

// Partial-match patterns: if the sObject name contains one of these,
// map it to a business domain (for custom objects like Invoice__c, Payment__c, etc.)
const OBJECT_PATTERNS = [
  { pattern: /invoice/i,        domain: 'Invoice',            dmlVerbs: { insert: 'Generate', update: 'Update', delete: 'Void' } },
  { pattern: /payment/i,        domain: 'Payment',            dmlVerbs: { insert: 'Process', update: 'Update', delete: 'Refund' } },
  { pattern: /subscription/i,   domain: 'Subscription',       dmlVerbs: { insert: 'Activate', update: 'Modify', delete: 'Cancel' } },
  { pattern: /audit/i,          domain: 'Audit Record',       dmlVerbs: { insert: 'Log', update: 'Update', delete: 'Delete' } },
  { pattern: /log/i,            domain: 'Log Entry',          dmlVerbs: { insert: 'Log', update: 'Update', delete: 'Purge' } },
  { pattern: /notification/i,   domain: 'Notification',       dmlVerbs: { insert: 'Send', update: 'Update', delete: 'Dismiss' } },
  { pattern: /approval/i,       domain: 'Approval',           dmlVerbs: { insert: 'Submit', update: 'Update', delete: 'Recall' } },
  { pattern: /shipment/i,       domain: 'Shipment',           dmlVerbs: { insert: 'Create', update: 'Update', delete: 'Cancel' } },
  { pattern: /fulfillment/i,    domain: 'Fulfillment',        dmlVerbs: { insert: 'Initiate', update: 'Update', delete: 'Cancel' } },
  { pattern: /provision/i,      domain: 'Provisioning Record',dmlVerbs: { insert: 'Provision', update: 'Update', delete: 'Deprovision' } },
  { pattern: /entitlement/i,    domain: 'Entitlement',        dmlVerbs: { insert: 'Grant', update: 'Modify', delete: 'Revoke' } },
  { pattern: /discount/i,       domain: 'Discount',           dmlVerbs: { insert: 'Apply', update: 'Adjust', delete: 'Remove' } },
  { pattern: /refund/i,         domain: 'Refund',             dmlVerbs: { insert: 'Issue', update: 'Update', delete: 'Cancel' } },
  { pattern: /credit/i,         domain: 'Credit',             dmlVerbs: { insert: 'Issue', update: 'Adjust', delete: 'Void' } },
  { pattern: /usage/i,          domain: 'Usage Tracker',      dmlVerbs: { insert: 'Create', update: 'Update', delete: 'Reset' } },
  { pattern: /error/i,          domain: 'Error Record',       dmlVerbs: { insert: 'Log', update: 'Update', delete: 'Clear' } },
  { pattern: /sync/i,           domain: 'Sync Record',        dmlVerbs: { insert: 'Queue', update: 'Update', delete: 'Remove' } },
  { pattern: /integration/i,    domain: 'Integration Record', dmlVerbs: { insert: 'Queue', update: 'Update', delete: 'Remove' } },
];

/**
 * Resolve an sObject name + DML verb → business-language label.
 * Uses the dictionary first, then pattern matching, then falls back to humanize.
 */
function businessLabel(objName, dmlVerb) {
  const verb = dmlVerb.toLowerCase();
  const defaultVerbs = { insert: 'Create', update: 'Update', delete: 'Delete', upsert: 'Upsert' };

  // 1. Exact dictionary match
  const dictEntry = OBJECT_DICTIONARY[objName];
  if (dictEntry) {
    const v = (verb === 'insert' && dictEntry.verb !== 'Manage')
      ? dictEntry.verb
      : (defaultVerbs[verb] || dmlVerb);
    return `${v} ${dictEntry.domain}`;
  }

  // 2. Pattern match (for custom objects)
  const cleaned = cleanObject(objName);
  for (const pm of OBJECT_PATTERNS) {
    if (pm.pattern.test(objName) || pm.pattern.test(cleaned)) {
      const v = pm.dmlVerbs[verb] || defaultVerbs[verb] || dmlVerb;
      return `${v} ${pm.domain}`;
    }
  }

  // 3. Fallback: humanized
  return `${defaultVerbs[verb] || dmlVerb} ${cleaned}`;
}


// ─── Humanizer: camelCase / PascalCase → Title Case ──────────────────────────

function humanize(name) {
  if (!name) return '';
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
  if (!text) return 'Step';
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


// ─── @intent comment parser ─────────────────────────────────────────────────

/**
 * Extracts all `// @intent <label>` comments from a code block.
 * Returns a Map<lineOffset, intentLabel> — the line offset is the char index
 * where the @intent comment appears, so we can position it correctly in the
 * milestone list.
 */
function extractIntents(body) {
  const intents = [];
  const re = /\/\/\s*@intent\s+(.+)/gi;
  let m;
  while ((m = re.exec(body)) !== null) {
    intents.push({
      label: m[1].trim(),
      pos: m.index,
      type: 'intent',
    });
  }
  return intents;
}


// ─── Regex patterns ──────────────────────────────────────────────────────────

const RE = {
  classDecl: /(?:public|private|global)\s+(?:with\s+sharing\s+|without\s+sharing\s+|inherited\s+sharing\s+)?(?:virtual\s+|abstract\s+)?class\s+(\w+)/,
  methodDecl: /(?:public|private|protected|global)\s+(?:static\s+)?(?:(?:void|String|Integer|Boolean|Decimal|Double|Long|Id|Date|DateTime|Time|Blob|List|Set|Map|SObject|\w+)\s*(?:<[^>]+>)?)\s+(\w+)\s*\(([^)]*)\)/g,
  dmlOps: /\b(insert|update|delete|upsert)\s+(\w+)/gi,
  databaseOp: /\bDatabase\.(insert|update|delete|upsert)\s*\(\s*(\w+)/gi,
  eventPublish: /EventBus\.publish\s*\(\s*(\w+)/g,
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


// ─── Milestone extractor ────────────────────────────────────────────────────

function extractMilestones(methodName, body, params) {
  const milestones = [];
  const seen = new Set();

  // ── Layer 1: @intent comments (highest priority) ──
  const intents = extractIntents(body);

  // ── Build type map: variableName → sObject type ──
  const typeMap = {};

  // Parse method parameters first (e.g., "List<Account> accounts, Map<Id, Order> orderMap")
  if (params) {
    const paramListRe = /\bList<(\w+(?:__\w+)?)>\s+(\w+)/g;
    let pm;
    while ((pm = paramListRe.exec(params)) !== null) typeMap[pm[2]] = pm[1];
    const paramMapRe = /\bMap<\w+,\s*(\w+(?:__\w+)?)>\s+(\w+)/g;
    while ((pm = paramMapRe.exec(params)) !== null) typeMap[pm[2]] = pm[1];
    // Single object params: Type varName
    const paramSingleRe = /\b(\w+(?:__\w+)?)\s+(\w+)\s*(?:,|$)/g;
    while ((pm = paramSingleRe.exec(params)) !== null) {
      if (!typeMap[pm[2]] && /^[A-Z]/.test(pm[1])) typeMap[pm[2]] = pm[1];
    }
  }

  // Then parse body declarations (these override params if duplicated)
  const listDeclRe = /\bList<(\w+(?:__\w+)?)>\s+(\w+)\b/g;
  let ld;
  while ((ld = listDeclRe.exec(body)) !== null) typeMap[ld[2]] = ld[1];

  const mapDeclRe = /\bMap<\w+,\s*(\w+(?:__\w+)?)>\s+(\w+)\b/g;
  let md;
  while ((md = mapDeclRe.exec(body)) !== null) typeMap[md[2]] = md[1];

  const singleDeclRe = /\b(\w+(?:__\w+)?)\s+(\w+)\s*=\s*new\s+\1/g;
  let sd;
  while ((sd = singleDeclRe.exec(body)) !== null) typeMap[sd[2]] = sd[1];

  // ── Collect machine-detected milestones ──
  const machineMilestones = [];

  // DML operations
  const dmlRe = /\b(insert|update|delete|upsert)\s+(\w+)/gi;
  let dm;
  while ((dm = dmlRe.exec(body)) !== null) {
    const verb = dm[1].toLowerCase();
    const varName = dm[2];
    const declaredType = typeMap[varName];
    const objName = declaredType || varName;

    // Use businessLabel (dictionary + pattern + fallback)
    const label = businessLabel(objName, verb);
    if (!seen.has(label)) {
      seen.add(label);
      machineMilestones.push({ label, type: 'dml', pos: dm.index });
    }
  }

  // Database.* operations
  const dbRe = new RegExp(RE.databaseOp.source, 'gi');
  let dbm;
  while ((dbm = dbRe.exec(body)) !== null) {
    const verb = dbm[1].toLowerCase();
    const varName = dbm[2];
    const declaredType = typeMap[varName];
    const objName = declaredType || varName;
    const label = businessLabel(objName, verb);
    if (!seen.has(label)) {
      seen.add(label);
      machineMilestones.push({ label, type: 'dml', pos: dbm.index });
    }
  }

  // Platform Events
  const evtRe = new RegExp(RE.eventPublish.source, 'g');
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
      machineMilestones.push({ label, type: 'event', pos: ev.index });
    }
  }

  // External service calls
  const callRe = new RegExp(RE.methodCall.source, 'g');
  let cm;
  const seenCalls = new Set();
  while ((cm = callRe.exec(body)) !== null) {
    const obj = cm[1], meth = cm[2];
    if (FRAMEWORK_OBJECTS.has(obj)) continue;
    if (COLLECTION_METHODS.has(meth)) continue;
    if (/^[a-z]/.test(obj)) continue;

    const key = `${obj}.${meth}`;
    if (seenCalls.has(key)) continue;
    seenCalls.add(key);

    machineMilestones.push({ label: humanize(meth), type: 'call', pos: cm.index });
  }

  // ── Merge: @intent overrides machine milestones in the same vicinity ──
  // An @intent within ~200 chars before a machine milestone replaces it.
  const merged = [];
  const usedIntents = new Set();
  const usedMachine = new Set();

  for (const intent of intents) {
    // Find the closest machine milestone AFTER this intent (within 200 chars)
    let closestIdx = -1;
    let closestDist = Infinity;
    for (let i = 0; i < machineMilestones.length; i++) {
      const dist = machineMilestones[i].pos - intent.pos;
      if (dist >= 0 && dist < 200 && dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    }
    if (closestIdx >= 0) {
      // @intent replaces the machine milestone
      usedMachine.add(closestIdx);
      usedIntents.add(intent);
      merged.push({ label: intent.label, type: 'intent', pos: intent.pos });
    } else {
      // Standalone @intent (no nearby machine milestone)
      merged.push({ label: intent.label, type: 'intent', pos: intent.pos });
      usedIntents.add(intent);
    }
  }

  // Add remaining machine milestones that weren't overridden
  for (let i = 0; i < machineMilestones.length; i++) {
    if (!usedMachine.has(i)) {
      merged.push(machineMilestones[i]);
    }
  }

  // Sort by position
  merged.sort((a, b) => a.pos - b.pos);

  // Deduplicate adjacent identical labels
  const deduped = [];
  for (const m of merged) {
    if (deduped.length > 0 && deduped[deduped.length - 1].label === m.label) continue;
    deduped.push(m);
  }

  // Fallback: method name
  if (deduped.length === 0) {
    const core = stripMethodPrefix(humanize(methodName));
    deduped.push({ label: core || humanize(methodName), type: 'fallback', pos: 0 });
  }

  return deduped;
}


// ─── Main parser: Business Process Map ───────────────────────────────────────

/**
 * parseApexToMermaid(apexCode, overrides?, customSteps?)
 *
 * @param {string}  apexCode    — The Apex class source
 * @param {Object}  overrides   — Optional { nodeId: "New Label" | "__HIDDEN__" } map
 * @param {Array}   customSteps — Optional [{ label, type }] appended before Done
 * @returns {string} Mermaid diagram code
 */
export function parseApexToMermaid(apexCode, overrides = {}, customSteps = []) {
  if (!apexCode || !apexCode.trim()) return '';

  const out = [];
  const styleGroups = {};
  const nodeMap = {}; // nodeId → { label, type } for UI click-to-rename
  let nid = 0;

  function id() { return `n${++nid}`; }

  function node(nodeId, shape, label, style) {
    // Apply user override if exists
    const finalLabel = overrides[nodeId] || label;
    const s = safe(finalLabel);
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
    nodeMap[nodeId] = { label: finalLabel, type: style };
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
    if (name === className) continue;
    const body = extractMethodBody(apexCode, mm.index);
    if (body) methods.push({ name, body, params: mm[2] || '' });
  }

  if (methods.length === 0) {
    return `graph TD\n    n1[["${safe(humanize(className))}"]]\n    n2(["No business logic found"])\n    n1 --> n2\n  classDef classNode fill:#312e81,stroke:#6366f1,stroke-width:2px,color:#e0e7ff\n  class n1 classNode`;
  }

  out.push('graph TD');
  out.push('');

  const titleId = id();
  node(titleId, 'subrect', humanize(className), 'classNode');
  out.push('');

  let prevId = titleId;

  methods.forEach((method) => {
    const milestones = extractMilestones(method.name, method.body, method.params);

    for (const ms of milestones) {
      const nId = id();

      // Skip hidden nodes (user removed this block)
      if (overrides[nId] === '__HIDDEN__') continue;

      // @intent milestones get a special style
      const styleType = ms.type === 'intent' ? 'intentNode' : ({
        dml: 'dmlNode',
        event: 'eventNode',
        call: 'callNode',
        fallback: 'fallbackNode',
      }[ms.type] || 'fallbackNode');

      const shape = ms.type === 'intent' ? 'stadium' : ({
        dml: 'stadium',
        event: 'hexagon',
        call: 'rounded',
        fallback: 'rect',
      }[ms.type] || 'rect');

      node(nId, shape, ms.label, styleType);
      edge(prevId, nId);
      prevId = nId;
    }
  });

  // ── Custom steps (user-added) ──
  for (const step of customSteps) {
    const csId = id();
    const stepLabel = typeof step === 'string' ? step : (step && step.label ? step.label : 'Custom Step');
    node(csId, 'rounded', stepLabel, 'customNode');
    edge(prevId, csId);
    prevId = csId;
  }

  const endId = id();
  node(endId, 'circle', 'Done', 'endNode');
  edge(prevId, endId);

  // ── Styles ──
  const styleMap = {
    classNode:    'fill:#312e81,stroke:#6366f1,stroke-width:3px,color:#e0e7ff,font-weight:bold',
    intentNode:   'fill:#065f46,stroke:#10b981,stroke-width:3px,color:#a7f3d0,font-weight:bold',
    dmlNode:      'fill:#7f1d1d,stroke:#ef4444,stroke-width:3px,color:#fecaca,font-weight:bold',
    eventNode:    'fill:#4a1d96,stroke:#8b5cf6,stroke-width:2px,color:#c4b5fd,font-weight:bold',
    callNode:     'fill:#164e63,stroke:#06b6d4,stroke-width:2px,color:#a5f3fc',
    fallbackNode: 'fill:#1e293b,stroke:#475569,stroke-width:2px,color:#cbd5e1',
    customNode:   'fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#c7d2fe,stroke-dasharray:5 3',
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

/**
 * Returns the node map from the most recent parse.
 * Used by the UI for click-to-rename.
 * We re-parse to extract it (cheap since it's all regex).
 */
export function getNodeMap(apexCode, overrides = {}) {
  if (!apexCode || !apexCode.trim()) return {};

  const nodeMap = {};
  let nid = 0;
  function id() { return `n${++nid}`; }

  const classMatch = apexCode.match(RE.classDecl);
  const className = classMatch ? classMatch[1] : 'ApexClass';

  const methods = [];
  const methodRegex = new RegExp(RE.methodDecl.source, 'g');
  let mm;
  while ((mm = methodRegex.exec(apexCode)) !== null) {
    const name = mm[1];
    if (name === className) continue;
    const body = extractMethodBody(apexCode, mm.index);
    if (body) methods.push({ name, body, params: mm[2] || '' });
  }

  // Title node
  const titleId = id();
  nodeMap[titleId] = { label: overrides[titleId] || humanize(className), type: 'classNode', editable: false };

  methods.forEach((method) => {
    const milestones = extractMilestones(method.name, method.body, method.params);
    for (const ms of milestones) {
      const nId = id();
      nodeMap[nId] = {
        label: overrides[nId] || ms.label,
        type: ms.type === 'intent' ? 'intentNode' : ms.type,
        editable: true,
      };
    }
  });

  // End node
  const endId = id();
  nodeMap[endId] = { label: 'Done', type: 'endNode', editable: false };

  return nodeMap;
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
  const intentCount = (apexCode.match(/\/\/\s*@intent/gi) || []).length;

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
    intentCount,
    complexity: ifCount + loopCount + throwCount,
  };
}
