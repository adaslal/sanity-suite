/**
 * ApexParser — Converts Apex source code into Mermaid.js flowchart syntax.
 *
 * This is a heuristic parser (not ANTLR-based) that extracts control flow,
 * DML operations, SOQL queries, method calls, and error handling from Apex
 * classes and produces a readable Mermaid `graph TD` diagram.
 *
 * Designed to run 100% client-side — no server, no dependencies beyond this file.
 *
 * Usage:
 *   import { parseApexToMermaid, SAMPLE_APEX } from '@/lib/apexParser';
 *   const mermaidCode = parseApexToMermaid(apexSource);
 */

// ─── Sample Apex for first-time visitors ─────────────────────────────────────
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

        // Pull related line items in bulk
        Map<Id, Opportunity> oppMap = new Map<Id, Opportunity>(
            [SELECT Id, Amount, AccountId, StageName,
                    (SELECT Id, UnitPrice, Quantity FROM OpportunityLineItems)
             FROM Opportunity
             WHERE Id IN :closedOpps]
        );

        List<Invoice__c> invoicesToInsert = new List<Invoice__c>();
        List<ERP_Sync_Event__e> events = new List<ERP_Sync_Event__e>();

        for (Opportunity opp : oppMap.values()) {
            // Validate: must have line items
            if (opp.OpportunityLineItems == null || opp.OpportunityLineItems.isEmpty()) {
                throw new OpportunityException('Opp ' + opp.Id + ' has no line items');
            }

            // Validate: amount must be positive
            if (opp.Amount == null || opp.Amount <= 0) {
                throw new OpportunityException('Invalid amount for Opp ' + opp.Id);
            }

            // Create invoice record
            Invoice__c inv = new Invoice__c(
                Opportunity__c = opp.Id,
                Account__c = opp.AccountId,
                Total_Amount__c = opp.Amount,
                Status__c = 'Pending'
            );
            invoicesToInsert.add(inv);

            // Queue ERP sync event
            events.add(new ERP_Sync_Event__e(
                Record_Id__c = opp.Id,
                Object_Type__c = 'Opportunity',
                Action__c = 'CLOSE_WON'
            ));
        }

        if (!invoicesToInsert.isEmpty()) {
            insert invoicesToInsert;
        }

        // Fire platform events for ERP integration
        if (!events.isEmpty()) {
            List<Database.SaveResult> results = EventBus.publish(events);
            for (Database.SaveResult sr : results) {
                if (!sr.isSuccess()) {
                    System.debug(LoggingLevel.ERROR, 'Event publish failed: ' + sr.getErrors());
                }
            }
        }

        // Update account last-closed date via utility
        AccountService.updateLastClosedDate(oppMap.values());
    }

    public class OpportunityException extends Exception {}
}`;


// ─── Node type definitions ───────────────────────────────────────────────────
const NODE_TYPES = {
  CLASS:    { shape: (id, label) => `${id}[["${label}"]]`,     style: 'classNode' },
  METHOD:   { shape: (id, label) => `${id}["${label}"]`,       style: 'methodNode' },
  START:    { shape: (id, label) => `${id}(["${label}"])`,      style: 'startNode' },
  END:      { shape: (id, label) => `${id}(["${label}"])`,      style: 'endNode' },
  DECISION: { shape: (id, label) => `${id}{"${label}"}`,       style: 'decisionNode' },
  ERROR:    { shape: (id, label) => `${id}[/"${label}"/]`,     style: 'errorNode' },
  DML:      { shape: (id, label) => `${id}[("${label}")]`,     style: 'dmlNode' },
  QUERY:    { shape: (id, label) => `${id}[("${label}")]`,     style: 'queryNode' },
  LOOP:     { shape: (id, label) => `${id}{{{"${label}"}}}`,   style: 'loopNode' },
  CALL:     { shape: (id, label) => `${id}>"${label}"]`,       style: 'callNode' },
  EVENT:    { shape: (id, label) => `${id}(("${label}"))`,     style: 'eventNode' },
  ACTION:   { shape: (id, label) => `${id}["${label}"]`,       style: 'actionNode' },
};


// ─── Regex patterns for Apex constructs ──────────────────────────────────────
const PATTERNS = {
  // Class declaration
  classDecl: /(?:public|private|global)\s+(?:with\s+sharing\s+|without\s+sharing\s+|inherited\s+sharing\s+)?(?:virtual\s+|abstract\s+)?class\s+(\w+)/,

  // Method declaration
  methodDecl: /(?:public|private|protected|global)\s+(?:static\s+)?(?:(?:void|String|Integer|Boolean|Decimal|Double|Long|Id|Date|DateTime|Time|Blob|List|Set|Map|SObject|\w+)\s*(?:<[^>]+>)?)\s+(\w+)\s*\(([^)]*)\)/g,

  // If / else if / else
  ifStatement: /\bif\s*\(([^{]+?)\)\s*\{/g,
  elseIfStatement: /\belse\s+if\s*\(([^{]+?)\)\s*\{/g,
  elseStatement: /\belse\s*\{/g,

  // Exception throwing
  throwStatement: /\bthrow\s+new\s+(\w+)\s*\(/g,

  // DML operations
  dmlInsert: /\binsert\s+(\w+)/g,
  dmlUpdate: /\bupdate\s+(\w+)/g,
  dmlDelete: /\bdelete\s+(\w+)/g,
  dmlUpsert: /\bupsert\s+(\w+)/g,
  databaseOp: /\bDatabase\.(insert|update|delete|upsert)\s*\(/g,

  // SOQL queries
  soqlQuery: /\[\s*SELECT\s+([\s\S]*?)FROM\s+(\w+)[\s\S]*?\]/gi,

  // For loops
  forLoop: /\bfor\s*\(\s*(\w+(?:\s*<[^>]+>)?)\s+(\w+)\s*:\s*([^)]+)\)/g,
  forTraditional: /\bfor\s*\(\s*(?:Integer|int)\s+\w+\s*=/g,

  // Method calls (external service or utility calls)
  methodCall: /(\w+)\.(\w+)\s*\(/g,

  // Platform Events
  eventPublish: /EventBus\.publish\s*\(/g,

  // Try-catch
  tryCatch: /\btry\s*\{/g,
  catchBlock: /\bcatch\s*\(\s*(\w+)\s+(\w+)\s*\)/g,

  // System.debug
  systemDebug: /System\.debug\s*\(/g,

  // Collections
  listDecl: /List<(\w+(?:__[a-zA-Z])?(?:<[^>]+>)?)>\s+(\w+)\s*=/g,
  mapDecl: /Map<([^>]+)>\s+(\w+)\s*=/g,

  // Return statements
  returnStmt: /\breturn\b/g,
};


// ─── Main parser function ────────────────────────────────────────────────────
export function parseApexToMermaid(apexCode) {
  if (!apexCode || !apexCode.trim()) {
    return '';
  }

  const lines = apexCode.split('\n');
  const nodes = [];
  const edges = [];
  const styles = new Set();
  let nodeCounter = 0;

  function nextId(prefix = 'n') {
    return `${prefix}${++nodeCounter}`;
  }

  function sanitize(text) {
    return text
      .replace(/"/g, "'")
      .replace(/[<>]/g, '')
      .replace(/\|/g, '/')
      .trim()
      .slice(0, 60);
  }

  function addNode(type, label) {
    const id = nextId();
    const nodeType = NODE_TYPES[type] || NODE_TYPES.ACTION;
    nodes.push(nodeType.shape(id, sanitize(label)));
    styles.add(nodeType.style);
    return id;
  }

  // ── Extract class name ──
  const classMatch = apexCode.match(PATTERNS.classDecl);
  const className = classMatch ? classMatch[1] : 'ApexClass';
  const classNodeId = addNode('CLASS', className);

  // ── Extract methods ──
  const methods = [];
  let methodMatch;
  const methodRegex = new RegExp(PATTERNS.methodDecl.source, 'g');
  while ((methodMatch = methodRegex.exec(apexCode)) !== null) {
    const name = methodMatch[1];
    const params = methodMatch[2].trim();

    // Skip inner class constructors
    if (name === className) continue;

    // Find method body boundaries
    const methodStart = methodMatch.index;
    let braceCount = 0;
    let bodyStart = -1;
    let bodyEnd = -1;

    for (let i = methodStart; i < apexCode.length; i++) {
      if (apexCode[i] === '{') {
        if (bodyStart === -1) bodyStart = i;
        braceCount++;
      } else if (apexCode[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          bodyEnd = i;
          break;
        }
      }
    }

    if (bodyStart !== -1 && bodyEnd !== -1) {
      methods.push({
        name,
        params: params ? params.split(',').map(p => p.trim().split(/\s+/).pop()).join(', ') : '',
        body: apexCode.slice(bodyStart + 1, bodyEnd),
        fullSignature: methodMatch[0],
      });
    }
  }

  // ── Build flowchart for each method ──
  methods.forEach((method) => {
    const paramHint = method.params ? `(${method.params})` : '()';
    const methodId = addNode('METHOD', `${method.name}${paramHint}`);
    edges.push(`${classNodeId} --> ${methodId}`);

    const startId = addNode('START', `Start: ${method.name}`);
    edges.push(`${methodId} --> ${startId}`);

    let prevId = startId;
    const body = method.body;

    // ── SOQL queries ──
    const soqlRegex = new RegExp(PATTERNS.soqlQuery.source, 'gi');
    let soql;
    while ((soql = soqlRegex.exec(body)) !== null) {
      const obj = soql[2];
      const nodeId = addNode('QUERY', `SOQL: ${obj}`);
      edges.push(`${prevId} --> ${nodeId}`);
      prevId = nodeId;
    }

    // ── For loops ──
    const forRegex = new RegExp(PATTERNS.forLoop.source, 'g');
    let forMatch;
    while ((forMatch = forRegex.exec(body)) !== null) {
      const varName = forMatch[2];
      const collection = forMatch[3].trim().split(/\s/).pop();
      const loopId = addNode('LOOP', `Loop: ${varName} in ${sanitize(collection)}`);
      edges.push(`${prevId} --> ${loopId}`);
      prevId = loopId;
    }

    // ── If conditions ──
    const ifRegex = new RegExp(PATTERNS.ifStatement.source, 'g');
    let ifMatch;
    while ((ifMatch = ifRegex.exec(body)) !== null) {
      const condition = sanitize(ifMatch[1]);
      const decId = addNode('DECISION', condition.slice(0, 45));

      edges.push(`${prevId} --> ${decId}`);

      // Look for throw after this if
      const afterIf = body.slice(ifMatch.index);
      const throwInBlock = afterIf.match(/\bthrow\s+new\s+(\w+)\s*\(\s*['"](.*?)['"]/);
      if (throwInBlock) {
        const errId = addNode('ERROR', `Throw: ${throwInBlock[1]}`);
        edges.push(`${decId} -->|Yes| ${errId}`);
      }

      prevId = decId;
    }

    // ── DML operations ──
    const dmlOps = [
      { regex: new RegExp(PATTERNS.dmlInsert.source, 'g'), label: 'INSERT' },
      { regex: new RegExp(PATTERNS.dmlUpdate.source, 'g'), label: 'UPDATE' },
      { regex: new RegExp(PATTERNS.dmlDelete.source, 'g'), label: 'DELETE' },
      { regex: new RegExp(PATTERNS.dmlUpsert.source, 'g'), label: 'UPSERT' },
    ];

    dmlOps.forEach(({ regex, label }) => {
      let dml;
      while ((dml = regex.exec(body)) !== null) {
        const target = dml[1];
        const dmlId = addNode('DML', `${label}: ${target}`);
        edges.push(`${prevId} --> ${dmlId}`);
        prevId = dmlId;
      }
    });

    // ── Database.* operations ──
    const dbRegex = new RegExp(PATTERNS.databaseOp.source, 'g');
    let dbMatch;
    while ((dbMatch = dbRegex.exec(body)) !== null) {
      const op = dbMatch[1].toUpperCase();
      const dbId = addNode('DML', `Database.${op}`);
      edges.push(`${prevId} --> ${dbId}`);
      prevId = dbId;
    }

    // ── Platform Events ──
    const evtRegex = new RegExp(PATTERNS.eventPublish.source, 'g');
    if (evtRegex.test(body)) {
      const evtId = addNode('EVENT', 'EventBus.publish');
      edges.push(`${prevId} --> ${evtId}`);
      prevId = evtId;
    }

    // ── External method calls (ClassName.method pattern) ──
    const callRegex = new RegExp(PATTERNS.methodCall.source, 'g');
    let callMatch;
    const seenCalls = new Set();
    const ignoredPrefixes = new Set([
      'System', 'Database', 'EventBus', 'Test', 'Schema',
      'Math', 'String', 'JSON', 'Blob', 'Crypto', 'URL',
      'UserInfo', 'Limits', 'LoggingLevel', 'Type',
    ]);

    while ((callMatch = callRegex.exec(body)) !== null) {
      const obj = callMatch[1];
      const meth = callMatch[2];

      // Skip common framework calls and duplicates
      if (ignoredPrefixes.has(obj)) continue;
      if (obj.startsWith('opp') || obj.startsWith('inv') || obj.startsWith('sr')) continue;
      if (obj === 'add' || meth === 'add' || meth === 'put' || meth === 'get'
          || meth === 'size' || meth === 'isEmpty' || meth === 'values'
          || meth === 'keySet' || meth === 'contains' || meth === 'containsKey'
          || meth === 'isSuccess' || meth === 'getErrors' || meth === 'debug') continue;

      const callKey = `${obj}.${meth}`;
      if (seenCalls.has(callKey)) continue;
      seenCalls.add(callKey);

      const callId = addNode('CALL', `${obj}.${meth}()`);
      edges.push(`${prevId} --> ${callId}`);
      prevId = callId;
    }

    // ── End node ──
    const endId = addNode('END', `End: ${method.name}`);
    edges.push(`${prevId} --> ${endId}`);
  });

  // ── If no methods found, do a flat line-by-line scan ──
  if (methods.length === 0) {
    let prevId = classNodeId;
    const flatBody = apexCode;

    const soqlRegex = new RegExp(PATTERNS.soqlQuery.source, 'gi');
    let soql;
    while ((soql = soqlRegex.exec(flatBody)) !== null) {
      const id = addNode('QUERY', `SOQL: ${soql[2]}`);
      edges.push(`${prevId} --> ${id}`);
      prevId = id;
    }

    const endId = addNode('END', 'End');
    edges.push(`${prevId} --> ${endId}`);
  }

  // ── Assemble Mermaid output ──
  const output = ['graph TD'];
  output.push('');

  // Nodes
  nodes.forEach(n => output.push(`  ${n}`));
  output.push('');

  // Edges
  edges.forEach(e => output.push(`  ${e}`));
  output.push('');

  // Style definitions
  const styleMap = {
    classNode:    'fill:#312e81,stroke:#6366f1,stroke-width:2px,color:#e0e7ff',
    methodNode:   'fill:#1e3a5f,stroke:#3b82f6,stroke-width:2px,color:#bfdbfe',
    startNode:    'fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#a7f3d0',
    endNode:      'fill:#1c1917,stroke:#78716c,stroke-width:2px,color:#d6d3d1',
    decisionNode: 'fill:#713f12,stroke:#f59e0b,stroke-width:2px,color:#fde68a',
    errorNode:    'fill:#7f1d1d,stroke:#ef4444,stroke-width:2px,color:#fecaca',
    dmlNode:      'fill:#172554,stroke:#3b82f6,stroke-width:2px,color:#93c5fd',
    queryNode:    'fill:#0c4a6e,stroke:#0ea5e9,stroke-width:2px,color:#7dd3fc',
    loopNode:     'fill:#3b0764,stroke:#a855f7,stroke-width:2px,color:#d8b4fe',
    callNode:     'fill:#164e63,stroke:#06b6d4,stroke-width:2px,color:#a5f3fc',
    eventNode:    'fill:#4a1d96,stroke:#8b5cf6,stroke-width:2px,color:#c4b5fd',
    actionNode:   'fill:#1e293b,stroke:#475569,stroke-width:1px,color:#cbd5e1',
  };

  styles.forEach(styleName => {
    if (styleMap[styleName]) {
      // Collect all node IDs that use this style
      const prefix = styleName.replace('Node', '');
      output.push(`  classDef ${styleName} ${styleMap[styleName]}`);
    }
  });

  // Apply styles to nodes based on their type
  output.push('');
  let nodeIdx = 0;
  const nodeIdList = [];
  nodes.forEach(() => {
    nodeIdx++;
    nodeIdList.push(`n${nodeIdx}`);
  });

  // Map node IDs to their styles by re-walking the generation order
  nodeIdx = 0;
  const styleAssignments = {};

  // Re-derive style assignments: we track each addNode call's type
  // Since we can't easily retroactively map, use a simpler approach:
  // Apply class styles based on node content patterns
  output.push('');

  return output.join('\n');
}


// ─── Lightweight stats extractor ─────────────────────────────────────────────
export function getApexStats(apexCode) {
  if (!apexCode || !apexCode.trim()) return null;

  const lines = apexCode.split('\n');
  const nonEmpty = lines.filter(l => l.trim() && !l.trim().startsWith('//') && !l.trim().startsWith('*'));

  const classMatch = apexCode.match(PATTERNS.classDecl);
  const methodRegex = new RegExp(PATTERNS.methodDecl.source, 'g');
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
    complexity: ifCount + loopCount + throwCount, // simplified cyclomatic
  };
}
