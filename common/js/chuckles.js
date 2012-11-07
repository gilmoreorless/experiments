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

FUTURE IDEAS

* Movement options: Easing, keyframes, transforms (rotate, scale, skew)
* Support multiple segments
    * Idea 1: All segments behave the same way, based on a single position
    * Idea 2: New segment types with different behaviour and different positions (e.g. eyes move left-right while mouth moves up-down)
* Bind an input source to position for auto-updating
    * HTML input element (text|range|radio|checkbox, textarea, select)
    * AudioContext for sound-based
* "Setup mode" - allow drawing a path on bg image to define a segment

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

    cproto._drawSegment = function () {
        if (this.segmentPath.length < 2) {
            return;
        }
        var ctx = this.ctx;
        // Clear the relative part of the bg image
        ctx.save();
        this._drawPath(this.segmentPath);
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
        this._drawPath(this.segmentPath, this.getSegmentOffset());
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

    function addListener(elem, type, handler) {
        if (elem.addEventListener) {
            elem.addEventListener(type, handler, false);
        } else if (elem.attachEvent) {
            elem.attachEvent('on' + type, handler);
        }
        return {
            remove: function () {
                removeListener(elem, type, handler);
            }
        };
    }

    function removeListener(elem, type, handler) {
        if (elem.removeEventListener) {
            elem.removeEventListener(type, handler, false);
        } else if (elem.detachEvent) {
            elem.detachEvent('on' + type, handler);
        }
    }

    function preventDefault(e) {
        if (e.preventDefault) {
            e.preventDefault();
        } else {
            e.returnValue = false;
        }
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
            drawMode.render(this);
            this.setSegmentPath(this._tmpPath);
            delete this._points;
            delete this._tmpPath;
        },
        render: function (chuck) {
            chuck.render();
            chuck.ctx.save();
            chuck.ctx.strokeStyle = '#000';
            chuck._drawPath(chuck._tmpPath);
            chuck.ctx.stroke();
            chuck.ctx.restore();
        }
    };

    var validModes = {normal: 1, drawing: 1, dragging: 1};
    var modeEvents = {
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
                console.log('setup drawing');
            },
            teardown: function () {
                console.log('teardown drawing');
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