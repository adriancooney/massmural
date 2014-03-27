var Brushes = require("./brushes");

var GUI = module.exports = {
	ui: {
		loader: "#gui .loader",
		coords: "#coords",
		link: "#link"
	},

	loading: function(state) {
		if(state) GUI.ui.loader.classList.add("loading");
		else GUI.ui.loader.classList.remove("loading");
	},

	setCoords: function(x, y) {
		coords.innerText = "(" + x + ", " + y + ")";
	},

	updateCursor: function(brush) {
		// Set the cursor
		document.body.style.cursor = "url('" + Brushes.current.stamp.canvas.toDataURL() + "'), auto";
	},

	init: function() {
		for(var elem in GUI.ui)
			GUI.ui[elem] = document.querySelector(GUI.ui[elem]);

		Brushes.current = Brushes.basic;

		// Set the current brush
		GUI.updateCursor();
	}
};