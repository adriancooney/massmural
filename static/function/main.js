(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Brush = function(setup, render) {
	if(!render) render = setup;
	else setup.call(this);

	// Brush options
	this.size = 12;
	this.color = "#f00";

	this._render = render;
};

Brush.prototype.paint = function(ctx, x, y, x1, y1) {
	this._render.apply(this, arguments);
};

module.exports = Brush;
},{}],2:[function(require,module,exports){
/**
 * Create e new grid.
 * @param {Number} vh Viewport width.
 * @param {Number} vw Viewport height.
 * @param {Number} th Tile width.
 * @param {Number} tw Tile height.
 * @param {Number} ox Origin x. (the center)
 * @param {Number} oy Origin y.
 */
var Grid = function(ctx, th, tw, ox, oy) {
	this.vh = ctx.canvas.height;
	this.vw = ctx.canvas.height;
	this.th = th;
	this.tw = tw;
	this.ox = ox;
	this.oy = oy;
};

Grid.fn = Grid.prototype;

// Preload threshold
// If a tile is showing less 60% on any axis
// another tile is preloaded behind it
Grid.fn.PRELOAD_THRESHOLD = 0.6;

Grid.fn.pan = function(x, y) {
	this.ox += x;
	this.oy += y;
};

Grid.fn.render = function() {
	for(var uy = -Math.ceil((this.vh/2)/this.th), vy = -uy; uy <= vy; uy++) {
		for(var ux = -Math.ceil((this.vw/2)/this.tw), vx = -ux; ux <= vx; ux++) {

			var x = (ux * this.tw) + this.ox, 
				y = (uy * this.th) + this.oy;

			this.getTile(x, y).render();
		}
	}
};

Grid.fn.getTile = function(x, y) {
	return new Grid.Tile(x, y);
};

Grid.Tile = function(x, y) {
	this.x = x;
	this.y = y;
};

Grid.Tile.prototype.render = function() {
	console.log(this.toString());
	if(this.img) {
		// Draw image
	} else {
		// Draw blank
	}
};

Grid.Tile.prototype.toString = function() {
	return "Tile [" + this.x + ", " + this.y + "]";
}
},{}],3:[function(require,module,exports){
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
},{}],4:[function(require,module,exports){
var Tile = require("./Tile"),
	Brushes = require("./brushes");

var Wall = {
	// The current wall coordinates
	x: 0, 
	y: 0,

	// The wall size
	width: window.innerWidth,
	height: window.innerHeight,

	// The tile store
	tiles: []
};

/**
 * Resize the wall to the window width.
 */
Wall.resize = function() {
	Wall.width = canvas.width = window.innerWidth;
	Wall.height = canvas.height = window.innerHeight;
};

/**
 * Update the wall.
 */
Wall.update = function() {

};

/**
 * Render the wall's current tiles
 */
Wall.render = function() {
	// Fill the background
	ctx.clearRect(0, 0, Wall.width, Wall.height);
	

	for(var y = 0, cy = Wall.tiles.height; y < cy; y++)
		for(var x = 0, cx = Wall.tiles.width; x < cx; x++) {
			var tile = Wall.tiles[y][x],
				px = tile.x - Wall.x,
				py = tile.y - Wall.y;

			tile.render(ctx, px, py);
		}


	ctx.fillText(Wall.x + ", " + Wall.y, Wall.width/2, Wall.height/2);
};

Wall.getTile = function() {

};

/**
 * Get tiles around a point.
 */
Wall.getTiles = function() {
	var x = Wall.x,
		y = Wall.y,

		tx = Tile.width,
		ty = Tile.height,

		wx = Wall.x,
		wy = Wall.y,

		// The amount of tiles we need to get
		lx = Math.ceil(Wall.width/tx) + 1,
		ly = Math.ceil(Wall.height/ty) + 1,

		// The tile overflow
		px = Math.abs(x % tx),
		py = Math.abs(y % ty),

		// The origin of the top left most tile we need to get
		ox = wx - px,
		oy = wy - py;

	for(var uy = 0; uy < ly; uy++) {
		var row = [];
		for(var ux = 0; ux < lx; ux++) {
			// The coordinates of each tile we have to get
			var ttx = ox + (tx * ux),
				tty = oy + (ty * uy);

			row.push(Tile.get(ttx, tty));
		}

		Wall.pushRow(Wall.BOTTOM_SIDE, row);
	}	

	// Add the wall dimensions in tiles to the tiles variable
	Wall.tiles.width = lx;
	Wall.tiles.height = ly;
};

/**
 * Wall side constants.
 * @type {Number}
 */
Wall.TOP_SIDE = 1;
Wall.RIGHT_SIDE = 2;
Wall.BOTTOM_SIDE = 3;
Wall.LEFT_SIDE = 4;

/**
 * Add a row to the wall.
 * @param  {Number} side  See Wall.[SIDE]_SIDE
 * @param  {Array} tiles  Array of tiles.
 */
Wall.pushRow = function(side, tiles) {
	if(side === Wall.TOP_SIDE) Wall.tiles.unshift(tiles), Wall.tiles.height++;
	else if(side === Wall.BOTTOM_SIDE) Wall.tiles.push(tiles), Wall.tiles.height++;
	else Wall.tiles.width++, Wall.tiles.forEach(function(row, i) {
		if(side === Wall.LEFT_SIDE) row.unshift(tiles[i]);
		else if(side === Wall.RIGHT_SIDE) row.push(tiles[i]); // Redundant if but keep it anyway
	});
};

/**
 * Remove a row from the wall.
 * @param  {Number} side See Wall.[SIDE]_SIDE
 */
Wall.popRow = function(side) {
	if(side === Wall.TOP_SIDE) Wall.tiles.shift(), Wall.tiles.height--;
	else if(side === Wall.BOTTOM_SIDE) Wall.tiles.pop(), Wall.tiles.height--;
	else Wall.tiles.width--, Wall.tiles.forEach(function(row) {
		if(side === Wall.LEFT_SIDE) row.shift();
		else if(side === Wall.RIGHT_SIDE) row.pop(); // Redundant if but keep it anyway
	});
};

/**
 * Get the next row of tiles.
 * @param  {Number} side See Wall.[SIDE]_SIDE
 * @return {Array}      Next row of tiles.
 */
Wall.getNextRow = function(side) {
	return Wall.getRow(side).map(function(tile) {
		return Tile.get(tile.x + ((side === Wall.LEFT_SIDE ? -1 : (side === Wall.RIGHT_SIDE ? 1 : 0)) * Tile.width), 
			tile.y + ((side === Wall.TOP_SIDE ? -1 : (side === Wall.BOTTOM_SIDE ? 1 : 0)) * Tile.height));
	});
};

/**
 * Get a row given the side.
 * @param  {Number} side See Wall.[SIDE]_SIDE
 * @return {Array}      Row
 */
Wall.getRow = function(side) {
	if(side === Wall.LEFT_SIDE || side === Wall.RIGHT_SIDE) return Wall.tiles.map(function(row) {
		return row[side === Wall.LEFT_SIDE ? 0 : row.length - 1];
	});

	else return Wall.tiles[side === Wall.TOP_SIDE ? 0 : Wall.tiles.length - 1];
};

/**
 * Pan the wall.
 * @param  {Number} x 
 * @param  {Number} y 
 */
Wall.pan = function(x, y) {
	var wx = Wall.x += x,
		wy = Wall.y += y,

		tw = Tile.width,
		th = Tile.height,

		// Get top left tile
		ttl = Wall.tiles[0][0], 

		bleedx = tw * 0.4,
		bleedy = th * 0.5;

	if(wy > (ttl.y + th + bleedy)) {
		Wall.popRow(Wall.TOP_SIDE);
		Wall.pushRow(Wall.BOTTOM_SIDE, Wall.getNextRow(Wall.BOTTOM_SIDE));
	}

	if(wx > (ttl.x + th + bleedx)) {
		Wall.popRow(Wall.LEFT_SIDE);
		Wall.pushRow(Wall.RIGHT_SIDE, Wall.getNextRow(Wall.RIGHT_SIDE));
	}

	if(wy < (ttl.y + bleedy)) {
		Wall.popRow(Wall.BOTTOM_SIDE);
		Wall.pushRow(Wall.TOP_SIDE, Wall.getNextRow(Wall.TOP_SIDE));
	}

	if(wx < (ttl.x + bleedx)) {
		Wall.popRow(Wall.RIGHT_SIDE);
		Wall.pushRow(Wall.LEFT_SIDE, Wall.getNextRow(Wall.LEFT_SIDE));
	}

};

Wall.init = function() {
	// Initially resize the wall to screen dimensions
	Wall.resize();

	// Bind the event handlers
	var drag = null;
	canvas.addEventListener("mousedown", function(event) {
		drag = event;
	});

	canvas.addEventListener("mousemove", function(event) {
		if(drag) Wall.ondrag.call(Wall, event, drag), drag = event;
	});

	canvas.addEventListener("mouseup", function(event) {
		drag = null;
	});

	// Initially get the tiles
	Wall.getTiles();

	// And render
	Wall.render();
};

// Event handlers
Wall.ondrag = function(event, previous) {
	Wall.pan(event.x - previous.x, event.y - previous.y);
	Wall.render();
};

Wall.onresize = function(event) {
	Wall.getTiles();
	Wall.render();
};

module.exports = Wall;
},{"./Tile":3,"./brushes":7}],5:[function(require,module,exports){
var Brush = require("../Brush");

module.exports = new Brush(function(ctx, x, y, x1, y1) {
	size = size/2;
	ctx.fillStyle = this.color;
	ctx.fillRect(x - this.size, y - this.size, this.size, this.size);
});
},{"../Brush":1}],6:[function(require,module,exports){
var Brush = require("../Brush");

module.exports = new Brush(function(ctx, x1, y1, x2, y2) {
	var velocity = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)),
		radius = this.size * ((75 - velocity)/75);

	ctx.fillStyle = this.color;
	ctx.beginPath();
	ctx.arc(x1, y1, radius, 0, Math.PI*2);
	ctx.closePath();
	ctx.fill();
});
},{"../Brush":1}],7:[function(require,module,exports){
module.exports = {
	basic: require("./Basic"),
	spray: require("./Spray")
};
},{"./Basic":5,"./Spray":6}],8:[function(require,module,exports){
(function (global){
var Tile = require("./Tile"),
	Wall = require("./Wall"),
	Grid = require("./Grid");

var canvas = global.canvas = document.getElementById("plate");
var ctx = global.ctx = canvas.getContext("2d");

// Event handlers
window.addEventListener("resize", Wall.onresize);

// Grab the starting coordinates
if(window.location.hash) {
	var coords = window.location.hash
		.replace("#", "").split(",")
		.map(function(coord) { return parseInt(coord); })
		.slice(0, 2);

	Wall.x = coords[0];
	Wall.y = coords[1];
}

window.wall = Wall;

// Initilize the wall
Wall.init();
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./Grid":2,"./Tile":3,"./Wall":4}]},{},[8])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYWRyaWFuL0Ryb3Bib3gvUHJvamVjdHMvdGhld2FsbC9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYWRyaWFuL0Ryb3Bib3gvUHJvamVjdHMvdGhld2FsbC9zdGF0aWMvZnVuY3Rpb24vQnJ1c2guanMiLCIvVXNlcnMvYWRyaWFuL0Ryb3Bib3gvUHJvamVjdHMvdGhld2FsbC9zdGF0aWMvZnVuY3Rpb24vR3JpZC5qcyIsIi9Vc2Vycy9hZHJpYW4vRHJvcGJveC9Qcm9qZWN0cy90aGV3YWxsL3N0YXRpYy9mdW5jdGlvbi9UaWxlLmpzIiwiL1VzZXJzL2Fkcmlhbi9Ecm9wYm94L1Byb2plY3RzL3RoZXdhbGwvc3RhdGljL2Z1bmN0aW9uL1dhbGwuanMiLCIvVXNlcnMvYWRyaWFuL0Ryb3Bib3gvUHJvamVjdHMvdGhld2FsbC9zdGF0aWMvZnVuY3Rpb24vYnJ1c2hlcy9CYXNpYy5qcyIsIi9Vc2Vycy9hZHJpYW4vRHJvcGJveC9Qcm9qZWN0cy90aGV3YWxsL3N0YXRpYy9mdW5jdGlvbi9icnVzaGVzL1NwcmF5LmpzIiwiL1VzZXJzL2Fkcmlhbi9Ecm9wYm94L1Byb2plY3RzL3RoZXdhbGwvc3RhdGljL2Z1bmN0aW9uL2JydXNoZXMvaW5kZXguanMiLCIvVXNlcnMvYWRyaWFuL0Ryb3Bib3gvUHJvamVjdHMvdGhld2FsbC9zdGF0aWMvZnVuY3Rpb24vZmFrZV81MDU4OGNmYi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNU9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBCcnVzaCA9IGZ1bmN0aW9uKHNldHVwLCByZW5kZXIpIHtcblx0aWYoIXJlbmRlcikgcmVuZGVyID0gc2V0dXA7XG5cdGVsc2Ugc2V0dXAuY2FsbCh0aGlzKTtcblxuXHQvLyBCcnVzaCBvcHRpb25zXG5cdHRoaXMuc2l6ZSA9IDEyO1xuXHR0aGlzLmNvbG9yID0gXCIjZjAwXCI7XG5cblx0dGhpcy5fcmVuZGVyID0gcmVuZGVyO1xufTtcblxuQnJ1c2gucHJvdG90eXBlLnBhaW50ID0gZnVuY3Rpb24oY3R4LCB4LCB5LCB4MSwgeTEpIHtcblx0dGhpcy5fcmVuZGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJydXNoOyIsIi8qKlxuICogQ3JlYXRlIGUgbmV3IGdyaWQuXG4gKiBAcGFyYW0ge051bWJlcn0gdmggVmlld3BvcnQgd2lkdGguXG4gKiBAcGFyYW0ge051bWJlcn0gdncgVmlld3BvcnQgaGVpZ2h0LlxuICogQHBhcmFtIHtOdW1iZXJ9IHRoIFRpbGUgd2lkdGguXG4gKiBAcGFyYW0ge051bWJlcn0gdHcgVGlsZSBoZWlnaHQuXG4gKiBAcGFyYW0ge051bWJlcn0gb3ggT3JpZ2luIHguICh0aGUgY2VudGVyKVxuICogQHBhcmFtIHtOdW1iZXJ9IG95IE9yaWdpbiB5LlxuICovXG52YXIgR3JpZCA9IGZ1bmN0aW9uKGN0eCwgdGgsIHR3LCBveCwgb3kpIHtcblx0dGhpcy52aCA9IGN0eC5jYW52YXMuaGVpZ2h0O1xuXHR0aGlzLnZ3ID0gY3R4LmNhbnZhcy5oZWlnaHQ7XG5cdHRoaXMudGggPSB0aDtcblx0dGhpcy50dyA9IHR3O1xuXHR0aGlzLm94ID0gb3g7XG5cdHRoaXMub3kgPSBveTtcbn07XG5cbkdyaWQuZm4gPSBHcmlkLnByb3RvdHlwZTtcblxuLy8gUHJlbG9hZCB0aHJlc2hvbGRcbi8vIElmIGEgdGlsZSBpcyBzaG93aW5nIGxlc3MgNjAlIG9uIGFueSBheGlzXG4vLyBhbm90aGVyIHRpbGUgaXMgcHJlbG9hZGVkIGJlaGluZCBpdFxuR3JpZC5mbi5QUkVMT0FEX1RIUkVTSE9MRCA9IDAuNjtcblxuR3JpZC5mbi5wYW4gPSBmdW5jdGlvbih4LCB5KSB7XG5cdHRoaXMub3ggKz0geDtcblx0dGhpcy5veSArPSB5O1xufTtcblxuR3JpZC5mbi5yZW5kZXIgPSBmdW5jdGlvbigpIHtcblx0Zm9yKHZhciB1eSA9IC1NYXRoLmNlaWwoKHRoaXMudmgvMikvdGhpcy50aCksIHZ5ID0gLXV5OyB1eSA8PSB2eTsgdXkrKykge1xuXHRcdGZvcih2YXIgdXggPSAtTWF0aC5jZWlsKCh0aGlzLnZ3LzIpL3RoaXMudHcpLCB2eCA9IC11eDsgdXggPD0gdng7IHV4KyspIHtcblxuXHRcdFx0dmFyIHggPSAodXggKiB0aGlzLnR3KSArIHRoaXMub3gsIFxuXHRcdFx0XHR5ID0gKHV5ICogdGhpcy50aCkgKyB0aGlzLm95O1xuXG5cdFx0XHR0aGlzLmdldFRpbGUoeCwgeSkucmVuZGVyKCk7XG5cdFx0fVxuXHR9XG59O1xuXG5HcmlkLmZuLmdldFRpbGUgPSBmdW5jdGlvbih4LCB5KSB7XG5cdHJldHVybiBuZXcgR3JpZC5UaWxlKHgsIHkpO1xufTtcblxuR3JpZC5UaWxlID0gZnVuY3Rpb24oeCwgeSkge1xuXHR0aGlzLnggPSB4O1xuXHR0aGlzLnkgPSB5O1xufTtcblxuR3JpZC5UaWxlLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbigpIHtcblx0Y29uc29sZS5sb2codGhpcy50b1N0cmluZygpKTtcblx0aWYodGhpcy5pbWcpIHtcblx0XHQvLyBEcmF3IGltYWdlXG5cdH0gZWxzZSB7XG5cdFx0Ly8gRHJhdyBibGFua1xuXHR9XG59O1xuXG5HcmlkLlRpbGUucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiBcIlRpbGUgW1wiICsgdGhpcy54ICsgXCIsIFwiICsgdGhpcy55ICsgXCJdXCI7XG59IiwiLyoqXG4gKiBDcmVhdGUgYSBuZXcgdGlsZS5cbiAqL1xudmFyIFRpbGUgPSBmdW5jdGlvbih4LCB5LCBpbWFnZSkge1xuXHR0aGlzLmlkID0gVGlsZS5nZXRQYXRoTmFtZSh4LCB5KTtcblxuXHQvLyBTZXQgdGhlIGltYWdlIHRvIGJsYW5rIHdoaWxlIGxvYWRpbmdcblx0dGhpcy5pbWFnZSA9IFRpbGUuYmxhbms7XG5cblx0dmFyIHRoYXQgPSB0aGlzO1xuXHRUaWxlLmZldGNoKHRoaXMuaWQsIGZ1bmN0aW9uKGltYWdlKSB7XG5cdFx0dGhhdC5pbWFnZSA9IGltYWdlO1xuXHR9KTtcblx0XG5cdHRoaXMueCA9IHg7XG5cdHRoaXMueSA9IHk7XG59O1xuXG4vKipcbiAqIFRpbGUgZGltZW5zaW9ucy5cbiAqIEB0eXBlIHtOdW1iZXJ9XG4gKi9cblRpbGUud2lkdGggPSA0MDA7XG5UaWxlLmhlaWdodCA9IDMwMDtcblxuLyoqXG4gKiBUaGUgbWF4aW11bSBhbW91bnQgb2YgVGlsZSBvYmplY3RzIHN0b3JlZCBpbiBtZW1vcnkuXG4gKiBAdHlwZSB7TnVtYmVyfVxuICovXG5UaWxlLkNBQ0hFX1NJWkVfTElNSVQgPSAxMDA7XG5cbi8qKlxuICogVGlsZSBjYWNoZS5cbiAqIEB0eXBlIHtPYmplY3R9XG4gKi9cblRpbGUuY2FjaGUgPSB7fTtcblRpbGUuY2FjaGUua2V5cyA9IFtdO1xuXG4vKipcbiAqIEludmFsaWRhdGUgYSB0aWxlIGluIHRoZSBjYWNoZS5cbiAqIEBwYXJhbSAge1N0cmluZ30gaWQgVGlsZSBpZCBpbiBjYWNoZS5cbiAqL1xuVGlsZS5jYWNoZS5pbnZhbGlkYXRlID0gZnVuY3Rpb24oaWQpIHtcblx0ZGVsZXRlIFRpbGUuY2FjaGVbaWRdO1xufTtcblxuVGlsZS5jYWNoZS5hZGQgPSBmdW5jdGlvbihpZCwgdGlsZSkge1xuXHRUaWxlLmNhY2hlLmtleXMucHVzaChpZCk7XG5cdFRpbGUuY2FjaGVbaWRdID0gdGlsZTtcblxuXHQvLyBDYW4ndCBsZXQgdGhlIGNhY2hlIGdldCB0b28gYmlnXG5cdGlmKFRpbGUuY2FjaGUua2V5cy5sZW5ndGggPiBUaWxlLkNBQ0hFX1NJWkVfTElNSVQpIFRpbGUuaW52YWxpZGF0ZShUaWxlLmNhY2hlLmtleXMudW5zaGlmdCgpKTtcbn07XG5cbi8qKlxuICogR2V0IGEgdGlsZSBnaXZlbiBjb29yZGluYXRlcy4gSWYgdGhlIHRpbGUgaXMgaW4gdGhlIGNhY2hlLFxuICogc2VydmUgdGhhdCB0aWxlLCBlbHNlIGNyZWF0ZSBhIG5ldyB0aWxlLlxuICogQHBhcmFtICB7TnVtYmVyfSB4IFxuICogQHBhcmFtICB7TnVtYmVyfSB5IFxuICogQHJldHVybiB7VGlsZX0gXG4gKi9cblRpbGUuZ2V0ID0gZnVuY3Rpb24oeCwgeSkge1xuXHR2YXIgaWQgPSBUaWxlLmdldFBhdGhOYW1lKHgsIHkpO1xuXHRpZihUaWxlLmNhY2hlW2lkXSkgcmV0dXJuIFRpbGUuY2FjaGVbaWRdO1xuXHRlbHNlIHtcblx0XHR2YXIgdGlsZSA9IG5ldyBUaWxlKHgsIHkpO1xuXHRcdFRpbGUuY2FjaGUuYWRkKGlkLCB0aWxlKTtcblx0XHRyZXR1cm4gdGlsZTtcblx0fVxufTtcblxuLyoqXG4gKiBSZW5kZXIgYSB0aWxlIG9udG8gYSBjYW52YXMuXG4gKi9cblRpbGUucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKGN0eCwgeCwgeSkge1xuXHRjdHguZHJhd0ltYWdlKHRoaXMuaW1hZ2UsIHgsIHkpO1xuXHRjdHguZm9udCA9IFwiMTJweCBBcmlhbFwiO1xuXHRjdHguZmlsbFN0eWxlID0gXCIjMDAwXCI7XG5cdGN0eC5maWxsVGV4dCh0aGlzLnggKyBcIiwgXCIgKyB0aGlzLnksIHggKyAoVGlsZS53aWR0aC8yKSwgeSArIChUaWxlLmhlaWdodC8yKSk7XG59O1xuXG4vKipcbiAqIFNhdmUgYSB0aWxlIHRvIHRoZSBzZXJ2ZXIuXG4gKi9cblRpbGUucHJvdG90eXBlLnNhdmUgPSBmdW5jdGlvbigpIHtcblxufTtcblxuLyoqXG4gKiBGZXRjaCBhIHRpbGUgZnJvbSB0aGUgc2VydmVyLlxuICogQHBhcmFtICB7U3RyaW5nfSAgIHVybCAgICAgIFxuICogQHBhcmFtICB7RnVuY3Rpb259IGNhbGxiYWNrIFxuICovXG5UaWxlLmZldGNoID0gZnVuY3Rpb24odXJsLCBjYWxsYmFjaykge1xuXHR2YXIgaW1nID0gbmV3IEltYWdlKCk7XG5cblx0aW1nLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuXHRcdGNhbGxiYWNrKGltZyk7XG5cdH07XG5cblx0aW1nLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcblx0XHRjYWxsYmFjayhUaWxlLmJsYW5rKTtcblx0fTtcblxuXHRpbWcuc3JjID0gdXJsO1xufTtcblxuLyoqXG4gKiBSZXR1cm4gdGhlIHRpbGUgbmFtZSBhY2NvcmRpbmcgdG8gdGhlIHNwZWMuXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHggXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHkgXG4gKiBAcmV0dXJuIHtTdHJpbmd9ICAgUGF0aCBuYW1lLlxuICovXG5UaWxlLmdldFBhdGhOYW1lID0gZnVuY3Rpb24oeCwgeSkge1xuXHRyZXR1cm4gXCJ0aWxlcy9cIiArIHggKyBcIl9cIiArIHkgKyBcIi5wbmdcIjtcbn07XG5cbi8vIENyZWF0ZSBhIGJsYW5rIGltYWdlXG5UaWxlLmJsYW5rID0gKGZ1bmN0aW9uKCkge1xuXHR2YXIgaW1nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKSxcblx0XHRjdHggPSBpbWcuZ2V0Q29udGV4dChcIjJkXCIpO1xuXG5cdGltZy53aWR0aCA9IFRpbGUud2lkdGg7XG5cdGltZy5oZWlnaHQgPSBUaWxlLmhlaWdodDtcblxuXHRjdHguZmlsbFN0eWxlID0gXCIjZjAwXCI7XG5cdGN0eC5maWxsUmVjdCgwLCAwLCBUaWxlLndpZHRoLCBUaWxlLmhlaWdodCk7XG5cdGN0eC5maWxsU3R5bGUgPSBcIiNmZmZcIjtcblx0Y3R4LmZpbGxSZWN0KDIsIDIsIFRpbGUud2lkdGggLSAyLCBUaWxlLmhlaWdodCAtIDIpO1xuXG5cdHJldHVybiBpbWc7XG59KSgpO1xuXG4vLyBDaXJjdW12ZW50IHRoZSBjaXJjdWxhciBkZXBlbmRhbmNpZXNcbm1vZHVsZS5leHBvcnRzID0gVGlsZTsiLCJ2YXIgVGlsZSA9IHJlcXVpcmUoXCIuL1RpbGVcIiksXG5cdEJydXNoZXMgPSByZXF1aXJlKFwiLi9icnVzaGVzXCIpO1xuXG52YXIgV2FsbCA9IHtcblx0Ly8gVGhlIGN1cnJlbnQgd2FsbCBjb29yZGluYXRlc1xuXHR4OiAwLCBcblx0eTogMCxcblxuXHQvLyBUaGUgd2FsbCBzaXplXG5cdHdpZHRoOiB3aW5kb3cuaW5uZXJXaWR0aCxcblx0aGVpZ2h0OiB3aW5kb3cuaW5uZXJIZWlnaHQsXG5cblx0Ly8gVGhlIHRpbGUgc3RvcmVcblx0dGlsZXM6IFtdXG59O1xuXG4vKipcbiAqIFJlc2l6ZSB0aGUgd2FsbCB0byB0aGUgd2luZG93IHdpZHRoLlxuICovXG5XYWxsLnJlc2l6ZSA9IGZ1bmN0aW9uKCkge1xuXHRXYWxsLndpZHRoID0gY2FudmFzLndpZHRoID0gd2luZG93LmlubmVyV2lkdGg7XG5cdFdhbGwuaGVpZ2h0ID0gY2FudmFzLmhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcbn07XG5cbi8qKlxuICogVXBkYXRlIHRoZSB3YWxsLlxuICovXG5XYWxsLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuXG59O1xuXG4vKipcbiAqIFJlbmRlciB0aGUgd2FsbCdzIGN1cnJlbnQgdGlsZXNcbiAqL1xuV2FsbC5yZW5kZXIgPSBmdW5jdGlvbigpIHtcblx0Ly8gRmlsbCB0aGUgYmFja2dyb3VuZFxuXHRjdHguY2xlYXJSZWN0KDAsIDAsIFdhbGwud2lkdGgsIFdhbGwuaGVpZ2h0KTtcblx0XG5cblx0Zm9yKHZhciB5ID0gMCwgY3kgPSBXYWxsLnRpbGVzLmhlaWdodDsgeSA8IGN5OyB5KyspXG5cdFx0Zm9yKHZhciB4ID0gMCwgY3ggPSBXYWxsLnRpbGVzLndpZHRoOyB4IDwgY3g7IHgrKykge1xuXHRcdFx0dmFyIHRpbGUgPSBXYWxsLnRpbGVzW3ldW3hdLFxuXHRcdFx0XHRweCA9IHRpbGUueCAtIFdhbGwueCxcblx0XHRcdFx0cHkgPSB0aWxlLnkgLSBXYWxsLnk7XG5cblx0XHRcdHRpbGUucmVuZGVyKGN0eCwgcHgsIHB5KTtcblx0XHR9XG5cblxuXHRjdHguZmlsbFRleHQoV2FsbC54ICsgXCIsIFwiICsgV2FsbC55LCBXYWxsLndpZHRoLzIsIFdhbGwuaGVpZ2h0LzIpO1xufTtcblxuV2FsbC5nZXRUaWxlID0gZnVuY3Rpb24oKSB7XG5cbn07XG5cbi8qKlxuICogR2V0IHRpbGVzIGFyb3VuZCBhIHBvaW50LlxuICovXG5XYWxsLmdldFRpbGVzID0gZnVuY3Rpb24oKSB7XG5cdHZhciB4ID0gV2FsbC54LFxuXHRcdHkgPSBXYWxsLnksXG5cblx0XHR0eCA9IFRpbGUud2lkdGgsXG5cdFx0dHkgPSBUaWxlLmhlaWdodCxcblxuXHRcdHd4ID0gV2FsbC54LFxuXHRcdHd5ID0gV2FsbC55LFxuXG5cdFx0Ly8gVGhlIGFtb3VudCBvZiB0aWxlcyB3ZSBuZWVkIHRvIGdldFxuXHRcdGx4ID0gTWF0aC5jZWlsKFdhbGwud2lkdGgvdHgpICsgMSxcblx0XHRseSA9IE1hdGguY2VpbChXYWxsLmhlaWdodC90eSkgKyAxLFxuXG5cdFx0Ly8gVGhlIHRpbGUgb3ZlcmZsb3dcblx0XHRweCA9IE1hdGguYWJzKHggJSB0eCksXG5cdFx0cHkgPSBNYXRoLmFicyh5ICUgdHkpLFxuXG5cdFx0Ly8gVGhlIG9yaWdpbiBvZiB0aGUgdG9wIGxlZnQgbW9zdCB0aWxlIHdlIG5lZWQgdG8gZ2V0XG5cdFx0b3ggPSB3eCAtIHB4LFxuXHRcdG95ID0gd3kgLSBweTtcblxuXHRmb3IodmFyIHV5ID0gMDsgdXkgPCBseTsgdXkrKykge1xuXHRcdHZhciByb3cgPSBbXTtcblx0XHRmb3IodmFyIHV4ID0gMDsgdXggPCBseDsgdXgrKykge1xuXHRcdFx0Ly8gVGhlIGNvb3JkaW5hdGVzIG9mIGVhY2ggdGlsZSB3ZSBoYXZlIHRvIGdldFxuXHRcdFx0dmFyIHR0eCA9IG94ICsgKHR4ICogdXgpLFxuXHRcdFx0XHR0dHkgPSBveSArICh0eSAqIHV5KTtcblxuXHRcdFx0cm93LnB1c2goVGlsZS5nZXQodHR4LCB0dHkpKTtcblx0XHR9XG5cblx0XHRXYWxsLnB1c2hSb3coV2FsbC5CT1RUT01fU0lERSwgcm93KTtcblx0fVx0XG5cblx0Ly8gQWRkIHRoZSB3YWxsIGRpbWVuc2lvbnMgaW4gdGlsZXMgdG8gdGhlIHRpbGVzIHZhcmlhYmxlXG5cdFdhbGwudGlsZXMud2lkdGggPSBseDtcblx0V2FsbC50aWxlcy5oZWlnaHQgPSBseTtcbn07XG5cbi8qKlxuICogV2FsbCBzaWRlIGNvbnN0YW50cy5cbiAqIEB0eXBlIHtOdW1iZXJ9XG4gKi9cbldhbGwuVE9QX1NJREUgPSAxO1xuV2FsbC5SSUdIVF9TSURFID0gMjtcbldhbGwuQk9UVE9NX1NJREUgPSAzO1xuV2FsbC5MRUZUX1NJREUgPSA0O1xuXG4vKipcbiAqIEFkZCBhIHJvdyB0byB0aGUgd2FsbC5cbiAqIEBwYXJhbSAge051bWJlcn0gc2lkZSAgU2VlIFdhbGwuW1NJREVdX1NJREVcbiAqIEBwYXJhbSAge0FycmF5fSB0aWxlcyAgQXJyYXkgb2YgdGlsZXMuXG4gKi9cbldhbGwucHVzaFJvdyA9IGZ1bmN0aW9uKHNpZGUsIHRpbGVzKSB7XG5cdGlmKHNpZGUgPT09IFdhbGwuVE9QX1NJREUpIFdhbGwudGlsZXMudW5zaGlmdCh0aWxlcyksIFdhbGwudGlsZXMuaGVpZ2h0Kys7XG5cdGVsc2UgaWYoc2lkZSA9PT0gV2FsbC5CT1RUT01fU0lERSkgV2FsbC50aWxlcy5wdXNoKHRpbGVzKSwgV2FsbC50aWxlcy5oZWlnaHQrKztcblx0ZWxzZSBXYWxsLnRpbGVzLndpZHRoKyssIFdhbGwudGlsZXMuZm9yRWFjaChmdW5jdGlvbihyb3csIGkpIHtcblx0XHRpZihzaWRlID09PSBXYWxsLkxFRlRfU0lERSkgcm93LnVuc2hpZnQodGlsZXNbaV0pO1xuXHRcdGVsc2UgaWYoc2lkZSA9PT0gV2FsbC5SSUdIVF9TSURFKSByb3cucHVzaCh0aWxlc1tpXSk7IC8vIFJlZHVuZGFudCBpZiBidXQga2VlcCBpdCBhbnl3YXlcblx0fSk7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBhIHJvdyBmcm9tIHRoZSB3YWxsLlxuICogQHBhcmFtICB7TnVtYmVyfSBzaWRlIFNlZSBXYWxsLltTSURFXV9TSURFXG4gKi9cbldhbGwucG9wUm93ID0gZnVuY3Rpb24oc2lkZSkge1xuXHRpZihzaWRlID09PSBXYWxsLlRPUF9TSURFKSBXYWxsLnRpbGVzLnNoaWZ0KCksIFdhbGwudGlsZXMuaGVpZ2h0LS07XG5cdGVsc2UgaWYoc2lkZSA9PT0gV2FsbC5CT1RUT01fU0lERSkgV2FsbC50aWxlcy5wb3AoKSwgV2FsbC50aWxlcy5oZWlnaHQtLTtcblx0ZWxzZSBXYWxsLnRpbGVzLndpZHRoLS0sIFdhbGwudGlsZXMuZm9yRWFjaChmdW5jdGlvbihyb3cpIHtcblx0XHRpZihzaWRlID09PSBXYWxsLkxFRlRfU0lERSkgcm93LnNoaWZ0KCk7XG5cdFx0ZWxzZSBpZihzaWRlID09PSBXYWxsLlJJR0hUX1NJREUpIHJvdy5wb3AoKTsgLy8gUmVkdW5kYW50IGlmIGJ1dCBrZWVwIGl0IGFueXdheVxuXHR9KTtcbn07XG5cbi8qKlxuICogR2V0IHRoZSBuZXh0IHJvdyBvZiB0aWxlcy5cbiAqIEBwYXJhbSAge051bWJlcn0gc2lkZSBTZWUgV2FsbC5bU0lERV1fU0lERVxuICogQHJldHVybiB7QXJyYXl9ICAgICAgTmV4dCByb3cgb2YgdGlsZXMuXG4gKi9cbldhbGwuZ2V0TmV4dFJvdyA9IGZ1bmN0aW9uKHNpZGUpIHtcblx0cmV0dXJuIFdhbGwuZ2V0Um93KHNpZGUpLm1hcChmdW5jdGlvbih0aWxlKSB7XG5cdFx0cmV0dXJuIFRpbGUuZ2V0KHRpbGUueCArICgoc2lkZSA9PT0gV2FsbC5MRUZUX1NJREUgPyAtMSA6IChzaWRlID09PSBXYWxsLlJJR0hUX1NJREUgPyAxIDogMCkpICogVGlsZS53aWR0aCksIFxuXHRcdFx0dGlsZS55ICsgKChzaWRlID09PSBXYWxsLlRPUF9TSURFID8gLTEgOiAoc2lkZSA9PT0gV2FsbC5CT1RUT01fU0lERSA/IDEgOiAwKSkgKiBUaWxlLmhlaWdodCkpO1xuXHR9KTtcbn07XG5cbi8qKlxuICogR2V0IGEgcm93IGdpdmVuIHRoZSBzaWRlLlxuICogQHBhcmFtICB7TnVtYmVyfSBzaWRlIFNlZSBXYWxsLltTSURFXV9TSURFXG4gKiBAcmV0dXJuIHtBcnJheX0gICAgICBSb3dcbiAqL1xuV2FsbC5nZXRSb3cgPSBmdW5jdGlvbihzaWRlKSB7XG5cdGlmKHNpZGUgPT09IFdhbGwuTEVGVF9TSURFIHx8IHNpZGUgPT09IFdhbGwuUklHSFRfU0lERSkgcmV0dXJuIFdhbGwudGlsZXMubWFwKGZ1bmN0aW9uKHJvdykge1xuXHRcdHJldHVybiByb3dbc2lkZSA9PT0gV2FsbC5MRUZUX1NJREUgPyAwIDogcm93Lmxlbmd0aCAtIDFdO1xuXHR9KTtcblxuXHRlbHNlIHJldHVybiBXYWxsLnRpbGVzW3NpZGUgPT09IFdhbGwuVE9QX1NJREUgPyAwIDogV2FsbC50aWxlcy5sZW5ndGggLSAxXTtcbn07XG5cbi8qKlxuICogUGFuIHRoZSB3YWxsLlxuICogQHBhcmFtICB7TnVtYmVyfSB4IFxuICogQHBhcmFtICB7TnVtYmVyfSB5IFxuICovXG5XYWxsLnBhbiA9IGZ1bmN0aW9uKHgsIHkpIHtcblx0dmFyIHd4ID0gV2FsbC54ICs9IHgsXG5cdFx0d3kgPSBXYWxsLnkgKz0geSxcblxuXHRcdHR3ID0gVGlsZS53aWR0aCxcblx0XHR0aCA9IFRpbGUuaGVpZ2h0LFxuXG5cdFx0Ly8gR2V0IHRvcCBsZWZ0IHRpbGVcblx0XHR0dGwgPSBXYWxsLnRpbGVzWzBdWzBdLCBcblxuXHRcdGJsZWVkeCA9IHR3ICogMC40LFxuXHRcdGJsZWVkeSA9IHRoICogMC41O1xuXG5cdGlmKHd5ID4gKHR0bC55ICsgdGggKyBibGVlZHkpKSB7XG5cdFx0V2FsbC5wb3BSb3coV2FsbC5UT1BfU0lERSk7XG5cdFx0V2FsbC5wdXNoUm93KFdhbGwuQk9UVE9NX1NJREUsIFdhbGwuZ2V0TmV4dFJvdyhXYWxsLkJPVFRPTV9TSURFKSk7XG5cdH1cblxuXHRpZih3eCA+ICh0dGwueCArIHRoICsgYmxlZWR4KSkge1xuXHRcdFdhbGwucG9wUm93KFdhbGwuTEVGVF9TSURFKTtcblx0XHRXYWxsLnB1c2hSb3coV2FsbC5SSUdIVF9TSURFLCBXYWxsLmdldE5leHRSb3coV2FsbC5SSUdIVF9TSURFKSk7XG5cdH1cblxuXHRpZih3eSA8ICh0dGwueSArIGJsZWVkeSkpIHtcblx0XHRXYWxsLnBvcFJvdyhXYWxsLkJPVFRPTV9TSURFKTtcblx0XHRXYWxsLnB1c2hSb3coV2FsbC5UT1BfU0lERSwgV2FsbC5nZXROZXh0Um93KFdhbGwuVE9QX1NJREUpKTtcblx0fVxuXG5cdGlmKHd4IDwgKHR0bC54ICsgYmxlZWR4KSkge1xuXHRcdFdhbGwucG9wUm93KFdhbGwuUklHSFRfU0lERSk7XG5cdFx0V2FsbC5wdXNoUm93KFdhbGwuTEVGVF9TSURFLCBXYWxsLmdldE5leHRSb3coV2FsbC5MRUZUX1NJREUpKTtcblx0fVxuXG59O1xuXG5XYWxsLmluaXQgPSBmdW5jdGlvbigpIHtcblx0Ly8gSW5pdGlhbGx5IHJlc2l6ZSB0aGUgd2FsbCB0byBzY3JlZW4gZGltZW5zaW9uc1xuXHRXYWxsLnJlc2l6ZSgpO1xuXG5cdC8vIEJpbmQgdGhlIGV2ZW50IGhhbmRsZXJzXG5cdHZhciBkcmFnID0gbnVsbDtcblx0Y2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRkcmFnID0gZXZlbnQ7XG5cdH0pO1xuXG5cdGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0aWYoZHJhZykgV2FsbC5vbmRyYWcuY2FsbChXYWxsLCBldmVudCwgZHJhZyksIGRyYWcgPSBldmVudDtcblx0fSk7XG5cblx0Y2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZXVwXCIsIGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0ZHJhZyA9IG51bGw7XG5cdH0pO1xuXG5cdC8vIEluaXRpYWxseSBnZXQgdGhlIHRpbGVzXG5cdFdhbGwuZ2V0VGlsZXMoKTtcblxuXHQvLyBBbmQgcmVuZGVyXG5cdFdhbGwucmVuZGVyKCk7XG59O1xuXG4vLyBFdmVudCBoYW5kbGVyc1xuV2FsbC5vbmRyYWcgPSBmdW5jdGlvbihldmVudCwgcHJldmlvdXMpIHtcblx0V2FsbC5wYW4oZXZlbnQueCAtIHByZXZpb3VzLngsIGV2ZW50LnkgLSBwcmV2aW91cy55KTtcblx0V2FsbC5yZW5kZXIoKTtcbn07XG5cbldhbGwub25yZXNpemUgPSBmdW5jdGlvbihldmVudCkge1xuXHRXYWxsLmdldFRpbGVzKCk7XG5cdFdhbGwucmVuZGVyKCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFdhbGw7IiwidmFyIEJydXNoID0gcmVxdWlyZShcIi4uL0JydXNoXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBCcnVzaChmdW5jdGlvbihjdHgsIHgsIHksIHgxLCB5MSkge1xuXHRzaXplID0gc2l6ZS8yO1xuXHRjdHguZmlsbFN0eWxlID0gdGhpcy5jb2xvcjtcblx0Y3R4LmZpbGxSZWN0KHggLSB0aGlzLnNpemUsIHkgLSB0aGlzLnNpemUsIHRoaXMuc2l6ZSwgdGhpcy5zaXplKTtcbn0pOyIsInZhciBCcnVzaCA9IHJlcXVpcmUoXCIuLi9CcnVzaFwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgQnJ1c2goZnVuY3Rpb24oY3R4LCB4MSwgeTEsIHgyLCB5Mikge1xuXHR2YXIgdmVsb2NpdHkgPSBNYXRoLnNxcnQoTWF0aC5wb3coeDIgLSB4MSwgMikgKyBNYXRoLnBvdyh5MiAtIHkxLCAyKSksXG5cdFx0cmFkaXVzID0gdGhpcy5zaXplICogKCg3NSAtIHZlbG9jaXR5KS83NSk7XG5cblx0Y3R4LmZpbGxTdHlsZSA9IHRoaXMuY29sb3I7XG5cdGN0eC5iZWdpblBhdGgoKTtcblx0Y3R4LmFyYyh4MSwgeTEsIHJhZGl1cywgMCwgTWF0aC5QSSoyKTtcblx0Y3R4LmNsb3NlUGF0aCgpO1xuXHRjdHguZmlsbCgpO1xufSk7IiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cdGJhc2ljOiByZXF1aXJlKFwiLi9CYXNpY1wiKSxcblx0c3ByYXk6IHJlcXVpcmUoXCIuL1NwcmF5XCIpXG59OyIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbnZhciBUaWxlID0gcmVxdWlyZShcIi4vVGlsZVwiKSxcblx0V2FsbCA9IHJlcXVpcmUoXCIuL1dhbGxcIiksXG5cdEdyaWQgPSByZXF1aXJlKFwiLi9HcmlkXCIpO1xuXG52YXIgY2FudmFzID0gZ2xvYmFsLmNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicGxhdGVcIik7XG52YXIgY3R4ID0gZ2xvYmFsLmN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XG5cbi8vIEV2ZW50IGhhbmRsZXJzXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLCBXYWxsLm9ucmVzaXplKTtcblxuLy8gR3JhYiB0aGUgc3RhcnRpbmcgY29vcmRpbmF0ZXNcbmlmKHdpbmRvdy5sb2NhdGlvbi5oYXNoKSB7XG5cdHZhciBjb29yZHMgPSB3aW5kb3cubG9jYXRpb24uaGFzaFxuXHRcdC5yZXBsYWNlKFwiI1wiLCBcIlwiKS5zcGxpdChcIixcIilcblx0XHQubWFwKGZ1bmN0aW9uKGNvb3JkKSB7IHJldHVybiBwYXJzZUludChjb29yZCk7IH0pXG5cdFx0LnNsaWNlKDAsIDIpO1xuXG5cdFdhbGwueCA9IGNvb3Jkc1swXTtcblx0V2FsbC55ID0gY29vcmRzWzFdO1xufVxuXG53aW5kb3cud2FsbCA9IFdhbGw7XG5cbi8vIEluaXRpbGl6ZSB0aGUgd2FsbFxuV2FsbC5pbml0KCk7XG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSJdfQ==
