/**
 * Created by vlad on 12.05.2016.
 */
var MongoClient = require('mongodb').MongoClient;

function  isPointInside(latlng, coords) {

    for(var c = false, i = -1, l = coords.length, j = l - 1; ++i < l; j = i) {

        if(
            (
                (coords[i].lng <= latlng.lng && latlng.lng < coords[j].lng) ||
                (coords[j].lng <= latlng.lng && latlng.lng < coords[i].lng)
            ) &&
            (
                latlng.lat < (coords[j].lat - coords[i].lat) *
                (latlng.lng - coords[i].lng) /
                (coords[j].lng - coords[i].lng) +
                coords[i].lat
            )
        ) {
            c = !c;
        }

    }

    return c;

}

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

function calculateParkArea(poly) {
    var xmin = null;
    var xmax = null;
    var ymin = null;
    var ymax = null;

    for (var i in poly) {
        if ((poly[i].lat) < xmin || xmin === null) {
            xmin = poly[i].lat;
        }
        if ((poly[i].lat) > xmax || xmax === null) {
            xmax = poly[i].lat;
        }
        if ((poly[i].lng) < ymin || ymin === null) {
            ymin = poly[i].lng ;
        }
        if ((poly[i].lng) > ymax || ymax === null) {
            ymax = poly[i].lng;
        }
    }

    var box_side = 1000;

    var dx = (xmax - xmin) / box_side;
    var dy = (ymax - ymin) / box_side;

    var distance1 = calculateDistanceBetweenPoints({lat: xmin, lng: ymax}, {lat: xmin, lng: ymin});
    var distance2 = calculateDistanceBetweenPoints({lat: xmax, lng: ymin}, {lat: xmin, lng: ymin});

    var area2 = distance1 * distance2;


    var area3 = area2 / (box_side * box_side);

    console.log("area 3", area3);

    var count = 0;

    var count_outside = 0;

    for (var k = 0; k < box_side; k++) {

        if (k % 100 === 0) {
            console.log('k', k);
        }

        y = parseFloat(ymin) + k * parseFloat(dy);

        for (var c = 0; c < box_side; c++) {
            x = parseFloat(xmin) + c * parseFloat(dx);

            if (isPointInside({lat:x, lng:y}, poly)) {
                console.log(count);
                count++;
            } else {
                count_outside++
            }
        }
    }

    console.log(count);
    console.log('outside', count_outside);

    console.log("Approximated area:", count * area3);
    return count * area3;
}

MongoClient.connect('mongodb://localhost:27017/park', function(err, db) {
    if (err) {
        console.log(err);
        return;
    }

    console.log("Connected to database");


    var cursor = db.collection('areas').find({name : 'Parcul Herăstrău'});

    var polys = [];

    cursor.each(function(err, doc) {
        if (err) {
            console.log('Error', err);
            return;
        }
        if (doc === null) {
            console.log("Finished generating points\n");


            var sum = 0;
            for (var i in polys) {

                var polys2 = [];
                for (var j in polys[i]) {
                    polys2.push({lat: polys[i][j].lat, lng: polys[i][j].lon});
                }
                sum += calculateParkArea(polys2);
            }

            console.log("total area",  sum);
            return;
        }

        polys.push(doc.coordinates);
    });
});

