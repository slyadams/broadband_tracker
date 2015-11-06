var sqlite3 = require('sqlite3').verbose();
var request = require('request');
var connect = require('connect');
var http = require('http');
var url = require('url');
var fs = require('fs');

function db_connect(file, write, success_callback, fail_callback) {
	var mode = write ? sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE : sqlite3.OPEN_READONLY;
	var db = new sqlite3.Database(config.sqlite_file, function(error) {
		if (error != null) {
			if (fail_callback) {
				fail_callback(error);
			}
		} else {
			success_callback(db);
		}
	});
	return db;
}

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
				console.info("Adding timestamp to database: "+timestamp);
				insert_data_to_db(db, timestamp, quota_total, quota_remaining);
			} else {
				console.error("Error: "+error);
			}
		}
	);
}

function start_poll(config) {
	setInterval(function() {
		db_connect(config.file,  true, function(db) {
			init_db(db);
			add_data(db, config);
		}, function(error) {
			console.error("Couldn't poll: "+error);
		});
	}, 30*60*1000);
}

var config_file = "./conf/get_quota.json";
if (process.argv.length > 2) {
	config_file = process.argv[2];
}
var config = JSON.parse(fs.readFileSync(config_file, 'utf8'));
start_poll(config);

var serveStatic = require('serve-static');
var serve = serveStatic('static/', {'index': ['index.html', 'index.htm']});

var app = connect();
app.use('/data', function getData(req, res, next) {
	var query = url.parse(req.url, true).query;
	res.setHeader('content-type', 'text/plain');

	db_connect(config.sqlite_file, false, function(db) {
		var csv = "Time,Quota Remaining,Quota Total\n";
		db.each("SELECT timestamp, quota_total, quota_remaining from quota_data order by timestamp", function(err, row) {
			if (err) {
			} else {
				csv += row.timestamp+","+row.quota_total+","+row.quota_remaining+"\n";
			}
		}, function() {
			db.close();
			res.end(csv);
			next();
		});
	}, function() {
		res.setHeader('content-type', 'text/plain');
		db.close();
		res.end(csv);
		next();
	});
});

app.use('/', function getData(req, res, next) {
	serve(req, res, next);
});

http.createServer(app).listen(3000);
