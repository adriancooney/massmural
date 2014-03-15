var Tile = require("./Tile"),
	Wall = require("./Wall")

var canvas = global.canvas = document.getElementById("plate");
var ctx = global.ctx = canvas.getContext("2d");

// Event handlers
window.addEventListener("resize", function() {
	Wall.resize();
});

var drag = null;
canvas.addEventListener("mousedown", function(event) {
	drag = event;
});

canvas.addEventListener("mouseup", function(event) {
	if(drag) {
		// Handle drag
		var dx = -(drag.x - event.x),
			dy = -(drag.y - event.y);

		Wall.pan(dx, dy);
	}

	drag = null;
});

// Initlize the wall
Wall.init();