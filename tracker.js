var fs = require('fs');
var WebService = require('./lib/webservice');
var dbConnect = require('./lib/dbConnect');
var Poller = require('./lib/poller');

var config_file = "./conf/tracker.json";
if (process.argv.length > 2) {
    config_file = process.argv[2];
}
var config = JSON.parse(fs.readFileSync(config_file, 'utf8'));

if (config.poll) {
    var poller = new Poller(config);
}

var webService = new WebService(config.port ? config.port : 3000, config.sqlite_file);