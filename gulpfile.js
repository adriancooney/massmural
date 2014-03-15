var gulp = require("gulp"),
	rename = require("gulp-rename"),
	browserify = require("gulp-browserify");

gulp.task("browserify", function() {
	gulp.src("static/function/index.js")

		// Browserify
		.pipe(browserify({ debug: true }))
	    .on("error", function(err) {
	    	console.log("Browserify Error: " + err.message);
	    })

	    .pipe(rename("main.js"))

		.pipe(gulp.dest("static/function"))
});

gulp.task("default", ["browserify"], function() {
	gulp.watch("./static/**/*.js", ["browserify"]);
});

