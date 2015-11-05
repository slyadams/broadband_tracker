var connect = require('connect');
var http = require('http');
var url = require('url');
var app = connect();
var sqlite3 = require('sqlite3').verbose();
var fs = require('fs');

var serveStatic = require('serve-static');
var serve = serveStatic('static/', {'index': ['index.html', 'index.htm']});


app.use('/data', function getData(req, res, next) {
	var query = url.parse(req.url, true).query;
	res.setHeader('content-type', 'text/plain');

	var config_file = "./conf/get_quota.json";
	var config = JSON.parse(fs.readFileSync(config_file, 'utf8'));
	var db = new sqlite3.Database(config.sqlite_file);

	var csv = "Time,Quota Remaining,Quota Total\n";
	db.each("SELECT timestamp, quota_total, quota_remaining from quota_data order by timestamp", function(err, row) {
		csv += row.timestamp+","+row.quota_total+","+row.quota_remaining+"\n";
	}, function() {
		db.close();
		res.end(csv);
		next();
	});
});

app.use('/', function getData(req, res, next) {
	serve(req, res, next);
});

http.createServer(app).listen(3000);

