var gulp = require("gulp");
var browserify = require("browserify");
var source = require("vinyl-source-stream");
var libs = [
];

gulp.task("build:js:lib", function () {
  browserify({
      paths: [
        "src/libs/",
      ]
   })
  .require(libs)
  .bundle()
  .pipe(source("lib.js"))
  .pipe(gulp.dest("server/js"));
});


module.exports = {
  libs:libs
};
