# Enviro-Vista Alpha

Real-time environmental monitoring dashboard with ESP32 ingestion via Supabase Edge Functions.

## 1) ESP32 Data Submission Format & Endpoint

- Endpoint (Edge Function): https://ihuzpqoevnpwesqagsbv.functions.supabase.co/ingest
- Method: POST
- Headers:
  - Content-Type: application/json
  - Authorization: Bearer YOUR_DEVICE_JWT_FROM_WEB_APP
- JSON Body:
```
{
  "device_id": "DEVICE123",
  "temperature": 25.4,
  "humidity": 60.2,
  "pressure": 1013.1
}
```
- Server-side dew point: dew_point = temperature - ((100 - humidity) / 5)
- Notes:
  - JWT must be the device token issued on registration
  - Token payload: { "device_id": "DEVICE123", "owner_id": "<USER_UUID>" }
  - Expiration: 10 years (configurable)

### Arduino (ESP32) Example
```
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

const char* serverName = "https://ihuzpqoevnpwesqagsbv.functions.supabase.co/ingest"; // Supabase Edge Function
const char* DEVICE_JWT = "YOUR_DEVICE_JWT_FROM_WEB_APP";
const char* DEVICE_ID = "DEVICE123";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" Connected!");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    float temperature = 25.4;
    float humidity = 60.2;
    float pressure = 1013.1;

    String payload = "{";
    payload += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
    payload += "\"temperature\":" + String(temperature, 1) + ",";
    payload += "\"humidity\":" + String(humidity, 1) + ",";
    payload += "\"pressure\":" + String(pressure, 1);
    payload += "}";

    http.begin(serverName);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", "Bearer " + String(DEVICE_JWT));

    int httpResponseCode = http.POST(payload);
    Serial.print("HTTP Response code: ");
    Serial.println(httpResponseCode);
    http.end();
  } else {
    Serial.println("WiFi Disconnected");
  }

  delay(3600000); // every 1 hour
}
```

## 2) User & Device Management

### Sign up / Sign in
- Use the built-in Auth page to create an account and sign in.

### Register a Device (JWT issuance)
- Click “Add Device” in the dashboard.
- Enter a unique Device ID and a name.
- On success, a device-specific JWT is generated and shown in the dialog.
- Copy this token into your ESP32 firmware as DEVICE_JWT.

### Managing Devices
- Devices appear in the grid view with their latest readings and online/offline status.
- Online = device sent a reading within the last 2 hours.

## 3) Deployment & Maintenance

### Deploy the Web App
- In Lovable, click Share → Publish to deploy the React app.

### Edge Functions and Secrets
- Edge Functions used: register-device (issues JWT), ingest (stores readings).
- Configure Supabase secrets (never hardcode values):
  - SUPABASE_URL
  - SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY
- The service role key is only used in Edge Functions and is never exposed to the frontend or devices.

### Monitoring & Logs
- Use Supabase “Logs” for Edge Functions to monitor incoming requests and errors.
- Use Dashboard tables to verify device inserts and readings.

### Rotation & Revocation
- To rotate a device token, re-register the device to issue a new JWT, then update the firmware.

### Rate & Reliability
- ESP32 can post hourly (configurable). Supabase Edge Functions handle bursts; implement client retries on your device if needed.

## 4) Security Notes
- Authorization header must be “Bearer <DEVICE_JWT>”.
- The device_id in the JWT must match the JSON body’s device_id.
- Keep your SUPABASE_SERVICE_ROLE_KEY secret in Supabase secrets; never store it in the frontend or firmware.
