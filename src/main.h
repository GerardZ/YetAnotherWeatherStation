#include <Arduino.h>

struct Status{
    int32_t currentMeasurementDay = -1;   // current day of measurements
    uint8_t numWsClients;
    char lastEnvMessage[200];

    bool ConnectToWifi = true;
};

struct WifiSettings{
    char ssid[32]; // = "_THOES_\0";
    char password[64]; // = "blablabla\0";
};

struct Settings{
    char Hostname[20] = "EasyEspWeb\0";
    
    char TimeZoneString[64] = "CET-1CEST,M3.5.0/02,M10.5.0/03\0";  // https://github.com/nayarsystems/posix_tz_db/blob/master/zones.csv
    char NtpServer[64] = "nl.pool.ntp.org\0";

    ulong StoreMeasurementInterval = 300;       // 300 seconds => 5 minutes
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

struct Measurement{     // 20 bytes...
    ulong timestamp;
    float temp;
    float press;
    float hum;
    uint16_t numMeasurements;
};

struct NewMeasurement{  // 8 bytes...
    u_int16_t minute;   // minute of the day/measurement
    int16_t temp;       // temp *100
    uint16_t pressure;  // pressure * 16
    uint8_t hum;        // humidity * 2
};

// gain is 2x, we could do 3x, enlarging littleFS to 3MB also 3x, result 32 *2 *3 *3

// 20 bytes, every 5 minutes -> 24 * 12 * 20 bytes = 5760bytes
// @ 1MB => 170 days
// shrinking struct 2x -> 340 days
// enlarging FS 3x -> 1020 days
//
// Or: 32GB SD => 5.9 M days...

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
