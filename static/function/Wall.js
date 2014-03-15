var Tile = require("./Tile");

var Wall = {
	// The current wall coordinates
	x: 0, 
	y: 0,

	tile: {
		blank: null,
		width: 400,
		height: 300,
		path: "tiles/",
		filetype: ".png",
		preload: 1 // How many tiles to preload around the perimeter
	},

	window: {
		width: window.innerWidth,
		height: window.innerHeight
	},

	// The tile store
	tiles: {}
};

/**
 * Resize the wall to the window width.
 */
Wall.resize = function() {
	Wall.window.width = canvas.width = window.innerWidth;
	Wall.window.height = canvas.height = window.innerHeight;
};

/**
 * Get a tile.
 * @param  {Number} x The tile that contains the coordinate.
 * @param  {Number} y 
 */
Wall.getTile = function(x, y, callback) {
	var tile = Wall.getTileName(x, y);

	// Test if the tile already exists
	if(Wall.tiles[tile]) callback(Wall.tiles[tile]);
	else {
		// Retrieve the image and save to canvas
		Wall.loadTile(tilename, callback);
	}
};

/**
 * Load a tile from the server
 * @param {String} tilename 
 */
Wall.loadTile = function(x, y, callback) {
	var tile = new Image();

	tile.onload = function() {
		callback(tile, x, y);
	};

	tile.onerror = function() {
		callback(Wall.tile.blank, x, y);
	};

	tile.src = Wall.getTileName(x, y);
};

/**
 * Get tiles for an origin.tty
 * @param  {Number}   x        
 * @param  {Number}   y        
 * @param  {Function} callback 
 */
Wall.getTiles = function(x, y, callback) {
	var w2 = Wall.window.width/2,
		h2 = Wall.window.height/2,
		tileCountX = Math.ceil(w2/Wall.tile.width),
		tileCountY = Math.ceil(h2/Wall.tile.height),
		tiles = [];

	
	for(var dy = -tileCountY; dy <= tileCountY; dy++) 
		for(var dx = -tileCountX; dx <= tileCountX; dx++) {
			Wall.getTile(x + (dx * Wall.tile.width), y + (dy * Wall.tile.height), callback);
		}
};

/**
 * Return the tile name from scheme.
 * @param  {Number} x 
 * @param  {Number} y 
 * @return {String}   filename e.g. /tiles/-300_400.png -> Tile at -300/400
 */
Wall.getTileName = function(x, y) {
	return Wall.tile.path + x + "_" + y + Wall.tile.filetype;
};

/**
 * Pan the wall in given direction.
 * @param  {Number} x -/+
 * @param  {Number} y -/+
 */
Wall.pan = function(x, y) {
	// Pan the origin
	Wall.x += x;
	Wall.y += y;

	// context.drawImage( img, sx, sy, swidth, sheight, x, y, width, height );
	// ctx.drawImage(canvas, 
	// 	x < 0 ? x * -1 : 0,
	// 	y < 0 ? y * -1 : 0,
	// 	x > 0 ? canvas.width - x : canvas.width,
	// 	y > 0 ? canvas.height - y : canvas.height,
	// 	0, 0, canvas.width, canvas.height);
	
	ctx.drawImage(canvas, x, y);
};

Wall.render = function() {

};

Wall.init = function() {
	// Initially resize the wall to screen dimensions
	Wall.resize();

	// Create the blank tile.
	var blank = Wall.tile.blank = document.createElement("canvas");
	var bctx = blank.getContext("2d");
	blank.width = Wall.tile.width;
	blank.height = Wall.tile.height;
	bctx.fillStyle = "#fff";
	bctx.fillRect(0, 0, blank.width, blank.height);
};

module.exports = Wall;