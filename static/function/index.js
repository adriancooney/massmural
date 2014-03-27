var Tile = require("./Tile"),
	Wall = require("./Wall"),
	GUI = require("./GUI");

var canvas = global.canvas = document.getElementById("plate");
var ctx = global.ctx = canvas.getContext("2d");


// Grab the starting coordinates
if(window.location.hash) {
	var coords = window.location.hash
		.replace("#", "").split(",")
		.map(function(coord) { return parseInt(coord); })
		.slice(0, 2);

	if(coords[0] && coords[1]) {
		Wall.x = coords[0];
		Wall.y = coords[1];

		GUI.setCoords(Wall.x, Wall.y);
	}
}

// Expose for debugging
window.wall = Wall; // TIL THE SWEAT DROPS DOWN MA BALLS
window.gui = GUI;

// Initilize the GUI
GUI.init();

// Initilize the wall
Wall.init();