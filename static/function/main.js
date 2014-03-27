(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Brush = function(fn) {
	if(fn.setup) setup.call(this);

	// Brush options
	this.size = 12;
	this.color = "#f00";

	// Save the render and outline functions
	this._render = fn.render;
	this._stamp = fn.stamp;

	// Create the outline
	this.stamp = document.createElement("canvas").getContext("2d");

	// Run the outline
	if(fn.stamp) this.refreshOutline();
};

Brush.prototype.paint = function(ctx, x, y, x1, y1) {
	this._render.apply(this, arguments);
};

Brush.prototype.setSize = function(size) {
	this.size = size;
	if(fn.stamp) this.refreshOutline();
};

Brush.prototype.setColor = function(color) {
	this.color = color;
	if(fn.stamp) this.refreshOutline();
};

Brush.prototype.refreshOutline = function() {
	this._stamp.call(this, this.stamp.canvas, this.stamp);
};

module.exports = Brush;
},{}],2:[function(require,module,exports){
var Brushes = require("./brushes");

var GUI = module.exports = {
	ui: {
		loader: "#gui .loader",
		coords: "#coords",
		link: "#link"
	},

	loading: function(state) {
		if(state) GUI.ui.loader.classList.add("loading");
		else GUI.ui.loader.classList.remove("loading");
	},

	setCoords: function(x, y) {
		coords.innerText = "(" + x + ", " + y + ")";
	},

	updateCursor: function(brush) {
		// Set the cursor
		document.body.style.cursor = "url('" + Brushes.current.stamp.canvas.toDataURL() + "'), auto";
	},

	init: function() {
		for(var elem in GUI.ui)
			GUI.ui[elem] = document.querySelector(GUI.ui[elem]);

		Brushes.current = Brushes.basic;

		// Set the current brush
		GUI.updateCursor();
	}
};
},{"./brushes":7}],3:[function(require,module,exports){
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
},{"./GUI":2}],4:[function(require,module,exports){
var Tile = require("./Tile"),
	Brushes = require("./brushes"),
	GUI = require("./GUI");

var Wall = {
	// The current wall coordinates
	x: 0, 
	y: 0,

	// The wall size
	width: window.innerWidth,
	height: window.innerHeight,

	// The render engine
	running: true,

	// The tile store
	tiles: []
};

/**
 * Render the wall's current tiles
 */
Wall.render = function() {
	// Fill the background
	ctx.clearRect(0, 0, Wall.width, Wall.height);

	// Loop over the tiles in the buffer
	for(var y = 0, cy = Wall.tiles.height; y < cy; y++)
		for(var x = 0, cx = Wall.tiles.width; x < cx; x++) {
			var tile = Wall.tiles[y][x],
				px = tile.x - Wall.x,
				py = tile.y - Wall.y;

			// Render the tiles at the correct coorindates
			tile.render(ctx, px, py);
		}
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
		// Create the row
		var row = [];

		for(var ux = 0; ux < lx; ux++) {
			// The coordinates of each tile we have to get
			var ttx = ox + (tx * ux),
				tty = oy + (ty * uy);

			row.push(Tile.get(ttx, tty));
		}

		// And push the row to the wall
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
 * Get a tile at a coordinate.
 * @param  {Number} x 
 * @param  {Number} y 
 * @return {Tile} 
 */
Wall.getTileAtCoord = function(x, y) {
	var ttl = Wall.tiles[0][0],
		ox = ttl.x - Wall.x,
		oy = ttl.y - Wall.y,
		vw = Wall.tiles.width * Tile.width,
		vh = Wall.tiles.height * Tile.height;

	if(x > ox && x < vw && y > oy && y < vh) {
		return Wall.tiles[Math.floor((y - oy)/Tile.height)][Math.floor((x - ox)/Tile.width)];
	}
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
		bleedy = th * 0.3;

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

	GUI.setCoords(Wall.x, Wall.y);
};

/**
 * Bake the current context onto the tiles.
 */
Wall.bake = function() {
	//TODO: ACCOUNT FOR DAMN OFFSCREEN SHIT
	for(var y = 0, ly = Wall.tiles.height; y < ly; y++)
		for(var x = 0, lx = Wall.tiles.width; x < lx; x++) {
			var tile = Wall.tiles[y][x],
				tctx = tile.getContext(),

				ww = Wall.width,
				wh = Wall.height,

				ox = tile.x - Wall.x,
				oy = tile.y - Wall.y,

				cx = ww - ox,
				cy = wh - oy;

			console.log(ox, oy, cx, cy);
			
		}
};

Wall.init = function() {
	// Initially resize the wall to screen dimensions
	Wall.resize();

	// Bind the event handlers
	var drag = null, dragstart = false;
	window.addEventListener("mousedown", function(event) {
		event.preventDefault();
		drag = event;
		dragstart = true;
	});

	window.addEventListener("mousemove", function(event) {
		if(dragstart) Wall.dragstart.call(Wall, event), dragstart = false;
		if(drag) event.preventDefault(), Wall.drag.call(Wall, event, drag), drag = event;
	});

	window.addEventListener("mouseup", function(event) {
		event.preventDefault();
		if(drag) Wall.dragend.call(Wall, event), drag = null;
	});

	window.addEventListener("mousewheel", function(event) {
		Wall.pan(event.wheelDeltaX, event.wheelDeltaY);
	});

	// Event handlers
	window.addEventListener("resize", function() {
		Wall.resize();
	});


	// Bind the link handler. Pity I can't keep this in GUI.js,
	// circular dependancies.
	GUI.ui.link.addEventListener("click", function() {
		window.location.hash = "#" + Wall.x + "," + Wall.y;
	});

	// Pick a brush
	Brushes.current = Brushes.basic;

	// Initially get the tiles
	Wall.getTiles();

	// And begin the render loop
	(function tick() {
		requestAnimationFrame(tick);
		if(Wall.running) Wall.render();
	})();
};

// Event handlers
Wall.dragstart = function(event) {
	// Pause the render engine to give a chance for the drawing
	Wall.running = false;
};

Wall.dragend = function(event) {
	// Saved what's drawn to the tiles and resume
	Wall.bake();

	Wall.running = true;
};

Wall.drag = function(event, previous) {
	console.log("DRAGGED!", event.shiftKey);
	if(event.shiftKey) Wall.pan(previous.x - event.x, previous.y - event.y), Wall.render();
	else {
		// Mark the tile as modified
		Wall.getTileAtCoord(event.x, event.y).modified();

		// Start the drawing 
		Brushes.current.paint(ctx, event.x, event.y);
	}
};

Wall.resize = function(event) {
	Wall.width = canvas.width = window.innerWidth;
	Wall.height = canvas.height = window.innerHeight;
	Wall.getTiles();
};

module.exports = Wall;
},{"./GUI":2,"./Tile":3,"./brushes":7}],5:[function(require,module,exports){
var Brush = require("../Brush");

module.exports = new Brush({
	render: function(ctx, x, y, x1, y1) {
		ctx.fillStyle = this.color;
		ctx.fillRect(x, y, this.size, this.size);
	},

	stamp: function(img, ctx) {
		img.width = this.size;
		img.height = this.size;
		ctx.fillStyle = this.color;
		ctx.fillRect(0, 0, this.size, this.size);
	}
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
	spray: require("./Spray"),
	current: undefined
};
},{"./Basic":5,"./Spray":6}],8:[function(require,module,exports){
(function (global){
var Tile = require("./Tile"),
	Wall = require("./Wall"),
	GUI = require("./GUI");

var canvas = global.canvas = document.getElementById("plate");
var ctx = global.ctx = canvas.getContext("2d");


// Grab the starting coordinates
if(window.location.hash) {
	var coords = window.location.hash
		.replace("#", "").split(",")
		.map(function(coord) { return parseInt(coord); })
		.slice(0, 2);

	if(coords[0] && coords[1]) {
		Wall.x = coords[0];
		Wall.y = coords[1];

		GUI.setCoords(Wall.x, Wall.y);
	}
}

// Expose for debugging
window.wall = Wall; // TIL THE SWEAT DROPS DOWN MA BALLS
window.gui = GUI;

// Initilize the GUI
GUI.init();

// Initilize the wall
Wall.init();
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./GUI":2,"./Tile":3,"./Wall":4}]},{},[8])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYWRyaWFuL0Ryb3Bib3gvUHJvamVjdHMvdGhld2FsbC9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYWRyaWFuL0Ryb3Bib3gvUHJvamVjdHMvdGhld2FsbC9zdGF0aWMvZnVuY3Rpb24vQnJ1c2guanMiLCIvVXNlcnMvYWRyaWFuL0Ryb3Bib3gvUHJvamVjdHMvdGhld2FsbC9zdGF0aWMvZnVuY3Rpb24vR1VJLmpzIiwiL1VzZXJzL2Fkcmlhbi9Ecm9wYm94L1Byb2plY3RzL3RoZXdhbGwvc3RhdGljL2Z1bmN0aW9uL1RpbGUuanMiLCIvVXNlcnMvYWRyaWFuL0Ryb3Bib3gvUHJvamVjdHMvdGhld2FsbC9zdGF0aWMvZnVuY3Rpb24vV2FsbC5qcyIsIi9Vc2Vycy9hZHJpYW4vRHJvcGJveC9Qcm9qZWN0cy90aGV3YWxsL3N0YXRpYy9mdW5jdGlvbi9icnVzaGVzL0Jhc2ljLmpzIiwiL1VzZXJzL2Fkcmlhbi9Ecm9wYm94L1Byb2plY3RzL3RoZXdhbGwvc3RhdGljL2Z1bmN0aW9uL2JydXNoZXMvU3ByYXkuanMiLCIvVXNlcnMvYWRyaWFuL0Ryb3Bib3gvUHJvamVjdHMvdGhld2FsbC9zdGF0aWMvZnVuY3Rpb24vYnJ1c2hlcy9pbmRleC5qcyIsIi9Vc2Vycy9hZHJpYW4vRHJvcGJveC9Qcm9qZWN0cy90aGV3YWxsL3N0YXRpYy9mdW5jdGlvbi9mYWtlXzNmMDNiMTljLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2VEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgQnJ1c2ggPSBmdW5jdGlvbihmbikge1xuXHRpZihmbi5zZXR1cCkgc2V0dXAuY2FsbCh0aGlzKTtcblxuXHQvLyBCcnVzaCBvcHRpb25zXG5cdHRoaXMuc2l6ZSA9IDEyO1xuXHR0aGlzLmNvbG9yID0gXCIjZjAwXCI7XG5cblx0Ly8gU2F2ZSB0aGUgcmVuZGVyIGFuZCBvdXRsaW5lIGZ1bmN0aW9uc1xuXHR0aGlzLl9yZW5kZXIgPSBmbi5yZW5kZXI7XG5cdHRoaXMuX3N0YW1wID0gZm4uc3RhbXA7XG5cblx0Ly8gQ3JlYXRlIHRoZSBvdXRsaW5lXG5cdHRoaXMuc3RhbXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpLmdldENvbnRleHQoXCIyZFwiKTtcblxuXHQvLyBSdW4gdGhlIG91dGxpbmVcblx0aWYoZm4uc3RhbXApIHRoaXMucmVmcmVzaE91dGxpbmUoKTtcbn07XG5cbkJydXNoLnByb3RvdHlwZS5wYWludCA9IGZ1bmN0aW9uKGN0eCwgeCwgeSwgeDEsIHkxKSB7XG5cdHRoaXMuX3JlbmRlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuQnJ1c2gucHJvdG90eXBlLnNldFNpemUgPSBmdW5jdGlvbihzaXplKSB7XG5cdHRoaXMuc2l6ZSA9IHNpemU7XG5cdGlmKGZuLnN0YW1wKSB0aGlzLnJlZnJlc2hPdXRsaW5lKCk7XG59O1xuXG5CcnVzaC5wcm90b3R5cGUuc2V0Q29sb3IgPSBmdW5jdGlvbihjb2xvcikge1xuXHR0aGlzLmNvbG9yID0gY29sb3I7XG5cdGlmKGZuLnN0YW1wKSB0aGlzLnJlZnJlc2hPdXRsaW5lKCk7XG59O1xuXG5CcnVzaC5wcm90b3R5cGUucmVmcmVzaE91dGxpbmUgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5fc3RhbXAuY2FsbCh0aGlzLCB0aGlzLnN0YW1wLmNhbnZhcywgdGhpcy5zdGFtcCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJydXNoOyIsInZhciBCcnVzaGVzID0gcmVxdWlyZShcIi4vYnJ1c2hlc1wiKTtcblxudmFyIEdVSSA9IG1vZHVsZS5leHBvcnRzID0ge1xuXHR1aToge1xuXHRcdGxvYWRlcjogXCIjZ3VpIC5sb2FkZXJcIixcblx0XHRjb29yZHM6IFwiI2Nvb3Jkc1wiLFxuXHRcdGxpbms6IFwiI2xpbmtcIlxuXHR9LFxuXG5cdGxvYWRpbmc6IGZ1bmN0aW9uKHN0YXRlKSB7XG5cdFx0aWYoc3RhdGUpIEdVSS51aS5sb2FkZXIuY2xhc3NMaXN0LmFkZChcImxvYWRpbmdcIik7XG5cdFx0ZWxzZSBHVUkudWkubG9hZGVyLmNsYXNzTGlzdC5yZW1vdmUoXCJsb2FkaW5nXCIpO1xuXHR9LFxuXG5cdHNldENvb3JkczogZnVuY3Rpb24oeCwgeSkge1xuXHRcdGNvb3Jkcy5pbm5lclRleHQgPSBcIihcIiArIHggKyBcIiwgXCIgKyB5ICsgXCIpXCI7XG5cdH0sXG5cblx0dXBkYXRlQ3Vyc29yOiBmdW5jdGlvbihicnVzaCkge1xuXHRcdC8vIFNldCB0aGUgY3Vyc29yXG5cdFx0ZG9jdW1lbnQuYm9keS5zdHlsZS5jdXJzb3IgPSBcInVybCgnXCIgKyBCcnVzaGVzLmN1cnJlbnQuc3RhbXAuY2FudmFzLnRvRGF0YVVSTCgpICsgXCInKSwgYXV0b1wiO1xuXHR9LFxuXG5cdGluaXQ6IGZ1bmN0aW9uKCkge1xuXHRcdGZvcih2YXIgZWxlbSBpbiBHVUkudWkpXG5cdFx0XHRHVUkudWlbZWxlbV0gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKEdVSS51aVtlbGVtXSk7XG5cblx0XHRCcnVzaGVzLmN1cnJlbnQgPSBCcnVzaGVzLmJhc2ljO1xuXG5cdFx0Ly8gU2V0IHRoZSBjdXJyZW50IGJydXNoXG5cdFx0R1VJLnVwZGF0ZUN1cnNvcigpO1xuXHR9XG59OyIsInZhciBHVUkgPSByZXF1aXJlKFwiLi9HVUlcIik7XG5cbi8qKlxuICogQ3JlYXRlIGEgbmV3IHRpbGUuXG4gKi9cbnZhciBUaWxlID0gZnVuY3Rpb24oeCwgeSwgaW1hZ2UpIHtcblx0dGhpcy5pZCA9IFRpbGUuZ2V0UGF0aE5hbWUoeCwgeSk7XG5cblx0Ly8gU2V0IHRoZSBpbWFnZSB0byBibGFuayB3aGlsZSBsb2FkaW5nXG5cdHRoaXMuaW1hZ2UgPSBUaWxlLmJsYW5rO1xuXG5cdHZhciB0aGF0ID0gdGhpcztcblx0VGlsZS5mZXRjaCh0aGlzLmlkLCBmdW5jdGlvbihpbWFnZSkge1xuXHRcdHRoYXQuaW1hZ2UgPSBpbWFnZTtcblx0fSk7XG5cdFxuXHR0aGlzLnggPSB4O1xuXHR0aGlzLnkgPSB5O1xuXG5cdHRoaXMuX3VwZGF0ZSA9IG51bGw7XG59O1xuXG4vKipcbiAqIFRpbGUgZGltZW5zaW9ucy5cbiAqIEB0eXBlIHtOdW1iZXJ9XG4gKi9cblRpbGUud2lkdGggPSA1MDA7XG5UaWxlLmhlaWdodCA9IDQwMDtcblxuLyoqXG4gKiBUaGUgd2FpdCBiZWZvcmUgdGhlIHRpbGUgaXMgc2F2ZWQgb25jZSBtb2RpZmllZC5cbiAqIEB0eXBlIHtOdW1iZXJ9XG4gKi9cblRpbGUuV0FJVF9CRUZPUkVfU0FWRSA9IDE1MDA7XG5cbi8qKlxuICogVGhlIHdhaXQgZm9yIHRoZSB0aWxlIGJ1ZmZlciB0byBiYXRjaCBzYXZlcy5cbiAqIEB0eXBlIHtOdW1iZXJ9XG4gKi9cblRpbGUuQlVGRkVSX1RJTUVPVVQgPSA1MDA7XG5cbi8qKlxuICogVGhlIG1heGltdW0gYW1vdW50IG9mIFRpbGUgb2JqZWN0cyBzdG9yZWQgaW4gbWVtb3J5LlxuICogQHR5cGUge051bWJlcn1cbiAqL1xuVGlsZS5DQUNIRV9TSVpFX0xJTUlUID0gMTAwO1xuXG4vKipcbiAqIFNldCB0aGUgd2FsbCB0byBkZWJ1Zy5cbiAqIEB0eXBlIHtCb29sZWFufVxuICovXG5UaWxlLkRFQlVHID0gZmFsc2U7XG5cbi8qKlxuICogVGlsZSBjYWNoZS5cbiAqIEB0eXBlIHtPYmplY3R9XG4gKi9cblRpbGUuY2FjaGUgPSB7fTtcblRpbGUuY2FjaGUua2V5cyA9IFtdO1xuXG4vKipcbiAqIEludmFsaWRhdGUgYSB0aWxlIGluIHRoZSBjYWNoZS5cbiAqIEBwYXJhbSAge1N0cmluZ30gaWQgVGlsZSBpZCBpbiBjYWNoZS5cbiAqL1xuVGlsZS5jYWNoZS5pbnZhbGlkYXRlID0gZnVuY3Rpb24oaWQpIHtcblx0ZGVsZXRlIFRpbGUuY2FjaGVbaWRdO1xufTtcblxuVGlsZS5jYWNoZS5hZGQgPSBmdW5jdGlvbihpZCwgdGlsZSkge1xuXHRUaWxlLmNhY2hlLmtleXMucHVzaChpZCk7XG5cdFRpbGUuY2FjaGVbaWRdID0gdGlsZTtcblxuXHQvLyBDYW4ndCBsZXQgdGhlIGNhY2hlIGdldCB0b28gYmlnXG5cdGlmKFRpbGUuY2FjaGUua2V5cy5sZW5ndGggPiBUaWxlLkNBQ0hFX1NJWkVfTElNSVQpIFRpbGUuY2FjaGUuaW52YWxpZGF0ZShUaWxlLmNhY2hlLmtleXMuc2hpZnQoKSk7XG59O1xuXG5UaWxlLmJ1ZmZlciA9IFtdO1xuVGlsZS5idWZmZXIudXBkYXRlID0gbnVsbDtcblxuVGlsZS5idWZmZXIuYWRkID0gZnVuY3Rpb24odGlsZSkge1xuXHRUaWxlLmJ1ZmZlci5wdXNoKHRpbGUpO1xuXG5cdGlmKFRpbGUuYnVmZmVyLmxlbmd0aCA8IDQpIHtcblx0XHRpZihUaWxlLmJ1ZmZlci51cGRhdGUpIGNsZWFyVGltZW91dChUaWxlLmJ1ZmZlci51cGRhdGUpO1xuXHRcdFRpbGUuYnVmZmVyLnVwZGF0ZSA9IHNldFRpbWVvdXQoVGlsZS5idWZmZXIuZW1wdHksIFRpbGUuQlVGRkVSX1RJTUVPVVQpO1xuXHR9IGVsc2UgVGlsZS5idWZmZXIuZW1wdHkoKTsgXG59O1xuXG4vKipcbiAqIEVtcHR5IHRoZSB0aWxlIGJ1ZmZlci4gQnkgdGhpcywgd2UgbWVhbiB1cGxvYWRcbiAqIGVhY2ggdGlsZSB0byB0aGUgc2VydmVyIGluIGEgYmF0Y2ggcmVxdWVzdCBpbnN0ZWFkXG4gKiBvZiByZXF1ZXN0cyBldmVyeSBmZXcgc2Vjb25kcy5cbiAqL1xuVGlsZS5idWZmZXIuZW1wdHkgPSBmdW5jdGlvbigpIHtcblx0dmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKSxcblx0XHRmb3JtID0gbmV3IEZvcm1EYXRhKCk7XG5cblx0Ly8gQ29udmVydCB0aGUgY2FudmFzZXMgdG8ganBlZy4gUGl0eSB0b0Jsb2IgaXNuJ3Qgc3VwcG9ydGVkIHlldC5cblx0VGlsZS5idWZmZXIuZm9yRWFjaChmdW5jdGlvbih0aWxlKSB7XG5cdFx0dmFyIGltZyA9IHRpbGUuZ2V0Q29udGV4dCgpLmNhbnZhcy50b0RhdGFVUkwoKTtcblxuXHRcdGZvcm0uYXBwZW5kKHRpbGUuaWQsIGltZywgdGlsZS5pZCk7XG5cdH0pO1xuXG5cdC8vIFBvc3QgcmVxdWVzdCB0byAvdGlsZXNcblx0R1VJLmxvYWRpbmcodHJ1ZSk7XG5cdHJlcXVlc3Qub3BlbihcIlBPU1RcIiwgXCIvdGlsZXNcIiwgdHJ1ZSk7XG5cblx0cmVxdWVzdC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcblx0XHRpZihyZXF1ZXN0LnJlYWR5U3RhdGUgPT09IDQgJiYgcmVxdWVzdC5zdGF0dXMgPT09IDIwMCkge1xuXHRcdFx0R1VJLmxvYWRpbmcoZmFsc2UpO1xuXHRcdH1cblx0fTtcblxuXHQvLyBTZW5kIHRoZSBmb3JtIGRhdGEgYWxvbmdcblx0cmVxdWVzdC5zZW5kKGZvcm0pO1xuXG5cdC8vIEVtcHR5IHRoZSBidWZmZXJcblx0VGlsZS5idWZmZXIubGVuZ3RoID0gMDtcbn07XG5cbi8qKlxuICogR2V0IGEgdGlsZSBnaXZlbiBjb29yZGluYXRlcy4gSWYgdGhlIHRpbGUgaXMgaW4gdGhlIGNhY2hlLFxuICogc2VydmUgdGhhdCB0aWxlLCBlbHNlIGNyZWF0ZSBhIG5ldyB0aWxlLlxuICogQHBhcmFtICB7TnVtYmVyfSB4IFxuICogQHBhcmFtICB7TnVtYmVyfSB5IFxuICogQHJldHVybiB7VGlsZX0gXG4gKi9cblRpbGUuZ2V0ID0gZnVuY3Rpb24oeCwgeSkge1xuXHR2YXIgaWQgPSBUaWxlLmdldFBhdGhOYW1lKHgsIHkpO1xuXHRpZihUaWxlLmNhY2hlW2lkXSkgcmV0dXJuIFRpbGUuY2FjaGVbaWRdO1xuXHRlbHNlIHtcblx0XHR2YXIgdGlsZSA9IG5ldyBUaWxlKHgsIHkpO1xuXHRcdFRpbGUuY2FjaGUuYWRkKGlkLCB0aWxlKTtcblx0XHRyZXR1cm4gdGlsZTtcblx0fVxufTtcblxuLyoqXG4gKiBSZW5kZXIgYSB0aWxlIG9udG8gYSBjYW52YXMuXG4gKi9cblRpbGUucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKGN0eCwgeCwgeSkge1xuXHRjdHguZHJhd0ltYWdlKHRoaXMuaW1hZ2UsIHgsIHkpO1xuXG5cdGN0eC5iZWdpblBhdGgoKTtcblx0Y3R4Lm1vdmVUbyh4LCB5ICsgVGlsZS5oZWlnaHQpO1xuXHRjdHgubGluZVRvKHgsIHkpO1xuXHRjdHgubGluZVRvKHggKyBUaWxlLndpZHRoLCB5KTtcblx0Y3R4LnN0cm9rZVN0eWxlID0gXCJyZ2JhKDAsMCwwLDAuMDUpXCI7XG5cdGN0eC5zdHJva2UoKTtcblxuXHRpZihUaWxlLkRFQlVHKSB7XG5cdFx0Y3R4LmZpbGxTdHlsZSA9IFwiI2FhYVwiO1xuXHRcdGN0eC50ZXh0QWxpZ24gPSBcImxlZnRcIjtcblx0XHRjdHgudGV4dEJhc2VsaW5lID0gXCJ0b3BcIjtcblx0XHRjdHguZmlsbFRleHQodGhpcy5pZCwgeCArIDUsIHkgKyA1KTtcblx0fVxufTtcblxuLyoqXG4gKiBTYXZlIGEgdGlsZSB0byB0aGUgc2VydmVyLlxuICovXG5UaWxlLnByb3RvdHlwZS5zYXZlID0gZnVuY3Rpb24oKSB7XG5cdFRpbGUuYnVmZmVyLmFkZCh0aGlzKTtcbn07XG5cbi8qKlxuICogU2V0IHRoZSB0aWxlIGFzIG1vZGlmaWVkIGFuZCBzdGFydCB1cGRhdGUgdGltZXIuXG4gKiBJZiB0aWxlIGlzIGFscmVhZHkgbW9kaWZpZWQsIHB1c2ggdGhlIHVwZGF0ZSB0aW1lci5cbiAqL1xuVGlsZS5wcm90b3R5cGUubW9kaWZpZWQgPSBmdW5jdGlvbigpIHtcblx0aWYodGhpcy5fdXBkYXRlKSBjbGVhclRpbWVvdXQodGhpcy5fdXBkYXRlKTtcblxuXHR2YXIgdGhhdCA9IHRoaXM7XG5cblx0dGhpcy5fdXBkYXRlID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHR0aGF0LnNhdmUoKTtcblx0fSwgVGlsZS5XQUlUX0JFRk9SRV9TQVZFKTtcbn07XG5cbi8qKlxuICogR2V0IHRoZSB0aWxlIGNvbnRleHQuXG4gKiBAcmV0dXJuIHtDYW52YXNSZW5kZXJpbmdDb250ZXh0MkR9IFxuICovXG5UaWxlLnByb3RvdHlwZS5nZXRDb250ZXh0ID0gZnVuY3Rpb24oKSB7XG5cdGlmKCF0aGlzLmN0eCkge1xuXHRcdC8vIENyZWF0ZSB0aGUgdGlsZXMgb3duIGNvbnRleHRcblx0XHR0aGlzLmNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIik7XG5cdFx0dGhpcy5jYW52YXMuaGVpZ2h0ID0gVGlsZS5oZWlnaHQ7XG5cdFx0dGhpcy5jYW52YXMud2lkdGggPSBUaWxlLndpZHRoO1xuXHRcdHRoaXMuY3R4ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xuXG5cdFx0Ly8gRHJhdyB0aGUgb2xkIGltYWdlIHRvIHRoZSBjYW52YXNcblx0XHR0aGlzLmN0eC5kcmF3SW1hZ2UodGhpcy5pbWFnZSwgMCwgMCk7XG5cdFx0dGhpcy5pbWFnZSA9IHRoaXMuY2FudmFzO1xuXHRcdHJldHVybiB0aGlzLmN0eDtcblx0fSBlbHNlIHJldHVybiB0aGlzLmN0eDtcbn07XG5cbi8qKlxuICogRmV0Y2ggYSB0aWxlIGZyb20gdGhlIHNlcnZlci5cbiAqIEBwYXJhbSAge1N0cmluZ30gICB1cmwgICAgICBcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBjYWxsYmFjayBcbiAqL1xuVGlsZS5mZXRjaCA9IGZ1bmN0aW9uKHVybCwgY2FsbGJhY2spIHtcblx0dmFyIGltZyA9IG5ldyBJbWFnZSgpO1xuXG5cdGltZy5vbmxvYWQgPSBmdW5jdGlvbigpIHtcblx0XHRjYWxsYmFjayhpbWcpO1xuXHR9O1xuXG5cdGltZy5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG5cdFx0Y2FsbGJhY2soVGlsZS5ibGFuayk7XG5cdH07XG5cblx0aW1nLnNyYyA9IHVybDtcbn07XG5cbi8qKlxuICogUmV0dXJuIHRoZSB0aWxlIG5hbWUgYWNjb3JkaW5nIHRvIHRoZSBzcGVjLlxuICogQHBhcmFtICB7TnVtYmVyfSB4IFxuICogQHBhcmFtICB7TnVtYmVyfSB5IFxuICogQHJldHVybiB7U3RyaW5nfSAgIFBhdGggbmFtZS5cbiAqL1xuVGlsZS5nZXRQYXRoTmFtZSA9IGZ1bmN0aW9uKHgsIHkpIHtcblx0cmV0dXJuIFwidGlsZXMvXCIgKyB4ICsgXCJfXCIgKyB5ICsgXCIucG5nXCI7XG59O1xuXG4vLyBDcmVhdGUgYSBibGFuayBpbWFnZVxuVGlsZS5ibGFuayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIik7XG5UaWxlLmJsYW5rLmN0eCA9IChmdW5jdGlvbigpIHtcblx0dmFyIGltZyA9IFRpbGUuYmxhbmssXG5cdFx0Y3R4ID0gaW1nLmdldENvbnRleHQoXCIyZFwiKTtcblxuXHRpbWcud2lkdGggPSBUaWxlLndpZHRoO1xuXHRpbWcuaGVpZ2h0ID0gVGlsZS5oZWlnaHQ7XG5cblx0cmV0dXJuIGN0eDtcbn0pKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gVGlsZTsiLCJ2YXIgVGlsZSA9IHJlcXVpcmUoXCIuL1RpbGVcIiksXG5cdEJydXNoZXMgPSByZXF1aXJlKFwiLi9icnVzaGVzXCIpLFxuXHRHVUkgPSByZXF1aXJlKFwiLi9HVUlcIik7XG5cbnZhciBXYWxsID0ge1xuXHQvLyBUaGUgY3VycmVudCB3YWxsIGNvb3JkaW5hdGVzXG5cdHg6IDAsIFxuXHR5OiAwLFxuXG5cdC8vIFRoZSB3YWxsIHNpemVcblx0d2lkdGg6IHdpbmRvdy5pbm5lcldpZHRoLFxuXHRoZWlnaHQ6IHdpbmRvdy5pbm5lckhlaWdodCxcblxuXHQvLyBUaGUgcmVuZGVyIGVuZ2luZVxuXHRydW5uaW5nOiB0cnVlLFxuXG5cdC8vIFRoZSB0aWxlIHN0b3JlXG5cdHRpbGVzOiBbXVxufTtcblxuLyoqXG4gKiBSZW5kZXIgdGhlIHdhbGwncyBjdXJyZW50IHRpbGVzXG4gKi9cbldhbGwucmVuZGVyID0gZnVuY3Rpb24oKSB7XG5cdC8vIEZpbGwgdGhlIGJhY2tncm91bmRcblx0Y3R4LmNsZWFyUmVjdCgwLCAwLCBXYWxsLndpZHRoLCBXYWxsLmhlaWdodCk7XG5cblx0Ly8gTG9vcCBvdmVyIHRoZSB0aWxlcyBpbiB0aGUgYnVmZmVyXG5cdGZvcih2YXIgeSA9IDAsIGN5ID0gV2FsbC50aWxlcy5oZWlnaHQ7IHkgPCBjeTsgeSsrKVxuXHRcdGZvcih2YXIgeCA9IDAsIGN4ID0gV2FsbC50aWxlcy53aWR0aDsgeCA8IGN4OyB4KyspIHtcblx0XHRcdHZhciB0aWxlID0gV2FsbC50aWxlc1t5XVt4XSxcblx0XHRcdFx0cHggPSB0aWxlLnggLSBXYWxsLngsXG5cdFx0XHRcdHB5ID0gdGlsZS55IC0gV2FsbC55O1xuXG5cdFx0XHQvLyBSZW5kZXIgdGhlIHRpbGVzIGF0IHRoZSBjb3JyZWN0IGNvb3JpbmRhdGVzXG5cdFx0XHR0aWxlLnJlbmRlcihjdHgsIHB4LCBweSk7XG5cdFx0fVxufTtcblxuLyoqXG4gKiBHZXQgdGlsZXMgYXJvdW5kIGEgcG9pbnQuXG4gKi9cbldhbGwuZ2V0VGlsZXMgPSBmdW5jdGlvbigpIHtcblx0dmFyIHggPSBXYWxsLngsXG5cdFx0eSA9IFdhbGwueSxcblxuXHRcdHR4ID0gVGlsZS53aWR0aCxcblx0XHR0eSA9IFRpbGUuaGVpZ2h0LFxuXG5cdFx0d3ggPSBXYWxsLngsXG5cdFx0d3kgPSBXYWxsLnksXG5cblx0XHQvLyBUaGUgYW1vdW50IG9mIHRpbGVzIHdlIG5lZWQgdG8gZ2V0XG5cdFx0bHggPSBNYXRoLmNlaWwoV2FsbC53aWR0aC90eCkgKyAxLFxuXHRcdGx5ID0gTWF0aC5jZWlsKFdhbGwuaGVpZ2h0L3R5KSArIDEsXG5cblx0XHQvLyBUaGUgdGlsZSBvdmVyZmxvd1xuXHRcdHB4ID0gTWF0aC5hYnMoeCAlIHR4KSxcblx0XHRweSA9IE1hdGguYWJzKHkgJSB0eSksXG5cblx0XHQvLyBUaGUgb3JpZ2luIG9mIHRoZSB0b3AgbGVmdCBtb3N0IHRpbGUgd2UgbmVlZCB0byBnZXRcblx0XHRveCA9IHd4IC0gcHgsXG5cdFx0b3kgPSB3eSAtIHB5O1xuXG5cdGZvcih2YXIgdXkgPSAwOyB1eSA8IGx5OyB1eSsrKSB7XG5cdFx0Ly8gQ3JlYXRlIHRoZSByb3dcblx0XHR2YXIgcm93ID0gW107XG5cblx0XHRmb3IodmFyIHV4ID0gMDsgdXggPCBseDsgdXgrKykge1xuXHRcdFx0Ly8gVGhlIGNvb3JkaW5hdGVzIG9mIGVhY2ggdGlsZSB3ZSBoYXZlIHRvIGdldFxuXHRcdFx0dmFyIHR0eCA9IG94ICsgKHR4ICogdXgpLFxuXHRcdFx0XHR0dHkgPSBveSArICh0eSAqIHV5KTtcblxuXHRcdFx0cm93LnB1c2goVGlsZS5nZXQodHR4LCB0dHkpKTtcblx0XHR9XG5cblx0XHQvLyBBbmQgcHVzaCB0aGUgcm93IHRvIHRoZSB3YWxsXG5cdFx0V2FsbC5wdXNoUm93KFdhbGwuQk9UVE9NX1NJREUsIHJvdyk7XG5cdH1cdFxuXG5cdC8vIEFkZCB0aGUgd2FsbCBkaW1lbnNpb25zIGluIHRpbGVzIHRvIHRoZSB0aWxlcyB2YXJpYWJsZVxuXHRXYWxsLnRpbGVzLndpZHRoID0gbHg7XG5cdFdhbGwudGlsZXMuaGVpZ2h0ID0gbHk7XG59O1xuXG4vKipcbiAqIFdhbGwgc2lkZSBjb25zdGFudHMuXG4gKiBAdHlwZSB7TnVtYmVyfVxuICovXG5XYWxsLlRPUF9TSURFID0gMTtcbldhbGwuUklHSFRfU0lERSA9IDI7XG5XYWxsLkJPVFRPTV9TSURFID0gMztcbldhbGwuTEVGVF9TSURFID0gNDtcblxuLyoqXG4gKiBBZGQgYSByb3cgdG8gdGhlIHdhbGwuXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHNpZGUgIFNlZSBXYWxsLltTSURFXV9TSURFXG4gKiBAcGFyYW0gIHtBcnJheX0gdGlsZXMgIEFycmF5IG9mIHRpbGVzLlxuICovXG5XYWxsLnB1c2hSb3cgPSBmdW5jdGlvbihzaWRlLCB0aWxlcykge1xuXHRpZihzaWRlID09PSBXYWxsLlRPUF9TSURFKSBXYWxsLnRpbGVzLnVuc2hpZnQodGlsZXMpLCBXYWxsLnRpbGVzLmhlaWdodCsrO1xuXHRlbHNlIGlmKHNpZGUgPT09IFdhbGwuQk9UVE9NX1NJREUpIFdhbGwudGlsZXMucHVzaCh0aWxlcyksIFdhbGwudGlsZXMuaGVpZ2h0Kys7XG5cdGVsc2UgV2FsbC50aWxlcy53aWR0aCsrLCBXYWxsLnRpbGVzLmZvckVhY2goZnVuY3Rpb24ocm93LCBpKSB7XG5cdFx0aWYoc2lkZSA9PT0gV2FsbC5MRUZUX1NJREUpIHJvdy51bnNoaWZ0KHRpbGVzW2ldKTtcblx0XHRlbHNlIGlmKHNpZGUgPT09IFdhbGwuUklHSFRfU0lERSkgcm93LnB1c2godGlsZXNbaV0pOyAvLyBSZWR1bmRhbnQgaWYgYnV0IGtlZXAgaXQgYW55d2F5XG5cdH0pO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgYSByb3cgZnJvbSB0aGUgd2FsbC5cbiAqIEBwYXJhbSAge051bWJlcn0gc2lkZSBTZWUgV2FsbC5bU0lERV1fU0lERVxuICovXG5XYWxsLnBvcFJvdyA9IGZ1bmN0aW9uKHNpZGUpIHtcblx0aWYoc2lkZSA9PT0gV2FsbC5UT1BfU0lERSkgV2FsbC50aWxlcy5zaGlmdCgpLCBXYWxsLnRpbGVzLmhlaWdodC0tO1xuXHRlbHNlIGlmKHNpZGUgPT09IFdhbGwuQk9UVE9NX1NJREUpIFdhbGwudGlsZXMucG9wKCksIFdhbGwudGlsZXMuaGVpZ2h0LS07XG5cdGVsc2UgV2FsbC50aWxlcy53aWR0aC0tLCBXYWxsLnRpbGVzLmZvckVhY2goZnVuY3Rpb24ocm93KSB7XG5cdFx0aWYoc2lkZSA9PT0gV2FsbC5MRUZUX1NJREUpIHJvdy5zaGlmdCgpO1xuXHRcdGVsc2UgaWYoc2lkZSA9PT0gV2FsbC5SSUdIVF9TSURFKSByb3cucG9wKCk7IC8vIFJlZHVuZGFudCBpZiBidXQga2VlcCBpdCBhbnl3YXlcblx0fSk7XG59O1xuXG4vKipcbiAqIEdldCB0aGUgbmV4dCByb3cgb2YgdGlsZXMuXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHNpZGUgU2VlIFdhbGwuW1NJREVdX1NJREVcbiAqIEByZXR1cm4ge0FycmF5fSAgICAgIE5leHQgcm93IG9mIHRpbGVzLlxuICovXG5XYWxsLmdldE5leHRSb3cgPSBmdW5jdGlvbihzaWRlKSB7XG5cdHJldHVybiBXYWxsLmdldFJvdyhzaWRlKS5tYXAoZnVuY3Rpb24odGlsZSkge1xuXHRcdHJldHVybiBUaWxlLmdldCh0aWxlLnggKyAoKHNpZGUgPT09IFdhbGwuTEVGVF9TSURFID8gLTEgOiAoc2lkZSA9PT0gV2FsbC5SSUdIVF9TSURFID8gMSA6IDApKSAqIFRpbGUud2lkdGgpLCBcblx0XHRcdHRpbGUueSArICgoc2lkZSA9PT0gV2FsbC5UT1BfU0lERSA/IC0xIDogKHNpZGUgPT09IFdhbGwuQk9UVE9NX1NJREUgPyAxIDogMCkpICogVGlsZS5oZWlnaHQpKTtcblx0fSk7XG59O1xuXG4vKipcbiAqIEdldCBhIHJvdyBnaXZlbiB0aGUgc2lkZS5cbiAqIEBwYXJhbSAge051bWJlcn0gc2lkZSBTZWUgV2FsbC5bU0lERV1fU0lERVxuICogQHJldHVybiB7QXJyYXl9ICAgICAgUm93XG4gKi9cbldhbGwuZ2V0Um93ID0gZnVuY3Rpb24oc2lkZSkge1xuXHRpZihzaWRlID09PSBXYWxsLkxFRlRfU0lERSB8fCBzaWRlID09PSBXYWxsLlJJR0hUX1NJREUpIHJldHVybiBXYWxsLnRpbGVzLm1hcChmdW5jdGlvbihyb3cpIHtcblx0XHRyZXR1cm4gcm93W3NpZGUgPT09IFdhbGwuTEVGVF9TSURFID8gMCA6IHJvdy5sZW5ndGggLSAxXTtcblx0fSk7XG5cblx0ZWxzZSByZXR1cm4gV2FsbC50aWxlc1tzaWRlID09PSBXYWxsLlRPUF9TSURFID8gMCA6IFdhbGwudGlsZXMubGVuZ3RoIC0gMV07XG59O1xuXG4vKipcbiAqIEdldCBhIHRpbGUgYXQgYSBjb29yZGluYXRlLlxuICogQHBhcmFtICB7TnVtYmVyfSB4IFxuICogQHBhcmFtICB7TnVtYmVyfSB5IFxuICogQHJldHVybiB7VGlsZX0gXG4gKi9cbldhbGwuZ2V0VGlsZUF0Q29vcmQgPSBmdW5jdGlvbih4LCB5KSB7XG5cdHZhciB0dGwgPSBXYWxsLnRpbGVzWzBdWzBdLFxuXHRcdG94ID0gdHRsLnggLSBXYWxsLngsXG5cdFx0b3kgPSB0dGwueSAtIFdhbGwueSxcblx0XHR2dyA9IFdhbGwudGlsZXMud2lkdGggKiBUaWxlLndpZHRoLFxuXHRcdHZoID0gV2FsbC50aWxlcy5oZWlnaHQgKiBUaWxlLmhlaWdodDtcblxuXHRpZih4ID4gb3ggJiYgeCA8IHZ3ICYmIHkgPiBveSAmJiB5IDwgdmgpIHtcblx0XHRyZXR1cm4gV2FsbC50aWxlc1tNYXRoLmZsb29yKCh5IC0gb3kpL1RpbGUuaGVpZ2h0KV1bTWF0aC5mbG9vcigoeCAtIG94KS9UaWxlLndpZHRoKV07XG5cdH1cbn07XG5cbi8qKlxuICogUGFuIHRoZSB3YWxsLlxuICogQHBhcmFtICB7TnVtYmVyfSB4IFxuICogQHBhcmFtICB7TnVtYmVyfSB5IFxuICovXG5XYWxsLnBhbiA9IGZ1bmN0aW9uKHgsIHkpIHtcblx0dmFyIHd4ID0gV2FsbC54ICs9IHgsXG5cdFx0d3kgPSBXYWxsLnkgKz0geSxcblxuXHRcdHR3ID0gVGlsZS53aWR0aCxcblx0XHR0aCA9IFRpbGUuaGVpZ2h0LFxuXG5cdFx0Ly8gR2V0IHRvcCBsZWZ0IHRpbGVcblx0XHR0dGwgPSBXYWxsLnRpbGVzWzBdWzBdLCBcblxuXHRcdGJsZWVkeCA9IHR3ICogMC40LFxuXHRcdGJsZWVkeSA9IHRoICogMC4zO1xuXG5cdGlmKHd5ID4gKHR0bC55ICsgdGggKyBibGVlZHkpKSB7XG5cdFx0V2FsbC5wb3BSb3coV2FsbC5UT1BfU0lERSk7XG5cdFx0V2FsbC5wdXNoUm93KFdhbGwuQk9UVE9NX1NJREUsIFdhbGwuZ2V0TmV4dFJvdyhXYWxsLkJPVFRPTV9TSURFKSk7XG5cdH1cblxuXHRpZih3eCA+ICh0dGwueCArIHRoICsgYmxlZWR4KSkge1xuXHRcdFdhbGwucG9wUm93KFdhbGwuTEVGVF9TSURFKTtcblx0XHRXYWxsLnB1c2hSb3coV2FsbC5SSUdIVF9TSURFLCBXYWxsLmdldE5leHRSb3coV2FsbC5SSUdIVF9TSURFKSk7XG5cdH1cblxuXHRpZih3eSA8ICh0dGwueSArIGJsZWVkeSkpIHtcblx0XHRXYWxsLnBvcFJvdyhXYWxsLkJPVFRPTV9TSURFKTtcblx0XHRXYWxsLnB1c2hSb3coV2FsbC5UT1BfU0lERSwgV2FsbC5nZXROZXh0Um93KFdhbGwuVE9QX1NJREUpKTtcblx0fVxuXG5cdGlmKHd4IDwgKHR0bC54ICsgYmxlZWR4KSkge1xuXHRcdFdhbGwucG9wUm93KFdhbGwuUklHSFRfU0lERSk7XG5cdFx0V2FsbC5wdXNoUm93KFdhbGwuTEVGVF9TSURFLCBXYWxsLmdldE5leHRSb3coV2FsbC5MRUZUX1NJREUpKTtcblx0fVxuXG5cdEdVSS5zZXRDb29yZHMoV2FsbC54LCBXYWxsLnkpO1xufTtcblxuLyoqXG4gKiBCYWtlIHRoZSBjdXJyZW50IGNvbnRleHQgb250byB0aGUgdGlsZXMuXG4gKi9cbldhbGwuYmFrZSA9IGZ1bmN0aW9uKCkge1xuXHQvL1RPRE86IEFDQ09VTlQgRk9SIERBTU4gT0ZGU0NSRUVOIFNISVRcblx0Zm9yKHZhciB5ID0gMCwgbHkgPSBXYWxsLnRpbGVzLmhlaWdodDsgeSA8IGx5OyB5KyspXG5cdFx0Zm9yKHZhciB4ID0gMCwgbHggPSBXYWxsLnRpbGVzLndpZHRoOyB4IDwgbHg7IHgrKykge1xuXHRcdFx0dmFyIHRpbGUgPSBXYWxsLnRpbGVzW3ldW3hdLFxuXHRcdFx0XHR0Y3R4ID0gdGlsZS5nZXRDb250ZXh0KCksXG5cblx0XHRcdFx0d3cgPSBXYWxsLndpZHRoLFxuXHRcdFx0XHR3aCA9IFdhbGwuaGVpZ2h0LFxuXG5cdFx0XHRcdG94ID0gdGlsZS54IC0gV2FsbC54LFxuXHRcdFx0XHRveSA9IHRpbGUueSAtIFdhbGwueSxcblxuXHRcdFx0XHRjeCA9IHd3IC0gb3gsXG5cdFx0XHRcdGN5ID0gd2ggLSBveTtcblxuXHRcdFx0Y29uc29sZS5sb2cob3gsIG95LCBjeCwgY3kpO1xuXHRcdFx0XG5cdFx0fVxufTtcblxuV2FsbC5pbml0ID0gZnVuY3Rpb24oKSB7XG5cdC8vIEluaXRpYWxseSByZXNpemUgdGhlIHdhbGwgdG8gc2NyZWVuIGRpbWVuc2lvbnNcblx0V2FsbC5yZXNpemUoKTtcblxuXHQvLyBCaW5kIHRoZSBldmVudCBoYW5kbGVyc1xuXHR2YXIgZHJhZyA9IG51bGwsIGRyYWdzdGFydCA9IGZhbHNlO1xuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCBmdW5jdGlvbihldmVudCkge1xuXHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0ZHJhZyA9IGV2ZW50O1xuXHRcdGRyYWdzdGFydCA9IHRydWU7XG5cdH0pO1xuXG5cdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0aWYoZHJhZ3N0YXJ0KSBXYWxsLmRyYWdzdGFydC5jYWxsKFdhbGwsIGV2ZW50KSwgZHJhZ3N0YXJ0ID0gZmFsc2U7XG5cdFx0aWYoZHJhZykgZXZlbnQucHJldmVudERlZmF1bHQoKSwgV2FsbC5kcmFnLmNhbGwoV2FsbCwgZXZlbnQsIGRyYWcpLCBkcmFnID0gZXZlbnQ7XG5cdH0pO1xuXG5cdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLCBmdW5jdGlvbihldmVudCkge1xuXHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0aWYoZHJhZykgV2FsbC5kcmFnZW5kLmNhbGwoV2FsbCwgZXZlbnQpLCBkcmFnID0gbnVsbDtcblx0fSk7XG5cblx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZXdoZWVsXCIsIGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0V2FsbC5wYW4oZXZlbnQud2hlZWxEZWx0YVgsIGV2ZW50LndoZWVsRGVsdGFZKTtcblx0fSk7XG5cblx0Ly8gRXZlbnQgaGFuZGxlcnNcblx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIiwgZnVuY3Rpb24oKSB7XG5cdFx0V2FsbC5yZXNpemUoKTtcblx0fSk7XG5cblxuXHQvLyBCaW5kIHRoZSBsaW5rIGhhbmRsZXIuIFBpdHkgSSBjYW4ndCBrZWVwIHRoaXMgaW4gR1VJLmpzLFxuXHQvLyBjaXJjdWxhciBkZXBlbmRhbmNpZXMuXG5cdEdVSS51aS5saW5rLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbigpIHtcblx0XHR3aW5kb3cubG9jYXRpb24uaGFzaCA9IFwiI1wiICsgV2FsbC54ICsgXCIsXCIgKyBXYWxsLnk7XG5cdH0pO1xuXG5cdC8vIFBpY2sgYSBicnVzaFxuXHRCcnVzaGVzLmN1cnJlbnQgPSBCcnVzaGVzLmJhc2ljO1xuXG5cdC8vIEluaXRpYWxseSBnZXQgdGhlIHRpbGVzXG5cdFdhbGwuZ2V0VGlsZXMoKTtcblxuXHQvLyBBbmQgYmVnaW4gdGhlIHJlbmRlciBsb29wXG5cdChmdW5jdGlvbiB0aWNrKCkge1xuXHRcdHJlcXVlc3RBbmltYXRpb25GcmFtZSh0aWNrKTtcblx0XHRpZihXYWxsLnJ1bm5pbmcpIFdhbGwucmVuZGVyKCk7XG5cdH0pKCk7XG59O1xuXG4vLyBFdmVudCBoYW5kbGVyc1xuV2FsbC5kcmFnc3RhcnQgPSBmdW5jdGlvbihldmVudCkge1xuXHQvLyBQYXVzZSB0aGUgcmVuZGVyIGVuZ2luZSB0byBnaXZlIGEgY2hhbmNlIGZvciB0aGUgZHJhd2luZ1xuXHRXYWxsLnJ1bm5pbmcgPSBmYWxzZTtcbn07XG5cbldhbGwuZHJhZ2VuZCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG5cdC8vIFNhdmVkIHdoYXQncyBkcmF3biB0byB0aGUgdGlsZXMgYW5kIHJlc3VtZVxuXHRXYWxsLmJha2UoKTtcblxuXHRXYWxsLnJ1bm5pbmcgPSB0cnVlO1xufTtcblxuV2FsbC5kcmFnID0gZnVuY3Rpb24oZXZlbnQsIHByZXZpb3VzKSB7XG5cdGNvbnNvbGUubG9nKFwiRFJBR0dFRCFcIiwgZXZlbnQuc2hpZnRLZXkpO1xuXHRpZihldmVudC5zaGlmdEtleSkgV2FsbC5wYW4ocHJldmlvdXMueCAtIGV2ZW50LngsIHByZXZpb3VzLnkgLSBldmVudC55KSwgV2FsbC5yZW5kZXIoKTtcblx0ZWxzZSB7XG5cdFx0Ly8gTWFyayB0aGUgdGlsZSBhcyBtb2RpZmllZFxuXHRcdFdhbGwuZ2V0VGlsZUF0Q29vcmQoZXZlbnQueCwgZXZlbnQueSkubW9kaWZpZWQoKTtcblxuXHRcdC8vIFN0YXJ0IHRoZSBkcmF3aW5nIFxuXHRcdEJydXNoZXMuY3VycmVudC5wYWludChjdHgsIGV2ZW50LngsIGV2ZW50LnkpO1xuXHR9XG59O1xuXG5XYWxsLnJlc2l6ZSA9IGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFdhbGwud2lkdGggPSBjYW52YXMud2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aDtcblx0V2FsbC5oZWlnaHQgPSBjYW52YXMuaGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuXHRXYWxsLmdldFRpbGVzKCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFdhbGw7IiwidmFyIEJydXNoID0gcmVxdWlyZShcIi4uL0JydXNoXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBCcnVzaCh7XG5cdHJlbmRlcjogZnVuY3Rpb24oY3R4LCB4LCB5LCB4MSwgeTEpIHtcblx0XHRjdHguZmlsbFN0eWxlID0gdGhpcy5jb2xvcjtcblx0XHRjdHguZmlsbFJlY3QoeCwgeSwgdGhpcy5zaXplLCB0aGlzLnNpemUpO1xuXHR9LFxuXG5cdHN0YW1wOiBmdW5jdGlvbihpbWcsIGN0eCkge1xuXHRcdGltZy53aWR0aCA9IHRoaXMuc2l6ZTtcblx0XHRpbWcuaGVpZ2h0ID0gdGhpcy5zaXplO1xuXHRcdGN0eC5maWxsU3R5bGUgPSB0aGlzLmNvbG9yO1xuXHRcdGN0eC5maWxsUmVjdCgwLCAwLCB0aGlzLnNpemUsIHRoaXMuc2l6ZSk7XG5cdH1cbn0pOyIsInZhciBCcnVzaCA9IHJlcXVpcmUoXCIuLi9CcnVzaFwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgQnJ1c2goZnVuY3Rpb24oY3R4LCB4MSwgeTEsIHgyLCB5Mikge1xuXHR2YXIgdmVsb2NpdHkgPSBNYXRoLnNxcnQoTWF0aC5wb3coeDIgLSB4MSwgMikgKyBNYXRoLnBvdyh5MiAtIHkxLCAyKSksXG5cdFx0cmFkaXVzID0gdGhpcy5zaXplICogKCg3NSAtIHZlbG9jaXR5KS83NSk7XG5cblx0Y3R4LmZpbGxTdHlsZSA9IHRoaXMuY29sb3I7XG5cdGN0eC5iZWdpblBhdGgoKTtcblx0Y3R4LmFyYyh4MSwgeTEsIHJhZGl1cywgMCwgTWF0aC5QSSoyKTtcblx0Y3R4LmNsb3NlUGF0aCgpO1xuXHRjdHguZmlsbCgpO1xufSk7IiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cdGJhc2ljOiByZXF1aXJlKFwiLi9CYXNpY1wiKSxcblx0c3ByYXk6IHJlcXVpcmUoXCIuL1NwcmF5XCIpLFxuXHRjdXJyZW50OiB1bmRlZmluZWRcbn07IiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xudmFyIFRpbGUgPSByZXF1aXJlKFwiLi9UaWxlXCIpLFxuXHRXYWxsID0gcmVxdWlyZShcIi4vV2FsbFwiKSxcblx0R1VJID0gcmVxdWlyZShcIi4vR1VJXCIpO1xuXG52YXIgY2FudmFzID0gZ2xvYmFsLmNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicGxhdGVcIik7XG52YXIgY3R4ID0gZ2xvYmFsLmN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XG5cblxuLy8gR3JhYiB0aGUgc3RhcnRpbmcgY29vcmRpbmF0ZXNcbmlmKHdpbmRvdy5sb2NhdGlvbi5oYXNoKSB7XG5cdHZhciBjb29yZHMgPSB3aW5kb3cubG9jYXRpb24uaGFzaFxuXHRcdC5yZXBsYWNlKFwiI1wiLCBcIlwiKS5zcGxpdChcIixcIilcblx0XHQubWFwKGZ1bmN0aW9uKGNvb3JkKSB7IHJldHVybiBwYXJzZUludChjb29yZCk7IH0pXG5cdFx0LnNsaWNlKDAsIDIpO1xuXG5cdGlmKGNvb3Jkc1swXSAmJiBjb29yZHNbMV0pIHtcblx0XHRXYWxsLnggPSBjb29yZHNbMF07XG5cdFx0V2FsbC55ID0gY29vcmRzWzFdO1xuXG5cdFx0R1VJLnNldENvb3JkcyhXYWxsLngsIFdhbGwueSk7XG5cdH1cbn1cblxuLy8gRXhwb3NlIGZvciBkZWJ1Z2dpbmdcbndpbmRvdy53YWxsID0gV2FsbDsgLy8gVElMIFRIRSBTV0VBVCBEUk9QUyBET1dOIE1BIEJBTExTXG53aW5kb3cuZ3VpID0gR1VJO1xuXG4vLyBJbml0aWxpemUgdGhlIEdVSVxuR1VJLmluaXQoKTtcblxuLy8gSW5pdGlsaXplIHRoZSB3YWxsXG5XYWxsLmluaXQoKTtcbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIl19
