/**
 * ParserBase — Unified Multi-Language Parser Interface
 *
 * Provides:
 *   1. Language auto-detection from code content
 *   2. Unified parseToSteps(code, language?) → Step[]
 *   3. Unified getStats(code, language?) → stats object
 *   4. Language metadata (names, samples, labels)
 *
 * All language parsers output the same Step[] model:
 *   { id, label, type, shape, style, source, editable, hidden }
 */

import { parseApexToSteps, getApexStats, SAMPLE_APEX, stepsToMermaid } from '../apexParser';
import { parseJSToSteps, getJSStats, SAMPLE_JS } from './jsParser';
import { parseJavaToSteps, getJavaStats, SAMPLE_JAVA } from './javaParser';
import { parseCSharpToSteps, getCSharpStats, SAMPLE_CSHARP } from './csharpParser';

// Re-export stepsToMermaid — it's language-agnostic
export { stepsToMermaid } from '../apexParser';

// ─── Language Registry ───────────────────────────────────────────────────────

export const LANGUAGES = {
  apex: {
    id: 'apex',
    name: 'Apex',
    label: 'Salesforce Apex',
    icon: '⚡',
    fileExtensions: ['.cls', '.trigger', '.apex'],
    parse: parseApexToSteps,
    stats: getApexStats,
    sample: SAMPLE_APEX,
    description: 'Salesforce Apex classes and triggers',
  },
  javascript: {
    id: 'javascript',
    name: 'JavaScript',
    label: 'JavaScript / React',
    icon: '🟨',
    fileExtensions: ['.js', '.jsx', '.mjs', '.tsx', '.ts'],
    parse: parseJSToSteps,
    stats: getJSStats,
    sample: SAMPLE_JS,
    description: 'JavaScript, React, Node.js, TypeScript',
  },
  java: {
    id: 'java',
    name: 'Java',
    label: 'Java / Spring',
    icon: '☕',
    fileExtensions: ['.java'],
    parse: parseJavaToSteps,
    stats: getJavaStats,
    sample: SAMPLE_JAVA,
    description: 'Java, Spring Boot, JPA, Hibernate',
  },
  csharp: {
    id: 'csharp',
    name: 'C#',
    label: 'C# / .NET',
    icon: '🟪',
    fileExtensions: ['.cs'],
    parse: parseCSharpToSteps,
    stats: getCSharpStats,
    sample: SAMPLE_CSHARP,
    description: 'C#, ASP.NET Core, Entity Framework',
  },
};

export const LANGUAGE_LIST = Object.values(LANGUAGES);


// ─── Language Auto-Detection ─────────────────────────────────────────────────

const DETECTION_PATTERNS = {
  apex: {
    strong: [
      /\bpublic\s+(?:with|without|inherited)\s+sharing\s+class\b/,     // sharing keyword
      /\b(?:insert|update|delete|upsert)\s+\w+.*;/,                     // DML statements
      /\[\s*SELECT\s+.*FROM\s+/i,                                       // SOQL query
      /\bTrigger\.(new|old|newMap|oldMap)\b/,                           // Trigger context
      /\bDatabase\.(insert|update|delete|upsert|query)\b/,             // Database class
      /\bEventBus\.publish\b/,                                          // Platform Events
      /\bSystem\.debug\b/,                                              // Apex debug
      /\b\w+__c\b/,                                                     // Custom fields
      /\b\w+__e\b/,                                                     // Platform events
      /\b@(?:isTest|future|AuraEnabled|InvocableMethod|RemoteAction)\b/, // Apex annotations
    ],
    weak: [
      /\bList<\w+>/,                // Could be Java too, but common in Apex
      /\bMap<Id,/,                  // Apex Id type
      /\bglobal\s+class\b/,        // global keyword
    ],
  },
  javascript: {
    strong: [
      /\b(?:const|let|var)\s+\w+\s*=\s*(?:require|import)\b/,          // CommonJS/ES imports
      /\bimport\s+.*\s+from\s+['"].*['"]/,                             // ES module import
      /\bexport\s+(?:default\s+)?(?:function|class|const)\b/,          // ES exports
      /\b(?:document|window|console)\.\w+/,                             // Browser globals
      /\buseState\s*\(/,                                                // React hooks
      /\buseEffect\s*\(/,
      /\bconst\s+\[.*,\s*set\w+\]\s*=\s*useState/,                    // Destructured useState
      /\bReact\.(?:Component|createElement|memo|forwardRef)\b/,         // React class
      /\b(?:=>)\s*(?:\{|[^{])/,                                        // Arrow functions
      /\basync\s+function\b/,                                           // async keyword (JS style)
      /\bfetch\s*\(/,                                                   // fetch API
      /\baxios\.\w+\s*\(/,                                             // axios
      /\.then\s*\(\s*(?:\w+|=>|\()/,                                   // Promise chaining
      /\bmodule\.exports\b/,                                            // CommonJS export
    ],
    weak: [
      /\bfunction\s+\w+\s*\(/,     // Could be many languages
      /===|!==|>>>/,                 // Strict equality (JS-specific)
      /`\$\{/,                       // Template literals
    ],
  },
  java: {
    strong: [
      /\bpackage\s+[\w.]+\s*;/,                                        // package declaration
      /\bimport\s+(?:java|javax|org\.springframework|jakarta)\./,       // Java imports
      /\b@(?:Service|Repository|Controller|Component|Autowired|Bean)\b/, // Spring annotations
      /\b@(?:Override|Transactional|RequestMapping|GetMapping|PostMapping)\b/,
      /\b(?:public|private|protected)\s+(?:static\s+)?(?:void|String|int|boolean|long|double)\s+\w+\s*\(/,
      /\bSystem\.out\.println\b/,                                       // Java print
      /\b(?:ArrayList|HashMap|LinkedList|TreeMap|HashSet)<\w+>/,        // Java collections
      /\bnew\s+(?:ArrayList|HashMap|LinkedList)<>/,                     // Diamond operator
      /\bEntityManager\.\w+\b/,                                        // JPA
      /\b(?:extends|implements)\s+\w+/,                                 // Inheritance
      /\bOptional<\w+>/,                                                // Java Optional
      /\b\.stream\(\)\./,                                               // Stream API
    ],
    weak: [
      /\bfinal\s+\w+\s+\w+/,       // final keyword
      /\bthrows\s+\w+/,             // throws clause
    ],
  },
  csharp: {
    strong: [
      /\bnamespace\s+[\w.]+/,                                           // namespace
      /\busing\s+(?:System|Microsoft|EntityFramework)\b/,               // C# using
      /\b\[Http(?:Get|Post|Put|Delete|Patch)\]/,                       // ASP.NET attributes
      /\b\[(?:ApiController|Route|Authorize|AllowAnonymous)]/,         // More attributes
      /\basync\s+Task<?\w*>?\s+\w+/,                                  // async Task pattern
      /\bDbContext\b/,                                                  // EF DbContext
      /\bDbSet<\w+>/,                                                  // EF DbSet
      /\bIServiceCollection\b/,                                         // DI
      /\bvar\s+\w+\s*=\s*await\b/,                                    // var + await (C# style)
      /\bILogger<\w+>/,                                                // ILogger
      /\b(?:string|int|bool|decimal|double)\s+\w+\s*\{.*get.*set/,    // Properties
      /\b=>.*;$/m,                                                      // Expression-bodied members
      /\bIActionResult|ActionResult<?\w*>?\b/,                         // ASP.NET return types
      /\bIMediator\b/,                                                  // MediatR
      /\bLINQ\b|\.Where\(.*=>\s*/,                                     // LINQ
    ],
    weak: [
      /\bpublic\s+class\s+\w+\s*:/,   // Inheritance with :
      /\bnew\s*\(\)/,                   // Target-typed new
    ],
  },
};

/**
 * detectLanguage(code)
 *
 * Scores code against pattern sets for each language.
 * Returns the language ID with highest confidence.
 *
 * @param {string} code — Source code to analyze
 * @returns {{ language: string, confidence: number, scores: object }}
 */
export function detectLanguage(code) {
  if (!code || !code.trim()) return { language: 'apex', confidence: 0, scores: {} };

  const scores = {};

  for (const [lang, patterns] of Object.entries(DETECTION_PATTERNS)) {
    let score = 0;
    for (const re of patterns.strong) {
      if (re.test(code)) score += 3;
    }
    for (const re of patterns.weak) {
      if (re.test(code)) score += 1;
    }
    scores[lang] = score;
  }

  // Find highest score
  let bestLang = 'apex';
  let bestScore = 0;
  for (const [lang, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestLang = lang;
    }
  }

  // Calculate confidence (0-1)
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? bestScore / totalScore : 0;

  return { language: bestLang, confidence, scores };
}


// ─── Unified Interface ───────────────────────────────────────────────────────

/**
 * parseToSteps(code, language?)
 *
 * Unified parser. If language is not provided, auto-detects.
 *
 * @param {string} code — Source code
 * @param {string} [language] — Language ID ('apex', 'javascript', 'java', 'csharp')
 * @returns {{ steps: Array, language: string, confidence: number }}
 */
export function parseToSteps(code, language) {
  if (!code || !code.trim()) return { steps: [], language: language || 'apex', confidence: 0 };

  let detectedLang = language;
  let confidence = 1;

  if (!detectedLang) {
    const detection = detectLanguage(code);
    detectedLang = detection.language;
    confidence = detection.confidence;
  }

  const lang = LANGUAGES[detectedLang];
  if (!lang) return { steps: [], language: detectedLang, confidence: 0 };

  const steps = lang.parse(code);
  return { steps, language: detectedLang, confidence };
}


/**
 * getStats(code, language?)
 *
 * Unified stats extractor.
 */
export function getStats(code, language) {
  if (!code || !code.trim()) return null;

  let detectedLang = language;
  if (!detectedLang) {
    detectedLang = detectLanguage(code).language;
  }

  const lang = LANGUAGES[detectedLang];
  if (!lang || !lang.stats) return null;

  return lang.stats(code);
}


/**
 * getSample(language)
 *
 * Returns the sample code for a given language.
 */
export function getSample(language = 'apex') {
  return LANGUAGES[language]?.sample || SAMPLE_APEX;
}
