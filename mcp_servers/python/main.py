
import sys
import json
import logging

# Configure basic logging
logging.basicConfig(filename='mcp_server.log', level=logging.DEBUG, 
                    format='%(asctime)s - %(levelname)s - %(message)s')

# --- Tool Definitions ---
def add(a: int, b: int) -> int:
    """
    Calculates the sum of two integers.
    
    :param a: The first integer.
    :param b: The second integer.
    :return: The sum of a and b.
    """
    return a + b

# --- MCP Tool Schema and Handlers ---
TOOLS = {
    "add": {
        "handler": add,
        "schema": {
            "name": "add",
            "description": "Calculates the sum of two numbers.",
            "parameters": {
                "type": "object",
                "properties": {
                    "a": {"type": "number", "description": "The first number."},
                    "b": {"type": "number", "description": "The second number."}
                },
                "required": ["a", "b"]
            }
        }
    }
}

# --- Core MCP Server Logic ---
def send_response(response):
    """Sends a JSON response to stdout."""
    response_str = json.dumps(response)
    logging.debug(f"Sending response: {response_str}")
    print(response_str, flush=True)

def main_loop():
    """Main loop to read requests from stdin and process them."""
    logging.info("MCP server started. Waiting for requests.")
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        
        logging.debug(f"Received request: {line}")
        
        try:
            request = json.loads(line)
            request_id = request.get("id", "unknown")

            if request.get("method") == "discover":
                tool_schemas = [tool["schema"] for tool in TOOLS.values()]
                send_response({
                    "id": request_id,
                    "result": {"tools": tool_schemas}
                })

            elif request.get("method") == "execute":
                tool_name = request["params"]["name"]
                tool_args = request["params"]["args"]
                
                if tool_name in TOOLS:
                    handler = TOOLS[tool_name]["handler"]
                    try:
                        result = handler(**tool_args)
                        send_response({
                            "id": request_id,
                            "result": {"content": str(result)}
                        })
                    except Exception as e:
                        logging.error(f"Error executing tool '{tool_name}': {e}")
                        send_response({
                            "id": request_id,
                            "error": {"message": f"Tool execution failed: {e}"}
                        })
                else:
                    logging.warning(f"Tool '{tool_name}' not found.")
                    send_response({
                        "id": request_id,
                        "error": {"message": f"Tool '{tool_name}' not found."}
                    })
            else:
                logging.error(f"Unknown method: {request.get('method')}")
                send_response({
                    "id": request_id,
                    "error": {"message": "Unknown method"}
                })

        except json.JSONDecodeError:
            logging.error("Failed to decode JSON from request.")
            send_response({"error": {"message": "Invalid JSON request"}})
        except Exception as e:
            logging.error(f"An unexpected error occurred: {e}")
            send_response({"error": {"message": f"An unexpected server error occurred: {e}"}})

if __name__ == "__main__":
    main_loop()
