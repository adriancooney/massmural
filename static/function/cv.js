//Thanks Paul Irish for this handy shim
window.requestAnimFrame = (function(){
      return  window.requestAnimationFrame       || 
              window.webkitRequestAnimationFrame || 
              window.mozRequestAnimationFrame    || 
              window.oRequestAnimationFrame      || 
              window.msRequestAnimationFrame     || 
              function( callback ){
                window.setTimeout(callback, 1000 / 60);
              };
})();

/**
 * Canvas Utilities
 */
(function() {

// Quick prototype reference
var ctx = CanvasRenderingContext2D.prototype;

// Default noop render functions.
ctx._render = function() {};
ctx._update = function() {};

// The mouse position
ctx.mouseX = 0;
ctx.mouseY = 0;

/**
 * Clear the canvas. That internal canvas reference is incredibly handy.
 */
ctx.clear = function() {
    this.canvas.width = this.canvas.width;
};

/**
 * Set the background color;
 * @param  {String} color See ctx.fillStyle
 */
ctx.background = function(color) {
	this.fillStyle = color;
	this.fillRect(0, 0, this.canvas.width, this.canvas.height);
};

/**
 * Render a dot.
 * @param  {String} color See ctx.fillStyle
 * @param  {Number} x     
 * @param  {Number} y     
 */
ctx.dot = function(color, x, y, w, h) {
	w = (w || 1)/2;
	h = (h || 1)/2;
	this.fillStyle = color;
	this.fillRect(x - w, y - h, w, h);
};

/**
 * Set the render callback.
 * @param  {Function} callback 
 */
ctx.render = function(callback) {
	this._render = callback;
};

/**
 * Set the update callback.
 * @param  {Function} callback 
 */
ctx.update = function(callback) {
	this._update = callback;
};

/**
 * The tick function. Frame update and render.
 */
ctx.tick = function() {
	var that = this;
	(function next() {
		requestAnimationFrame(next);
		that._update.call(that);
		that._render.call(that);
	})();
};

/**
 * Initilize the renderer and bind the events.
 */
ctx.init = function() {
	var that = this;

	this.canvas.addEventListener("mousemove", function(event) {
		that.mouseX = event.x;
		that.mouseY = event.y;
	});

	this.tick();
};

})();