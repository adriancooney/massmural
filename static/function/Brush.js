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