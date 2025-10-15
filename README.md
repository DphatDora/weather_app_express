## Weather App (Express + EJS + Redis Cache)

### Features

- Endpoint `GET /weather?city=`: returns temperature (°C) and weather status
- **Input Validation**: City name 1-30 chars, letters + Vietnamese diacritics only
- **Security**: SQL Injection & XSS prevention, Rate limiting (100 req/min)
- City-based caching for 60 seconds (Redis)
- EJS frontend with fetch to display results and response time
- Fallback: if third-party API fails → return most recent cached data (if available) + warning
- Internal OpenWeather mock: `GET /mock/openweather/weather?q=City&delayMs=...&temp=...&status=...&fail=true|false`
- Autocomplete with Vietnam cities list (from CSV)
- **Error Handling**: Proper HTTP status codes (400, 429, 503)

### Requirements

- Node.js 18+
- Redis running at `redis://localhost:6379/0`. Install and run with Docker: `docker run -p 6379:6379 -d redis:7`

### Configuration

Create `.env` file:

```dotenv
PORT=3000
REDIS_URL=redis://localhost:6379/0
OPENWEATHER_PROVIDER=mock #real
OPENWEATHER_API_KEY=
OPENWEATHER_BASE_URL=https://api.openweathermap.org/data/2.5
MOCK_OPENWEATHER_BASE_PATH=/mock/openweather
MOCK_DEFAULT_DELAY_MS=0
```

- To use internal mock for integration tests: `OPENWEATHER_PROVIDER=mock`. The `/weather` route will call `/mock/openweather/...`.

### Installation & Run

```bash
npm install
npm run dev
```

### Testing

```bash
npm test
```

### API Response Messages

#### Success Response (200)

```json
{
  "city": "Ha Noi",
  "temperature": 30,
  "status": "clear sky",
  "responseTimeMs": 21,
  "providerDurationMs": 20,
  "cache": {
    "hit": false,
    "key": "weather:Ha Noi"
  }
}
```

**Fields:**

- `city`: City name
- `temperature`: Temperature in Celsius
- `status`: Weather status description
- `responseTimeMs`: Server processing time in milliseconds
- `providerDurationMs`: Time taken by weather provider (optional, only when cache miss)
- `cache.hit`: `true` if data from cache, `false` if fetched from provider
- `cache.key`: Redis cache key used

#### Success with Warning (200 with fallback)

```json
{
  "city": "Da Nang",
  "temperature": 28,
  "status": "cloudy",
  "responseTimeMs": 15,
  "cache": {
    "hit": true,
    "key": "weather:Da Nang"
  },
  "warning": "Using cached data due to upstream error"
}
```

**Additional field:**

- `warning`: Indicates data is from cache because upstream provider failed

#### Error Responses

**400 Bad Request** - Missing city parameter:

```json
{
  "message": "City is required"
}
```

**500 Internal Server Error** - No cached data and upstream failed:

```json
{
  "message": "Weather service unavailable"
}
```

**404 Not Found** - Invalid endpoint:

```json
{
  "message": "Not Found"
}
```

### Client Display

The frontend displays:

- **City**: Name of the city
- **Temperature**: Temperature in °C
- **Status**: Weather description
- **Response Time**: Total response time measured by client (in ms)
- **Cache Hit**: Yes/No indicating if data came from cache
- **Warning**: (if present) Alert about using cached data due to upstream error

### NFR Notes

- Performance target: P95 < 200ms on cache hit; < 800ms on cache miss (depends on upstream latency). Mock allows configuring `delayMs` for simulation.
- Availability: When upstream fails, returns most recent cached data if available and adds `warning` field in JSON response.
