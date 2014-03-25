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