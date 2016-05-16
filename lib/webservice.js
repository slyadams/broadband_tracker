var connect = require('connect');
var http = require('http');
var url = require('url');
var serveStatic = require('serve-static');
var dbConnect = require('./dbConnect');

var webService = function(port, dataFile) {

    var getMonthStart = function() {
	    var d = new Date();
	    return new Date(d.getFullYear(), d.getMonth(), d.getDay()).getTime();
    };

    var serve = serveStatic('static/', {'index': ['index.html', 'index.htm']});
    var app = connect();
    app.use('/data', function getData(req, res, next) {
        var query = url.parse(req.url, true).query;
	    res.setHeader('content-type', 'text/plain');

        dbConnect(dataFile, false, function(db) {
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

    console.log("Starting server on port "+port);
    http.createServer(app).listen(port);
};

module.exports = webService;