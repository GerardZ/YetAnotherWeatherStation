
var points = new Array();
var pressArray = new Array();
var mArray = new Array();

class ESPLineGraph {

    xSize;
    xMin;
    xMax;
    ySize;
    yRast = 50;
    yRastOffset = 0;
    xOff = 30;  // space left of graph
    yOff = 20;  // space under graph
    parentName;
    svg;
    lines = {};
    xRasterChildren = new Array;
    yRasterChildren = new Array;

    // blue /Philips:
    BGColor = "rgb(16,110,204)";
    RasterColor = "rgb(5,80,173)";
    StrokeColor = "rgb(39,230,254)";
    textColor = "#FFF"
        ;
    constructor(parentName, xMin = 0, xMax = 86400, xSize = 800, ySize = 400, colorScheme = "") {
        this.parentName = parentName;
        this.xSize = xSize;
        this.ySize = ySize;
        this.xMax = xMax;
        this.xMin = xMin;

        this.SetColorScheme(colorScheme);

        this.svg = this.GetSvg();

        this.svg.appendChild(this.GetDownloadArrow());

        this.svg.appendChild(this.GetRect(this.xOff, 10, this.xSize, this.ySize, this.BGColor));

        // x-raster
        for (var x = 0; x <= this.xSize; x += this.xRast) {
            //this.svg.appendChild(this.GetLine(x + this.xOff, x + this.xOff, 10, 10 + this.ySize, this.RasterColor));
        }

        // // x-scale
        // var offSet = this.ScaleX(86400-((Date.now()/1000)%86400),0,86400);

        // for (var x = 0; x <= this.xSize; x += this.xSize/24) {
        //     var shiftX = (offSet + x) % this.xSize;
        //     this.svg.appendChild(this.GetText(shiftX + this.xOff - 8, this.ySize + 25, `${(x * 24 / xSize).toFixed(0)}`));
        //     this.svg.appendChild(this.GetLine(shiftX + this.xOff, shiftX + this.xOff, 10, 10 + this.ySize, this.RasterColor));
        // }

        // y-raster
        for (var y = 10; y <= this.ySize; y += this.yRast) {
            //this.svg.appendChild(this.GetLine(this.xOff, this.xOff + this.xSize, y, y, this.RasterColor));
        }

        parent = document.getElementById(parentName);
        parent.appendChild(this.svg);
    }

    SetColorScheme(schemeName) {
        if (this.colorSchemes.hasOwnProperty(schemeName)) {
            this.BGColor = this.colorSchemes[schemeName].BGColor;
            this.RasterColor = this.colorSchemes[schemeName].RasterColor;
            this.StrokeColor = this.colorSchemes[schemeName].StrokeColor;
        }
    }

    SetYBar() {
        for (var x = this.xOff; x <= (this.xSize + this.xOff); x += this.xSize / 24) {
            this.svg.appendChild(this.GetText(x, this.ySize + 4, `${x * 24 / this.xSize}`));
        }
    }

    SetYRaster(plotLine, min, max, interval) {

        this.lines[plotLine].ymin = min;
        this.lines[plotLine].ymax = max;

        for (var element of this.yRasterChildren) { // 1st remove previous
            this.svg.removeChild(element);
        };
        this.yRasterChildren.length = 0;

        for (var y = min; y <= max; y += interval) {
            var realY = this.ScaleY(y, min, max);
            var line = this.GetLine(this.xOff, this.xOff + this.xSize, realY, realY, this.RasterColor);
            this.svg.appendChild(line);
            var txt = this.GetText(5, realY + 3, y)
            this.svg.appendChild(txt);

            this.yRasterChildren.push(line);
            this.yRasterChildren.push(txt);
        }
    }

    SetXRaster(number, offset = 0) {
        // set xlines and x legenda

        for (var element of this.xRasterChildren) { // 1st remove previous
            this.svg.removeChild(element);
        };
        this.xRasterChildren.length = 0;

        for (var x = this.xMin; x < this.xMax; x += (this.xMax - this.xMin) / number) {
            var realX = this.ScaleX(((offset + x + this.xMax) % this.xMax), this.xMin, this.xMax); // x on graph
            //console.log(realX);

            var txt = this.GetText(realX - 10, this.ySize + 25, `${(x * number / this.xMax).toFixed(0)}`)

            this.svg.appendChild(txt);

            var line = this.GetLine(realX, realX, 10, 10 + this.ySize, this.RasterColor);

            this.svg.appendChild(line);

            this.xRasterChildren.push(txt);
            this.xRasterChildren.push(line);

        }
    }

    AddPlot(name, xMin, xMax, yMin, yMax, color = this.StrokeColor) {
        this.lines[name] = {
            pl: this.GetPolyLine(color, name),
            xmin: xMin,
            xmax: xMax,
            ymin: yMin,
            ymax: yMax,
        }
        //this.lines[name].pl.setAttribute("points")
        this.svg.appendChild(this.lines[name].pl);
    }

    SetPlot(name, dataSeries) {
        points = dataSeries
            .filter(entry => !isNaN(entry.xValue) && !isNaN(entry.yValue)) // a NaN somewhere will ruin your plot
            .map(entry => `${this.ScaleX(entry.xValue, this.lines[name].xmin, this.lines[name].xmax).toFixed(1)},${this.ScaleY(entry.yValue, this.lines[name].ymin, this.lines[name].ymax).toFixed(1)}`).join(' ');
        this.lines[name].pl.setAttribute("points", points);
    }

    ScaleX(value, min, max) {
        var xValue = (value - min) * this.xSize / (max - min);
        return (xValue + this.xOff);
    }

    ScaleY(value, min, max) {
        var yValue = (value - min) * this.ySize / (max - min);
        if (yValue == NaN){
            console.error("Error with value: " + value + "which produces a NaN !" + max + " " + min)
        }
        return (this.ySize - yValue + 10);
    }

    GetSvg() {
        var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", this.xSize + this.xOff + 10);
        svg.setAttribute("height", this.ySize + this.yOff + 10);
        svg.setAttribute("viewBox", `0 0 ${this.xSize + this.xOff + 10} ${this.ySize + this.yOff + 10}`);
        return svg;
    }

    GetText(x, y, text) {
        const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textElement.setAttribute('x', x);
        textElement.setAttribute('y', y);
        textElement.setAttribute('font-family', '"Segoe UI",Arial,sans-serif');
        textElement.setAttribute('font-weight', 200);
        textElement.setAttribute('font-size', 10);
        textElement.setAttribute('fill', this.textColor);



        textElement.textContent = text;


        return textElement;
    }

    GetRect(x, y, width, height, color) {
        var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("fill", color);
        rect.setAttribute("x", x);
        rect.setAttribute("y", y);
        rect.setAttribute("width", width);
        rect.setAttribute("height", height);
        return rect;
    }

    GetLine(x1, x2, y1, y2, color, strokeWidth = 1) {
        var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("stroke", color);
        line.setAttribute("x1", x1);
        line.setAttribute("x2", x2);
        line.setAttribute("y1", y1);
        line.setAttribute("y2", y2);
        line.setAttribute("stroke-width", `${strokeWidth}`);
        return line;
    }

    GetPolyLine(color, name) {
        var PolyLine = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        PolyLine.setAttribute("fill", "none");
        PolyLine.setAttribute("stroke", color);
        PolyLine.setAttribute("stroke-width", "2");
        PolyLine.setAttribute("id", name);

        return PolyLine;
    }

    colorSchemes = {
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

    GetDownloadArrow(x, y) {
        var PolyLine = document.createElementNS("http://www.w3.org/2000/svg", "polyline");

        PolyLine.setAttribute("fill", this.textColor);
        PolyLine.setAttribute("stroke", this.textColor);
        PolyLine.setAttribute("stroke-width", "1");
        PolyLine.setAttribute("id", "download");
        PolyLine.setAttribute("points", "711,0 715,0 715,3 717,3 713,6 709,3 711,3 711,0");
        PolyLine.addEventListener('click', () => this.DownloadSvgAsPng(this.parentName));

        return PolyLine;
    }

    DownloadSvgAsPng(name, scale=2) {
        var svgString = new XMLSerializer().serializeToString(this.svg);

        var canvas = document.createElement("canvas");
        var svgSize = this.svg.getBoundingClientRect();
        canvas.width = svgSize.width * scale;
        canvas.height = svgSize.height * scale;
        var ctx = canvas.getContext("2d");
        ctx.scale(scale,scale);

        var img = new Image();
        img.setAttribute("src", "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgString))));

        img.onload = function () {
            ctx.drawImage(img, 0, 0);
            var imgsrc = canvas.toDataURL("image/png");
            var a = document.createElement("a");
            a.download = `${name}_graph.png`;
            a.href = imgsrc;
            a.click();
        };
    }
}
