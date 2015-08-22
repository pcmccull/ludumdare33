var gulp = require("gulp");
var livereload = require("gulp-livereload");
gulp.task("watch", [
  "build",
  "watch:js:game",
  "serve",
], function () {
  livereload.listen();
});

require("./game");
