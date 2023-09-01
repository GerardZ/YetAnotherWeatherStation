
var gateway = `ws://${window.location.hostname}/ws`;
var websocket;
var host;
var logBuffer;
var chart;


EspHost = '192.168.0.98' // we need this for debugging websockets, it makes sure we connect to the ESP32

window.onload = function () {
    Init();
}

function Init() {
    InitWs();

    //GetLogData();
    //SetLasthour();
    //GetAndSetLastHour();
    //fetchBinaryData();
    //InitChart();
}

function InitWs() {
    host = location.host;
    //REMOVE This will be removed by CompressHTML.py and is for debugging purposes
    EspHost = '192.168.0.98' // we need this for debugging websockets, it makes sure we connect to the ESP32
    if (location.host.startsWith('127.0.0')) { host = EspHost; }
    console.log("Host is: " + host);
    //ENDREMOVE

    if (isHttps()) {  // when served through proxy via https, we also need to connect websockets secure:
        socket = new WebSocket('wss://' + host + '/ws');
    }
    else {
        socket = new WebSocket('ws://' + host + '/ws');
    }

    socket.onopen = onOpen;
    socket.onclose = onClose;
    socket.onmessage = onMessage; // <-- add this line
}

function isHttps() {
    return (document.location.protocol == 'https:');
}

function onOpen(event) {
    console.log('Connection opened');
}
function onClose(event) {
    console.log('Connection closed');
    setTimeout(InitWs, 2000);
}
function onMessage(event) {
    var state;

    if (event.data.startsWith("{")) ParseJson(event.data);

    if (event.data == "1") {
        state = "OFF";
    }
    else {
        state = "ON";
    }
    //document.getElementById('state').innerHTML = state;
}
function onLoad(event) {
    initWebSocket();
    initButton();
}
function initButton() {
    document.getElementById('button').addEventListener('click', toggle);
}
function toggle() {
    socket.send('toggle');
}

function clickButton(id) {
    socket.send(id);
    console.debug("send: " + id);
}

function ParseJson(jsonString) {

    console.debug(jsonString);

    jsonObject = JSON.parse(jsonString);

    //console.debug(jsonObject);

    if (jsonObject) {
        for (const [key, value] of Object.entries(jsonObject)) {
            //console.debug("try to set key: " + key);
            el = document.getElementById(key);
            if (el) {
                document.getElementById(key).value = value;
                document.getElementById(key).innerHTML = value;
            }
            else {
                if (key == "env") {
                    handleEnv(value);
                }
                else if (key == "time") {
                    document.getElementById("tijd").innerHTML = value["string"];
                    //console.debug("Set time: " + value["string"]);
                }
                else {
                    console.debug("Id for key: " + key + " was not found !");
                }
            }
        }
    }
}


function handleEnv(jsonObj) {
    document.getElementById("temperature").innerHTML = jsonObj.temp.toFixed(1);
    document.getElementById("pressure").innerHTML = jsonObj.press.toFixed(1);

    add2Graph(jsonObj);
}

function GetEpoch() {
    return Math.floor(Date.now() / 1000);
}

function getByteIndex(epoch) {
    return (epoch % 86400) / 8;
}
function getBitIndex(epoch) {
    return bitIndex = previousEpoch % 8;
}

function GetLogData2() {
    const xhr = new XMLHttpRequest();
    url = "http://" + host + '/data';
    console.debug(url);
    xhr.open('GET', url, false); // Set async option to false
    //xhr.responseType = 'arraybuffer';

    try {
        xhr.send();
        if (xhr.status === 200) {
            const binaryData = xhr.response;
            console.log("we got data !");
            console.log(binaryData); // ArrayBuffer containing the binary data
        } else {
            console.error('Error fetching binary data:', xhr.status);
        }
    } catch (error) {
        console.error('Error fetching binary data:', error);
    }

}



function GetLogData_old() {
    url = "http://" + host + '/data';
    fetch(url)
        .then(response => response.arrayBuffer())
        .then(buffer => {
            logBuffer = new Uint8Array(buffer);
            // Now you have the binary data as a Uint8Array
            console.log(logBuffer);
            SetLasthour(logBuffer);
        })
        .catch(error => {
            console.error('Error fetching binary data:', error);
        });

    SetLasthour();

}

function GetLogData() {
    url = "http://" + host + '/data';

    fetch(url)
        .then(response => response.arrayBuffer())
        .then(buffer => {
            logBuffer = new Uint8Array(buffer);
            // Now you have the binary data as a Uint8Array
            //console.log(logBuffer);
            this.SetLasthour(logBuffer); // Pass the fetched buffer to SetLasthour
        })
        .catch(error => {
            console.error('Error fetching binary data:', error);
        });
}

function func(url) {
    return fetch(url)  // return this promise
        .then(response => response.arrayBuffer())
        .then(data => (data))
}

async function synchronousFetch(url) {
    const response = await fetch(url);
    if (response.ok) {
        const data = await response.arrayBuffer();
        return data;
    } else {
        throw new Error('Request failed: ' + response.statusText);
    }
}

function GetAndSetLastHour() {
    data = synchronousFetch("http://" + host + '/data');
    SetLasthour(data)

}

function getLastHour() {
    epoch = GetEpoch();
    index = getBitIndex(epoch) - (3600 / 8);

}

function pointsToString(dataPoints) {
    return dataPoints.map(point => `${point.x},${point.y}`).join(' ');
}

function fetchBinaryData() {
    const apiUrl = "http://" + host + '/data'; // Replace with your API endpoint
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            return response.arrayBuffer(); // Get the response body as a Blob
        })
        .then(blob => {
            SetLasthour(new Uint8Array(blob))
        })
        .catch(error => {
            console.error('Error fetching binary data:', error);
        });
}

function SetLasthour(myBuffer) {
    graph = document.getElementById("plotActivity");
    epochNow = GetEpoch();

    console.debug("we start at: " + epochNow);

    points = [];
    points.push({ x: 10, y: 20 }) // start

    byteIndexNow = getByteIndex(epochNow);

    x = 50;

    hourPoints = 3600 / 8     // 3600 seconds / 8 bits (1 bit per second)

    for (let i = 0; i < hourPoints; i++) {
        byte = myBuffer[byteIndexNow - hourPoints + i];

        console.debug(byte);

        for (b = 0; b < 8; b++) {
            //points.push({ x: x+b, y: 100 });
            x = i;



            if (isBitSet(byte, b)) {
                points.push({ x: x, y: 20 });   // from previous point
                points.push({ x: x, y: 5 });    // line up
                points.push({ x: x, y: 20 });   // to zero (y==20)
                console.debug("byte high !");
            }
            else {
                // we only point activity
            }

        }
        x++;
    }

    graph.setAttribute('points', pointsToString(points));
    console.debug(pointsToString(points));

}

function isBitSet(byte, bitPosition) {
    // Create a bitmask with the desired bit set to 1
    const bitmask = 1 << bitPosition;

    // Use bitwise AND to test if the bit is set
    return (byte & bitmask) !== 0;
}
