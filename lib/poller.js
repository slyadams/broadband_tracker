var sqlite3 = require('sqlite3').verbose();
var request = require('request');
var dbConnect = require('./dbConnect');

var Poller = function(config) {

    var init_db = function(db) {
        db.run("                                      \
            CREATE TABLE IF NOT EXISTS quota_data (   \
                timestamp    INTEGER    PRIMARY KEY,  \
                quota_total    INTEGER,               \
                quota_remaining    INTEGER            \
            )                                         \
        ");
    }

    var insert_data_to_db = function(db, timestamp, quota_total, quota_remaining) {
        var stmt = db.prepare("REPLACE INTO quota_data VALUES (?, ?, ?)", function(error)  {
            if (error != null) {
                console.error("Error: "+error);
            } else {
                stmt.run(timestamp, quota_total, quota_remaining, function(error) {
                    if (error != null) {
                        console.error("Error: "+error);
                    } else {
                        stmt.finalize(function(error) {
                            if (error != null) {
                                console.error("Error: "+error);
                            } else {
                                db.close();
                            }
                        });
                    }
                });
            }
        });
    }

    var add_data = function(db, config) {
        var chaos_request = request(
            {
                'uri': config.uri,
                'auth' : {
                    'user': config.user,
                    'pass': config.pass,
                    'sendImmediately': true
                }
            }, function(error, response, body) {
                if (!error && response.statusCode == 200) {
                    var info = JSON.parse(body);
                    var broadband = info.login[0].broadband[0];
                    var quota_total = broadband.quota_monthly;
                    var quota_remaining = broadband.quota_left;
                    var timestamp = Date.parse(broadband.quota_time);
                    console.info("Adding timestamp to database: "+timestamp);
                    insert_data_to_db(db, timestamp, quota_total, quota_remaining);
                } else {
                    console.error("Error: "+error);
                }
            }
        );
    }

    setInterval(function() {
        dbConnect(config.sqlite_file,  true, function(db) {
            init_db(db);
            add_data(db, config);
        }, function(error) {
            console.error("Couldn't poll: "+error);
        });
     }, 0.25*60*1000);

}

module.exports = Poller;