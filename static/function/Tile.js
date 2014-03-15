/**
 * Create a new tile.
 */
var Tile = function(image, x, y) {
	this.image = image;
	this.x = x;
	this.y = y;
};

// Circumvent the circular dependancies
module.exports = Tile;

var Wall = require("./Wall");

/**
 * Render a tile onto the canvas.
 * @param  {Image} tile HTMLImageElement
 */
Tile.prototype.render = function() {
	ctx.drawImage(this.image, (Wall.window.width/2) + this.x, (Wall.window.height/2) + this.y);
};