/**
 * Created by vlad on 11.05.2016.
 */
var MongoClient = require('mongodb').MongoClient;
var request = require('request');



function toRad(Value) {
    /** Converts numeric degrees to radians */
    return Value * Math.PI / 180;
}

function calculateDistanceBetweenPoints(p1, p2) {
    var R = 6371000; // metres
    var φ1 = toRad(p1.lat);
    var φ2 = toRad(p2.lat);
    var Δφ = toRad(p2.lat-p1.lat);
    var Δλ = toRad((p2.lng-p1.lng));

    var a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ/2) * Math.sin(Δλ/2);


    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}

var xmin = 44.339036;
var ymin = 25.958263;
var xmax = 44.538035;
var ymax = 26.225406;

var box_side = 5;

var dx = (xmax - xmin) / box_side;
var dy = (ymax - ymin) / box_side;

var distance1 = calculateDistanceBetweenPoints({lat: xmin, lng: ymax}, {lat: xmin, lng: ymin});
var distance2 = calculateDistanceBetweenPoints({lat: xmax, lng: ymin}, {lat: xmin, lng: ymin});

var area2 = distance1 * distance2;

var area3 = area2 / (box_side * box_side);

var poly = [];

for (var k = 0; k < box_side; k++) {
    y = ymin + k * dy;

    for (var c = 0; c < box_side; c++) {
        x = xmin + c * dx;

        var polygon = [
            //coords: [
                [y, x],
                [y, x + dx],
                [y + dy, x + dx],
                [y + dy, x],
                [y, x]
            //],
            //area: area3,
            //centroid: [y + dy/2 ,x + dx / 2],
            //population: 1
        ];

        poly.push(polygon);
    }
}

console.log(JSON.stringify(poly));
return;

for (var key in poly) {

    var requestParams = {
        "geometryType": "esriGeometryPolygon",
        "features": {
            "geometryType": "esriGeometryPolygon",
            "features": [
                {
                    "geometry": {
                        "rings": [
                            poly[key].coords
                        ],
                        "spatialReference": {
                            "wkid": 4326
                        }
                    }
                }
            ],
            "sr": {
                "wkid": 4326
            }
        }
    };


    request.post(
        'https://sampleserver1.arcgisonline.com/ArcGIS/rest/services/Demographics/ESRI_Population_World/GPServer/PopulationSummary/execute',
        { form: {inputPoly: requestParams, f:'pjson', 'env:outSR': null, 'env:processSR': null}},
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log(body);
                //console.log(response);

                //console.log(body.results[0].value.features[0].attributes.SUM);
            } else {
                console.log('error');
                console.log(body);
            }
        }
    );
    return;
}


//
//MongoClient.connect('mongodb://localhost:27017/park', function(err, db) {
//    if (err) {
//        console.log(err);
//        return;
//    }
//
//    console.log("Connected to database");
//
//});
