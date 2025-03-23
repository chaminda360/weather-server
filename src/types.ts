// Interface representing the response from the OpenWeather API
export interface OpenWeatherResponse {
    main: {
      temp: number; // Temperature in Kelvin
      humidity: number; // Humidity percentage
    };
    weather: Array<{
      description: string; // Weather condition description
    }>;
    wind: {
      speed: number; // Wind speed in meter/sec
    };
    dt_txt?: string; // Optional date and time of the forecast
}

// Interface representing the weather data used in the application
export interface WeatherData {
    temperature: number; // Temperature in Celsius
    conditions: string; // Weather condition description
    humidity: number; // Humidity percentage
    wind_speed: number; // Wind speed in meter/sec
    timestamp: string; // Date and time of the weather data
}

// Interface representing a single day's forecast
export interface ForecastDay {
    date: string; // Date of the forecast
    temperature: number; // Temperature in Celsius
    conditions: string; // Weather condition description
}

// Interface representing the arguments for getting a weather forecast
export interface GetForecastArgs {
    city: string; // Name of the city
    days?: number; // Optional number of days for the forecast
}

// Type guard function to validate forecast arguments
export function isValidForecastArgs(args: any): args is GetForecastArgs {
    return (
      typeof args === "object" &&
      args !== null &&
      "city" in args &&
      typeof args.city === "string" &&
      (args.days === undefined || typeof args.days === "number")
    );
}