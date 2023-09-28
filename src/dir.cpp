#include "dir.h"

void ServeDir(AsyncWebServerRequest *request, bool deleteEnabled, bool showHidden)
{
    String html = "<h2>Files on LittleFS:</h2><ul>";

    Dir dir = LittleFS.openDir("/");
    while (dir.next())
    {
        String fileName = dir.fileName();
        if (!fileName.startsWith(".") || showHidden)
        {
            File file = LittleFS.open(fileName, "r");
            html += "<li><a href=\"" + fileName + "\">" + fileName + " (";
            if (file)
            {
                size_t fileSize = file.size();
                file.close();
                html += fileSize;
            }
            else
            {
                html += " - ";
            }
            html += ")</a>";
            if (deleteEnabled)
            {
                html += "<a href=\"/delete?fileName=/";
                html += fileName;
                html += "\"><img src=\"bin.png\" \\>";
            }
            html += " </li>";
        }
    }
    html += "</ul>";
    
    FSInfo64 info;
    
    if (LittleFS.info64(info)){
        int usedPercent = info.usedBytes * 100 / info.totalBytes;
        html += "Usage FS: " + String(usedPercent) + "% of " + String(info.totalBytes) + " Bytes.";
    }


    html += "<h2>Upload a new file:</h2>";
    html += "<form action=\"/upload\" method=\"post\" enctype=\"multipart/form-data\">";
    html += "<input type=\"file\" name=\"file\"><br>";
    html += "<input type=\"submit\" value=\"Upload\">";
    html += "</form>";

    request->send(200, "text/html", html);
}
