#include <Arduino.h>


struct Status{
    int32_t currentMeasurementDay = -1;   // current day of measurements
    uint8_t numWsClients;
    char lastEnvMessage[200];
};

struct WifiSettings{
    char ssid[32]; // = "_THOES_\0";
    char password[64]; // = "blablabla\0";
};

struct Settings{
    char Hostname[20] = "EasyEspWeb\0";
    
    char TimeZoneString[64] = "CET-1CEST,M3.5.0/02,M10.5.0/03\0";  // https://github.com/nayarsystems/posix_tz_db/blob/master/zones.csv
    char NtpServer[64] = "nl.pool.ntp.org\0";

    ulong StoreMeasurementInterval = 300;
    int LogRetentionDays = 32;

    bool DeleteEnabled = false;         // you can delete files from LittleFS in /dir
    bool UploadEnabled = false;         // you can upload files to LittleFS in /dir
    bool ShowHiddenFiles = true;
};

struct MultiMeasurement{
    ulong timestamp;
    float temp;
    float press;
    float hum;
    uint16_t numMeasurements;
};

struct Measurement{
    ulong timestamp;
    float temp;
    float press;
    float hum;
    uint16_t numMeasurements;
};


// measurement for storage
// we got 1MB storage
//
struct ShortMeasurement{
    int16_t temp;   // temp * 256, so range +/- 128
    uint16_t press; // pressure/256-850 -> 850 - 1106hPa
    uint8_t hum;    // humidity*2 -> 0 - 128
};

struct MultilShortMeasurement{
    int16_t temp;   // temp * 256, so range +/- 128
    uint16_t press; // pressure/256-850 -> 850 - 1106hPa
    uint8_t hum;    // humidity*2 -> 0 - 128
};




// size 64byte

struct DateTime{
    int second;
    int minute;
    int hour;
    ulong epochdays;

};
