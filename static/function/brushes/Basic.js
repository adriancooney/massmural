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