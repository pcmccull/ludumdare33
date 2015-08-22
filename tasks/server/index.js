var gulp = require("gulp");
var gulpOpen = require("gulp-open");
var express = require("express");
var PORT = 5000;

gulp.task("serve", [
	"build"
], function () {

	var app = express();
	var server = require("http").createServer(app);
	var compression = require("compression");

	server.listen(PORT, "0.0.0.0", function () {
		var port = server.address().port;
		var url = "http://" + process.env.HOSTNAME + ":" + port;
		console.log("Server listening at port %d", port);
		console.log(url);
		gulpOpen(url);
	});
	app.use(express.static("server"));
	app.use(compression());
});
