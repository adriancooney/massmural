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