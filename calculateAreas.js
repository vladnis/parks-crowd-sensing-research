/**
 * Created by vlad on 23.04.2016.
 */
var MongoClient = require('mongodb').MongoClient;
var turf = require('turf-area');
var turfCenter = require('turf-centroid');

MongoClient.connect('mongodb://localhost:27017/park', function(err, db) {
    var cursor = db.collection('areas').find();

    cursor.each(function(err, doc) {
        if (err) {
            console.log('Error', err);
            return;
        }
        if (doc === null) {
            console.log('Finished');
            return;
        }

        //var areaId = doc['_id'];
        //var nodes = doc['nodes'];
        //for (var k in nodes) {
        //
        //    (function(position, id) {
        //        db.collection('nodes').findOne({_id: nodes[k]}, function(err, doc) {
        //            db.collection('areas').findOneAndUpdate({_id: areaId}, {
        //                $push: {
        //                    'coordinates': {
        //                        id: id,
        //                        position: position,
        //                        lat: doc['lat'],
        //                        lon: doc['lon']
        //                    }
        //                }
        //            });
        //        })
        //    })(k, nodes[k]);
        //
        //}

        var coordinates = doc['coordinates'];

        var expectedCoord = [];

        for (var k in coordinates) {
            expectedCoord.push([parseFloat(coordinates[k].lat), parseFloat(coordinates[k].lon)]);
        }

        var polygon = {
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "Polygon",
                "coordinates": [expectedCoord]
            }
        };

        //var area = turf(polygon);
        //db.collection('areas').findOneAndUpdate(
        //    {_id: doc['_id']},
        //    {
        //        $set: {
        //            'area': area
        //        }
        //    }
        //);

        var centroid = turfCenter(polygon);
        db.collection('areas').findOneAndUpdate(
            {_id: doc['_id']},
            {
                $set: {
                    'centroid': centroid.geometry.coordinates
                }
            }
        );
    });
});
