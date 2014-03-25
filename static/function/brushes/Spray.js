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