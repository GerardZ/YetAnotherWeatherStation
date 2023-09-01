// Import required libraries
#include <Arduino.h>
#include "LittleFS.h"

#include <ESP8266WiFi.h>
#include <ESPAsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>

#include <time.h> // time() ctime()

#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>

#define BMP_SCK 13
#define BMP_MISO 12
#define BMP_MOSI 11
#define BMP_CS 10

#define SEALEVELPRESSURE_HPA (1013.25)

#define RADAR 14 // Gpio14 -> D5

/* Configuration of NTP */
#define MY_NTP_SERVER "at.pool.ntp.org"
#define MY_TZ "CET-1CEST,M3.5.0/02,M10.5.0/03"

#include "main.h"

// this contains HTML data and other binary sources, generated with CompressHtml:
#include <appdata.h>

/* NTP Globals */
time_t now;   // this is the epoch
struct tm tm; // the structure tm holds time information in a more convenient way

// Replace with your network credentials
const char *ssid = "_THOES_";
const char *password = "0598613193";

StaticJsonDocument<1000> jsonDoc;

Status status;

// Create AsyncWebServer object on port 80
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

uint8_t recordBuffer[10800]; // 1 bit per second, 8x10080 gives 86400 (= 1 day)

// ntp...
const char *ntpServer = "pool.ntp.org";
// WiFiUDP udp;
// NTPClient timeClient(udp, ntpServer);

Adafruit_BME280 bme; // I2C

Settings settings;

void Report();
void handleUpload(AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final);

void i2cScan()
{
  byte error, address;
  int nDevices;
  Serial.println("Scanning..."); /*ESP32 starts scanning available I2C devices*/
  nDevices = 0;
  for (address = 1; address < 127; address++) // for loop to check number of devices on 127 address
  {
    Wire.beginTransmission(address);
    error = Wire.endTransmission();
    if (error == 0)
    {
      Serial.printf("I2C device found at address: 0x%02X (%d)\n", address, address);
      nDevices++;
    }
    else if (error == 4)
    {
      Serial.printf("nknown error at address: 0x%02X (%d)\n", address, address);
    }
  }
  if (nDevices == 0)
    Serial.println("No I2C devices found !");
  Serial.println("done\n");
}

void showTime()
{
  time(&now);             // read the current time
  localtime_r(&now, &tm); // update the structure tm with the current time
  Serial.print("year:");
  Serial.print(tm.tm_year + 1900); // years since 1900
  Serial.print("\tmonth:");
  Serial.print(tm.tm_mon + 1); // January = 0 (!)
  Serial.print("\tday:");
  Serial.print(tm.tm_mday); // day of month
  Serial.print("\thour:");
  Serial.print(tm.tm_hour); // hours since midnight  0-23
  Serial.print("\tmin:");
  Serial.print(tm.tm_min); // minutes after the hour  0-59
  Serial.print("\tsec:");
  Serial.print(tm.tm_sec); // seconds after the minute  0-61*
  Serial.print("\twday");
  Serial.print(tm.tm_wday); // days since Sunday 0-6
  if (tm.tm_isdst == 1)     // Daylight Saving Time flag
    Serial.print("\tDST");
  else
    Serial.print("\tstandard");
  Serial.println();
}

void InitBME()
{
  // Wire.begin();

  unsigned status = bme.begin(0x76);
  // You can also pass in a Wire library object like &Wire2
  // status = bme.begin(0x76, &Wire2)
  if (!status)
  {
    Serial.println("Could not find a valid BMP280 sensor, check wiring, address, sensor ID!");
    Serial.print("SensorID was: 0x");
    Serial.println(bme.sensorID(), 16);
    Serial.print("        ID of 0xFF probably means a bad address, a BMP 180 or BMP 085\n");
    Serial.print("   ID of 0x56-0x58 represents a BMP 280,\n");
    Serial.print("        ID of 0x60 represents a BME 280.\n");
    Serial.print("        ID of 0x61 represents a BME 680.\n");
    while (1)
      delay(10);
  }
}

MultiMeasurement MMeasurement;

void CreateMeasurementJsonString(char *buffer, long long epoch, float temp, float press, float hum, bool stored)
{
  sprintf(buffer, "{\"env\":{\"epoch\":%llu,\"temp\":%f, \"press\":%f,\"hum\":%f,\"stored\":%s}}", epoch, temp, press, hum, stored ? "true" : "false");
}

void ReadBME(time_t epoch)
{
  float temp = bme.readTemperature();
  float press = bme.readPressure() / 100.0F;
  float hum = bme.readHumidity();

  Serial.printf("Temp %fC, Pressure: %fhPa, Humidity: %f%%\n", temp, press, hum);

  CreateMeasurementJsonString(status.lastEnvMessage, epoch, temp, press, hum, false);
  ws.textAll(status.lastEnvMessage);

  MMeasurement.temp += temp;
  MMeasurement.press += press;
  MMeasurement.hum += hum;
  MMeasurement.numMeasurements++;
}

void StoreBME(ulong epoch)
{
  int day = (epoch / 86400) % settings.LogRetentionDays; // retention days rollover

  char filename[20];
  sprintf(filename, "day%02d.dat", day);

  if (status.currentMeasurementDay == -1) // after startup...
  {
    status.currentMeasurementDay = day;
  }

  if (status.currentMeasurementDay != day) // we switched a day..., so if current file already exists, it needs to be deleted first
  {
    status.currentMeasurementDay = day;

    if (LittleFS.exists(filename))
    {
      if (LittleFS.remove(filename))
      {
        Serial.printf("DataFile %s deleted !\n", filename);
      }
    }
  }

  Serial.printf("Storing measurements in file: %s.\n", filename);

  File file = LittleFS.open(filename, LittleFS.exists(filename) ? "a" : "w");

  Measurement measurement;
  measurement.temp = MMeasurement.temp / MMeasurement.numMeasurements;
  measurement.press = MMeasurement.press / MMeasurement.numMeasurements;
  measurement.hum = MMeasurement.hum / MMeasurement.numMeasurements;
  measurement.timestamp = epoch;
  // and null
  MMeasurement.numMeasurements = 0;
  MMeasurement.hum = 0;
  MMeasurement.temp = 0;
  MMeasurement.press = 0;

  // Save;
  file.write(reinterpret_cast<const char *>(&measurement), sizeof(measurement));
  file.close();

  CreateMeasurementJsonString(status.lastEnvMessage, epoch, measurement.temp, measurement.press, measurement.hum, true);
  ws.textAll(status.lastEnvMessage);
}

void notifyClients()
{
  // ws.textAll(String(ledState));
}

void handleWebSocketMessage(void *arg, uint8_t *data, size_t len)
{
  AwsFrameInfo *info = (AwsFrameInfo *)arg;
  if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT)
  {
    data[len] = 0;
    if (strcmp((char *)data, "toggle") == 0)
    {
      // do something
    }

    if (strcmp((char *)data, "i2cScan") == 0)
    {
      Serial.printf("Got i2cScan...\n");
      i2cScan();
    }
  }
}

void onEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type,
             void *arg, uint8_t *data, size_t len)
{
  switch (type)
  {
  case WS_EVT_CONNECT:
    // limit number of clients !!! @13 the esp crashes
    status.numWsClients++;
    Serial.printf("WebSocket client #%u connected from %s, we have %d total clients. FreeHeap: %dbytes\n", client->id(), client->remoteIP().toString().c_str(), status.numWsClients, ESP.getFreeHeap());
    client->text(status.lastEnvMessage);
    // notifyClients();
    // ReadBME();
    break;
  case WS_EVT_DISCONNECT:
    status.numWsClients--;
    Serial.printf("WebSocket client #%u disconnected, we have %d total clients.\n", client->id(), status.numWsClients);
    break;
  case WS_EVT_DATA:
    handleWebSocketMessage(arg, data, len);
    break;
  case WS_EVT_PONG:
  case WS_EVT_ERROR:
    break;
  }
}

void GetWsReport(AsyncWebSocketClient *client)
{
}

void initWebSocket()
{
  ws.onEvent(onEvent);
  server.addHandler(&ws);
}

void InitLittleFS()
{
  if (!LittleFS.begin())
  {
    Serial.println("An Error has occurred while mounting LittleFS");
    return;
  }

  FSInfo64 info;

  bool success = LittleFS.info64(info);
  if (success)
  {
    Serial.printf("LittleFs bytes used: %lld, avail: %lld, total: %lld.\n", info.usedBytes, info.totalBytes - info.usedBytes, info.totalBytes);
  }
  else
  {
    Serial.println("ERROR: LittleFs could not be initialized !!");
  }
}

void setup()
{
  Serial.begin(115200);

  InitLittleFS();

  String newHostname = "EasyEspWeb";

  // Connect to Wi-Fi
  WiFi.hostname(newHostname.c_str());
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(1000);
    Serial.println("Connecting to WiFi..");
  }

  configTime(MY_TZ, MY_NTP_SERVER); // --> Here is the IMPORTANT ONE LINER needed in your sketch!
                                    // printLocalTime();

  // Print ESP Local IP Address
  Serial.println(WiFi.localIP());

  initWebSocket();

  // CORS headers configuration
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Origin", "*");
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Headers", "Content-Type");

  // Route for root / web page
  // server.on("/", HTTP_GET, [](AsyncWebServerRequest *request){
  //  request->send_P(200, "text/html", index_html, processor);
  //});

  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) // send gzipped index (gzip))
            {
              AsyncWebServerResponse *response = request->beginResponse_P(200, "text/html", index_html_gz, sizeof(index_html_gz));
              response->addHeader("Content-Encoding", "gzip");
              request->send(response); });

  server.on("/favicon.ico", HTTP_GET, [](AsyncWebServerRequest *request)
            {
              AsyncWebServerResponse *response = request->beginResponse_P(200, "application/octet-stream", favicon_ico, sizeof(favicon_ico));
              request->send(response); });

  server.on("/readme.html", HTTP_GET, [](AsyncWebServerRequest *request) // send gzipped index (gzip))
            {
              AsyncWebServerResponse *response = request->beginResponse_P(200, "text/html", README_md_html_gz, sizeof(README_md_html_gz));
              response->addHeader("Content-Encoding", "gzip");
              request->send(response); });

  server.on("/leave3.png", HTTP_GET, [](AsyncWebServerRequest *request)
            {
              AsyncWebServerResponse *response = request->beginResponse_P(200, "image/png", leave3_png, sizeof(leave3_png));
              request->send(response); });

  server.on("/prototype.jpg", HTTP_GET, [](AsyncWebServerRequest *request)
            {
              AsyncWebServerResponse *response = request->beginResponse_P(200, "image/jpg", prototype_jpg, sizeof(prototype_jpg));
              request->send(response); });

  server.on("/upload.html", HTTP_GET, [](AsyncWebServerRequest *request)
            {
        String html = "<form action=\"/upload\" method=\"post\" enctype=\"multipart/form-data\">";
        html += "<input type=\"file\" name=\"file\"><br>";
        html += "<input type=\"submit\" value=\"Upload\">";
        html += "</form>";
        request->send(200, "text/html", html); });

  server.on(
      "/upload", HTTP_POST, [](AsyncWebServerRequest *request)
      { request->send(200, "text/plain", "File uploaded"); },
      handleUpload);

  server.on("/delete", HTTP_GET, [](AsyncWebServerRequest *request)
            {
              String fileName;

              if (!settings.DeleteEnabled){
                request->send(403, "text/plain", "ERROR: delete is not enabled !"); // 
                return;
              }

              if (request->hasParam("fileName"))
              {
                fileName = request->getParam("fileName")->value();
                // Now you can use param1Value in your logic.

                if (LittleFS.remove(fileName))
                {
                  request->send(200, "text/plain", "SUCCESS: File: " + fileName + " was deleted !"); // Respond to the client
                }
                else
                {
                  request->send(404, "text/plain", "ERROR: File: " + fileName + " was not found !"); // Respond to the client
                }
              }
              else
              {
                request->send(404, "text/plain", "ERROR: no fileName was given !"); // Respond to the client
              } });

  server.on("/dir", HTTP_GET, [](AsyncWebServerRequest *request)
            {
    String html = "<h2>Files on LittleFS:</h2><ul>";

    Dir dir = LittleFS.openDir("/");
    while (dir.next()) {
        String fileName = dir.fileName();
        File file = LittleFS.open(fileName, "r");
        html += "<li><a href=\"" + fileName + "\">" + fileName + " (";
        if (file) {
          size_t fileSize = file.size();
          file.close();
          html += fileSize;
        }
        else{
          html += " - ";
        }
        html += ")</a>";
        if (settings.DeleteEnabled){
        html += "<a href=\"/delete?fileName=/";
        html += fileName;
        html += "\"><img src=\"bin.png\" \\>";
        }
        html += " </li>";
    }
    html += "</ul>";

    html += "<h2>Upload a new file:</h2>";
    html += "<form action=\"/upload\" method=\"post\" enctype=\"multipart/form-data\">";
    html += "<input type=\"file\" name=\"file\"><br>";
    html += "<input type=\"submit\" value=\"Upload\">";
    html += "</form>";
    
    request->send(200, "text/html", html); });

  server.on("/status", HTTP_GET, [](AsyncWebServerRequest *request)
            {
    
    char buffer[200];
    int bufferPtr;
    sprintf(buffer, "We have %u free heap, Flash size is: %u\n", ESP.getFreeHeap(), ESP.getFlashChipRealSize());
    FSInfo64 info;
    bool success = LittleFS.info64(info);
    if (success){
      bufferPtr = strlen(buffer);
      sprintf(buffer + bufferPtr, "LittleFs bytes used: %lld, avail: %lld, total: %lld.\n", info.usedBytes, info.totalBytes - info.usedBytes, info.totalBytes);
}
    //Serial.printf("LittleFs bytes used: %lld, avail: %lld, total: %lld.\n", info.usedBytes, info.totalBytes - info.usedBytes, info.totalBytes);
    request->send(200, "text/plain", buffer); });

  // Handler for serving files from LittleFS
  server.onNotFound([](AsyncWebServerRequest *request)
                    {
        String filePath = request->url();
        if (LittleFS.exists(filePath)) {
            AsyncWebServerResponse *response = request->beginResponse(LittleFS, filePath);
            // set contenType here
            request->send(response);
        } else {
            //request->send(404, "text/plain", "File not found");
            AsyncWebServerResponse *response = request->beginResponse_P(404, "text/html", page404_html_gz, sizeof(page404_html_gz));
            response->addHeader("Content-Encoding", "gzip");
            request->send(response);
        } });

  // Start server
  server.begin();

  InitBME();

  pinMode(RADAR, INPUT);

  // timeClient.begin();
  // timeClient.setTimeOffset(7200);
  // timeClient.update();

  Report();
}

void handleUpload(AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final)
{
  static File fsUploadFile;

  if (!index)
  { // If index == 0, this is the start of the upload
    String filepath = "/" + filename;
    fsUploadFile = LittleFS.open(filepath, "w");
  }

  for (size_t i = 0; i < len; i++)
  {
    fsUploadFile.write(data[i]);
  }

  if (final)
  { // If final is true, this is the last chunk of data
    fsUploadFile.close();
  }
}

void Report()
{
  const uint16_t size = sizeof(MultiMeasurement);
  Serial.printf("Size of MultiMeasurement: %dbytes.\n", size);
}

void sendWsTime()
{
  char message[200];

  sprintf(message, "{\"time\":{\"string\":\"%02d:%02d:%02d\", \"sec\":%d,\"min\":%d,\"hour\":%d}}", tm.tm_hour, tm.tm_min, tm.tm_sec, tm.tm_sec, tm.tm_min, tm.tm_hour);
  Serial.println(message);
  ws.textAll(message);
}

time_t before;

bool NewSecond()
{
  time(&now); // read the current time
  if (now == before)
  {
    return false;
  }

  before = now;
  localtime_r(&now, &tm); // update the structure tm with the current time

  return true;
}

void loop()
{
  ws.cleanupClients();

  if (NewSecond())
  {
    // this is a new second...

    if (now % 10 == 0)
    {
      ReadBME(now);
    }

    if (now % settings.StoreMeasurementInterval == 0) // every [settings.settings.StoreMeasurementInterval] seconds.
    {
      StoreBME(now);
    }
    sendWsTime();
  };
}