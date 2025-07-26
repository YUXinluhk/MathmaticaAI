
const readline = require('readline');

// --- Tool Definitions ---
function subtract(a, b) {
    return a - b;
}

// --- MCP Tool Schema and Handlers ---
const TOOLS = {
    "subtract": {
        handler: (args) => subtract(args.a, args.b),
        schema: {
            "name": "subtract",
            "description": "Calculates the difference between two numbers.",
            "parameters": {
                "type": "object",
                "properties": {
                    "a": { "type": "number", "description": "The first number." },
                    "b": { "type": "number", "description": "The second number." }
                },
                "required": ["a", "b"]
            }
        }
    }
};

// --- Core MCP Server Logic ---
function sendResponse(response) {
    const responseStr = JSON.stringify(response);
    // Use stderr for logging to avoid interfering with stdout communication
    console.error(`Sending response: ${responseStr}`); 
    process.stdout.write(responseStr + '\n');
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

console.error("Node.js MCP server started. Waiting for requests.");

rl.on('line', (line) => {
    console.error(`Received request: ${line}`);
    try {
        const request = JSON.parse(line);
        const { id, method, params } = request;

        if (method === 'discover') {
            const toolSchemas = Object.values(TOOLS).map(t => t.schema);
            sendResponse({ id, result: { tools: toolSchemas } });
        } else if (method === 'execute') {
            const { name, args } = params;
            if (TOOLS[name]) {
                const result = TOOLS[name].handler(args);
                sendResponse({ id, result: { content: result.toString() } });
            } else {
                sendResponse({ id, error: { message: `Tool '${name}' not found.` } });
            }
        } else {
            sendResponse({ id, error: { message: 'Unknown method' } });
        }
    } catch (e) {
        sendResponse({ error: { message: `An unexpected server error occurred: ${e.message}` } });
    }
});
