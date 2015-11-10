var sqlite3 = require('sqlite3').verbose();
var request = require('request');
var connect = require('connect');
var http = require('http');
var url = require('url');
var fs = require('fs');

function db_connect(file, write, success_callback, fail_callback) {
	var mode = write ? sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE : sqlite3.OPEN_READONLY;
	var db = new sqlite3.Database(file, function(error) {
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
		db_connect(config.sqlite_file,  true, function(db) {
			init_db(db);
			add_data(db, config);
		}, function(error) {
			console.error("Couldn't poll: "+error);
		});
	}, 30*60*1000);
}

function getMonthStart() {
	var d = new Date();
	return new Date(d.getFullYear(), d.getMonth(), d.getDay()).getTime();
}

var config_file = "./conf/tracker.json";
if (process.argv.length > 2) {
	config_file = process.argv[2];
}
var config = JSON.parse(fs.readFileSync(config_file, 'utf8'));
if (config.poll) {
	start_poll(config);
}

var serveStatic = require('serve-static');
var serve = serveStatic('static/', {'index': ['index.html', 'index.htm']});

var app = connect();
app.use('/data', function getData(req, res, next) {
	var query = url.parse(req.url, true).query;
	res.setHeader('content-type', 'text/plain');

	db_connect(config.sqlite_file, false, function(db) {
		var data = [[],[]];
		var start = query.start ? query.start : getMonthStart();
		var end = query.end ? query.end : new Date().getTime();
			
		db.each("SELECT timestamp, quota_total, quota_remaining from quota_data where timestamp >= ? and timestamp <= ? order by timestamp", [start, end], function(err, row) {
			if (err) {
				console.log(err);
			} else {
				data[0].push([row.timestamp, row.quota_total]);
				data[1].push([row.timestamp, row.quota_remaining]);
			}
		}, function() {
			db.close();
			res.end(JSON.stringify(data));
			next();
		});
	}, function() {
		res.setHeader('content-type', 'text/plain');
		db.close();
		res.end("");
		next();
	});
});

app.use('/', function getData(req, res, next) {
	serve(req, res, next);
});

var port = config.port ? config.port : 3000;
console.log("Starting server on port "+port);
http.createServer(app).listen(port);
