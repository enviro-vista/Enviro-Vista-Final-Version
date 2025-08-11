# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/4f03156d-1725-4650-a7de-041c61967082

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/4f03156d-1725-4650-a7de-041c61967082) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/4f03156d-1725-4650-a7de-041c61967082) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

---

## ESP32 Integration (MVP)

Use these steps to send measurements securely to your app.

1) Register your device in the web app to receive a Device JWT.

2) Configure your ESP32 to POST JSON to your ingest endpoint:

- Endpoint URL: https://ihuzpqoevnpwesqagsbv.functions.supabase.co/ingest
- HTTP Method: POST
- Headers:
  - Content-Type: application/json
  - Authorization: Bearer YOUR_DEVICE_JWT_FROM_WEB_APP
- Body format:
```json
{
  "device_id": "DEVICE123",
  "temperature": 25.4,
  "humidity": 60.2,
  "pressure": 1013.1
}
```

3) Example Arduino HTTP code:

```cpp
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

Notes:
- Dew point is computed server-side: dew_point = temperature - ((100 - humidity) / 5)
- The Device JWT is long-lived (10 years) and scoped to your device_id.
- Never share your SUPABASE_SERVICE_ROLE_KEY. Only store it as a Supabase secret.
