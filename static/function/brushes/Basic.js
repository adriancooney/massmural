var Brush = require("../Brush");

module.exports = new Brush(function(ctx, x, y, x1, y1) {
	size = size/2;
	ctx.fillStyle = this.color;
	ctx.fillRect(x - this.size, y - this.size, this.size, this.size);
});