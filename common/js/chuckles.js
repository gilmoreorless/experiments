/*****

NOTES:

* Canvas has a single background image (e.g. face)
    √ Image can be a string src, Image element or callback function for drawing to canvas directly
    * Allow offset positioning on canvas, don't default to 0,0
√ Segment is cut away from bg image (e.g. mouth)
    √ NEED DEFINITION OF SEGMENT PATH - series of context commands?
√ Movement is where the path should move to at 100%
    √ Simple x/y offsets, relative to initial starting position
√ Position is a value from 0 to 1 - path is moved according to position
√ Fill colour when segment path is cut out
√ Only move segment in steps for more of a "wooden" feel
√ "Setup mode" - allow drawing a path on bg image to define a segment

FUTURE IDEAS

* Movement options: Easing, keyframes, transforms (rotate, scale, skew)
* Support multiple segments
    * Idea 1: All segments behave the same way, based on a single position
    * Idea 2: New segment types with different behaviour and different positions (e.g. eyes move left-right while mouth moves up-down)
* Bind an input source to position for auto-updating
    * HTML input element (text|range|radio|checkbox, textarea, select)
    * AudioContext for sound-based

OPTIMISATIONS

* Don't constantly render to one canvas, use stacked canvases instead
    * Main canvas gets drawn once only, with bg image minus cut-away segment
    * New canvas on top only gets segment, allowing for faster redraws

*****/

Chuckles = (function () {

    var getType = function (thing) {
        return Object.prototype.toString.call(thing).slice(8, -1).toLowerCase();
    };

    /**
     * options:
     *  - canvas: <canvas> element or ID
     *  - movement: object with properties `x` and `y`
     *  - steps: number of "locked" steps for movement (e.g. steps=4 divides movement into quarters, with rounding; steps=0 disables locks)
     *  - path: array of segment path commands
     *  - image: background image; <image> element, string src or function to define canvas drawing commands
     *  - fillStyle: canvas fillStyle for area behind segment path
     */
    function Chuckles(options) {
        options || (options = {});
        this.canvas = options.canvas;
        if (getType(this.canvas) === 'string') {
            this.canvas = document.getElementById(this.canvas);
        }
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
        }
        this.ctx = this.canvas.getContext('2d');
        this.mode = 'normal';
        this._inputs = [];
        this._listeners = {};

        this.movement = options.movement || {x: 0, y: 0};
        this.steps = +options.steps || 0;
        this.position = 0;
        this.fillStyle = options.fillStyle || 'none';
        this.setSegmentPath(options.path || []);
        if (options.image) {
            var self = this;
            this.setImage(options.image);
        } else {
            this.render();
        }
    }

    var cproto = Chuckles.prototype;

    /*** Internal methods ***/

    cproto._drawBackground = function (callback) {
        if (typeof this.image === 'function') {
            this.ctx.save();
            this.image(this.ctx);
            this.ctx.restore();
        } else if (this.image) {
            this.ctx.drawImage(this.image, 0, 0);
        }
    };

    cproto._drawSegment = function (offset) {
        var path = this.segmentPath;
        if (path.length < 2) {
            return;
        }
        var ctx = this.ctx;
        // Clear the relative part of the bg image
        ctx.save();
        this._drawPath(path);
        ctx.clip();
        if (this.fillStyle === 'none') {
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        } else {
            ctx.fillStyle = this.fillStyle;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        ctx.restore();
        // Draw the segment part at the right offset
        ctx.save();
        this._drawPath(path, offset || this.getSegmentOffset());
        ctx.clip();
        this._drawBackground();
        ctx.restore();
    };

    cproto._drawPath = function (path, offset) {
        var ctx = this.ctx;
        if (offset) {
            ctx.translate(offset.x, offset.y);
        }
        ctx.beginPath();
        var piece, cmd, args;
        for (var i = 0, ii = path.length; i < ii; i++) {
            piece = path[i];
            cmd = piece[0];
            args = piece.slice(1);
            if (getType(args[0]) === 'array') {
                for (var j = 0, jj = args.length; j < jj; j++) {
                    ctx[cmd].apply(ctx, args[j]);
                }
            } else {
                ctx[cmd].apply(ctx, args);
            }
        }
    };

    cproto._handleInputNodeChange = function (e) {
        var value = parseFloat(e.target.value);
        if (!isNaN(value)) {
            this.setPosition(value);
        }
    };

    cproto._handleAudioStream = function () {
        this._animFrameID = webkitRequestAnimationFrame(this._handleAudioStream.bind(this));
        this.analyser.getByteFrequencyData(this.byteData);
        var max = Math.max.apply(Math, this.byteData);
        this.setPosition(max / 256);
    };

    function addListener(elem, type, handler) {
        elem.addEventListener(type, handler, false);
        return {
            remove: function () {
                removeListener(elem, type, handler);
            }
        };
    }

    function removeListener(elem, type, handler) {
        elem.removeEventListener(type, handler, false);
    }

    function preventDefault(e) {
        e.preventDefault();
    }

    function getXY(e) {
        return {
            x: e.offsetX,
            y: e.offsetY
        };
    }

    var drawMode = {
        start: function (e) {
            var xy = getXY(e);
            this._points = [xy];
            this._tmpPath = [['moveTo', xy.x, xy.y], ['lineTo']];
            this._listeners.drawModeDraw = addListener(this.canvas, 'mousemove', drawMode.draw.bind(this));
            this._listeners.selectStart = addListener(document, 'selectstart', preventDefault);
        },
        draw: function (e) {
            var xy = getXY(e);
            this._points.push(xy);
            this._tmpPath[1].push([xy.x, xy.y]);
            drawMode.render(this);
        },
        end: function (e) {
            this._listeners.drawModeDraw.remove();
            this._listeners.selectStart.remove();
            // TODO: Use Simplify.js to reduce _points, then use that to make a new _tmpPath
            this._tmpPath.push(['closePath']);
            drawMode.render(this, true);
            this.setSegmentPath(this._tmpPath);
            delete this._points;
            delete this._tmpPath;
        },
        render: function (chuck, useDash) {
            chuck.render();
            chuck.ctx.save();
            chuck.ctx.strokeStyle = '#000';
            if (useDash) {
                chuck.ctx.setLineDash([3, 3]);
            }
            chuck._drawPath(chuck._tmpPath);
            chuck.ctx.stroke();
            if (useDash) {
                chuck.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                chuck.ctx.lineDashOffset = 3;
                chuck.ctx.stroke();
            }
            chuck.ctx.restore();
        }
    };

    var dragMode = {
        start: function (e) {
            var xy = getXY(e);
            if (this.ctx.isPointInPath(xy.x, xy.y)) {
                this._dragging = true;
                this.movement = {x: 0, y: 0};
                this._dragPointStart = xy;
                this._dragPointOffset = {x: 0, y: 0};
                this._oldCursor = this.canvas.style.cursor;
                this.canvas.style.cursor = 'move';
                this._listeners.dragModeDrag = addListener(this.canvas, 'mousemove', dragMode.drag.bind(this));
                this._listeners.selectStart = addListener(document, 'selectstart', preventDefault);
            }
        },
        drag: function (e) {
            var xy = getXY(e);
            this._dragPointOffset.x = xy.x - this._dragPointStart.x;
            this._dragPointOffset.y = xy.y - this._dragPointStart.y;
            this._drawBackground();
            this._drawSegment(this._dragPointOffset);
        },
        end: function (e) {
            if (this._dragging) {
                this._listeners.dragModeDrag.remove();
                this._listeners.selectStart.remove();
                this.canvas.style.cursor = this._oldCursor;
                this.movement = this._dragPointOffset;
                delete this._dragPointStart;
                delete this._dragPointOffset;
                delete this._oldCursor;
                delete this._dragging;
                this.setPosition(1);
            }
        }
    };

    var validModes = {normal: 1, drawing: 1, dragging: 1};
    var modeEvents = {
        normal: {
            setup: function () {
                this.render();
            }
        },
        drawing: {
            setup: function () {
                this.setSegmentPath([]);
                this.setPosition(0);
                // TODO: Function.prototype.bind shim
                this._listeners.drawModeStart = addListener(this.canvas, 'mousedown', drawMode.start.bind(this));
                this._listeners.drawModeEnd = addListener(this.canvas, 'mouseup', drawMode.end.bind(this));
            },
            teardown: function () {
                this._listeners.drawModeStart.remove();
                this._listeners.drawModeEnd.remove();
            }
        },
        dragging: {
            setup: function () {
                this.setPosition(0);
                this.ctx.save();
                this.ctx.setLineDash([3, 3]);
                this.ctx.strokeStyle = '#000';
                this.ctx.stroke();
                this.ctx.restore();
                this._listeners.dragModeStart = addListener(this.canvas, 'mousedown', dragMode.start.bind(this));
                this._listeners.dragModeEnd = addListener(this.canvas, 'mouseup', dragMode.end.bind(this));
            },
            teardown: function () {
                this._listeners.dragModeStart.remove();
                this._listeners.dragModeEnd.remove();
            }
        }
    };

    /*** Public: Actions ***/

    cproto.render = function () {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this._drawBackground();
        this._drawSegment();
    };

    /*** Public: Setters ***/

    cproto.setImage = function (image) {
        if (!image) {
            throw TypeError('Image expected');
        }
        if (getType(image) === 'string') {
            var newImg = new Image();
            var self = this;
            newImg.onload = function () {
                self.setImage(newImg);
            };
            newImg.src = image;
            return;
        }
        this.image = image;
        this.render();
    };

    cproto.setSegmentPath = function (path) {
        this.segmentPath = path;
    };

    cproto.setPosition = function (position) {
        if (position > 1) {
            position /= 100;
        }
        this.position = position;
        this.render();
    };

    cproto.setMode = function (mode) {
        if (!validModes.hasOwnProperty(mode)) {
            return;
        }
        var oldModeEvent = (modeEvents[this.mode] || {}).teardown;
        var newModeEvent = (modeEvents[mode] || {}).setup;
        if (oldModeEvent) {
            oldModeEvent.call(this);
        }
        this.mode = mode;
        if (newModeEvent) {
            newModeEvent.call(this);
        }
    };

    cproto.bindInput = function (input) {
        if (!input) {
            return;
        }
        if (input.nodeName && input.nodeName.toLowerCase() === 'input') {
            this._inputs.push({
                type: 'node/input',
                input: input,
                listener: addListener(input, 'change', this._handleInputNodeChange.bind(this))
            });
            return;
        }
        if (input.mediaStream && input.context && input.context instanceof webkitAudioContext) {
            var i = this._inputs.length;
            while (i--) {
                if (this._inputs[i].type === 'audio/stream' && this._inputs[i].input !== input) {
                    this.unbindInput(this._inputs[i]);
                }
            }

            if (!this.analyser) {
                this.analyser = input.context.createAnalyser();
                this.analyser.fftSize = 32;
                this.byteData = new Uint8Array(this.analyser.fftSize / 2);
            }
            input.connect(this.analyser);
            var chuck = this;
            this._inputs.push({
                type: 'audio/stream',
                input: input,
                listener: {
                    remove: function () {
                        input.disconnect(chuck.analyser);
                        webkitCancelAnimationFrame(chuck._animFrameID);
                    }
                }
            });
            this._handleAudioStream();
        }
    };

    cproto.unbindInput = function (input) {
        if (!input) {
            return;
        }
        var i = this._inputs.length;
        var obj;
        while (i--) {
            obj = this._inputs[i];
            if (obj.input === input) {
                obj.listener.remove();
                this._inputs.splice(i, 1);
                break;
            }
        }
    };

    /*** Public: Getters ***/

    cproto.getSegmentOffset = function () {
        var offset = {x: 0, y: 0};
        if (this.movement) {
            var pos = this.position;
            if (this.steps) {
                pos = Math.round(pos * this.steps) * (1 / this.steps);
            }
            offset.x = this.movement.x * pos;
            offset.y = this.movement.y * pos;
        }
        return offset;
    };

    return Chuckles;
})();