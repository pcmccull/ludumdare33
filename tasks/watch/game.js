var gulp = require("gulp");
var watch = require("gulp-watch");
var browserifyTask = require("../build/game").browserifyTask;

gulp.task("watch:js:game", ["build:js:game"], function () {
  var browserifyTaskResult = browserifyTask(true);
  watch([
    "src/js/**/*.js",
  ], function (file) {
    console.log("File change event triggered", file.event);
    if (/^(add|unlink)$/.test(file.event)){
      console.log("File change event triggered", file.event, "reloading browserify");
      browserifyTaskResult.pipe.emit("exit");
      browserifyTaskResult.bundle.close();
      browserifyTaskResult =  browserifyTask(true);
    }
  });
});
