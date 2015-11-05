var sqlite3 = require('sqlite3').verbose();
var request = require('request');
var fs = require('fs');

function init_db(db) {
	db.run("							\
		CREATE TABLE IF NOT EXISTS quota_data (			\
			timestamp	INTEGER	PRIMARY KEY,		\
			quota_total	INTEGER,			\
			quota_remaining	INTEGER				\
		)							\
	");

}

function insert_data_to_db(db, timestamp, quota_total, quota_remaining) {
	var stmt = db.prepare("REPLACE INTO quota_data VALUES (?, ?, ?)");
	stmt.run(timestamp, quota_total, quota_remaining);
	stmt.finalize();
}

function add_data(db, config) {
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
				insert_data_to_db(db, timestamp, quota_total, quota_remaining);
				db.close();
			}
		}
	);
}

var config_file = "./conf/get_quota.json";
if (process.argv.length > 2) {
	config_file = process.argv[2];
}
var config = JSON.parse(fs.readFileSync(config_file, 'utf8'));

var db = new sqlite3.Database(config.sqlite_file);
db.serialize(function() {
	init_db(db);
	add_data(db, config);
});

