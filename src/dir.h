#include <Arduino.h>
#include <ESPAsyncWebServer.h>
#include "LittleFS.h"


void ServeDir(AsyncWebServerRequest *request, bool deleteEnabled = false, bool showHidden = false);