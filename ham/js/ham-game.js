(function (window) {
    var HAM = window.HAM = {};

    HAM._guid = 0;

    HAM.init = function () {
        HAM.game.init('game');
        HAM.input.initKeyboard();
        HAM.video.init();
        HAM.sfx.init();
    };


    /*** EVENTS ***/

    ['on', 'once', 'off'].forEach(function (name) {
        HAM[name] = function () {
            var args = Array.prototype.slice.apply(arguments);
            args[0] = 'ham.' + args[0];
            return eve[name].apply(eve, args);
        };
    });

    /**
     * HAM.trigger('event.name', arg1, ...)
     *  maps to
     * eve('ham.event.name', HAM, arg1, ...)
     */
    HAM.trigger = function () {
        var args = Array.prototype.slice.apply(arguments);
        args[0] = 'ham.' + args[0];
        args.splice(1, 0, HAM);
        return eve.apply(eve, args);
    };


    /*** GAME ***/

    function actionWrapper(func) {
        return function () {
            if (game.state.started) {
                func.apply(this, arguments);
            }
        };
    }

    var lastEnemySpawnTime = 0;
    var enemySpawnRate = 5000; // Milliseconds

    function shouldSpawnEnemy() {
        var now = Date.now();
        // TODO: Use a formula that increases spawn rate over time
        var timeSinceStart = now - game.state.startTime;
        var timeSinceLastEnemy = now - (lastEnemySpawnTime || game.state.startTime);
        if (timeSinceLastEnemy >= enemySpawnRate) {
            lastEnemySpawnTime = now;
            return true;
        }
        return false;
    }

    function killEnemy(id) {
        var enemies = game.state.enemies;
        var i = enemies.length;
        while (i--) {
            if (enemies[i].id === id) {
                game.state.enemies.splice(i, 1);
                break;
            }
        }

        game.state.kills++;
        HAM.trigger('state.kills', game.state.kills);
    }

    var game = HAM.game = {
        canvas: null,
        context: null,
        rafId: null,

        sprites: {
            player: null,
            enemy: null
        },

        state: {
            started: false,
            startTime: 0,
            alive: true,
            kills: 0,
            player: {},
            enemies: [],
            playerShots: [],
            enemyShots: []
        },

        init: function (id) {
            this.canvas = document.getElementById(id);
            this.context = this.canvas.getContext('2d');
            this.canvas.width = 480;
            this.canvas.height = 360;

            // Temp player until image is created
            var canvas = document.createElement('canvas');
            canvas.width = canvas.height = 32;
            var ctx = canvas.getContext('2d');
            ctx.strokeWidth = 1;
            ctx.strokeStyle = '#030';
            ctx.fillStyle = '#090';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(12, 16, 0, 32);
            ctx.lineTo(32, 16);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            this.sprites.player = {
                width: canvas.width,
                height: canvas.height,
                image: canvas
            };

            // Temp enemy until image is created
            canvas = document.createElement('canvas');
            canvas.width = canvas.height = 32;
            ctx = canvas.getContext('2d');
            ctx.fillStyle = '#900';
            ctx.fillRect(4, 4, 24, 24);
            ctx.translate(16, -6);
            ctx.rotate(Math.PI / 4);
            ctx.fillRect(4, 4, 24, 24);

            this.sprites.enemy = {
                width: canvas.width,
                height: canvas.height,
                image: canvas
            };
        },

        start: function () {
            var state = game.state;
            state.alive = true;
            state.kills = 0;
            state.player = {y: game.canvas.height / 2};
            state.enemies = [];
            state.playerShots = [];
            state.enemyShots = [];
            state.startTime = Date.now();
            state.started = true;
            game.tick();
            HAM.sfx.play('engine');
            HAM.trigger('game.start');
        },

        finish: function () {
            if (game.rafId) {
                cancelAnimationFrame(game.rafId);
                game.rafId = null;
            }
            game.state.started = false;
            HAM.sfx.stop('engine');
            HAM.trigger('game.finish');
        },

        tick: function () {
            var state = game.state;
            if (state.alive) {
                game.rafId = requestAnimationFrame(game.tick);
            } else {
                game.finish();
            }

            var i, j, enemy, shot, x, y, w2, h2, hit, values;
            var gw = game.canvas.width;
            var gh = game.canvas.height;
            var ctx = game.context;
            ctx.clearRect(0, 0, gw, gh);

            var playerSprite = game.sprites.player;
            var enemySprite = game.sprites.enemy;
            var enemyBounds = {};

            // Create new enemies if needed
            if (shouldSpawnEnemy()) {
                state.enemies.push({
                    id: HAM._guid++,
                    x: gw - enemySprite.width,
                    y: ~~(Math.random() * (gh - enemySprite.height)),
                    vx: -0.25  // X pixels to move every tick()
                });
            }

            // Draw player
            ctx.drawImage(playerSprite.image, 0, state.player.y - playerSprite.height / 2);

            // Draw enemies
            i = state.enemies.length;
            values = [];
            while (i--) {
                enemy = state.enemies[i];
                ctx.drawImage(enemySprite.image, enemy.x, enemy.y);
                enemy.x += enemy.vx;
                enemyBounds[enemy.x] = [enemy.y, enemy.y + enemySprite.height, enemy.id];
                values.push(enemy.x);
            }
            if (state.enemies.length) {
                enemyBounds.min = Math.min.apply(Math, values);
                enemyBounds.max = Math.max.apply(Math, values) + enemySprite.width;
            } else {
                enemyBounds.min = enemyBounds.max = Infinity;
            }

            // Draw shots
            ctx.save();
            ctx.fillStyle = '#0c0';
            i = state.playerShots.length;
            while (i--) {
                shot = state.playerShots[i];
                var sw = 5, sh = 2;
                x = shot.x;
                y = shot.y;
                ctx.fillRect(x - sw, y - sh, sw * 2, sh * 2);

                // Hit/bounds detection
                hit = false;
                if (x > enemyBounds.min && x < enemyBounds.max) {
                    for (j in enemyBounds) {
                        if (j !== 'max' && j !== 'min' && enemyBounds.hasOwnProperty(j)) {
                            if (x >= j && y >= enemyBounds[j][0] && y <= enemyBounds[j][1]) {
                                hit = true;
                                killEnemy(enemyBounds[j][2]);
                                break;
                            }
                        }
                    }
                }
                if (hit || x > gw) {
                    state.playerShots.splice(i, 1);
                } else {
                    shot.x += 5;
                }
            }
            ctx.restore();
        },

        setPlayerY: function (y) {
            var minY = game.sprites.player.height / 2;
            var maxY = game.canvas.height - minY;
            // Make sure y value is within bounds
            if (y < minY) {
                y = minY;
            }
            if (y > maxY) {
                y = maxY;
            }
            // Update player object
            game.state.player.y = y;
        },

        action: {
            up: actionWrapper(function () {
                game.setPlayerY(game.state.player.y - 10);
            }),

            down: actionWrapper(function () {
                game.setPlayerY(game.state.player.y + 10);
            }),

            fire: actionWrapper(function () {
                var playerSprite = game.sprites.player;
                game.state.playerShots.push({
                    x: playerSprite.width,
                    y: game.state.player.y
                });
                HAM.sfx.play('fire');
            })
        }

    };


    /*** INPUT ***/

    var _gettingMedia = false;

    HAM.input = {
        inputStream: null,
        audioSource: null,

        getUserMedia: function () {
            var that = this;
            _gettingMedia = true;
            navigator.getUserMedia({video: true, audio: true}, function (stream) {
                _gettingMedia = false;
                that.inputStream = stream;
                that.audioSource = HAM.sfx.context.createMediaStreamSource(stream);
                HAM.trigger('input.start');
            }, function () {
                _gettingMedia = false;
                console.error('Oh no! Something went wrong and I can\'t be bothered handling this error properly.');
            });
        },

        getVideo: function (callback) {
            if (this.inputStream) {
                callback(this.inputStream);
                return;
            }
            var that = this;
            HAM.once('input.start', function () {
                callback(that.inputStream);
            });
            if (!_gettingMedia) {
                this.getUserMedia();
            }
        },

        getAudio: function (callback) {
            if (this.audioSource) {
                callback(this.audioSource);
                return;
            }
            var that = this;
            HAM.once('input.start', function () {
                callback(that.audioSource);
            });
            if (!_gettingMedia) {
                this.getUserMedia();
            }
        },

        keyMap: {
            38: 'up',    // Up arrow
            40: 'down',  // Down arrow
            32: 'fire'   // Space
        },

        initKeyboard: function () {
            document.addEventListener('keydown', this.keyListener, false);
        },

        keyListener: function (e) {
            var action = HAM.input.keyMap[e.keyCode];
            if (action) {
                e.preventDefault();
                HAM.game.action[action]();
            }
        }
    };


    /*** VIDEO ***/

    HAM.video = {
        dom: {
            video: null,
            canvas: null,
            context: null
        },

        init: function () {
            var video = document.createElement('video');
            var canvas = document.createElement('canvas');
            video.width  = canvas.width  = 320;
            video.height = canvas.height = 240;
            this.dom.video = video;
            this.dom.canvas = canvas;
            this.dom.context = canvas.getContext('2d');
            HAM.input.getVideo(function (stream) {
                setStreamSrc(video, stream);
            });
        },

        calibrate: function () {},

        startTracking: function () {},

        stopTracking: function () {}
    };


    /*** AUDIO ***/

    HAM.Sound = function (params) {
        this.id = HAM._guid++;
        this.name = params.name;
        this.context = params.context;
        this.loop = !!params.loop;
        this.buffer = null;
        this.src = null;
        this.state = 'empty';

        this.analyser = this.context.createAnalyser();
        this.analyser.fftSize = 64;
        this.byteData = new Uint8Array(this.analyser.frequencyBinCount);
        this.lastTimeAboveThreshold = 0;
        this.timer = 0;
        var analyser = this.analyser;
        HAM.input.getAudio(function (audioSource) {
            audioSource.connect(analyser);
        });
    };

    var recOpts = HAM.Sound.recordingOptions = {
        threshold: 130, // 0 - 255
        cutoffAllowance: 1000 // milliseconds
    };

    var Sproto = HAM.Sound.prototype;

    function isAudioAboveThreshold(sound) {
        var now = Date.now();
        sound.analyser.getByteFrequencyData(sound.byteData);
        var max = Math.max.apply(Math, sound.byteData);
        if (max >= recOpts.threshold) {
            sound.lastTimeAboveThreshold = now;
            // console.log('max', max);
            return true;
        }
        // console.log('max', max, now - sound.lastTimeAboveThreshold)
        if (!sound.lastTimeAboveThreshold) {
            return false;
        }
        var delta = now - sound.lastTimeAboveThreshold;
        if (delta > recOpts.cutoffAllowance) {
            sound.lastTimeAboveThreshold = 0;
            return false;
        }
        return true;
    }

    function listenForAudioStop() {
        if (!isAudioAboveThreshold(this)) {
            this.stopRecording();
        } else {
            this.timer = setTimeout(listenForAudioStop.bind(this), 10);
        }
    }

    function listenForAudioStart() {
        if (isAudioAboveThreshold(this)) {
            HAM.sfx.recorder.record();
            this.timer = setTimeout(listenForAudioStop.bind(this), 10);
        } else {
            this.timer = setTimeout(listenForAudioStart.bind(this), 10);
        }
    }

    Sproto.record = function () {
        HAM.sfx.recorder.clear();
        this.state = 'recording';
        HAM.trigger('sound.startRecord.' + this.id, this);
        listenForAudioStart.call(this);
    };

    Sproto.stopRecording = function () {
        var that = this;
        function cleanup() {
            that.state = 'stopped';
            if (that.timer) {
                clearTimeout(that.timer);
                that.timer = 0;
            }
            HAM.trigger('sound.stopRecord.' + that.id, that);
        }

        HAM.sfx.recorder.stop();
        HAM.sfx.recorder.getBuffer(function (buffers) {
            if (!buffers[0].length) {
                console.log('No buffer length');
                that.src = null;
                cleanup();
                return;
            }

            var buffer = that.context.createBuffer(2, buffers[0].length, that.context.sampleRate);
            buffer.getChannelData(0).set(buffers[0]);
            buffer.getChannelData(1).set(buffers[1]);
            that.buffer = buffer;
            cleanup();
        });
    };

    Sproto.play = function () {
        console.log('play', this.name, this);
        if (this.buffer) {
            // Need to create a new AudioBufferSourceNode each time as they can't be played more than once
            this.src = this.context.createBufferSource();
            this.src.buffer = this.buffer;
            this.src.connect(this.context.destination);
            if (this.loop) {
                this.src.loop = true;
            }
            this.src.start(0);
            this.state = 'playing';
            HAM.trigger('sound.startPlay.' + this.id, this);
            if (!this.loop) {
                setTimeout(this.stop.bind(this), this.src.buffer.duration * 1000);
            }
        }
    };

    Sproto.stop = function () {
        console.log('stop', this.name, this);
        if (this.src && this.state == 'playing') {
            this.src.disconnect();
            this.src = null;
            this.state = 'stopped';
            HAM.trigger('sound.stopPlay.' + this.id, this);
        }
    };

    Sproto.erase = function () {
        console.log('erase', this.name, this);
        if (this.buffer) {
            if (this.src && this.state == 'playing') {
                this.stop();
            }
            this.buffer = null;
            this.state = 'empty';
            HAM.trigger('sound.erase.' + this.id, this);
        }
    };

    var sounds = {};

    HAM.sfx = {
        context: new AudioContext(),
        recorder: null,

        init: function () {
            this.add('engine', {
                loop: true
            });
            this.add('fire');
            HAM.input.getAudio(function (audioSource) {
                this.recorder = new Recorder(audioSource, {
                    workerPath: '../common/js/recorderWorker.js'
                });
            }.bind(this));
        },

        add: function (name, options) {
            options || (options = {});
            options.name = name;
            options.context = this.context;
            sounds[name] = new HAM.Sound(options);
            return sounds[name];
        },

        get: function (name) {
            return sounds[name];
        },

        names: function () {
            return Object.keys(sounds);
        },

        play: function (name) {
            (sounds[name] || {play: function () {}}).play();
        },

        stop: function (name) {
            (sounds[name] || {stop: function () {}}).stop();
        }
    };


    HAM.init();

    // DEBUG
    window.end = HAM.game.finish;

})(this);