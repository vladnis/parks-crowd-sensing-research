/**
 * Created by vlad on 24.04.2016.
 */

    //http://www.benfrederickson.com/calculating-the-intersection-of-3-or-more-circles/

var MongoClient = require('mongodb').MongoClient;
var geolib = require('geolib');

var uniquePointsCovered = [];
var uniquePointsCoveredHash = {};
var minusMeters = 0;

var radius = 3;

var degreesPerMeter = 0.000009009 * radius * 2; // 6 meters

var area = radius * radius * Math.PI;
console.log(area);

return;

var numberOfPeople = 1000;


var availableMoves = [
    {lat: degreesPerMeter, lng: 0},
    {lat: -degreesPerMeter, lng: 0},
    {lat: 0, lng: degreesPerMeter},
    {lat: 0, lng: -degreesPerMeter}
];

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

function calculateIntersections() {
    var length = uniquePointsCovered.length;

    for (var i = 0; i < length - 1; i++) {
        for (var j = i + 1; j < length; j++) {
            if (Math.abs(uniquePointsCovered[i].lat - uniquePointsCovered[j].lat) > degreesPerMeter) {
                break;
            }
            if (Math.abs(uniquePointsCovered[i].lng - uniquePointsCovered[j].lng) > degreesPerMeter) {
                continue;
            }

            var d = calculateDistanceBetweenPoints( uniquePointsCovered[i], uniquePointsCovered[j]);

            if (d > radius * 2) {
                continue;
            }

            var r = radius;
            var R = radius;


            var part1 = r*r*Math.acos((d*d + r*r - R*R)/(2*d*r));
            var part2 = R*R*Math.acos((d*d + R*R - r*r)/(2*d*R));
            var part3 = 0.5*Math.sqrt((-d+r+R)*(d+r-R)*(d-r+R)*(d+r+R));
            var intersectionArea = part1 + part2 - part3;

            if (intersectionArea > area) {
                console.log('d!!!', d);
                console.log('i!!!', intersectionArea);
                continue;
            }
            if (!isNaN(intersectionArea)) {
                minusMeters += intersectionArea;
            }
        }
        if (i % 100 === 0) {
            console.log(i, "/", length);
        }
    }
}

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

function moveCircle(circle, polygon, iteration) {
    // 4 directions
    var oldCenter = circle.coords;

    while (1) {
        var newCenter = {
            lat: oldCenter.lat + availableMoves[circle.direction].lat,
            lng: oldCenter.lng + availableMoves[circle.direction].lng
        };

        if (isPointInside(newCenter, polygon)) {
            break;
        } else {
            circle.direction = (circle.direction + getRandomInt(0, 20)) % 4;
        }
    }

    var lat = newCenter.lat;
    var lng = newCenter.lng;

    if (uniquePointsCoveredHash[lat + '/' + lng]) {
        return;
    }

    uniquePointsCoveredHash[lat + '/' + lng] = {1:1};
    uniquePointsCovered.push({
        lat: lat,
        lng: lng,
    });

    circle.coords = newCenter;
}

function movePeople(circles, iteration, polygon) {

    for (iteration = 0; iteration < 900; iteration++) {
        if (iteration % 100 === 0) {
            console.log('iteration', iteration);
        }
        for (var key in circles) {
            moveCircle(circles[key], polygon, iteration);
        }

    }
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

                var circles = [];
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

                movePeople(circles, 0, markers);

            }

            uniquePointsCovered.sort(function(e1, e2) {
                return e1.lat - e2.lat;
            });


            calculateIntersections();



            console.log("minus", minusMeters);
            uniquePointsCovered = uniquePointsCovered.length * area -  minusMeters;
            console.log("Squares meters covered: " + uniquePointsCovered);

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
