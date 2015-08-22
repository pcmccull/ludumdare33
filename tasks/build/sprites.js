var gulp = require("gulp");
var spritesmith = require("gulp.spritesmith");
var imagemin = require("gulp-imagemin");
var texturepacker = require("spritesmith-texturepacker");

gulp.task("build:sprites", function() {
    var spriteData = gulp.src("src/sprites/*.png")
        .pipe(spritesmith({
            imgName: "sprites.png",
            cssName: "sprites.json",
            algorithm: "binary-tree",
            cssTemplate: texturepacker
    }));
    spriteData.img.pipe(imagemin()).pipe(gulp.dest("server/assets/"));
    spriteData.css.pipe(gulp.dest("server/assets"));
});
