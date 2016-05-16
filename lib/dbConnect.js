var sqlite3 = require('sqlite3').verbose();

var dbConnect = function (file, write, success_callback, fail_callback) {
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

module.exports = dbConnect;