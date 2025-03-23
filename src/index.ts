#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import dotenv from "dotenv";
import {
  WeatherData,
  ForecastDay,
  OpenWeatherResponse,
  isValidForecastArgs,
} from "./types.js";

dotenv.config();

const API_KEY = process.env.OPENWEATHER_API_KEY;
if (!API_KEY) {
  throw new Error("OPENWEATHER_API_KEY environment variable is required");
}

const API_CONFIG = {
  BASE_URL: "http://api.openweathermap.org/data/2.5",
  DEFAULT_CITY: "San Francisco",
  ENDPOINTS: {
    CURRENT: "weather",
    FORECAST: "forecast",
  },
} as const;

// Main class for the weather server
class WeatherServer {
  private server: Server;
  private axiosInstance;

  constructor() {
    // Initialize the server with basic information and capabilities
    this.server = new Server(
      {
        name: "example-weather-server",
        version: "0.1.0",
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    // Configure axios with defaults for API requests
    this.axiosInstance = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      params: {
        appid: API_KEY,
        units: "metric",
      },
    });

    this.setupHandlers();
    this.setupErrorHandling();
  }

  // Setup error handling for the server
  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  // Setup request handlers for resources and tools
  private setupHandlers(): void {
    this.setupResourceHandlers();
    this.setupToolHandlers();
  }

  // Setup handlers for resource-related requests
  private setupResourceHandlers(): void {
    this.server.setRequestHandler(
      ListResourcesRequestSchema,
      async () => ({
        resources: [{
          uri: `weather://${API_CONFIG.DEFAULT_CITY}/current`,
          name: `Current weather in ${API_CONFIG.DEFAULT_CITY}`,
          mimeType: "application/json",
          description: "Real-time weather data including temperature, conditions, humidity, and wind speed"
        }]
      })
    );

    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        const city = API_CONFIG.DEFAULT_CITY;
        if (request.params.uri !== `weather://${city}/current`) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Unknown resource: ${request.params.uri}`
          );
        }

        try {
          const response = await this.axiosInstance.get<OpenWeatherResponse>(
            API_CONFIG.ENDPOINTS.CURRENT,
            {
              params: { q: city }
            }
          );

          const weatherData: WeatherData = {
            temperature: response.data.main.temp,
            conditions: response.data.weather[0].description,
            humidity: response.data.main.humidity,
            wind_speed: response.data.wind.speed,
            timestamp: new Date().toISOString()
          };

          return {
            contents: [{
              uri: request.params.uri,
              mimeType: "application/json",
              text: JSON.stringify(weatherData, null, 2)
            }]
          };
        } catch (error) {
          if (axios.isAxiosError(error)) {
            throw new McpError(
              ErrorCode.InternalError,
              `Weather API error: ${error.response?.data.message ?? error.message}`
            );
          }
          throw error;
        }
      }
    );
  }

  // Setup handlers for tool-related requests
  private setupToolHandlers(): void {
    this.server.setRequestHandler(
      ListToolsRequestSchema,
      async () => ({
        tools: [{
          name: "get_forecast",
          description: "Get weather forecast for a city",
          inputSchema: {
            type: "object",
            properties: {
              city: {
                type: "string",
                description: "City name"
              },
              days: {
                type: "number",
                description: "Number of days (1-5)",
                minimum: 1,
                maximum: 5
              }
            },
            required: ["city"]
          }
        }]
      })
    );

    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request) => {
        if (request.params.name !== "get_forecast") {
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
        }

        if (!isValidForecastArgs(request.params.arguments)) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "Invalid forecast arguments"
          );
        }

        const city = request.params.arguments.city;
        const days = Math.min(request.params.arguments.days || 3, 5);

        try {
          const response = await this.axiosInstance.get<{
            list: OpenWeatherResponse[]
          }>(API_CONFIG.ENDPOINTS.FORECAST, {
            params: {
              q: city,
              cnt: days * 8 // API returns 3-hour intervals
            }
          });

          const forecasts: ForecastDay[] = [];
          for (let i = 0; i < response.data.list.length; i += 8) {
            const dayData = response.data.list[i];
            forecasts.push({
              date: dayData.dt_txt?.split(' ')[0] ?? new Date().toISOString().split('T')[0],
              temperature: dayData.main.temp,
              conditions: dayData.weather[0].description
            });
          }

          return {
            content: [{
              type: "text",
              text: JSON.stringify(forecasts, null, 2)
            }]
          };
        } catch (error) {
          if (axios.isAxiosError(error)) {
            return {
              content: [{
                type: "text",
                text: `Weather API error: ${error.response?.data.message ?? error.message}`
              }],
              isError: true,
            }
          }
          throw error;
        }
      }
    );
  }

  // Run the server with stdio transport
  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // Although this is just an informative message, we must log to stderr,
    // to avoid interfering with MCP communication that happens on stdout
    console.error("Weather MCP server running on stdio");
  }
}

// Instantiate and run the weather server
const server = new WeatherServer();
server.run().catch(console.error);