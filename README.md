# Weather Server MCP Server

Test weather server tool

This is a TypeScript-based MCP server that implements a weather information system. It demonstrates core MCP concepts by providing:

- Resources representing weather data with URIs and metadata
- Tools for fetching and updating weather information
- Prompts for generating weather summaries

## Features

### Resources
- List and access weather data via `weather://` URIs
- Each weather entry has a location, temperature, and metadata
- JSON mime type for structured data access

### Tools
- `fetch_weather` - Fetch current weather information
  - Takes location as a required parameter
  - Retrieves weather data from an external API

- `update_weather` - Update weather information
  - Takes location and new weather data as required parameters
  - Updates the weather data in server state

### Prompts
- `summarize_weather` - Generate a summary of the current weather data
  - Includes all weather entries as embedded resources
  - Returns structured prompt for LLM summarization

## Development

Install dependencies:
```bash
npm install
```

Build the server:
```bash
npm run build
```

For development with auto-rebuild:
```bash
npm run watch
```

## Installation

To use with Claude Desktop, add the server config:

On MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
On Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "weatherserver": {
      "command": "/path/to/weatherserver/build/index.js"
    }
  }
}
```

### Debugging

Since MCP servers communicate over stdio, debugging can be challenging. We recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector), which is available as a package script:

```bash
npm run inspector
```

The Inspector will provide a URL to access debugging tools in your browser.
