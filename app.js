/**
 * Created by vlad on 24.04.2016.
 */
var MongoClient = require('mongodb').MongoClient;
var geolib = require('geolib');

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
            console.log('ok');
            return {
                lat: coord.latitude,
                lon: coord.longitude
            };
        }

        console.log('Trying again');
    }
}

var numberOfPeople = 1;

var express = require('express');
var app = express();
MongoClient.connect('mongodb://localhost:27017/park', function(err, db) {
    if (err) {
        console.log(err);
        return;
    }

    console.log("Connected to database");

    app.get('/getCentroids', function(req, res) {
        var cursor = db.collection('areas').find();
        var points = [];
        cursor.each(function(err, doc) {
            if (err) {
                console.log('Error', err);
                return;
            }
            if (doc === null) {
                res.send(JSON.stringify(points));
                return;
            }
            points.push(doc.centroid);
        });
    });



    app.get('/getPolygons', function(req, res) {
        var cursor = db.collection('areas').find({name : 'Parcul Herăstrău'});
        var points = [];

        cursor.each(function(err, doc) {
            if (err) {
                console.log('Error', err);
                return;
            }
            if (doc === null) {
                res.send(JSON.stringify(points));
                delete points;

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
                info.randomPoints.push(getRandomPosition(info));
            }

            points.push(info);
        });
    });

});

app.listen(3000, function () {
    console.log('Park app listening on port 3000!');
});

app.use(express.static('public'));
