var gulp = require("gulp");
var browserify = require("browserify");
var source = require("vinyl-source-stream");
var libs = [
    "pixi.js",
    "phaser",
    "p2",
];

gulp.task("build:js:lib", function () {
  browserify({
    config: {
      paths: [
        "client/libs/js",
      ]
    }
   })
  .require(libs)
  .bundle()
  .pipe(source("lib.js"))
  .pipe(gulp.dest("server/js"));
});


module.exports = {
  libs:libs
};
