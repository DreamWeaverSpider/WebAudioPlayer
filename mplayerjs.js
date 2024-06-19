//Frame Shower
var Framer = {
    //The number of ticks is 360, corresponding to 360 degrees of the circle.
    countTicks: 360,
    //the container: frequency data of one frame
    frequencyData: [],

    tickSize: 10,

    PI: 360,

    index: 0,

    loadingAngle: 0,

    maxScale : (window.innerHeight / 740).toFixed(2),

    init: function (scene) {
        this.canvas = document.querySelector('canvas');
        this.scene = scene;
        this.context = scene.context;
        this.configure();
    },

    configure: function () {
        this.maxTickSize = this.tickSize * 9 * this.scene.scaleCoef;
        this.countTicks = 360 * Scene.scaleCoef;
    },

    draw: function () {
        this.drawTicks();
        this.drawEdging();
    },

    drawTicks: function () {
        this.context.save();
        this.context.beginPath();
        this.context.lineWidth = 1;
        this.ticks = this.getTicks(this.countTicks, this.tickSize, [0, 90]);
        for (var i = 0, len = this.ticks.length; i < len; ++i) {
            var tick = this.ticks[i];
            this.drawTick(tick.x1, tick.y1, tick.x2, tick.y2);
        }
        this.context.restore();
    },

    drawTick: function (x1, y1, x2, y2) {
        var dx1 = parseInt(this.scene.cx + x1);
        var dy1 = parseInt(this.scene.cy + y1);

        var dx2 = parseInt(this.scene.cx + x2);
        var dy2 = parseInt(this.scene.cy + y2);

        var gradient = this.context.createLinearGradient(dx1, dy1, dx2, dy2);
        gradient.addColorStop(0, '#FE4365');
        gradient.addColorStop(0.6, '#FE4365');
        gradient.addColorStop(1, '#F5F5F5');
        this.context.beginPath();
        this.context.strokeStyle = gradient;
        this.context.lineWidth = 2;
        this.context.moveTo(this.scene.cx + x1, this.scene.cx + y1);
        this.context.lineTo(this.scene.cx + x2, this.scene.cx + y2);
        this.context.stroke();
    },

    setLoadingPercent: function (percent) {
        this.loadingAngle = percent * 2 * Math.PI;
    },

    drawEdging: function () {
        this.context.save();
        this.context.beginPath();
        this.context.strokeStyle = 'rgba(254, 67, 101, 0.5)';
        this.context.lineWidth = 1;

        var offset = Tracker.lineWidth / 2;
        this.context.moveTo(this.scene.padding + 2 * this.scene.radius - Tracker.innerDelta - offset, this.scene.padding + this.scene.radius);
        //this.scene.cx---The horizontal coordinate of the center point of the canvas，this.scene.cy---The vertical coordinate of the canvas center point
        this.context.arc(this.scene.cx, this.scene.cy, this.scene.radius - Tracker.innerDelta - offset, 0, this.loadingAngle, false);

        this.context.stroke();
        this.context.restore();
    },

    getTicks: function (count, size, animationParams) {
        size = 10;
        var ticks = this.getTickPoints(count);
        var x1, y1, x2, y2, m = [], tick, k;
        var lesser = 160;
        var allScales = [];
        for (var i = 0, len = ticks.length; i < len; ++i) {
            var coef = 1 - i / (len * 2.5);
            var delta = ((this.frequencyData[i] || 0) - lesser * coef) * this.scene.scaleCoef;
            if (delta < 0) {
                delta = 0;
            }
            tick = ticks[i];
            if (animationParams[0] <= tick.angle && tick.angle <=  animationParams[1]) {
                k = this.scene.radius / (this.scene.radius - this.getSize(tick.angle, animationParams[0], animationParams[1]) - delta);
            } else {
                k = this.scene.radius / (this.scene.radius - (size + delta));
            }
            x1 = tick.x * (this.scene.radius - size);
            y1 = tick.y * (this.scene.radius - size);
            x2 = x1 * k;
            y2 = y1 * k;
            m.push({ x1: x1, y1: y1, x2: x2, y2: y2 });
            if (i < 20) {
                var scale = delta / 50;
                scale = scale < 1 ? 1 : scale;
                allScales.push(scale);
            }
        }
        var sum = allScales.reduce(function(pv, cv) { return pv + cv; }, 0) / allScales.length;
        //Limit the maximum zoom ratio of the canvas: window.innerHeight = 963; 963/740=1.30135135135...
        sum = sum > this.maxScale ? this.maxScale : sum;
        this.canvas.style.transform = 'scale('+sum+')';
        return m;
    },

    getSize: function (angle, l, r) {
        var m = (r - l) / 2;
        var x = (angle - l);
        var h;

        if (x == m) {
            return this.maxTickSize;
        }
        var d = Math.abs(m - x);
        var v = 70 * Math.sqrt(1 / d);
        if (v > this.maxTickSize) {
            h = this.maxTickSize - d;
        } else {
            h = Math.max(this.tickSize, v);
        }

        if (this.index > this.count) {
            this.index = 0;
        }

        return h;
    },

    getTickPoints: function (count) {
        var coords = [], step = this.PI / count;
        for (var deg = 0; deg < this.PI; deg += step) {
            var rad = deg * Math.PI / (this.PI / 2);
            coords.push({ x: Math.cos(rad), y: -Math.sin(rad), angle: deg });
        }
        return coords;
    }
};
'use strict';

//Progress tracker: this shows the playback position of audio, its path is a circle
var Tracker = {

    innerDelta: 20,

    lineWidth: 7,

    prevAngle: 0.5,

    angle: 0,

    playbackPositionMinusCurrentTime: 0,

    animationCount: 10,

    pressButton: false,

    init: function (scene) {
        this.scene = scene;
        this.context = scene.context;
        this.initHandlers();
    },

    initHandlers: function () {
        var that = this;
        //Left mouse press down
        this.scene.canvas.addEventListener('mousedown', function (e) {
            if (that.isInsideOfSmallCircle(e) || that.isOusideOfBigCircle(e)) {
                return;
            }
            that.prevAngle = that.angle;
            that.pressButton = true;
            that.stopAnimation();
            that.calculateAngle(e, true);
        });
        //Left mouse press up
        window.addEventListener('mouseup', function () {
            if (!that.pressButton) {
                return;
            }
            var id = setInterval(function () {
                if (!that.animatedInProgress) {
                    that.pressButton = false;
                    clearInterval(id);
                }
            }, 100);
            that.playbackPositionMinusCurrentTime = that.angle / (2 * Math.PI) * Player.source.buffer.duration - Player.context.currentTime;
            Player.playAt(that.angle / (2 * Math.PI) * Player.source.buffer.duration);
        });

        window.addEventListener('mousemove', function (e) {
            if (that.animatedInProgress) {
                return;
            }
            if (that.pressButton && that.scene.inProcess()) {
                that.calculateAngle(e);
            }
        });
    },

    isInsideOfSmallCircle: function (e) {
        var x = Math.abs(e.pageX - this.scene.cx - this.scene.coord.left);
        var y = Math.abs(e.pageY - this.scene.cy - this.scene.coord.top);
        return Math.sqrt(x * x + y * y) < this.scene.radius - 3 * this.innerDelta;
    },

    isOusideOfBigCircle: function (e) {
        return Math.abs(e.pageX - this.scene.cx - this.scene.coord.left) > this.scene.radius ||
            Math.abs(e.pageY - this.scene.cy - this.scene.coord.top) > this.scene.radius;
    },

    draw: function () {
        if (!Player.source.buffer) {
            return;
        }
        if (!this.pressButton) {
            // The currentTime of an AudioContext object always starts from 0.
            // It does not (and cannot) represent the time when playback starts from a certain position, but the total duration of playback.
            // For example, you want to start playing from 50 seconds, so you call "source.start(0,50);"
            // but currentTime starts counting from 0, not from 50.
            this.angle = ((Player.context.currentTime + this.playbackPositionMinusCurrentTime) / Player.source.buffer.duration * 2 * Math.PI) % (2 * Math.PI) || 0;
        }
        this.drawArc();
    },

    drawArc: function () {
        this.context.save();
        this.context.strokeStyle = 'rgba(254, 67, 101, 0.8)';
        this.context.beginPath();
        this.context.lineWidth = this.lineWidth;

        this.r = this.scene.radius - (this.innerDelta + this.lineWidth / 2);
        this.context.arc(
            this.scene.radius + this.scene.padding,
            this.scene.radius + this.scene.padding,
            this.r, 0, this.angle, false
        );
        this.context.stroke();
        this.context.restore();
    },

    drawAngle: function (angle) {
        this.angle = angle;
    },

    calculateAngle: function (e, animatedInProgress) {
        this.animatedInProgress = animatedInProgress;
        this.mx = e.pageX;
        this.my = e.pageY;
        this.angle = Math.atan((this.my - this.scene.cy - this.scene.coord.top) / (this.mx - this.scene.cx - this.scene.coord.left));
        if (this.mx < this.scene.cx + this.scene.coord.left) {
            this.angle = Math.PI + this.angle;
        }
        if (this.angle < 0) {
            this.angle += 2 * Math.PI;
        }
        if (animatedInProgress) {
            this.startAnimation();
        } else {
            this.prevAngle = this.angle;
        }
    },

    startAnimation: function () {
        var that = this;
        var angle = this.angle;
        var l = Math.abs(this.angle) - Math.abs(this.prevAngle);
        var step = l / this.animationCount, i = 0;
        var f = function () {
            that.angle += step;
            if (++i == that.animationCount) {
                that.angle = angle;
                that.prevAngle = angle;
                that.animatedInProgress = false;
            } else {
                that.animateId = setTimeout(f, 20);
            }
        };

        this.angle = this.prevAngle;
        this.animateId = setTimeout(f, 20);
    },

    stopAnimation: function () {
        clearTimeout(this.animateId);
        this.animatedInProgress = false;
    }
};
'use strict';

// Drawing Canvas under the Scene
var Scene = {

    padding: 120,

    minSize: 740,

    optimiseHeight: 982,

    _inProcess: false,

    init: function () {
        this.canvasConfigure();
        this.initHandlers();

        Framer.init(this);
        Tracker.init(this);
        Controls.init(this);

        this.startRender();
    },

    canvasConfigure: function () {
        this.canvas = document.querySelector('canvas');
        this.context = this.canvas.getContext('2d');
        this.context.strokeStyle = '#FE4365';
        this.calculateSize();
    },

    calculateSize: function () {
        this.scaleCoef = Math.max(0.5, 740 / this.optimiseHeight);

        var size = Math.max(this.minSize, 1/*document.body.clientHeight */);
        this.canvas.setAttribute('width', size);
        this.canvas.setAttribute('height', size);
        //this.canvas.style.marginTop = -size / 2 + 'px';
        //this.canvas.style.marginLeft = -size / 2 + 'px';

        this.width = size;
        this.height = size;

        this.radius = (size - this.padding * 2) / 2;
        this.cx = this.radius + this.padding;
        this.cy = this.radius + this.padding;
        this.coord = this.canvas.getBoundingClientRect();
    },

    initHandlers: function () {
        var that = this;
        window.onresize = function () {
            that.canvasConfigure();
            Framer.configure();
            that.render();
        };
    },

    render: function () {
        var that = this;
        requestAnimationFrame(function () {
            that.clear();
            that.draw();
            if (that._inProcess) {
                that.render();
            }
        });
    },

    clear: function () {
        this.context.clearRect(0, 0, this.width, this.height);
    },

    draw: function () {
        Framer.draw();
        Tracker.draw();
        Controls.draw();
    },

    startRender: function () {
        this._inProcess = true;
        this.render();
    },

    stopRender: function () {
        this._inProcess = false;
    },

    inProcess: function () {
        return this._inProcess;
    }
};
'use strict';

// All controls of Player
var Controls = {

    playing: false,

    init: function (scene) {
        this.scene = scene;
        this.context = scene.context;
        this.initHandlers();
        this.timeControl = document.querySelector('.time');
    },

    initHandlers: function () {
        this.initPlayButton();
        this.initPauseButton();
        this.initSoundButton();
        this.initPrevSongButton();
        this.initNextSongButton();
        this.initTimeHandler();
    },

    // Init Play Button
    initPlayButton: function () {
        var that = this;
        this.playButton = document.querySelector('.play');
        this.playButton.addEventListener('mouseup', function () {
            if (!Player.sourceReady) {
                Player.showSnackbar("The audio is being prepared, please wait……");
                return;
            }
            that.playButton.style.display = 'none';
            that.pauseButton.style.display = 'inline-block';
            Player.play();
            that.playing = true;
        });
    },

    // Init Pause Button
    initPauseButton: function () {
        var that = this;
        this.pauseButton = document.querySelector('.pause');
        this.pauseButton.addEventListener('mouseup', function () {
            that.playButton.style.display = 'inline-block';
            that.pauseButton.style.display = 'none';
            Player.pause();
            that.playing = false;
        });
    },

    // Init Sound Button
    initSoundButton: function () {
        var that = this;
        this.soundButton = document.querySelector('.soundControl');
        this.soundButton.addEventListener('mouseup', function () {
            if (that.soundButton.classList.contains('disable')) {
                that.soundButton.classList.remove('disable');
                Player.unmute();
            } else {
                that.soundButton.classList.add('disable');
                Player.mute();
            }
        });
    },

    // Init Previous Song Button
    initPrevSongButton: function () {
        var that = this;
        this.prevSongButton = document.querySelector('.prevSong');
        this.prevSongButton.addEventListener('mouseup', function () {
            Player.prevTrack();
            that.playing && Player.play();
        });
    },

    // Init Next Song Button
    initNextSongButton: function () {
        var that = this;
        this.nextSongButton = document.querySelector('.nextSong');
        this.nextSongButton.addEventListener('mouseup', function () {
            Player.nextTrack();
            that.playing && Player.play();
        });
    },

    // Init the time process of playback
    initTimeHandler: function () {
        var that = this;
        setTimeout(function () {
            var rawTime = parseInt(Player.context.currentTime + Tracker.playbackPositionMinusCurrentTime || 0);
            if (Player.duration && Player.context.currentTime + Tracker.playbackPositionMinusCurrentTime > Player.duration) {
                rawTime = rawTime % Player.duration;
                //rawTime = rawTime % Player.duration == 0 ? Player.duration : rawTime % Player.duration;
            }
            var secondsInMin = 60;
            var min = parseInt(rawTime / secondsInMin || 0);
            var seconds = rawTime - min * secondsInMin;
            if (min < 10) {
                min = '0' + min;
            }
            if (seconds < 10) {
                seconds = '0' + seconds;
            }
            var time = min + ':' + seconds;
            that.timeControl.textContent = time;
            that.initTimeHandler();
        }, 1000);
    },

    draw: function () {
        this.drawPic();
    },

    drawPic: function () {
        this.context.save();
        this.context.beginPath();
        this.context.fillStyle = 'rgba(254, 67, 101, 0.85)';
        this.context.lineWidth = 1;
        // x = r*cos(theta)
        var x = Tracker.r / Math.sqrt(Math.pow(Math.tan(Tracker.angle), 2) + 1);
        // x^2+y^2=r^2
        var y = Math.sqrt(Tracker.r * Tracker.r - x * x);
        // Determine which quadrant the tracker is located in
        if (this.getQuadrant() == 2) {
            x = -x;
        }
        if (this.getQuadrant() == 3) {
            x = -x;
            y = -y;
        }
        if (this.getQuadrant() == 4) {
            y = -y;
        }
        this.context.arc(this.scene.radius + this.scene.padding + x, this.scene.radius + this.scene.padding + y, 10, 0, Math.PI * 2, false);
        this.context.fill();
        this.context.restore();
    },

    // Get the quadrant where the progress tracker is located
    getQuadrant: function () {
        if (0 <= Tracker.angle && Tracker.angle < Math.PI / 2) {
            return 1;
        }
        if (Math.PI / 2 <= Tracker.angle && Tracker.angle < Math.PI) {
            return 2;
        }
        if (Math.PI < Tracker.angle && Tracker.angle < Math.PI * 3 / 2) {
            return 3;
        }
        if (Math.PI * 3 / 2 <= Tracker.angle && Tracker.angle <= Math.PI * 2) {
            return 4;
        }
    }
};

'use strict';

// Player Object
var Player = {

    context: null,

    duration: null,

    // Current audio source
    source: null,

    // Audio decoded data, same as source.buffer
    decodedData: null,

    // Flag indicating whether the audio source has been downloaded
    sourceReady: false,

    // 0x00 the audio is stopped;
    // 0x01 the audio is playing;
    // 0x10 the audio is suspended;
    playState: 0x00,

    // Set your own tracks below
    tracks: [
        // {
        //     artist: "真瑞",
        //     song: "最美的瞬间",
        //     url: "//ceveryc.com/music/真瑞 - 最美的瞬间.mp3"
        // },
        // {
        //     artist: "林俊杰",
        //     song: "X",
        //     url: "//ceveryc.com/music/林俊杰 - X.mp3"
        // },
        // {
        //     artist: "刘力扬",
        //     song: "旅途",
        //     url: "//ceveryc.com/music/刘力扬 - 旅途.mp3"
        // },
        // {
        //     artist: "胡彦斌",
        //     song: "月光",
        //     url: "//ceveryc.com/music/胡彦斌 - 月光.mp3"
        // },
        // {
        //     artist: "周深",
        //     song: "起风了",
        //     url: "//ceveryc.com/music/周深 - 起风了.mp3"
        // },
        // {
        //     artist: "Jay Chou",
        //     song: "晴天",
        //     url: "//ceveryc.com/music/晴天.mp3"
        // },
        // {
        //     artist: "王梓熙",
        //     song: "化风行万里 (DJ京仔版)",
        //     url: "//ceveryc.com/music/化风行万里.mp3"
        // },
        {
            artist: "Kavinsky",
            song: "Odd Look ft. The Weeknd",
            url: "odd-look.mp3"
        }
    ],

    init: async function () {
        try {
            this.firstLaunch = true;
            this.playing = false;

            await this.loadTrack(0);

            //this.initHandlers();
        } catch (e) {
            console.log(e);
            Framer.setLoadingPercent(1);
        }
        Framer.setLoadingPercent(1);
        Scene.init();
    },

    loadTrack: async function (index) {
        Tracker.playbackPositionMinusCurrentTime = 0;

        var that = this;

        // Init the Context of Audio
        that.context = new AudioContext();
        // Determine whether the context has an object 'suspended'. If so, call the object as a function object.
        that.context.suspend && that.context.suspend();
        // Init AudioBufferSource
        that.source = that.context.createBufferSource();

        await that.context.audioWorklet.addModule("audio-processor.js");
        that.audioWorkletNode = new AudioWorkletNode(that.context, "audio-processor");
        that.audioWorkletNode.connect(that.context.destination);

        // Establish a connection between an audio source and an audio output device
        that.source.connect(that.context.destination);
        // Set loop playback
        that.source.loop = true;

        // Create analyzer
        that.analyser = that.context.createAnalyser();
        // Set analyzer smoothing time
        that.analyser.smoothingTimeConstant = 0.6;
        // Sets the window size for the analyzer to perform fast Fourier transforms on samples
        that.analyser.fftSize = 2048;
        // Connect AudioBufferSourceNode to AnalyserNode
        that.source.connect(this.analyser);

        // Create a GainNode to control volume
        that.gainNode = that.context.createGain();

        /* Control the volume */
        // Connect Audio source to GainNode
        that.source.connect(that.gainNode);
        // Connect GainNode to audio output device
        that.gainNode.connect(that.context.destination);
        // Although the gain node has the property "maxValue" and "minValue", I think the gain value is from -1 to 0,
        // such as: -1 means "minus 100% volume (mute)", 0 means "100% volume"
        that.gainNode.gain.value = 0;

        // Download the audio below
        var request = new XMLHttpRequest();
        var track = this.tracks[index];
        document.querySelector('.song .artist').textContent = track.artist;
        document.querySelector('.song .name').textContent = track.song;
        this.currentSongIndex = index;

        request.open('GET', track.url, true);
        request.responseType = 'arraybuffer';

        request.onload = function() {
            that.context.decodeAudioData(request.response, async function(buffer) {
                if (that.firstLaunch) {
                    // Cache decoded audio data
                    that.source.buffer = buffer;
                    that.decodedData = buffer;
                    // Set 'sourceReady' true, so you can click the play button
                    that.sourceReady = true;
                }
                else {
                    // Disconnect all nodes of source
                    that.source.disconnect();
                    that.source = that.context.createBufferSource();
                    that.source.buffer = buffer;
                    // decodedData is for playing at specify position
                    that.decodedData = buffer;
                    // Set loop mode
                    that.source.loop = true;
                    // Connect to the destination node (audio output device)
                    that.source.connect(that.context.destination);
                    // Audio sample analysis, frequency plotting
                    that.source.connect(that.analyser);
                    // Reconnect the GainNode node (gainNode can control volume)
                    that.source.connect(that.gainNode);
                    // audio download completed
                    that.sourceReady = true;
                    // Call play function
                    that.play();
                }

                that.duration = parseInt(buffer.duration || 0);
            });
        };

        request.send();
    },

    // Play the next track
    nextTrack: async function () {
        ++this.currentSongIndex;
        if (this.currentSongIndex == this.tracks.length) {
            this.currentSongIndex = 0;
        }
        this.stop();

        await this.loadTrack(this.currentSongIndex);
    },

    // Play the previous track
    prevTrack: async function () {
        --this.currentSongIndex;
        if (this.currentSongIndex == -1) {
            this.currentSongIndex = this.tracks.length - 1;
        }
        this.stop();

        await this.loadTrack(this.currentSongIndex);
    },

    // Play or Resume
    play: function () {
        // Determine whether the context has a resume object. If so, call it as a function.
        this.context.resume && this.context.resume();
        // First Launch
        if (this.firstLaunch) {
            this.firstLaunch = false;
        }
        if (this.playState == 0x00) {
            // If the track is stopped, start playing
            this.source.start();
        }
        // Set the play status to playing
        this.playState = 0x01;

        this.notifyFramer();

        var playButton = document.querySelector('.play');
        playButton.style.display = 'none';

        var pauseButton = document.querySelector('.pause');
        pauseButton.style.display = 'inline-block';

        Controls.playing = true;
    },

    playAt: function(offsetInSeconds) {
        this.source.stop();
        this.source = this.context.createBufferSource();
        this.source.buffer = this.decodedData;
        this.source.loop = true;
        this.source.connect(this.context.destination);
        this.source.start(0, offsetInSeconds);
        // Audio sample analysis, frequency plotting
        this.source.connect(this.analyser);
        // Reconnect GainNode, so we can control the volume
        this.source.connect(this.gainNode);
    },

    // Stop playing track
    stop: function () {
        this.playState = 0x00;
        this.context.suspend();
        this.sourceReady = false;

        //this.audioWorkletNode.disconnect(this.context.destination);
        //this.source.disconnect(this.context.destination);
        //this.source.disconnect(this.analyser);
        //this.source.disconnect(this.gainNode);
        //this.gainNode.disconnect(this.context.destination);
        //this.gainNode.disconnect(this.analyser);
        //this.source.buffer = null;

        var playButton = document.querySelector('.play');
        playButton.style.display = 'inline-block';

        var pauseButton = document.querySelector('.pause');
        pauseButton.style.display = 'none';

        Controls.playing = false;

        Tracker.drawAngle(0);
    },

    // Suspend the track
    pause: function () {
        this.playState = 0x10;
        this.context.suspend();

        var playButton = document.querySelector('.play');
        playButton.style.display = 'inline-block';

        var pauseButton = document.querySelector('.pause');
        pauseButton.style.display = 'none';

        Controls.playing = false;
    },

    // Set mute: -1 means "minus 100% volume"
    mute: function () {
        this.gainNode.gain.value = -1;
    },

    // Unmute: 0 is 100% volume
    unmute: function () {
        this.gainNode.gain.value = 0;
    },

    // draw the framer
    notifyFramer: function () {
        var that = this;

        // It takes 30ms to draw one frame, and approximately 33 frames are drawn in 1 second.
        setTimeout(function () {

            Framer.frequencyData = new Uint8Array(that.analyser.frequencyBinCount);
            that.analyser.getByteFrequencyData(Framer.frequencyData);
            if ( that.playState == 0x01 ) {
                that.notifyFramer();
            } else if (that.playState == 0x00 ) {
                Framer.frequencyData = new Uint8Array(that.analyser.frequencyBinCount);
            }
        }, 30);
    },

    showSnackbar: function (message) {
        var snackbar = document.getElementById("snackbar");
        snackbar.innerHTML = message;
        snackbar.style.display = "block";
        // Hide after 2 seconds
        setTimeout(function() {
            snackbar.style.display = "none";
        }, 2000);
    },
};

// Init Music Player
(async function(){ await Player.init(); })();