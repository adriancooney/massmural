var GUI = require("./GUI");

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

	this._update = null;
};

/**
 * Tile dimensions.
 * @type {Number}
 */
Tile.width = 500;
Tile.height = 400;

/**
 * The wait before the tile is saved once modified.
 * @type {Number}
 */
Tile.WAIT_BEFORE_SAVE = 1500;

/**
 * The wait for the tile buffer to batch saves.
 * @type {Number}
 */
Tile.BUFFER_TIMEOUT = 500;

/**
 * The maximum amount of Tile objects stored in memory.
 * @type {Number}
 */
Tile.CACHE_SIZE_LIMIT = 100;

/**
 * Set the wall to debug.
 * @type {Boolean}
 */
Tile.DEBUG = false;

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
	if(Tile.cache.keys.length > Tile.CACHE_SIZE_LIMIT) Tile.cache.invalidate(Tile.cache.keys.shift());
};

Tile.buffer = [];
Tile.buffer.update = null;

Tile.buffer.add = function(tile) {
	Tile.buffer.push(tile);

	if(Tile.buffer.length < 4) {
		if(Tile.buffer.update) clearTimeout(Tile.buffer.update);
		Tile.buffer.update = setTimeout(Tile.buffer.empty, Tile.BUFFER_TIMEOUT);
	} else Tile.buffer.empty(); 
};

/**
 * Empty the tile buffer. By this, we mean upload
 * each tile to the server in a batch request instead
 * of requests every few seconds.
 */
Tile.buffer.empty = function() {
	var request = new XMLHttpRequest(),
		form = new FormData();

	// Convert the canvases to jpeg. Pity toBlob isn't supported yet.
	Tile.buffer.forEach(function(tile) {
		var img = tile.getContext().canvas.toDataURL();

		form.append(tile.id, img, tile.id);
	});

	// Post request to /tiles
	GUI.loading(true);
	request.open("POST", "/tiles", true);

	request.onreadystatechange = function() {
		if(request.readyState === 4 && request.status === 200) {
			GUI.loading(false);
		}
	};

	// Send the form data along
	request.send(form);

	// Empty the buffer
	Tile.buffer.length = 0;
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

	ctx.beginPath();
	ctx.moveTo(x, y + Tile.height);
	ctx.lineTo(x, y);
	ctx.lineTo(x + Tile.width, y);
	ctx.strokeStyle = "rgba(0,0,0,0.05)";
	ctx.stroke();

	if(Tile.DEBUG) {
		ctx.fillStyle = "#aaa";
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		ctx.fillText(this.id, x + 5, y + 5);
	}
};

/**
 * Save a tile to the server.
 */
Tile.prototype.save = function() {
	Tile.buffer.add(this);
};

/**
 * Set the tile as modified and start update timer.
 * If tile is already modified, push the update timer.
 */
Tile.prototype.modified = function() {
	if(this._update) clearTimeout(this._update);

	var that = this;

	this._update = setTimeout(function() {
		that.save();
	}, Tile.WAIT_BEFORE_SAVE);
};

/**
 * Get the tile context.
 * @return {CanvasRenderingContext2D} 
 */
Tile.prototype.getContext = function() {
	if(!this.ctx) {
		// Create the tiles own context
		this.canvas = document.createElement("canvas");
		this.canvas.height = Tile.height;
		this.canvas.width = Tile.width;
		this.ctx = this.canvas.getContext("2d");

		// Draw the old image to the canvas
		this.ctx.drawImage(this.image, 0, 0);
		this.image = this.canvas;
		return this.ctx;
	} else return this.ctx;
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
Tile.blank = document.createElement("canvas");
Tile.blank.ctx = (function() {
	var img = Tile.blank,
		ctx = img.getContext("2d");

	img.width = Tile.width;
	img.height = Tile.height;

	return ctx;
})();

module.exports = Tile;