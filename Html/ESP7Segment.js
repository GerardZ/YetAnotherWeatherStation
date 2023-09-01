class ESP7Segment {

    scale = 100;

    clockDotOffset = 0;

    backGround = "#EEEEEE";
    segOn = "black";
    segOff = "#DDDDDD";

    suppressLeadingZero = true;

    svg;
    segments = {};

    dpOffset;

    constructor(parentName, type = 4, scalePercent = 100) {

        var numdigits = type;

        this.scale = scalePercent;

        var width = numdigits * 100 * this.scale / 100 + this.clockDotOffset;
        var vbWidth = numdigits * 100 + this.clockDotOffset;
        var height = 130 * this.scale / 100;

        this.scale = scalePercent;

        this.SetColorScheme("grey");

        this.svg = this.GetSvg(width, vbWidth, height);
        //this.svg = this.GetSvg(numdigits, scale);

        for (var digit = 0; digit < numdigits; digit++) {

            var dpOffset = (numdigits - digit - 1) * 130 + 2;

            this.segments[digit] = {}

            var group = this.GetGroup(dpOffset);

            for (const segment of this.segmentIds) {
                this.segments[digit][segment] = this.GetSegment(segment, digit);
                group.appendChild(this.segments[digit][segment]);
            }
            this.segments[digit]["dot"] = this.GetDot(digit);
            group.appendChild(this.segments[digit]["dot"]);

            this.svg.appendChild(group);
        }

        parent = document.getElementById(parentName);
        parent.appendChild(this.svg);

        this.setDigit(0, 1);
        this.setDigit(1, 2, true);
        this.setDigit(2, 3);
    }

    SetValue(value) {

        var valueString = `${value}`.replace(',', '.');
        var length = valueString.length;
        let pattern = /.|,/;
        var comma = false;
        if (pattern.test(valueString)) {
            //console.log("we have a . or ,");
            length--;
        }

        if (length > this.numdigits) {
            console.log("Warning, inputstring larger than display !");
        }

        var digitIndex = 0;
        for (var index = length; index >= 0; index--) {
            var digitValue = valueString[index];
            if (digitValue == "-") digitValue = "Minus";
            //console.log(digitValue);
            if (digitValue == ".") comma = true;
            else {
                this.setDigit(digitIndex++, digitValue, comma);
                comma = false;
            }
        }
    }

    GetDot(digit) {
        var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", 110);
        circle.setAttribute("cy", 170);
        circle.setAttribute("r", 10);
        circle.setAttribute("fill", this.segOff);
        circle.setAttribute("id", `seg_${digit}_dot`);
        return circle;
    }

    GetSegment(segment, digit) {
        var polyGon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        polyGon.setAttribute("points", this.polyPointSegments[segment]);
        polyGon.setAttribute("id", `seg_${digit}_${segment}`);
        polyGon.setAttribute("fill", this.segOff);
        return polyGon;
    }

    GetGroup(digitOffset) {
        var group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.setAttribute("transform", `translate(${digitOffset}, 0) skewX(-5)`);
        group.setAttribute("style", `fill-rule:evenodd; stroke:${this.backGround}; stroke-width:3.3; stroke-opacity:1; stroke-linecap:butt; stroke-linejoin:miter;`);
        return group;
    }

    GetSvg(width, vbWidth, height) {
        var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", width + "px");
        svg.setAttribute("height", height) + "px";
        svg.setAttribute("viewBox", `0 0 ${(vbWidth + 18)} 180`);
        svg.setAttribute("style", `border: 4px solid ${this.backGround}; background-color:${this.backGround}`)
        return svg;
    }

    setDigit(digit, value, dot = false) {
        var segmentsState = this.number2Segments[value];

        for (var i = 0; i < 7; i++) {
            var segId = String.fromCharCode(97 + i);
            this.segments[digit][segId].setAttribute("fill", ((segmentsState >> i) % 2) ? this.segOn : this.segOff);
        }

        this.segments[digit]["dot"].setAttribute("fill", dot ? this.segOn : this.segOff);
    }

    polyPointSegments1 = {
        a: "1, 1  2, 0  8, 0   9, 1  8, 2  2, 2",
        b: "9, 1 10, 2 10, 8   9, 9  8, 8  8, 2",
        c: "9, 9 10,10 10,16   9,17  8,16  8,10",
        d: "9,17  8,18  2,18   1,17  2,16  8,16",
        e: "1,17  0,16  0,10   1, 9  2,10  2,16",
        f: "1, 9  0, 8  0, 2   1, 1  2, 2  2, 8",
        g: "1, 9  2, 8  8, 8   9, 9  8,10  2,10"
    }

    polyPointSegments = {
        a: "10, 10  20, 0  80, 0   90, 10  80, 20  20, 20",
        b: "90, 10 100, 20 100, 80   90, 90  80, 80  80, 20",
        c: "90, 90 100,100 100,160   90,170  80,160  80,100",
        d: "90,170  80,180  20,180   10,170  20,160  80,160",
        e: "10,170  0,160  0,100   10, 90  20,100  20,160",
        f: "10, 90  0, 80  0, 20   10, 10  20, 20  20, 80",
        g: "10, 90  20, 80 80, 80   90, 90  80,100  20,100"
    }

    segmentIds = ["a", "b", "c", "d", "e", "f", "g"];

    number2Segments = {     // Segments representation for number/symbol
        0: 0b00111111, // 0
        1: 0b00000110, // 1
        2: 0b01011011, // 2
        3: 0b01001111, // 3
        4: 0b01100110, // 4
        5: 0b01101101, // 5
        6: 0b01111101, // 6
        7: 0b00000111, // 7
        8: 0b01111111, // 8
        9: 0b01101111, // 9
        A: 0b01110111, // A
        B: 0b01111100, // B
        C: 0b00111001, // C
        D: 0b01011110, // D
        E: 0b01111001, // E
        F: 0b01110001, // F
        Off: 0,          //   allOff 16
        Minus: 0b01000000,
    }

    SetColorScheme(name) {
        this.backGround = this.ColorScheme[name].BGColor;
        this.segOn = this.ColorScheme[name].StrokeColor;
        this.segOff = this.ColorScheme[name].RasterColor;

    }

    ColorScheme = {
        blue: {           // blue /Philips:
            BGColor: "rgb(16,110,204)",
            RasterColor: "rgb(5,80,173)",
            StrokeColor: "rgb(39,230,254)"
        },
        green: {           // green /Philips:
            BGColor: "rgb(47,60,40)",
            RasterColor: "rgb(43,33,21)",
            StrokeColor: "rgb(74,253,133)"
        },
        grey: {           // green /Philips:
            BGColor: "#616161",
            RasterColor: "#776161",
            StrokeColor: "#FF6161"
        }
    }
}
