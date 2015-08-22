var gulp = require("gulp");
var _ = require("underscore");
var watchify = require("watchify");
var browserify = require("browserify");
var source = require("vinyl-source-stream");
var libs = require("./lib.js").libs;
require("colors"); //allow coloring console output


gulp.task("build:js:game", ["build:js:lib"], function () {
  browserifyTask(false);
});
function browserifyTask(watch) {
console.log(watch);
  var config = {
    entries: "src/js/game.js",
    debug: true,

    paths: [
        "src/js",
    ],

  };

  if (watch) {
    config = _.extend(config, watchify.args);
  }

  var b = browserify(config);

  function bundle() {
    return b
      .external(libs)
      .bundle()
      .on("error", function (msg) {
          console.log( msg.toString().red);
        })
      .pipe(source("game.js"))
      .pipe(gulp.dest("server/js"));
  }
  if (watch) {
    b = watchify(b);
    b.on("update", bundle);
  }

  return bundle();
}

module.exports = {
  browserifyTask: browserifyTask
}
