var Tile = require("./Tile"),
	Wall = require("./Wall"),
	Grid = require("./Grid");

var canvas = global.canvas = document.getElementById("plate");
var ctx = global.ctx = canvas.getContext("2d");

// Event handlers
window.addEventListener("resize", Wall.onresize);

// Grab the starting coordinates
if(window.location.hash) {
	var coords = window.location.hash
		.replace("#", "").split(",")
		.map(function(coord) { return parseInt(coord); })
		.slice(0, 2);

	Wall.x = coords[0];
	Wall.y = coords[1];
}

window.wall = Wall;

// Initilize the wall
Wall.init();