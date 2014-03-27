var express = require("express"),
	path = require("path"),
	multiparty = require("multiparty"),
	fs = require("fs"),
	app = express();

const TILE_DIR = path.resolve(__dirname, "../static/tiles");

/**
 * Retrieve a tile.
 */

/**
 * Write the tiles to the server.
 */
app.post("/tiles", function(req, res, next) {
	var form = new multiparty.Form();

	// Since the images are Base64 encoded, we have no
	// "file" events only parts.
	form.on("part", function(part) {
		console.log(part);
		var img = [];

		// Buffer the stream
		part.on("data", function(chunk) {
			if(img.length === 0) img.push(new Buffer(chunk.toString().replace("data:image/png;base64,", ""), "base64"));
			else console.log("MORE CHUNKS"), img.push(new Buffer(chunk.toString(), "base64"));
		});

		part.on("end", function() {

			var filename = TILE_DIR + "/" + path.basename(part.name),
				file = Buffer.concat(img);

			console.log("File recieved, writing.", filename);

			// Write the buffer to file
			fs.writeFile(filename, file, function(err) {
				if(err) next(err);
				else console.log("File written: ", filename), res.send({ worked: true });
			});
		});
	});

	form.on("error", function(err) {
		next(err);
	})

	// Pipe in the request.
	form.parse(req);
});

app.use(function(err, req, res, next) {
	console.log("Error!", err);
})

app.use(express.static(path.resolve(__dirname, "../static")));

app.listen(4048);