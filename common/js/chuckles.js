/*****

NOTES:

* Canvas has a single background image (e.g. face)
    * Image can be a string src, Image element or callback function for drawing to canvas directly
    * Allow offset positioning on canvas, don't default to 0,0
* Segment is cut away from bg image (e.g. mouth)
    * NEED DEFINITION OF SEGMENT PATH - series of context commands?
* Movement is where the path should move to at 100%
    * Simple x/y offsets, relative to initial starting position
* Position is a value from 0 to 1 - path is moved according to position

FUTURE IDEAS

* Fill colour when segment path is cut out
* Easing & keyframes for movement
* Support multiple paths
* Bind an input source to position for auto-updating
    * HTML input element (text|range|radio|checkbox, textarea, select)
    * AudioContext for sound-based

OPTIMISATIONS

* Don't constantly render to one canvas, use stacked canvases instead
    * Main canvas gets drawn once only, with bg image minus cut-away segment
    * New canvas on top only gets segment, aloowing for faster redraws

*****/

Chuckles = (function () {
    function Chuckles(options) {
        options || (options = {});
        this.canvas = options.canvas || document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.movement = options.movement || {x: 0, y: 0};
        this.position = 0;
        if (options.image) {
            this.setImage(options.image);
        }
        this.setSegmentPath(options.path || []);
        this.render();
    }

    var cproto = Chuckles.prototype;

    /*** Internal methods ***/

    cproto._drawBackground = function () {
        if (typeof this.image === 'function') {
            this.ctx.save();
            this.image(this.ctx);
            this.ctx.restore();
        } else if (this.image) {
            this.ctx.drawImage(this.image, 0, 0);
        }
    };

    cproto._drawSegment = function () {
        var ctx = this.ctx;
        // Clear the relative part of the bg image
        ctx.save();
        this._drawPath(this.segmentPath);
        ctx.clip();
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.restore();
        // Draw the segment part at the right offset
        // ctx.strokeStyle = '#900';
        ctx.save();
        this._drawPath(this.segmentPath, this.getSegmentOffset());
        ctx.clip();
        this._drawBackground();
        // ctx.stroke();
        ctx.restore();
    };

    cproto._drawPath = function (path, offset) {
        var ctx = this.ctx;
        if (offset) {
            ctx.translate(offset.x, offset.y);
        }
        // TEMP
        ctx.beginPath();
        ctx.moveTo(75.5, 75.5);
        ctx.lineTo(105.5, 75.5);
        ctx.lineTo(105.5, 105.5);
        ctx.lineTo(75.5, 105.5);
        ctx.closePath();
        // END TEMP
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
        if (Object.prototype.toString.call(image) === '[object String]') {
            var newImg = new Image();
            var self = this;
            newImg.onload = function () {
                self.setImage(newImg);
            };
            newImg.src = image;
            return;
        }
        this.image = image;
    };

    cproto.setSegmentPath = function (path) {
        // TODO: How is path formatted?
        this.segmentPath = path;
    };

    cproto.setPosition = function (position) {
        if (position > 1) {
            position /= 100;
        }
        this.position = position;
        this.render();
    };

    /*** Public: Getters ***/

    cproto.getSegmentOffset = function () {
        var offset = {x: 0, y: 0};
        if (this.movement) {
            offset.x = this.movement.x * this.position;
            offset.y = this.movement.y * this.position;
        }
        return offset;
    };

    return Chuckles;
})();