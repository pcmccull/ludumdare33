var gulp = require("gulp");


gulp.task("build", ["build:js:lib", "build:js:game"]);

require("./lib");
require("./game");
