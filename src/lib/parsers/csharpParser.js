/**
 * C#/.NET Code Parser
 * Converts C# code (ASP.NET Core, Entity Framework, HttpClient, SignalR, etc.)
 * into a standardized Step[] array for visualization and analysis
 */

// ============================================================================
// REGEX PATTERNS FOR C# DETECTION
// ============================================================================

const PATTERNS = {
  // Class/Interface declarations
  classDeclaration: /^\s*(public\s+)?(sealed\s+)?(abstract\s+)?class\s+(\w+)/m,
  interfaceDeclaration: /^\s*(public\s+)?interface\s+I(\w+)/m,

  // Entity Framework operations
  efSaveChanges: /\.SaveChanges(?:Async)?\s*\(\s*\)/g,
  efAdd: /DbSet<[\w<>,\s]*>\s*\.Add\s*\(/g,
  efAddAsync: /\.AddAsync\s*\(/g,
  efUpdate: /\.Update\s*\(/g,
  efUpdateRange: /\.UpdateRange\s*\(/g,
  efRemove: /\.Remove\s*\(/g,
  efRemoveRange: /\.RemoveRange\s*\(/g,
  efFind: /\.Find(?:Async)?\s*\(/g,
  efDbSet: /DbSet<[\w<>,\s]*>\s*\./g,
  efInclude: /\.Include\s*\(/g,
  efSelect: /\.Select\s*\(/g,

  // LINQ operations (database-related)
  linqWhere: /\.Where\s*\(/g,
  linqFirstOrDefault: /\.FirstOrDefault(?:Async)?\s*\(/g,
  linqSingleOrDefault: /\.SingleOrDefault(?:Async)?\s*\(/g,
  linqToList: /\.ToList(?:Async)?\s*\(\s*\)/g,
  linqToArray: /\.ToArray\s*\(\s*\)/g,
  linqAny: /\.Any\s*\(/g,
  linqCount: /\.Count\s*\(/g,
  linqJoin: /\.Join\s*\(/g,
  linqGroupBy: /\.GroupBy\s*\(/g,
  linqOrderBy: /\.OrderBy(?:Descending)?\s*\(/g,
  linqDistinct: /\.Distinct\s*\(/g,
  linqSkipTake: /\.(?:Skip|Take)\s*\(/g,

  // HttpClient operations
  httpGetAsync: /\.GetAsync\s*\(/g,
  httpPostAsync: /\.PostAsync\s*\(/g,
  httpPutAsync: /\.PutAsync\s*\(/g,
  httpDeleteAsync: /\.DeleteAsync\s*\(/g,
  httpSendAsync: /\.SendAsync\s*\(/g,
  httpPatchAsync: /\.PatchAsync\s*\(/g,

  // ASP.NET Controller attributes & responses
  httpGetAttribute: /\[\s*HttpGet\s*\]/g,
  httpPostAttribute: /\[\s*HttpPost\s*\]/g,
  httpPutAttribute: /\[\s*HttpPut\s*\]/g,
  httpDeleteAttribute: /\[\s*HttpDelete\s*\]/g,
  returnOk: /return\s+Ok\s*\(/g,
  returnCreated: /return\s+Created\s*\(/g,
  returnBadRequest: /return\s+BadRequest\s*\(/g,
  returnNotFound: /return\s+NotFound\s*\(/g,
  returnUnauthorized: /return\s+Unauthorized\s*\(/g,

  // SignalR operations
  signalRSendAsync: /Clients\s*\.\s*All\s*\.\s*SendAsync\s*\(/g,
  signalRHubConnection: /hubConnection\s*\.\s*(?:SendAsync|InvokeAsync)\s*\(/g,

  // Message Queue / Mediator patterns
  mediatorSend: /mediator\s*\.\s*Send\s*\(/gi,
  messageBusPublish: /messageBus\s*\.\s*Publish\s*\(/gi,
  messageBusSubscribe: /messageBus\s*\.\s*Subscribe\s*\(/gi,

  // File I/O operations
  fileReadAllText: /File\s*\.\s*ReadAllText\s*\(/g,
  fileReadAllLines: /File\s*\.\s*ReadAllLines\s*\(/g,
  fileWriteAllText: /File\s*\.\s*WriteAllText\s*\(/g,
  fileAppendAllText: /File\s*\.\s*AppendAllText\s*\(/g,
  streamWriter: /new\s+StreamWriter\s*\(/g,
  streamReader: /new\s+StreamReader\s*\(/g,

  // Async/await patterns
  awaitKeyword: /await\s+/g,
  taskOfT: /Task<[\w<>,\s]+>/g,
  taskOfVoid: /Task\s*\(/g,

  // Intent comments
  intentComment: /\/\/\s*@intent\s+(.+?)$/gm,

  // Exception handling
  throwNew: /throw\s+new\s+(\w+Exception)\s*\(/g,
  tryCatch: /try\s*\{/g,
  catchBlock: /catch\s*\(/g,

  // Constructor and DI
  constructorPattern: /public\s+(\w+)\s*\([^)]*\)\s*\{/g,
  propertyInjection: /public\s+I(\w+)\s+(\w+)\s*\{[\s\S]*?get;\s*set;\s*\}/g,

  // Logging
  logger: /(?:ILogger|_logger)\s*\./g,
  logInformation: /\.LogInformation\s*\(/g,
  logError: /\.LogError\s*\(/g,
  logWarning: /\.LogWarning\s*\(/g,
  logDebug: /\.LogDebug\s*\(/g,

  // Method declaration
  methodDeclaration: /(?:public|private|protected)\s+(?:async\s+)?(?:virtual\s+)?(?:\w+<[\w<>,\s]*>|\w+)\s+(\w+)\s*\(/g,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Count all occurrences of a pattern in code
 */
function countPattern(code, pattern) {
  const matches = code.match(pattern);
  return matches ? matches.length : 0;
}

/**
 * Extract identifier name from a line (for method/class names)
 */
function extractIdentifier(line) {
  const match = line.match(/(?:class|interface|async\s+)?(?:\w+\s+)+?(\w+)\s*[\(\{]/);
  return match ? match[1] : 'unknown';
}

/**
 * Determine step type based on code content
 */
function determineStepType(line) {
  if (PATTERNS.classDeclaration.test(line) || PATTERNS.interfaceDeclaration.test(line)) {
    return 'class';
  }
  if (
    PATTERNS.efSaveChanges.test(line) ||
    PATTERNS.efAdd.test(line) ||
    PATTERNS.efUpdate.test(line) ||
    PATTERNS.efRemove.test(line) ||
    PATTERNS.fileReadAllText.test(line) ||
    PATTERNS.fileWriteAllText.test(line) ||
    PATTERNS.streamWriter.test(line)
  ) {
    return 'dml';
  }
  if (
    PATTERNS.linqWhere.test(line) ||
    PATTERNS.linqFirstOrDefault.test(line) ||
    PATTERNS.linqToList.test(line) ||
    PATTERNS.linqAny.test(line) ||
    PATTERNS.linqCount.test(line)
  ) {
    return 'dml';
  }
  if (
    PATTERNS.httpGetAsync.test(line) ||
    PATTERNS.httpPostAsync.test(line) ||
    PATTERNS.httpPutAsync.test(line) ||
    PATTERNS.httpDeleteAsync.test(line) ||
    PATTERNS.httpSendAsync.test(line)
  ) {
    return 'call';
  }
  if (
    PATTERNS.signalRSendAsync.test(line) ||
    PATTERNS.signalRHubConnection.test(line) ||
    PATTERNS.mediatorSend.test(line) ||
    PATTERNS.messageBusPublish.test(line)
  ) {
    return 'event';
  }
  if (PATTERNS.httpGetAttribute.test(line) || PATTERNS.httpPostAttribute.test(line)) {
    return 'class';
  }
  return 'fallback';
}

/**
 * Map step type to shape and style
 */
function getShapeAndStyle(type) {
  const mapping = {
    class: { shape: 'subrect', style: 'classNode' },
    dml: { shape: 'stadium', style: 'dmlNode' },
    intent: { shape: 'stadium', style: 'intentNode' },
    event: { shape: 'hexagon', style: 'eventNode' },
    call: { shape: 'rounded', style: 'callNode' },
    fallback: { shape: 'rect', style: 'fallbackNode' },
    end: { shape: 'circle', style: 'endNode' },
  };
  return mapping[type] || mapping.fallback;
}

/**
 * Create a unique step ID
 */
function createStepId(index, label) {
  return `csharp_${index}_${label.toLowerCase().replace(/\s+/g, '_').substring(0, 20)}`;
}

// ============================================================================
// MAIN PARSER FUNCTION
// ============================================================================

/**
 * Parse C# code into Step[] array
 * @param {string} csharpCode - C# source code
 * @returns {Step[]} Array of steps for visualization
 */
export function parseCSharpToSteps(csharpCode) {
  const steps = [];
  const lines = csharpCode.split('\n');
  let stepIndex = 0;

  // Extract intent comments
  const intentMatches = [...csharpCode.matchAll(PATTERNS.intentComment)];
  const intentMap = new Map(intentMatches.map(m => [m.index, m[1]]));

  // Extract class name
  const classMatch = csharpCode.match(PATTERNS.classDeclaration);
  const className = classMatch ? classMatch[4] : 'CSharpClass';

  // Add initial class node
  if (classMatch) {
    steps.push({
      id: createStepId(stepIndex, className),
      label: className,
      type: 'class',
      shape: 'subrect',
      style: 'classNode',
      source: classMatch[0],
      editable: false,
      hidden: false,
    });
    stepIndex++;
  }

  // Process each line for operations
  let currentPos = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('*')) {
      continue;
    }

    // Check for intent comment on this line
    const intentIndex = intentMap.get(currentPos);
    if (intentIndex) {
      const intentId = createStepId(stepIndex, 'intent');
      steps.push({
        id: intentId,
        label: intentIndex,
        type: 'intent',
        shape: 'stadium',
        style: 'intentNode',
        source: `// @intent ${intentIndex}`,
        editable: true,
        hidden: false,
      });
      stepIndex++;
    }

    // Detect Entity Framework operations
    if (PATTERNS.efSaveChanges.test(trimmedLine)) {
      steps.push({
        id: createStepId(stepIndex, 'SaveChanges'),
        label: 'Save Changes to DB',
        type: 'dml',
        shape: 'stadium',
        style: 'dmlNode',
        source: trimmedLine,
        editable: false,
        hidden: false,
      });
      stepIndex++;
    }

    if (PATTERNS.efAdd.test(trimmedLine) || PATTERNS.efAddAsync.test(trimmedLine)) {
      steps.push({
        id: createStepId(stepIndex, 'Add'),
        label: 'Add Entity to DbSet',
        type: 'dml',
        shape: 'stadium',
        style: 'dmlNode',
        source: trimmedLine,
        editable: false,
        hidden: false,
      });
      stepIndex++;
    }

    if (PATTERNS.efUpdate.test(trimmedLine) || PATTERNS.efUpdateRange.test(trimmedLine)) {
      steps.push({
        id: createStepId(stepIndex, 'Update'),
        label: 'Update Entity',
        type: 'dml',
        shape: 'stadium',
        style: 'dmlNode',
        source: trimmedLine,
        editable: false,
        hidden: false,
      });
      stepIndex++;
    }

    if (PATTERNS.efRemove.test(trimmedLine) || PATTERNS.efRemoveRange.test(trimmedLine)) {
      steps.push({
        id: createStepId(stepIndex, 'Remove'),
        label: 'Remove Entity',
        type: 'dml',
        shape: 'stadium',
        style: 'dmlNode',
        source: trimmedLine,
        editable: false,
        hidden: false,
      });
      stepIndex++;
    }

    if (PATTERNS.efFind.test(trimmedLine)) {
      steps.push({
        id: createStepId(stepIndex, 'Find'),
        label: 'Find Entity by Key',
        type: 'dml',
        shape: 'stadium',
        style: 'dmlNode',
        source: trimmedLine,
        editable: false,
        hidden: false,
      });
      stepIndex++;
    }

    // Detect LINQ queries
    if (PATTERNS.linqWhere.test(trimmedLine)) {
      steps.push({
        id: createStepId(stepIndex, 'Where'),
        label: 'Filter with Where',
        type: 'dml',
        shape: 'stadium',
        style: 'dmlNode',
        source: trimmedLine,
        editable: false,
        hidden: false,
      });
      stepIndex++;
    }

    if (PATTERNS.linqFirstOrDefault.test(trimmedLine)) {
      steps.push({
        id: createStepId(stepIndex, 'FirstOrDefault'),
        label: 'Get First or Default',
        type: 'dml',
        shape: 'stadium',
        style: 'dmlNode',
        source: trimmedLine,
        editable: false,
        hidden: false,
      });
      stepIndex++;
    }

    if (PATTERNS.linqToList.test(trimmedLine) || PATTERNS.linqToArray.test(trimmedLine)) {
      steps.push({
        id: createStepId(stepIndex, 'ToList'),
        label: 'Convert to List',
        type: 'dml',
        shape: 'stadium',
        style: 'dmlNode',
        source: trimmedLine,
        editable: false,
        hidden: false,
      });
      stepIndex++;
    }

    if (PATTERNS.linqAny.test(trimmedLine)) {
      steps.push({
        id: createStepId(stepIndex, 'Any'),
        label: 'Check Any Match',
        type: 'dml',
        shape: 'stadium',
        style: 'dmlNode',
        source: trimmedLine,
        editable: false,
        hidden: false,
      });
      stepIndex++;
    }

    if (PATTERNS.linqCount.test(trimmedLine)) {
      steps.push({
        id: createStepId(stepIndex, 'Count'),
        label: 'Count Results',
        type: 'dml',
        shape: 'stadium',
        style: 'dmlNode',
        source: trimmedLine,
        editable: false,
        hidden: false,
      });
      stepIndex++;
    }

    // Detect HttpClient operations
    if (PATTERNS.httpGetAsync.test(trimmedLine)) {
      steps.push({
        id: createStepId(stepIndex, 'GetAsync'),
        label: 'HTTP GET Request',
        type: 'call',
        shape: 'rounded',
        style: 'callNode',
        source: trimmedLine,
        editable: false,
        hidden: false,
      });
      stepIndex++;
    }

    if (PATTERNS.httpPostAsync.test(trimmedLine)) {
      steps.push({
        id: createStepId(stepIndex, 'PostAsync'),
        label: 'HTTP POST Request',
        type: 'call',
        shape: 'rounded',
        style: 'callNode',
        source: trimmedLine,
        editable: false,
        hidden: false,
      });
      stepIndex++;
    }

    if (PATTERNS.httpPutAsync.test(trimmedLine)) {
      steps.push({
        id: createStepId(stepIndex, 'PutAsync'),
        label: 'HTTP PUT Request',
        type: 'call',
        shape: 'rounded',
        style: 'callNode',
        source: trimmedLine,
        editable: false,
        hidden: false,
      });
      stepIndex++;
    }

    if (PATTERNS.httpDeleteAsync.test(trimmedLine)) {
      steps.push({
        id: createStepId(stepIndex, 'DeleteAsync'),
        label: 'HTTP DELETE Request',
        type: 'call',
        shape: 'rounded',
        style: 'callNode',
        source: trimmedLine,
        editable: false,
        hidden: false,
      });
      stepIndex++;
    }

    if (PATTERNS.httpSendAsync.test(trimmedLine)) {
      steps.push({
        id: createStepId(stepIndex, 'SendAsync'),
        label: 'HTTP Send Request',
        type: 'call',
        shape: 'rounded',
        style: 'callNode',
        source: trimmedLine,
        editable: false,
        hidden: false,
      });
      stepIndex++;
    }

    // Detect SignalR operations
    if (PATTERNS.signalRSendAsync.test(trimmedLine)) {
      steps.push({
        id: createStepId(stepIndex, 'SignalR'),
        label: 'SignalR Broadcast',
        type: 'event',
        shape: 'hexagon',
        style: 'eventNode',
        source: trimmedLine,
        editable: false,
        hidden: false,
      });
      stepIndex++;
    }

    // Detect Message Queue operations
    if (PATTERNS.mediatorSend.test(trimmedLine)) {
      steps.push({
        id: createStepId(stepIndex, 'MediatRSend'),
        label: 'Send Command (MediatR)',
        type: 'event',
        shape: 'hexagon',
        style: 'eventNode',
        source: trimmedLine,
        editable: false,
        hidden: false,
      });
      stepIndex++;
    }

    if (PATTERNS.messageBusPublish.test(trimmedLine)) {
      steps.push({
        id: createStepId(stepIndex, 'Publish'),
        label: 'Publish Event',
        type: 'event',
        shape: 'hexagon',
        style: 'eventNode',
        source: trimmedLine,
        editable: false,
        hidden: false,
      });
      stepIndex++;
    }

    // Detect File I/O operations
    if (
      PATTERNS.fileReadAllText.test(trimmedLine) ||
      PATTERNS.fileReadAllLines.test(trimmedLine) ||
      PATTERNS.streamReader.test(trimmedLine)
    ) {
      steps.push({
        id: createStepId(stepIndex, 'FileRead'),
        label: 'Read File',
        type: 'dml',
        shape: 'stadium',
        style: 'dmlNode',
        source: trimmedLine,
        editable: false,
        hidden: false,
      });
      stepIndex++;
    }

    if (
      PATTERNS.fileWriteAllText.test(trimmedLine) ||
      PATTERNS.fileAppendAllText.test(trimmedLine) ||
      PATTERNS.streamWriter.test(trimmedLine)
    ) {
      steps.push({
        id: createStepId(stepIndex, 'FileWrite'),
        label: 'Write File',
        type: 'dml',
        shape: 'stadium',
        style: 'dmlNode',
        source: trimmedLine,
        editable: false,
        hidden: false,
      });
      stepIndex++;
    }

    currentPos += line.length + 1; // +1 for newline
  }

  // Add end node
  steps.push({
    id: createStepId(stepIndex, 'end'),
    label: 'End',
    type: 'end',
    shape: 'circle',
    style: 'endNode',
    source: '',
    editable: false,
    hidden: false,
  });

  return steps;
}

// ============================================================================
// STATISTICS FUNCTION
// ============================================================================

/**
 * Get statistics about C# code
 * @param {string} csharpCode - C# source code
 * @returns {object} Statistics object
 */
export function getCSharpStats(csharpCode) {
  const lines = csharpCode.split('\n');
  const totalLines = lines.length;
  const codeLines = lines.filter(
    l => l.trim() && !l.trim().startsWith('//') && !l.trim().startsWith('*')
  ).length;

  const classMatch = csharpCode.match(PATTERNS.classDeclaration);
  const className = classMatch ? classMatch[4] : 'Unknown';

  const methodMatches = csharpCode.match(PATTERNS.methodDeclaration);
  const methodCount = methodMatches ? methodMatches.length : 0;

  const efOpsCount =
    countPattern(csharpCode, PATTERNS.efSaveChanges) +
    countPattern(csharpCode, PATTERNS.efAdd) +
    countPattern(csharpCode, PATTERNS.efUpdate) +
    countPattern(csharpCode, PATTERNS.efRemove) +
    countPattern(csharpCode, PATTERNS.efFind);

  const httpCallCount =
    countPattern(csharpCode, PATTERNS.httpGetAsync) +
    countPattern(csharpCode, PATTERNS.httpPostAsync) +
    countPattern(csharpCode, PATTERNS.httpPutAsync) +
    countPattern(csharpCode, PATTERNS.httpDeleteAsync) +
    countPattern(csharpCode, PATTERNS.httpSendAsync);

  const linqCount =
    countPattern(csharpCode, PATTERNS.linqWhere) +
    countPattern(csharpCode, PATTERNS.linqFirstOrDefault) +
    countPattern(csharpCode, PATTERNS.linqToList) +
    countPattern(csharpCode, PATTERNS.linqAny) +
    countPattern(csharpCode, PATTERNS.linqCount);

  const eventCount =
    countPattern(csharpCode, PATTERNS.signalRSendAsync) +
    countPattern(csharpCode, PATTERNS.mediatorSend) +
    countPattern(csharpCode, PATTERNS.messageBusPublish);

  const asyncCount = countPattern(csharpCode, PATTERNS.awaitKeyword);

  // Simple cyclomatic complexity estimate
  const complexity =
    methodCount +
    countPattern(csharpCode, /if\s*\(/g) +
    countPattern(csharpCode, /for\s*\(/g) +
    countPattern(csharpCode, /foreach\s+/g) +
    countPattern(csharpCode, /while\s*\(/g) +
    countPattern(csharpCode, /catch\s*\(/g);

  return {
    className,
    totalLines,
    codeLines,
    methods: methodMatches ? methodMatches.map(m => m.match(/(\w+)\s*\(/)[1]) : [],
    methodCount,
    efOpsCount,
    httpCallCount,
    linqCount,
    eventCount,
    asyncCount,
    complexity,
  };
}

// ============================================================================
// SAMPLE C# CODE
// ============================================================================

export const SAMPLE_CSHARP = `using Microsoft.EntityFrameworkCore;
using System.Net.Http;
using MediatR;

namespace Sovereign.Services
{
  // @intent Handles product lifecycle management with EF Core and external API sync
  public class ProductService
  {
    private readonly ApplicationDbContext _context;
    private readonly HttpClient _httpClient;
    private readonly IMediator _mediator;

    public ProductService(
      ApplicationDbContext context,
      HttpClient httpClient,
      IMediator mediator)
    {
      _context = context;
      _httpClient = httpClient;
      _mediator = mediator;
    }

    // @intent Create a new product with validation and event publishing
    public async Task<int> CreateProduct(CreateProductCommand command)
    {
      var product = new Product
      {
        Name = command.Name,
        Price = command.Price,
        Description = command.Description
      };

      _context.Products.Add(product);
      await _context.SaveChangesAsync();

      await _mediator.Send(new ProductCreatedEvent { ProductId = product.Id });

      return product.Id;
    }

    // @intent Retrieve all products with filtering and pagination
    public async Task<List<Product>> GetProducts(string filter = null, int skip = 0, int take = 10)
    {
      var query = _context.Products.AsQueryable();

      if (!string.IsNullOrEmpty(filter))
      {
        query = query.Where(p => p.Name.Contains(filter));
      }

      var products = await query
        .Skip(skip)
        .Take(take)
        .ToListAsync();

      return products;
    }

    // @intent Sync product data with external API
    public async Task SyncWithExternalApi(int productId)
    {
      var product = await _context.Products.FindAsync(productId);

      if (product == null)
      {
        return;
      }

      var content = new StringContent(
        JsonConvert.SerializeObject(product),
        Encoding.UTF8,
        "application/json"
      );

      var response = await _httpClient.PostAsync(
        "https://api.external.com/products",
        content
      );

      if (response.IsSuccessStatusCode)
      {
        product.SyncedAt = DateTime.UtcNow;
        _context.Products.Update(product);
        await _context.SaveChangesAsync();
      }
    }

    // @intent Delete product and cascade cleanup
    public async Task DeleteProduct(int productId)
    {
      var product = await _context.Products.FindAsync(productId);

      if (product != null)
      {
        _context.Products.Remove(product);
        await _context.SaveChangesAsync();

        await _mediator.Send(new ProductDeletedEvent { ProductId = productId });
      }
    }
  }
}
`;

// ============================================================================
// ES6 exports defined inline above
