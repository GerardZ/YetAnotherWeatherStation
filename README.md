# ESP8266-first

todo:

- check day datafile when creating, delete if exist before starting new measurements
- gliding y-scale
- cleanup c++

This project is not finished and is for experiments.  
It has some interesting features (I think):

Asycwebserver with websockets

A compress utility that will converge index.html with local .css and .js files, compress the resulting html and create a PROGMEM byte-array in the apphtml.h in the include folder.  
Compression will result in an approx 70-80% reduction of file size, the PROGMEM data then can be send to the webclient with "Content-Encoding", "gzip".  
server.on("/", HTTP_GET, \[\](AsyncWebServerRequest \*request) // send gzipped index (gzip))  
{  
AsyncWebServerResponse \*response = request->beginResponse_P(200, "text/html", index_html_gz, sizeof(index_html_gz));  
response->addHeader("Content-Encoding", "gzip");  
request->send(response); });  
Apart from less memory consumption, this will lead to faster load times, but also to easier editing since you can test the html through live-server in Studio Code without converting to c++  
specific format. It outperforms LittleFS/SPIFFS and for most tasks is easier to use. On top of that, your SPIFFS or LittleFS on the ESP will remain intact, handy when you are logging data there.  
The script will be started at pre-compile time so that the html files will be included in every compile. To do so in your platformio.ini configure:  
extra_scripts =  
pre:CompressHtml.py  
For demonstration: File index.html is joined with: Chart.js, app.js, w3.css, app.css.  
resulting in: 470342, size out: 114979, ratio: 24.4%.

This means this can easily be served by even an ESP8266, think of the possibilities !
