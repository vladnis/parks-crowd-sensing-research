/**
 * Created by vlad on 24.04.2016.
 */

var MongoClient = require('mongodb').MongoClient;
var geolib = require('geolib');

var radius = 50;

var area = radius * radius * Math.PI;
console.log('circles area = ', area);

var radiusInDegrees = radius * 0.000009009;

var degreesPerMeter = 0.000009009 * 3 * 2; // 6 meters

var numberOfPeople = 2000;

var NUM_ITERATIONS = 15;


var availableMoves = [
    {lat: degreesPerMeter, lng: 0},
    {lat: -degreesPerMeter, lng: 0},
    {lat: 0, lng: degreesPerMeter},
    {lat: 0, lng: -degreesPerMeter}
];

// ##############
function pow(x) {
    return x*x;
}

function locationOf(element, array, start, end) {

    var pivot = parseInt(start + (end - start) / 2, 10);

    if (end-start <= 1 || array[pivot].lat == element) {
        return pivot;
    }

    if (array[pivot].lat < element) {
        return locationOf(element, array, pivot, end);
    } else {
        return locationOf(element, array, start, pivot);
    }

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


function calculateArea(circles, poly) {

    var xmin = null;
    var xmax = null;
    var ymin = null;
    var ymax = null;

    for (var i in circles) {
        if ((circles[i].lat - radiusInDegrees) < xmin || xmin === null) {
            xmin = circles[i].lat - radiusInDegrees;
        }
        if ((circles[i].lat + radiusInDegrees) > xmax || xmax === null) {
            xmax = circles[i].lat + radiusInDegrees;
        }
        if ((circles[i].lng - radiusInDegrees) < ymin || ymin === null) {
            ymin = circles[i].lng - radiusInDegrees;
        }
        if ((circles[i].lng + radiusInDegrees) > ymax || ymax === null) {
            ymax = circles[i].lng + radiusInDegrees;
        }
    }

    circles.sort(function(x,y) {return x.lat - y.lat});

    var box_side = 1500;

    var dx = (xmax - xmin) / box_side;
    var dy = (ymax - ymin) / box_side;

    var distance1 = calculateDistanceBetweenPoints({lat: xmin, lng: ymax}, {lat: xmin, lng: ymin});
    var distance2 = calculateDistanceBetweenPoints({lat: xmax, lng: ymin}, {lat: xmin, lng: ymin});

    var area2 = distance1 * distance2;

    var area3 = area2 / (box_side * box_side);

    var count = 0;

    var x, y;

    var num_circles = circles.length;

    console.log('num_circles', num_circles);

    for (var k = 0; k < box_side; k++) {

        if (k % 100 === 0) {
            console.log('k', k);
        }

        y = ymin + k * dy;
        for (var c = 0; c < box_side; c++) {

            x = xmin + c * dx;

            var ok = false;
            for (var key in  poly) {
                if (isPointInside({lat:x, lng:y}, poly[key])) {
                    ok = true;
                    break;
                }
            }

            if (!ok) {
                continue;
            }

            var location = locationOf(x, circles, 0, num_circles);

            var intersects = false;

            for (var down = location; down >= 0; down--) {
                if (Math.abs(x - circles[down].lat) > radiusInDegrees * 2 ) {
                    break;
                }

                if (calculateDistanceBetweenPoints({lat: x, lng: y}, circles[down]) <= radius) {
                    count ++;
                    intersects = true;
                    break;
                }
            }



            if (intersects) {
                continue;
            }

            for (var up = location + 1; up < num_circles; up++) {

                if (Math.abs(x - circles[up].lat) > radiusInDegrees * 2 ) {
                    break;
                }

                if (calculateDistanceBetweenPoints({lat: x, lng: y}, circles[up]) <= radius) {
                    count ++;
                    break;
                }
            }

        }
    }

    var area = dx * dy * 111000 * 111000;

    console.log('total area', area2);
    console.log('area', area3);
    console.log('count', count);

    console.log("Approximated area:", count * area3);

    var parkArea = 1771625.93631;

    var percentage = count * area3 / parkArea * 100;
    console.log("Percentage covered:", count * area3 / parkArea * 100);

    return percentage;

}

// ##############

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDirection() {
    return getRandomInt(0, 3);
}

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

function moveCircle(circle, polygons) {

    // 4 directions
    var oldCenter = circle.coords;

    while (1) {
        var newCenter = {
            lat: oldCenter.lat + availableMoves[circle.direction].lat,
            lng: oldCenter.lng + availableMoves[circle.direction].lng
        };

        var ok = false;
        for (var key in  polygons) {
            if (isPointInside(newCenter, polygons[key])) {
                ok = true;
                break;
            }
        }

        if (ok) {
            break;
        } else {
            circle.direction = (circle.direction + getRandomInt(0, 20)) % 4;
        }
    }

    circle.coords = newCenter;
}

function movePeople(circles, polygons) {

    var areaSum = 0;
    for (var iteration = 0; iteration < NUM_ITERATIONS; iteration++) {

        console.log('####iteration', iteration);

        for (var key in circles) {
            moveCircle(circles[key], polygons);
        }

        var circlesAux = [];
        for (var key in circles) {
            circlesAux.push({lat: circles[key].coords.lat, lng:circles[key].coords.lng});
        }

        areaSum += calculateArea(circlesAux, polygons);
    }

    console.log('total area', areaSum/NUM_ITERATIONS);
}



/**
 * Returns a random integer between min (inclusive) and max (inclusive)
 * Using Math.round() will give you a non-uniform distribution!
 */
function getRandomFloat(min, max) {
    return Math.random() * (parseFloat(max) - parseFloat(min)) + parseFloat(min);
}


function getRandomPosition(info) {
    var minLon = info.minLon.lon;
    var maxLon = info.maxLon.lon;
    var minLat = info.minLat.lat;
    var maxLat = info.maxLat.lat;

    var poly = [];

    for (var elemKey in info.coord) {
        poly.push({
            latitude: info.coord[elemKey].lat,
            longitude: info.coord[elemKey].lon
        });
    }

    while(1) {
        var coord = {
            latitude: getRandomFloat(minLat, maxLat),
            longitude: getRandomFloat(minLon, maxLon)
        };

        if (geolib.isPointInside(coord, poly)) {
            return {
                lat: coord.latitude,
                lon: coord.longitude
            };
        }
    }
}


MongoClient.connect('mongodb://localhost:27017/park', function(err, db) {
    if (err) {
        console.log(err);
        return;
    }

    console.log("Connected to database");


    var cursor = db.collection('areas').find({name : 'Parcul Herăstrău'});
    var points = [];

    var polys = [];
    var circles = [];

    cursor.each(function(err, doc) {
        if (err) {
            console.log('Error', err);
            return;
        }
        if (doc === null) {
            console.log("Finished generating points\n");

            for (var areaKey in points) {
                coordinates = points[areaKey].coord;

                var markers = [];

                for (var coordinateKey in coordinates) {

                    var lat = parseFloat(coordinates[coordinateKey].lat);
                    var lon = parseFloat(coordinates[coordinateKey].lon);

                    var coord = {
                        lat: lat,
                        lng: lon
                    };
                    markers.push(coord);
                }

                var randomPoints = points[areaKey].randomPoints;

                for (var elemKey in randomPoints) {
                    var coords = {
                        lat: parseFloat(randomPoints[elemKey].lat),
                        lng: parseFloat(randomPoints[elemKey].lon)
                    };
                    var circle = {};
                    circle.direction = getRandomDirection();
                    circle.coords = coords;
                    circles.push(circle);
                }

                polys.push(markers);

            }

            movePeople(circles, polys);

            return;
        }

        var minLat = null;
        var minLon = null;
        var maxLat = null;
        var maxLon = null;

        for (var coordKey in doc.coordinates) {
            var coordinates = doc.coordinates[coordKey];

            if (minLat == null || minLat.lat > coordinates.lat ) {
                minLat = coordinates;
            }

            if (maxLat == null || coordinates.lat > maxLat.lat) {
                maxLat = coordinates;
            }

            if (minLon == null || minLon.lon > coordinates.lon) {
                minLon = coordinates;
            }

            if (maxLon == null || maxLon.lon < coordinates.lon) {
                maxLon = coordinates;
            }

        }

        var info = {
            coord: doc.coordinates,
            minLon: minLon,
            maxLon: maxLon,
            minLat: minLat,
            maxLat: maxLat
        };


        info.randomPoints = [];

        for (var i = 0; i < numberOfPeople; i++) {
            if (i % 100 == 0) {
                console.log('numberOfPeople', i);
            }
            info.randomPoints.push(getRandomPosition(info));
        }

        points.push(info);
    });


});
