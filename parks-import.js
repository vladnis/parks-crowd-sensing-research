/**
 * Created by vlad on 23.04.2016.
 */
var fs = require('fs'),
    xml2js = require('xml2js'),
    parser = new xml2js.Parser(),
    MongoClient = require('mongodb').MongoClient;

var parkFile = 'parks.osm';


MongoClient.connect('mongodb://localhost:27017/park', function(err, db) {

    if (err) {
        console.log(err);
        return;
    }


    console.log("Connected correctly to server.");


    fs.readFile(__dirname + '/' + parkFile, function(err, data) {

        if (err) {
            console.log(err);
            return;
        }

        parser.parseString(data, function (err, result) {
            if (err) {
                console.log(err);
                return;
            }

            // Add nodes

            //for (var elem in result['osm']['node']) {
            //    var node = result['osm']['node'][elem]['$'];
            //    db.collection('nodes').insertOne({
            //        _id: node['id'],
            //        lat: node['lat'],
            //        lon: node['lon']
            //    });
            //}

            // Add ways

            //for (var elem in result['osm']['way']) {
            //    var id = result['osm']['way'][elem]['$']['id'];
            //
            //    var nodesArray = [];
            //    var nodes = result['osm']['way'][elem]['nd'];
            //
            //    for (var j in nodes) {
            //        nodesArray.push(nodes[j]['$']['ref']);
            //    }
            //
            //    var name = null;
            //    var alt_name = null;
            //
            //    var keys = result['osm']['way'][elem]['tag'];
            //    for (var i in keys) {
            //        if (keys[i]['$']['k'] === 'name') {
            //            name = keys[i]['$']['v'];
            //        }
            //        if (keys[i]['$']['k'] === 'alt_name') {
            //            alt_name = keys[i]['$']['v'];
            //        }
            //    }
            //
            //    db.collection('areas').insertOne({
            //        _id: id,
            //        nodes: nodesArray,
            //        name: name,
            //        alt_name: alt_name
            //    });
            //}


            // Add relations
            for (var elem in result['osm']['relation']) {
                var id = result['osm']['relation'][elem]['$']['id'];

                var areasArray = [];
                var members = result['osm']['relation'][elem]['member'];
                for (var j in members) {
                    areasArray.push({
                        ref: members[j]['$']['ref'],
                        type: members[j]['$']['role']
                    });
                }

                var name = null;
                var alt_name = null;

                var keys = result['osm']['relation'][elem]['tag'];
                for (var i in keys) {
                    if (keys[i]['$']['k'] === 'name') {
                        name = keys[i]['$']['v'];
                    }
                    if (keys[i]['$']['k'] === 'alt_name') {
                        alt_name = keys[i]['$']['v'];
                    }
                }

                db.collection('relations').insertOne({
                    _id: id,
                    name: name,
                    alt_name: alt_name,
                    members: areasArray
                });

            }

        });

    });

});
