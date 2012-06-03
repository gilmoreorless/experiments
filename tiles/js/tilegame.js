;(function (window, undefined) {

	/*** Utilities ***/

	// Fisher-Yates in-place shuffle from http://bost.ocks.org/mike/shuffle/
	function shuffle(array) {
		var m = array.length, t, i;
		// While there remain elements to shuffle...
		while (m) {
			// Pick a remaining element...
			i = Math.floor(Math.random() * m--);
			// And swap it with the current element.
			t = array[m];
			array[m] = array[i];
			array[i] = t;
		}
		return array;
	}

	function extend(dest /*, src...*/) {
		var len = arguments.length;
		if (len < 2) {
			return dest;
		}
		for (var i = 1; i < len; i++) {
			var src = arguments[i];
			if (src !== undefined) {
				for (var key in src) {
					if (src.hasOwnProperty(key)) {
						dest[key] = src[key];
					}
				}
			}
		}
		return dest;
	}


	/*** Main game ***/

	var Tiler = window.Tiler = function (canvas, options) {
		if (typeof canvas === 'string') {
			canvas = document.getElementById(canvas);
		}
		if (!canvas) {
			throw new TypeError('Invalid canvas argument passed to Tiler');
		}
		this.game = {
			canvas: canvas,
			context: canvas.getContext('2d')
		};
		var sourceCanvas = document.createElement('canvas');
		this.source = {
			canvas: sourceCanvas,
			context: sourceCanvas.getContext('2d'),
			image: null
		};

		// Setup default options and canvas dimensions
		this.options = extend({}, Tiler.defaultOptions, options);
		canvas.width  = options.width;
		canvas.height = options.height;
		sourceCanvas.width = canvas.width;
		sourceCanvas.height = canvas.height;

		// TEMP for debugging
		document.body.appendChild(sourceCanvas);

		// Register click handler
		var handler = this.clickHandler.bind(this);
		canvas.addEventListener('click', handler, false);
		if (this.options.move === 'dblclick') {
			canvas.addEventListener('dblclick', handler, false);
		}

		// Work out pieces
		this.setup();
	};

	Tiler.defaultOptions = {
		width: 320,
		height: 240,
		rows: 3,
		cols: 3,
		move: 'click',
		flip: false,
		rotate: false
	};

	var Tproto = Tiler.prototype;

	Tproto.setup = function () {
		var opts = this.options;
		var rows = opts.rows;
		var cols = opts.cols;
		var length = rows * cols;
		var colWidth = opts.colWidth = opts.width / cols;
		var rowHeight = opts.rowHeight = opts.height / rows;

		// Game state flags
		this.state = {
			valid: false,
			finished: false,
			moves: 0,
			emptyIndex: -1,
			selectedIndex: -1
		};

		// Build the list of pieces to move
		this.pieces = new Array(length);
		var i = length,
			r = rows,
			c;
		while (r--) {
			c = cols;
			while (c--) {
				--i;
				this.pieces[i] = {
					index: i,
					row: r,
					col: c
				};
			}
		}
		// Make the last piece the empty space
		var last = this.pieces.pop();
		last.empty = true;

		// Shuffle the pieces (minus the empty one)
		shuffle(this.pieces);
		// Restore the empty piece
		this.pieces.push(last);
		this.state.emptyIndex = length - 1;
	};

	Tproto.setSrc = function (src) {
		var self = this;
		function drawSource() {
			if (!self.source.isCanvas) {
				self.source.context.drawImage(src, 0, 0);
			}
			self.render();
		}

		var drawn = false;
		if (typeof src === 'string') {
			if (/\.(?:png|gif|jpe?g)$/i.test(src)) {
				var img = new Image();
				img.onload = drawSource;
				img.src = src;
				src = img;
				drawn = true;
			}
		} else if (src instanceof HTMLCanvasElement) {
			self.source.canvas = src;
			self.source.context = null;
			self.source.isCanvas = true;
		}
		if (!drawn) {
			drawSource();
		}
		this.source.image = src;
		this.state.valid = true;
	};

	Tproto.render = function () {
		var ctx = this.game.context;
		var src = this.source.canvas;
		var opts = this.options;

		// Background colour
		ctx.save();
		ctx.fillStyle = '#666';
		ctx.fillRect(0, 0, opts.width, opts.height);
		ctx.restore();

		// Image segments
		var i = this.pieces.length;
		var r = opts.rows;
		var width = opts.colWidth;
		var height = opts.rowHeight;
		var piece, c;
		while (r--) {
			c = opts.cols;
			while (c--) {
				--i;
				piece = this.pieces[i];
				if (!piece.empty) {
					ctx.save();
					ctx.translate(c * width, r * height);
					ctx.drawImage(
						src,
						piece.col * width, piece.row * height,
						width, height,
						0, 0, width, height
					);
					ctx.restore();
				}
			}
		}

		// Selection border
		var sel = this.state.selectedIndex;
		if (sel > -1) {
			r = ~~(sel / opts.cols);
			c = sel % opts.cols;
			ctx.save();
			ctx.strokeStyle = 'rgba(0, 220, 220, 0.7)';
			ctx.lineWidth = 4;
			ctx.lineJoin = 'round';
			ctx.strokeRect(
				c * width - 2, r * height - 2,
				width + 4, height + 4
			);
			ctx.restore();
		}
	};

	Tproto.clickHandler = function (e) {
		if (this.state.finished) {
			return;
		}
		var x = e.offsetX;
		var y = e.offsetY;
		var col = ~~(x / this.options.colWidth);
		var row = ~~(y / this.options.rowHeight);
		var index = row * this.options.cols + col;
		var actionMove = true;
		var actionSelect = false;
		var isDblClick = e.type === 'dblclick';
		if (this.options.move === 'dblclick' && !isDblClick) {
			actionMove = false;
			actionSelect = true;
		}
		if (actionMove) {
			this.moveTile(index);
		} else if (actionSelect) {
			this.selectTile(index);
		}
	};

	Tproto.moveTile = function (index) {
		var state = this.state;
		var pieces = this.pieces;
		var empty = state.emptyIndex;
		var rows = this.options.rows;
		var cols = this.options.cols;
		if (
			index === empty - 1 ||
			index === empty + 1 ||
			index === empty - cols ||
			index === empty + cols
		) {
			// Valid move, let's do this thing
			var temp = pieces[index];
			pieces[index] = pieces[empty];
			pieces[empty] = temp;
			state.emptyIndex = index;
			state.selectedIndex = -1;
			state.moves++;
			this.render();
			this.checkFinished();
		}
	};

	Tproto.selectTile = function (index) {
		this.state.selectedIndex = index;
		this.render();
	};

	Tproto.checkFinished = function () {
		if (this.state.finished) {
			return true;
		}
		var i = this.pieces.length;
		while (i--) {
			if (this.pieces[i].index !== i) {
				return false;
			}
		}
		// Game just finished
		alert('Finished in ' + this.state.moves + ' moves!');
		this.state.finished = true;
		return true;
	};

})(this);
