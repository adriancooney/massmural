/**
 * Create a new tile.
 */
var Tile = function(x, y, image) {
	this.id = Tile.getPathName(x, y);

	// Set the image to blank while loading
	this.image = Tile.blank;

	var that = this;
	Tile.fetch(this.id, function(image) {
		that.image = image;
	});
	
	this.x = x;
	this.y = y;
};

/**
 * Tile dimensions.
 * @type {Number}
 */
Tile.width = 400;
Tile.height = 300;

/**
 * The maximum amount of Tile objects stored in memory.
 * @type {Number}
 */
Tile.CACHE_SIZE_LIMIT = 100;

/**
 * Tile cache.
 * @type {Object}
 */
Tile.cache = {};
Tile.cache.keys = [];

/**
 * Invalidate a tile in the cache.
 * @param  {String} id Tile id in cache.
 */
Tile.cache.invalidate = function(id) {
	delete Tile.cache[id];
};

Tile.cache.add = function(id, tile) {
	Tile.cache.keys.push(id);
	Tile.cache[id] = tile;

	// Can't let the cache get too big
	if(Tile.cache.keys.length > Tile.CACHE_SIZE_LIMIT) Tile.invalidate(Tile.cache.keys.unshift());
};

/**
 * Get a tile given coordinates. If the tile is in the cache,
 * serve that tile, else create a new tile.
 * @param  {Number} x 
 * @param  {Number} y 
 * @return {Tile} 
 */
Tile.get = function(x, y) {
	var id = Tile.getPathName(x, y);
	if(Tile.cache[id]) return Tile.cache[id];
	else {
		var tile = new Tile(x, y);
		Tile.cache.add(id, tile);
		return tile;
	}
};

/**
 * Render a tile onto a canvas.
 */
Tile.prototype.render = function(ctx, x, y) {
	ctx.drawImage(this.image, x, y);
	ctx.font = "12px Arial";
	ctx.fillStyle = "#000";
	ctx.fillText(this.x + ", " + this.y, x + (Tile.width/2), y + (Tile.height/2));
};

/**
 * Save a tile to the server.
 */
Tile.prototype.save = function() {

};

/**
 * Fetch a tile from the server.
 * @param  {String}   url      
 * @param  {Function} callback 
 */
Tile.fetch = function(url, callback) {
	var img = new Image();

	img.onload = function() {
		callback(img);
	};

	img.onerror = function() {
		callback(Tile.blank);
	};

	img.src = url;
};

/**
 * Return the tile name according to the spec.
 * @param  {Number} x 
 * @param  {Number} y 
 * @return {String}   Path name.
 */
Tile.getPathName = function(x, y) {
	return "tiles/" + x + "_" + y + ".png";
};

// Create a blank image
Tile.blank = (function() {
	var img = document.createElement("canvas"),
		ctx = img.getContext("2d");

	img.width = Tile.width;
	img.height = Tile.height;

	ctx.fillStyle = "#f00";
	ctx.fillRect(0, 0, Tile.width, Tile.height);
	ctx.fillStyle = "#fff";
	ctx.fillRect(2, 2, Tile.width - 2, Tile.height - 2);

	return img;
})();

// Circumvent the circular dependancies
module.exports = Tile;