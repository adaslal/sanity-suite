/**
 * JavaScriptParser v6 — Business Logic IDE
 *
 * Architecture: Step Array Model
 *   parseJSToSteps(code)  → Step[]   (structured data)
 *   stepsToMermaid(steps) → string   (Mermaid diagram)
 *
 * Three accuracy layers:
 *   1. @intent COMMENTS (developer-led override)
 *   2. PATTERN DICTIONARY (semantic mapping for business operations)
 *   3. VARIABLE RESOLUTION (regex-based type inference)
 *   4. USER REFINEMENT (mid-flow insertion, rename, hide — handled in UI)
 *
 * 100% client-side. No dependencies.
 */

// ─── Sample React Component (with @intent demo) ────────────────────────────────
export const SAMPLE_JS = `import React, { useState, useEffect } from 'react';
import axios from 'axios';

export function UserDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '' });

  // @intent Load User Data from API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/users');
        setUsers(response.data);
      } catch (err) {
        setError('Failed to load users');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // @intent Submit New User Registration
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (result.ok) {
        const newUser = await result.json();
        setUsers([...users, newUser]);
        setFormData({ name: '', email: '' });
        localStorage.setItem('lastSubmitted', new Date().toISOString());
      }
    } catch (err) {
      console.error('Submit failed:', err);
    }
  };

  const handleDeleteUser = (userId) => {
    fetch(\`/api/users/\${userId}\`, { method: 'DELETE' })
      .then(() => setUsers(users.filter(u => u.id !== userId)))
      .catch(err => console.error(err));
  };

  const handleNavigate = () => {
    window.location.href = '/dashboard/settings';
  };

  return (
    <div className="dashboard-container">
      <h1>User Dashboard</h1>

      {error && <div className="alert error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="Name"
        />
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          placeholder="Email"
        />
        <button type="submit" disabled={loading}>Add User</button>
      </form>

      {loading && <div>Loading users...</div>}

      <ul className="user-list">
        {users.map(user => (
          <li key={user.id}>
            {user.name} - {user.email}
            <button onClick={() => handleDeleteUser(user.id)}>Delete</button>
          </li>
        ))}
      </ul>

      <button onClick={handleNavigate}>Go to Settings</button>
    </div>
  );
}`;


// ─── Pattern Dictionary for Business Operations ───────────────────────────────

const ENDPOINT_DICTIONARY = {
  '/api/users': { domain: 'User',            verb: 'Manage' },
  '/api/accounts': { domain: 'Account',      verb: 'Manage' },
  '/api/orders': { domain: 'Order',          verb: 'Process' },
  '/api/products': { domain: 'Product',      verb: 'Manage' },
  '/api/payments': { domain: 'Payment',      verb: 'Process' },
  '/api/auth': { domain: 'Authentication',   verb: 'Verify' },
  '/api/invoices': { domain: 'Invoice',      verb: 'Generate' },
  '/api/reports': { domain: 'Report',        verb: 'Generate' },
  '/api/notifications': { domain: 'Notification', verb: 'Send' },
  '/api/subscriptions': { domain: 'Subscription', verb: 'Manage' },
};

const ENDPOINT_PATTERNS = [
  { pattern: /\/api\/users/i,        domain: 'User',               verb: 'Manage' },
  { pattern: /\/api\/accounts/i,     domain: 'Account',            verb: 'Manage' },
  { pattern: /\/api\/orders/i,       domain: 'Order',              verb: 'Process' },
  { pattern: /\/api\/products/i,     domain: 'Product',            verb: 'Manage' },
  { pattern: /\/api\/payments/i,     domain: 'Payment',            verb: 'Process' },
  { pattern: /\/api\/auth/i,         domain: 'Authentication',     verb: 'Verify' },
  { pattern: /\/api\/invoices/i,     domain: 'Invoice',            verb: 'Generate' },
  { pattern: /\/api\/reports/i,      domain: 'Report',             verb: 'Generate' },
  { pattern: /\/api\/notifications/i, domain: 'Notification',      verb: 'Send' },
  { pattern: /\/api\/subscriptions/i, domain: 'Subscription',      verb: 'Manage' },
  { pattern: /\/api\/\w+$/i,         domain: 'Data',               verb: 'Update' },
];

const DOM_OPERATIONS = [
  'querySelector', 'querySelectorAll', 'getElementById', 'getElementsByClassName',
  'getElementsByTagName', 'createElement', 'appendChild', 'removeChild', 'insertBefore',
  'replaceChild', 'setAttribute', 'removeAttribute', 'classList', 'innerHTML', 'textContent',
  'addEventListener', 'removeEventListener', 'addEventListener', 'dispatchEvent',
];

const STATE_OPERATIONS = [
  'setState', 'useState', 'dispatch', 'commit', 'setters', 'setLoading', 'setError',
  'setData', 'setUser', 'setUsers', 'setForm', 'setModal', 'setSelected', 'setFilter',
  'setPage', 'setSort', 'setSearch', 'setCount', 'setTotal',
];

const REACT_HOOKS = [
  'useState', 'useEffect', 'useContext', 'useReducer', 'useCallback', 'useMemo',
  'useRef', 'useImperativeHandle', 'useLayoutEffect', 'useDebugValue', 'useTransition',
  'useDeferredValue', 'useId',
];

const STORAGE_OPERATIONS = [
  'setItem', 'getItem', 'removeItem', 'clear', 'key', 'length',
];

function businessLabelForEndpoint(endpoint, httpMethod = 'GET') {
  const method = httpMethod.toUpperCase();
  const defaultVerbs = {
    'GET': 'Fetch', 'POST': 'Create', 'PUT': 'Update', 'PATCH': 'Modify', 'DELETE': 'Delete'
  };

  const dictEntry = ENDPOINT_DICTIONARY[endpoint];
  if (dictEntry) {
    const verb = method === 'GET' ? 'Fetch' : (defaultVerbs[method] || method);
    return `${verb} ${dictEntry.domain}`;
  }

  const cleaned = cleanEndpoint(endpoint);
  for (const pm of ENDPOINT_PATTERNS) {
    if (pm.pattern.test(endpoint)) {
      const verb = method === 'GET' ? 'Fetch' : (defaultVerbs[method] || method);
      return `${verb} ${pm.domain}`;
    }
  }

  return `${defaultVerbs[method] || method} ${cleaned}`;
}

function cleanEndpoint(endpoint) {
  if (!endpoint) return 'API';
  return endpoint
    .replace(/^\/api\//, '')
    .split('/')
    .filter(p => p && !p.startsWith('{') && !p.startsWith(':'))
    .map(p => humanize(p))
    .join(' ');
}


// ─── Humanizer: camelCase / PascalCase → Title Case ──────────────────────────

function humanize(name) {
  if (!name) return '';
  let cleaned = name
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([a-z])([A-Z]{2,})/g, '$1 $2');
  return cleaned
    .split(/[\s_-]+/)
    .filter(w => w.length > 0)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
    .trim();
}

function stripFunctionPrefix(name) {
  return name
    .replace(/^(handle|on|process|execute|run|do|perform|before|after|fetch|load|init|setup)/i, '')
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


// ─── Extract function body by brace-matching ──────────────────────────────────

function extractFunctionBody(code, startIdx) {
  let braceCount = 0, bodyStart = -1, bodyEnd = -1;
  for (let i = startIdx; i < code.length; i++) {
    if (code[i] === '{') { if (bodyStart === -1) bodyStart = i; braceCount++; }
    else if (code[i] === '}') { braceCount--; if (braceCount === 0) { bodyEnd = i; break; } }
  }
  if (bodyStart === -1 || bodyEnd === -1) return null;
  return code.slice(bodyStart + 1, bodyEnd);
}


// ─── @intent comment parser ─────────────────────────────────────────────────

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
  // Function/Component declarations
  functionDecl: /(?:function|const|let|var)\s+([a-zA-Z_$][\w$]*)\s*(?:=\s*\(?.*?\)?\s*)?(?:=>|function\s*\()/,
  arrowFunc: /const\s+([a-zA-Z_$][\w$]*)\s*=\s*(?:\([^)]*\))?\s*=>/,
  funcDecl: /function\s+([a-zA-Z_$][\w$]*)\s*\(/,
  classComp: /class\s+([a-zA-Z_$][\w$]*)\s+extends\s+React\.Component/,
  exportDefault: /export\s+(?:default\s+)?(?:function|const|class)\s+([a-zA-Z_$][\w$]*)/,

  // fetch/axios calls
  fetchCall: /fetch\s*\(\s*['"](.*?)['"]|fetch\s*\(\s*`(.*?)`/gi,
  axiosCall: /axios\.(get|post|put|patch|delete)\s*\(\s*['"](.*?)['"]|axios\.(get|post|put|patch|delete)\s*\(\s*`(.*?)`/gi,
  httpCall: /http\.(get|post|put|patch|delete)\s*\(\s*['"](.*?)['"]|http\.(get|post|put|patch|delete)\s*\(\s*`(.*?)`/gi,

  // DOM manipulation
  domOp: /\b(?:document|querySelector|getElementById|createElement|appendChild|removeChild|setAttribute|innerHTML|textContent|addEventListener)\b/g,
  domSpecific: /(?:document\.|querySelector|getElementById|getElementsByClassName|createElement|appendChild|removeChild|insertBefore|replaceChild|setAttribute|removeAttribute|addEventListener|removeEventListener|dispatchEvent)\s*\(/g,

  // State management
  setStateCall: /setState\s*\(/g,
  useStateHook: /useState\s*\(/g,
  reduxDispatch: /dispatch\s*\(/g,
  vuexCommit: /commit\s*\(/g,
  stateOp: /\b(?:setLoading|setError|setData|setUser|setUsers|setForm|setModal|setSelected|setFilter|setPage|setSort|setSearch|setCount|setTotal)\s*\(/g,

  // Event listeners
  onEventHandler: /on(?:Click|Change|Submit|Focus|Blur|KeyDown|KeyUp|MouseEnter|MouseLeave|Input)\s*=/g,
  addEventListener: /addEventListener\s*\(\s*['"](.*?)['"]/gi,

  // Storage
  storageOp: /(?:localStorage|sessionStorage)\.\s*(?:setItem|getItem|removeItem|clear)\s*\(/g,
  storageMethods: /(?:localStorage|sessionStorage)\.\s*(?:setItem|getItem|removeItem|clear)\s*\(\s*['"](.*?)['"]/gi,

  // React hooks
  useEffectHook: /useEffect\s*\(\s*(?:\(\s*\)|async\s+\(\s*\))\s*=>/g,
  useMemoHook: /useMemo\s*\(\s*\(\s*\)\s*=>/g,
  useCallbackHook: /useCallback\s*\(\s*\(\s*[^)]*\)\s*=>/g,
  hookCall: /\b(?:useContext|useReducer|useRef|useImperativeHandle|useLayoutEffect|useDebugValue)\s*\(/g,

  // Router navigation
  routerNav: /(?:navigate|history\.push|window\.location|go\()\s*\(\s*['"](.*?)['"]|(?:navigate|go)\s*\(\s*`(.*?)`/gi,

  // Form submission
  formSubmit: /onSubmit\s*=|<\s*form[^>]*onSubmit|form\.submit\s*\(|e\.preventDefault\s*\(\)/g,

  // Promise/async
  thenCatch: /\.then\s*\(|\.catch\s*\(|\.finally\s*\(/g,
  awaitKeyword: /await\s+/g,

  // Module exports
  exportStmt: /export\s+(?:default\s+)?(?:function|const|class|{\s*[^}]*})\s+([a-zA-Z_$][\w$]*)/g,
};

const FRAMEWORK_OBJECTS = new Set([
  'console', 'window', 'document', 'Math', 'String', 'Array', 'Object', 'JSON',
  'setTimeout', 'setInterval', 'Promise', 'Error', 'React', 'ReactDOM',
  'localStorage', 'sessionStorage', 'fetch',
]);

const ASYNC_KEYWORDS = new Set([
  'async', 'await', 'then', 'catch', 'finally', 'resolve', 'reject',
]);


// ─── Milestone extractor ────────────────────────────────────────────────────

function extractMilestones(functionName, body) {
  const milestones = [];
  const seen = new Set();

  const intents = extractIntents(body);

  const machineMilestones = [];

  // Detect fetch calls
  const fetchRe = /fetch\s*\(\s*['"](.*?)['"]|fetch\s*\(\s*`([^`]*)`/gi;
  let fm;
  while ((fm = fetchRe.exec(body)) !== null) {
    const endpoint = fm[1] || fm[2];
    const label = businessLabelForEndpoint(endpoint, 'GET');
    if (!seen.has(label)) {
      seen.add(label);
      machineMilestones.push({ label, type: 'call', pos: fm.index });
    }
  }

  // Detect axios calls
  const axiosRe = /axios\.(get|post|put|patch|delete)\s*\(\s*['"](.*?)['"]|axios\.(get|post|put|patch|delete)\s*\(\s*`([^`]*)`/gi;
  let am;
  while ((am = axiosRe.exec(body)) !== null) {
    const method = am[1] || am[3];
    const endpoint = am[2] || am[4];
    const label = businessLabelForEndpoint(endpoint, method);
    if (!seen.has(label)) {
      seen.add(label);
      machineMilestones.push({ label, type: 'call', pos: am.index });
    }
  }

  // Detect HTTP client calls
  const httpRe = /http\.(get|post|put|patch|delete)\s*\(\s*['"](.*?)['"]|http\.(get|post|put|patch|delete)\s*\(\s*`([^`]*)`/gi;
  let hm;
  while ((hm = httpRe.exec(body)) !== null) {
    const method = hm[1] || hm[3];
    const endpoint = hm[2] || hm[4];
    const label = businessLabelForEndpoint(endpoint, method);
    if (!seen.has(label)) {
      seen.add(label);
      machineMilestones.push({ label, type: 'call', pos: hm.index });
    }
  }

  // Detect DOM manipulation
  const domRe = /(?:document|this)\.\s*(?:querySelector|getElementById|createElement|appendChild|removeChild|setAttribute)\s*\([^)]*\)/gi;
  let dm;
  const seenDom = new Set();
  while ((dm = domRe.exec(body)) !== null) {
    const snippet = body.substring(Math.max(0, dm.index - 5), Math.min(body.length, dm.index + dm[0].length + 10));
    if (!seenDom.has(snippet)) {
      seenDom.add(snippet);
      machineMilestones.push({ label: 'Update DOM Elements', type: 'dml', pos: dm.index });
      break;
    }
  }

  // Detect useState hooks
  const useStateRe = /const\s+\[(\w+),\s*\w+\]\s*=\s*useState/gi;
  let usm;
  const seenStates = new Set();
  while ((usm = useStateRe.exec(body)) !== null) {
    const stateName = usm[1];
    if (!seenStates.has(stateName)) {
      seenStates.add(stateName);
      const label = `Initialize State: ${humanize(stateName)}`;
      if (!seen.has(label)) {
        seen.add(label);
        machineMilestones.push({ label, type: 'dml', pos: usm.index });
      }
    }
  }

  // Detect state updates (setState, direct assignment)
  const setStateRe = /\b(set\w+|setState)\s*\(/gi;
  let ssm;
  const seenSetState = new Set();
  while ((ssm = setStateRe.exec(body)) !== null) {
    const stateFunc = ssm[1];
    if (!seenSetState.has(stateFunc)) {
      seenSetState.add(stateFunc);
      const label = `Update State: ${humanize(stateFunc.replace(/^set/, ''))}`;
      if (!seen.has(label)) {
        seen.add(label);
        machineMilestones.push({ label, type: 'dml', pos: ssm.index });
      }
    }
  }

  // Detect useEffect hooks
  const useEffectRe = /useEffect\s*\(\s*(?:\(\s*\)|async\s+\(\s*\))\s*=>/gi;
  let uem;
  let effectCount = 0;
  while ((uem = useEffectRe.exec(body)) !== null) {
    effectCount++;
    const depMatch = body.substring(uem.index, Math.min(body.length, uem.index + 300)).match(/\],\s*\[(.*?)\]/);
    const deps = depMatch && depMatch[1] ? depMatch[1].split(',').map(d => d.trim()).filter(d => d) : ['all'];
    const depLabel = deps.length === 0 ? 'mount' : deps.join(', ');
    const label = `Effect: ${depLabel}`;
    if (!seen.has(label)) {
      seen.add(label);
      machineMilestones.push({ label, type: 'event', pos: uem.index });
    }
  }

  // Detect event handlers (onClick, onChange, etc.)
  const onHandlerRe = /on(?:Click|Change|Submit|Focus|Blur|KeyDown|KeyUp|Mouse\w+|Input)\s*=/gi;
  let ehm;
  let eventCount = 0;
  while ((ehm = onHandlerRe.exec(body)) !== null) {
    eventCount++;
    const eventName = body.substring(ehm.index, Math.min(body.length, ehm.index + 50))
      .match(/on(\w+)/)[1];
    const label = `Handle ${eventName} Event`;
    if (!seen.has(label) && eventCount <= 5) {
      seen.add(label);
      machineMilestones.push({ label, type: 'event', pos: ehm.index });
    }
  }

  // Detect form submission
  const formRe = /onSubmit\s*=|<form[^>]*onSubmit|form\.submit\s*\(|e\.preventDefault\s*\(\)/gi;
  let form;
  while ((form = formRe.exec(body)) !== null) {
    const label = 'Submit Form';
    if (!seen.has(label)) {
      seen.add(label);
      machineMilestones.push({ label, type: 'event', pos: form.index });
      break;
    }
  }

  // Detect localStorage/sessionStorage
  const storageRe = /(?:localStorage|sessionStorage)\.\s*(?:setItem|getItem|removeItem)\s*\(\s*['"](.*?)['"]/gi;
  let stm;
  const seenStorage = new Set();
  while ((stm = storageRe.exec(body)) !== null) {
    const key = stm[1];
    if (!seenStorage.has(key)) {
      seenStorage.add(key);
      const label = `Store Data: ${humanize(key)}`;
      if (!seen.has(label)) {
        seen.add(label);
        machineMilestones.push({ label, type: 'dml', pos: stm.index });
      }
    }
  }

  // Detect navigation
  const navRe = /(?:navigate|history\.push|window\.location\.href)\s*=\s*['"](.*?)['"]|navigate\s*\(\s*['"](.*?)['"]/gi;
  let nm;
  while ((nm = navRe.exec(body)) !== null) {
    const path = nm[1] || nm[2];
    const label = `Navigate to ${humanize(path)}`;
    if (!seen.has(label)) {
      seen.add(label);
      machineMilestones.push({ label, type: 'call', pos: nm.index });
    }
  }

  // Detect Redux dispatch
  const dispatchRe = /dispatch\s*\(\s*(?:\{|[\w.]+\()/g;
  let disp;
  while ((disp = dispatchRe.exec(body)) !== null) {
    const label = 'Dispatch Action';
    if (!seen.has(label)) {
      seen.add(label);
      machineMilestones.push({ label, type: 'event', pos: disp.index });
      break;
    }
  }

  // Detect useMemo/useCallback
  const memoRe = /useMemo\s*\(|useCallback\s*\(/g;
  let memom;
  let memoCount = 0;
  while ((memom = memoRe.exec(body)) !== null) {
    memoCount++;
    const label = 'Compute Memoized Value';
    if (!seen.has(label) && memoCount <= 2) {
      seen.has(label) || seen.add(label);
      memoCount === 1 && machineMilestones.push({ label, type: 'event', pos: memom.index });
    }
  }

  // Merge intents and machine-detected milestones
  const merged = [];
  const usedMachine = new Set();

  for (const intent of intents) {
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
      usedMachine.add(closestIdx);
      merged.push({ label: intent.label, type: 'intent', pos: intent.pos });
    } else {
      merged.push({ label: intent.label, type: 'intent', pos: intent.pos });
    }
  }

  for (let i = 0; i < machineMilestones.length; i++) {
    if (!usedMachine.has(i)) {
      merged.push(machineMilestones[i]);
    }
  }

  merged.sort((a, b) => a.pos - b.pos);

  const deduped = [];
  for (const m of merged) {
    if (deduped.length > 0 && deduped[deduped.length - 1].label === m.label) continue;
    deduped.push(m);
  }

  if (deduped.length === 0) {
    const core = stripFunctionPrefix(humanize(functionName));
    deduped.push({ label: core || humanize(functionName), type: 'fallback', pos: 0 });
  }

  return deduped;
}


// ─── Step Array Model ────────────────────────────────────────────────────────
//
// Each Step = {
//   id:       string     — unique ID ('n1', 'n2', ... or 'c1', 'c2' for custom)
//   label:    string     — display text
//   type:     string     — 'class'|'dml'|'intent'|'event'|'call'|'fallback'|'custom'|'end'
//   shape:    string     — Mermaid shape: 'subrect'|'stadium'|'hexagon'|'rounded'|'rect'|'circle'
//   style:    string     — CSS class: 'classNode'|'dmlNode'|'intentNode'|etc.
//   source:   string     — 'machine'|'intent'|'custom'
//   editable: boolean    — whether users can rename/hide this step
//   hidden:   boolean    — if true, excluded from Mermaid output
// }

/**
 * parseJSToSteps(jsCode)
 *
 * Parses JavaScript/React source into a structured Step array.
 * This is the foundation — the UI manipulates this array,
 * then calls stepsToMermaid() to render.
 *
 * @param {string} jsCode — The JavaScript/React source
 * @returns {Array} Step objects
 */
export function parseJSToSteps(jsCode) {
  if (!jsCode || !jsCode.trim()) return [];

  const steps = [];
  let nextId = 1;

  // Find component/module name
  const classCompMatch = jsCode.match(RE.classComp);
  const exportMatch = jsCode.match(RE.exportDefault);
  const arrowMatch = jsCode.match(RE.arrowFunc);
  const funcMatch = jsCode.match(RE.funcDecl);

  const componentName = classCompMatch ? classCompMatch[1]
    : exportMatch ? exportMatch[1]
    : arrowMatch ? arrowMatch[1]
    : funcMatch ? funcMatch[1]
    : 'Component';

  // ── Title step ──
  steps.push({
    id: `n${nextId++}`,
    label: humanize(componentName),
    type: 'class',
    shape: 'subrect',
    style: 'classNode',
    source: 'machine',
    editable: false,
    hidden: false,
  });

  // ── Extract functions ──
  const functions = [];

  // Extract arrow functions
  const arrowFuncRe = /const\s+(\w+)\s*=\s*\([^)]*\)\s*=>/g;
  let arrow;
  while ((arrow = arrowFuncRe.exec(jsCode)) !== null) {
    const name = arrow[1];
    const body = extractFunctionBody(jsCode, arrow.index);
    if (body) functions.push({ name, body, type: 'arrow' });
  }

  // Extract function declarations
  const declRe = /function\s+(\w+)\s*\(/g;
  let decl;
  while ((decl = declRe.exec(jsCode)) !== null) {
    const name = decl[1];
    const body = extractFunctionBody(jsCode, decl.index);
    if (body) functions.push({ name, body, type: 'declaration' });
  }

  // Extract useEffect hooks
  const effectRe = /useEffect\s*\(\s*\([^)]*\)\s*=>/g;
  let effect;
  let effectIndex = 0;
  while ((effect = effectRe.exec(jsCode)) !== null) {
    effectIndex++;
    const body = extractFunctionBody(jsCode, effect.index);
    if (body) functions.push({ name: `useEffect${effectIndex}`, body, type: 'hook' });
  }

  if (functions.length === 0) {
    steps.push({
      id: `n${nextId++}`,
      label: 'No business logic found',
      type: 'fallback',
      shape: 'stadium',
      style: 'fallbackNode',
      source: 'machine',
      editable: false,
      hidden: false,
    });
  } else {
    for (const func of functions) {
      const milestones = extractMilestones(func.name, func.body);

      for (const ms of milestones) {
        const style = ms.type === 'intent' ? 'intentNode' : ({
          dml: 'dmlNode', event: 'eventNode', call: 'callNode', fallback: 'fallbackNode',
        }[ms.type] || 'fallbackNode');

        const shape = ms.type === 'intent' ? 'stadium' : ({
          dml: 'stadium', event: 'hexagon', call: 'rounded', fallback: 'rect',
        }[ms.type] || 'rect');

        steps.push({
          id: `n${nextId++}`,
          label: ms.label,
          type: ms.type,
          shape,
          style,
          source: ms.type === 'intent' ? 'intent' : 'machine',
          editable: true,
          hidden: false,
        });
      }
    }
  }

  // ── End step ──
  steps.push({
    id: `n${nextId++}`,
    label: 'Done',
    type: 'end',
    shape: 'circle',
    style: 'endNode',
    source: 'machine',
    editable: false,
    hidden: false,
  });

  return steps;
}


// ─── Steps → Mermaid ─────────────────────────────────────────────────────────

/** Style definitions shared by stepsToMermaid and parseJSToMermaid */
const STYLE_MAP = {
  classNode:    'fill:#312e81,stroke:#6366f1,stroke-width:3px,color:#e0e7ff,font-weight:bold',
  intentNode:   'fill:#065f46,stroke:#10b981,stroke-width:3px,color:#a7f3d0,font-weight:bold',
  dmlNode:      'fill:#7f1d1d,stroke:#ef4444,stroke-width:3px,color:#fecaca,font-weight:bold',
  eventNode:    'fill:#4a1d96,stroke:#8b5cf6,stroke-width:2px,color:#c4b5fd,font-weight:bold',
  callNode:     'fill:#164e63,stroke:#06b6d4,stroke-width:2px,color:#a5f3fc',
  fallbackNode: 'fill:#1e293b,stroke:#475569,stroke-width:2px,color:#cbd5e1',
  customNode:   'fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#c7d2fe,stroke-dasharray:5 3',
  endNode:      'fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#a7f3d0',
};

/**
 * stepsToMermaid(steps)
 *
 * Converts a Step array into a Mermaid TD graph string.
 * Filters out hidden steps. Produces edges between consecutive visible steps.
 *
 * @param {Array} steps — Step objects (from parseJSToSteps or user-modified)
 * @returns {string} Mermaid diagram code
 */
export function stepsToMermaid(steps) {
  if (!steps || steps.length === 0) return '';

  const visible = steps.filter(s => !s.hidden);
  if (visible.length === 0) return '';

  const out = ['graph TD', ''];
  const styleGroups = {};

  for (let i = 0; i < visible.length; i++) {
    const step = visible[i];
    const s = safe(step.label);

    const shapes = {
      stadium:  `${step.id}(["${s}"])`,
      rect:     `${step.id}["${s}"]`,
      rounded:  `${step.id}("${s}")`,
      circle:   `${step.id}(("${s}"))`,
      hexagon:  `${step.id}{{"${s}"}}`,
      subrect:  `${step.id}[["${s}"]]`,
    };

    out.push(`    ${shapes[step.shape] || shapes.rect}`);

    if (i > 0) {
      out.push(`    ${visible[i - 1].id} --> ${step.id}`);
    }

    if (!styleGroups[step.style]) styleGroups[step.style] = [];
    styleGroups[step.style].push(step.id);
  }

  out.push('');
  Object.entries(styleGroups).forEach(([s, ids]) => {
    if (STYLE_MAP[s]) out.push(`  classDef ${s} ${STYLE_MAP[s]}`);
  });
  out.push('');
  Object.entries(styleGroups).forEach(([s, ids]) => {
    if (STYLE_MAP[s] && ids.length > 0) out.push(`  class ${ids.join(',')} ${s}`);
  });

  return out.join('\n');
}


// ─── Convenience wrapper (backward compat with v5 API) ──────────────────────

/**
 * parseJSToMermaid(jsCode, overrides?, customSteps?)
 *
 * Wraps parseJSToSteps + stepsToMermaid for backward compatibility.
 * New code should use the Step array directly.
 */
export function parseJSToMermaid(jsCode, overrides = {}, customSteps = []) {
  let steps = parseJSToSteps(jsCode);
  if (steps.length === 0) return '';

  // Apply overrides (rename / hide)
  steps = steps.map(s => {
    if (overrides[s.id] === '__HIDDEN__') return { ...s, hidden: true };
    if (overrides[s.id]) return { ...s, label: overrides[s.id] };
    return s;
  });

  // Insert custom steps before Done
  if (customSteps.length > 0) {
    const endIdx = steps.findIndex(s => s.type === 'end');
    const insertAt = endIdx >= 0 ? endIdx : steps.length;
    const customs = customSteps.map((cs, i) => ({
      id: `c${100 + i}`,
      label: typeof cs === 'string' ? cs : (cs && cs.label ? cs.label : 'Custom Step'),
      type: 'custom',
      shape: 'rounded',
      style: 'customNode',
      source: 'custom',
      editable: true,
      hidden: false,
    }));
    steps.splice(insertAt, 0, ...customs);
  }

  return stepsToMermaid(steps);
}


// ─── Node map (backward compat) ─────────────────────────────────────────────

export function getNodeMap(jsCode, overrides = {}) {
  const steps = parseJSToSteps(jsCode);
  const nodeMap = {};
  for (const step of steps) {
    nodeMap[step.id] = {
      label: overrides[step.id] || step.label,
      type: step.style,
      editable: step.editable,
    };
  }
  return nodeMap;
}


// ─── Stats extractor ─────────────────────────────────────────────────────────

export function getJSStats(jsCode) {
  if (!jsCode || !jsCode.trim()) return null;

  const lines = jsCode.split('\n');
  const nonEmpty = lines.filter(l => l.trim() && !l.trim().startsWith('//') && !l.trim().startsWith('*'));

  // Component name
  const classCompMatch = jsCode.match(RE.classComp);
  const exportMatch = jsCode.match(RE.exportDefault);
  const arrowMatch = jsCode.match(RE.arrowFunc);
  const funcMatch = jsCode.match(RE.funcDecl);

  const componentName = classCompMatch ? classCompMatch[1]
    : exportMatch ? exportMatch[1]
    : arrowMatch ? arrowMatch[1]
    : funcMatch ? funcMatch[1]
    : 'Unknown';

  // Extract all functions
  const arrowFuncRe = /const\s+(\w+)\s*=\s*\([^)]*\)\s*=>/g;
  const declRe = /function\s+(\w+)\s*\(/g;
  const functions = [];
  let m;
  while ((m = arrowFuncRe.exec(jsCode)) !== null) functions.push(m[1]);
  while ((m = declRe.exec(jsCode)) !== null) functions.push(m[1]);

  // Count operations
  const fetchCount = (jsCode.match(/fetch\s*\(/g) || []).length
    + (jsCode.match(/axios\.(get|post|put|patch|delete)/gi) || []).length;
  const domOpsCount = (jsCode.match(/(?:document|querySelector|getElementById|createElement|appendChild)\b/gi) || []).length;
  const stateOpsCount = (jsCode.match(/setState\s*\(|useState\s*\(/gi) || []).length
    + (jsCode.match(/\bset\w+\s*\(/g) || []).length;
  const eventCount = (jsCode.match(/on(?:Click|Change|Submit|Focus|Blur|KeyDown|KeyUp|Mouse\w+|Input)\s*=/gi) || []).length
    + (jsCode.match(/addEventListener\s*\(/g) || []).length;
  const hookCount = (jsCode.match(/use(?:State|Effect|Context|Reducer|Callback|Memo|Ref)\s*\(/gi) || []).length;
  const ifCount = (jsCode.match(/if\s*\(/g) || []).length;
  const asyncCount = (jsCode.match(/async\s+|await\s+/g) || []).length;
  const intentCount = (jsCode.match(/\/\/\s*@intent/gi) || []).length;

  return {
    componentName,
    totalLines: lines.length,
    codeLines: nonEmpty.length,
    functions,
    functionCount: functions.length,
    fetchCount,
    domOpsCount,
    stateOpsCount,
    eventCount,
    hookCount,
    ifCount,
    asyncCount,
    intentCount,
    complexity: ifCount + asyncCount + hookCount,
  };
}
