/*
 Copyright (c) 2010-2011, artifacts Software GmbH & Co. KG
 All rights reserved.
 
 BSD License
 
 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:
 * Redistributions of source code must retain the above copyright
 notice, this list of conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright
 notice, this list of conditions and the following disclaimer in the
 documentation and/or other materials provided with the distribution.
 * Neither the name of BILD digital GmbH & Co. KG nor the
 names of its contributors may be used to endorse or promote products
 derived from this software without specific prior written permission.
 
 THIS SOFTWARE IS PROVIDED BY artifacts Software GmbH & Co. KG ''AS IS'' AND ANY
 EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 DISCLAIMED. IN NO EVENT SHALL artifacts Software GmbH & Co. KG BE LIABLE FOR ANY
 DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/*
 JavaScript - Player for HTML5 animations made with Purple.
 http://www.purpleanimator.com
 
  An integrator should use something like this:

  In html head:

 <html>
  <head>
    ...
    <script language="text/javascript" src="jquery-1.5.2.js" />
    <script language="text/javascript" src="purpleplayer.js" />
    <script language="text/javascript" src="mypurpleanimation.js" />
    <link rel='stylesheet' type='text/css' href='mypurpleanimation.css'
        media='screen' charset='utf-8'/>
    ...
  </head>

    <div id="mypurpleplayer" />
    <script language="text/javascript">
      var player = PurplePlayer({
        'id':'mypurpleplayer',
        'data': mypurpleanimation_data,
        'autostart':true,
        'showControlPanel':true,
        'onReady':function() {
           //do something if player is ready
        }
      });
    </script>

  We decided to let the html coder explicit include jquery. We could
  have done some magic in purpleplayer.js to load jquery if it
  is not defined yet.

  We provide two interfaces for the JSON data and css data:

  - One approach is to load the JSON data via a script tag in the HTML-head
    (in the example above it is the src="mypurpleanimation.js") and configure
    the player with the data option. The mypurpleanimation.js should define
    a variable wich is assigned to the players data.

  - Second approach is to provide the path to a JSON file. This JSON file
    should only contain the JSON data and no variable assignments. The data
    is loaded via an ajax request.

  The order for the javascript tags is important:
    1) JQuery
    2) PurplePlayer
    3) additional data for embedded Stages.

      +------ Loader                  SceneBuilder
      |         |                           |
  Configuration |                           | Stage uses SceneBuilder
      |         |                           |
      +------ Player -------------------- Stage (is a Scene)
                |                           |
                |                           |
             ControlPanel                   |
             (<Node>)                       |
                                            |
                                            |
                        Transition ------- Scene
                                            |
                                            |
             Keyframes ---- Animation --- Asset

    The JSON format of the animation data:
    ======================================

    {
      'id':'id_of_the_whole_animation',
      'width': width_in_pixels_as_integer,
      'height': height_in_pixels_as_integer,
      'childNodes': [
        childNodeData,
      ]
    }

      'childNodes' ->
          A childNode represents data for a scene. The main
          goal is that a scene could have and controls subscenes.
          The animation data has only one root childNode.
          We name it 'rootScene' and it represents the stage.
          The rootScene itself has childNodes for the underlying
          scenes.

    childNodeData:
    {
      'id':'id_of_the_scene',
      'duration': duration_in_seconds_as_float,
      'loop': 0|1, (not interpreted yet)
      'hidden': 0|1, (not interpreted yet)
      'transitionToNext': TransitionData,
      'animations': [ AnimationData, ]
      'childNodes': [ childNodeData0, childNodeData1, ... ]
    }

      'animations' ->
          Array with only one AnimationData

      'childNodes' ->
          Array with one or more childNodeData

    AnimationData:
    {
      'id':'id_of_the_animation',
      'animationName':'name_given_in_editor_to_the_track',
      'track':'track0',
      'animationIterationCount': 'count_of_iterations_as_string',
      'animationDirection':'normal|reverse',
      'assetURL':'url_of_the_assets_src',
      'isButton': 0|1,
      'uti':'public.image|public.movie|public.text',
      'keyframes':[ KeyframeData1, KeyframeData2,... ]
    }

      'keyframes' ->
          Array of one of more KeyframeData

    KeyframeData:
    {
      "_percent": 0,
      "transform": "translate3d(0px, 0px, 0px) rotateZ(0rad) scale3d(1, 1, 1)",
      "opacity": 1,
      "textColor": "#ffffff",
      "backgroundColor": "#000000",
      "animationTimingFunction": "linear"
    }

    Classes/Objects of PurplePlayer
    ===============================

    Main functionality of the Player:
      - load resources
      - init stage/sceens
      - start
      - stop

    Custom events bound to the players div node:
    (drawback: every object acting on theses events
    needs to reference this node. The attribute is:
    player.stateController)

      - 'animationStateChange'
            is fired if someone changes
            the state of the animation ('paused'|'running').
            e.g. buttons etc. reflect or trigger the new state.

      - 'JSONDataReady'
            fired if the json data is loaded per Ajax.
            Also fixed if player is configured via 'data'
            option.

      - 'animationEnd'
            bind to this event if you want to get notified
            if the animation ended

      - 'animationShouldStart'

    Stage (has the root scene)
      This is more than a scene. A stage is responsible to
      build all its scenes and controls the scenes.

    Scene
      - controls child scenes and assets
      - has a view in which the controller renders
        the current scene/assets

    Asset
      - a controller for animatable items, mostly controls
        images and videos

    SceneBuilder
      - A kind of utility to build the dom divs for scenes and
        assets. Also creates scene controller and asset controller
        objects

    ControlPanel (is a visual component with buttons to control the player)

    Loader (controller, starts model loading and notifies progress meter):
      - load optionally css
      - load optionally json data
      - preload images

    Configuration
      - small wrapper around a settings dict

    Transition
      - does the transition
      - renders the transition into the view of the parentScene
        of the transition scenes.
*/

function PurplePlayer(options) {
    return (function(options) {

// PurplePlayer namespace
var PP = {
    name: "http://www.purpleanimator.com/js/purpleplayer",
    HOMEPAGE: "http://www.purpleanimator.com",
}

function isIOS(){
    return (
        (navigator.platform.indexOf("iPhone") != -1) ||
        (navigator.platform.indexOf("iPod") != -1) ||
        (navigator.platform.indexOf("iPad") != -1)
    );
}

/*

  Player:
  =======

  id:
    id of the div which is the players root

  autostart: true|false
    if true start the animation if everything is loaded

  showControlPanel: true|false
    if true show panel with start|rewind buttons

  showProgress:
    should we display a kind of progress bar

  dataFile:
    Path to the json file.

  data:
    directly assigned JSON data.

  cssFile:
    Path to the css file.
    If we have a dataFile cssFile defaults to
    the dataFile by replacing '.js' by '.css'.

  resourcesDir:
    If we get our data via 'data' and not 'dataFile'
    this dir should be set to the folder which
    contains the image/css/js resources.
    If not set this defaults to the current dir.

  expandPlayerToStage:
    Should the player resized to fit the stage dimensions

  onReady:
    callback if the player is loaded and ready to start
    the animation.

*/


var ZINDEX_VIEW = 100;
var ZINDEX_TRANSITION = 99;
var ZINDEX_ONHOLD = -1;
var PRELOADED_VIDEOS = {};

PP.Player = function(options) {
    this.config = new PP.Configuration(options);
    this.playerId = this.config.get('id');
    this.playerDiv = $("#"+this.playerId);
    this.playerDiv.addClass("pp_ani");
    // most custom events are bound to the playerDiv node
    // We name this node stateController
    this.stateController = new PP.StateController(this.playerDiv);
    this.controlPanel = null;
    this.stage = null;
    if(this.isBrowserSupported()) {
        this.buildSkin();
        this.load();
    }
}

PP.Player.prototype = {

    isBrowserSupported: function() {
        var self = this;
        if($.browser.webkit || ($.browser.mozilla && parseInt($.browser.version, 10) > 5) ) {        
            return true;
        } else {
            alert("Browser not supported");
        }
/*        } else {
            var w = this.playerDiv.width();
            var h = this.playerDiv.height();
            var msg = $("<div>")
                .css({
                    'width': self.playerDiv.width,
                    'margin-left':'auto',
                    'margin-right':'auto',
                    'display':'table',
                    'height':'100%'
                })
                .html("<iframe width=\""+w+"\" height=\""+h+"\" src=\"http://www.purpleanimator.com/no_webkit/index.html?w="+w+"&h="+h+"\" frameborder=\"0\"/>")
                .appendTo(this.playerDiv);
*/
//        }
    },

    buildSkin: function() {
        var outer = $('<div>').attr('id', this.playerId + '_outer');
        var inner = $('<div>').attr('id', this.playerId + '_inner');
        outer.append(inner);
        this.playerDiv.replaceWith(outer);
        inner.append(this.playerDiv);
    },

    load: function() {
        var self = this;
        /* register custom event 'JSONDataReady' */
        if(this.config.get('expandPlayerToStage')) {
            self.stateController.bind('JSONDataReady', function(event, data) {
                var width = data['width'];
                var height = data['height'];
                if(self.config.get('showControlPanel')) {
                    height += 30;
                }
                self.playerDiv.css({
                    'width': width,
                    'height': height,
                });
            });
        }

        self.stateController.bind('JSONDataReady', function(event, data) {
            self.config.set('jsonData', data);
        });

        /* initialize the loader and register the callbacks */
        var loader = new PP.Loader(self.stateController, this.config);
        var progressInfo = null;
        if(this.config.get('showProgress')) {
            function pixelize(value) { return parseInt(value) + "px" }
            var width = this.playerDiv.width();
            var height = this.playerDiv.height();
            progressInfo = $("<div id='progressinfo'/>")
                .width(width)
                .height(height)
                .css('background-color', '#000')
                .css('font-family', 'Helvetica, Arial')
                .css('color', 'white')
                .appendTo(this.playerDiv);

            $('<img>').attr('src', this.config.resourceFileByFileName('ajax-loader.gif'))
                .css('position', 'absolute')
                .css('left', pixelize(width/2 - 10))
                .css('top', pixelize(height/2 - 10))
                .appendTo(progressInfo);

            $('<p>').html("<b>Loading ...</b>")
                .css('position', 'absolute')
                .css('font-size', '14px')
                .css('left', pixelize(width/2 - 30))
                .css('top', pixelize(height/2 + 20))
                .appendTo(progressInfo);

            var infoBox = $('<div>')
                .css('position', 'relative')
                .css('font-size', '12px')
                .css('top', pixelize(height/2 + 40))
                .css('text-align', 'center')
                .appendTo(progressInfo);

            loader.onProgress = function(resourceType, progress, total) {
                infoBox.html("<p>"+resourceType + " " + progress + "/"+ total+"</p>");
            }
        }

        loader.load(function() {
            if(progressInfo) {
                progressInfo.hide();
            }
            self.onLoad();
        });
    },

    onLoad: function() {
        var self = this;
        self.buildStage();
        if(self.config.get('showControlPanel')) {
            self.buildControlPanel();
        }

        if(self.config.get('autostart') == true) {
            self.stage.start();
        }
    },

    buildStage: function() {
        var stage = new PP.Stage(this);
        this.stage = stage;
    },

    buildControlPanel: function() {
        var self = this;
        var panelId = this.config.get('jsonData').id + '_control_panel';
        var pp = PP;

/*        var ppInfo = $('<div>')
            .addClass("pp_info")
            .append($('<div>')
                .css('height',((self.playerDiv.height() - 150) / 2)))
            .append($('<a>')
                .attr('target', '_blank')
                .css('border', '')
                .attr('href', PP.HOMEPAGE)
                .append($('<div>')
                    .addClass("pp_ui pp_button pp_logo pp_madewith"))
                .append($('<div>')
                    .addClass("pp_ui pp_button pp_logo pp_icon")));

        var back = $('<div>')
            .addClass('pp_back')
            .css({width: '100%', height: self.playerDiv.height()-30})
            .append(ppInfo)
            .appendTo(self.playerDiv);
*/
        var panel = $('<div>')
            .addClass('pp_ui pp_toolbar')
            .attr('id', panelId);

        function hilight(type, obj, hi) {
            var x,y;
            switch (type) {
                case "play":
                    x=0;
                break;
                case "purple":
                    x=-38;
                break;
                case "rewind":
                    x=-120;
                break;
            }
            y=hi?-30:0;
            obj.style.backgroundPosition=x+'px '+y+'px';
        }

        function hilightStart(state, obj, hi) {
            var btn = state == 'paused' ? 'play' : 'rewind';
            hilight(btn, obj, hi);
        }

        var startbutton = $('<div>')
            .addClass('pp_ui pp_button pp_btplay')
            .click(function() {
                if(self.stateController.animation.stateIsIn(['playing','stopped']))
                    self.stateController.trigger('animationShouldRestart');
                else if(self.stateController.animation.stateIsIn(
                        ['uninitialized']))
                    self.stage.start();
            })
            //.mousedown(function() { hilight('rewind', this, true); })
            //.mouseup(function()   { hilight('rewind', this, false); })
            //.mouseout(function()  { hilight('rewind', this, false); })        
            .appendTo(panel);

       self.stateController.bind('animationStateChange',
            function(evt, oldState, newState) {
                if(newState != 'playing') {
                    startbutton.addClass('pp_btplay');
                    startbutton.removeClass('pp_btrewind');
                } else {
                    startbutton.addClass('pp_btrewind');
                    startbutton.removeClass('pp_btplay');
                }
            }
        );

        var purpleButton = $('<div>')
            .addClass('pp_ui pp_button pp_btpurple')
            .click(function() {
                if(self.stateController.view.getState() == 'background') {
                    self.stateController.trigger('animationShouldRestart');
                } else if(self.stateController.animation.getState() == 'playing') {
                    window.setTimeout(function() { self.stage.stop(); }, 1000);
                    self.playerDiv.addClass('flip');
                    self.stateController.animation.setState('stopped');
                    self.stateController.view.setState('background');
                }
             })
            .mousedown(function() { window.open(PP.HOMEPAGE); hilight('purple', this, true);  })
            .mouseup(function()   { hilight('purple', this, false); })
            .mouseout(function()  { hilight('purple', this, false); })
            .appendTo(panel);

/*        self.stateController.bind('animationEnded', function() {
            if(self.stateController.view.stateIsIn(['background']))
                return;
            self.stateController.view.setState('flipping');
            self.stateController.flippingHandler = 
                window.setTimeout(function() {
                    self.playerDiv.addClass('flip');
                    self.stateController.view.setState('background');
                }, 3000);
        });*/

        self.stateController.bind('animationShouldRestart', function() {
            var withTimeout = false;
            switch(self.stateController.view.getState()) {
                case 'flipping':
                    window.clearTimeout(self.stateController.flippingHandler);
                    self.stateController.view.setState('foreground');
                    break;
                case 'background':
                    self.playerDiv.removeClass('flip');
                    self.stateController.view.setState('foreground');
                    withTimeout = true;
                    break;
            }
            // We start the animation with delay to give the foreground
            // flip some time
            if(withTimeout) {
                window.setTimeout(function() {
                    self.stage.restart(); }, 1000);
            } else {
                self.stage.restart();
            }
        });

        panel.appendTo(this.playerDiv);
        var playerHeight = this.playerDiv.height();
        panel.show();
        this.controlPanel = panel;
    },

}

PP.StateController = function(node) {
    // we trigger custom events on this node
    this.node = node

    /* the animation could have following states:

       'uninitialized': animation did never run
       'stopped': animation is stopped
       'paused': animation is paused
       'playing': animation is playing
       'ended': animation reached 
       'flippingToBackground': animation is not playing and flipping to bg
       'flippedToBackground': animation is flipped to background
       'flippingToForeground': animation is not playing and flipping to fg

        We also now following events:

       'JSONDataReady': Fired if we have successfully read the json data
       'animationEnded': If the animation ended.
       'animationShouldRestart': This is fired if someone wants the animation to
                                 start. The bound event has to decide what should
                                 be done to fire animationStart

     */

    var State = function(delegate, eventName) {
        this._state = "uninitialized";
        this._delegate = delegate;

        this.setState = function(newState) {
            var oldState = this._state;
            this._state = newState;
            this._delegate.trigger(eventName, [oldState, newState]);
        }

        this.getState = function() {
            return this._state;
        }

        this.stateIsIn = function(states) {
            return jQuery.inArray(this.getState(), states) > -1 ? true : false;
        }
    }

    this.animation = new State(this, 'animationStateChange');
    this.view = new State(this, 'viewStateChange');
}

PP.StateController.prototype = {
    bind: function(eventName, handler) {
        this.node.bind(eventName, handler);
    },

    unbind: function(eventName, handler) {
        this.node.unbind(eventName, handler);
    },

    trigger: function(eventName, eventData) {
        this.node.trigger(eventName, eventData);
    },
}

PP.Configuration = function(options) {
    var self = this;
    if(! options) {
        throw "Player must be initialized with arguments object.";
    }

    var defaults = {
        'autostart': true,
        'cssFile': null,
        'cssFileName': null,
        'data': null,
        'dataFile': null,
        'dataFileName': null,
        'expandPlayerToStage': true,
        'id': null,
        'resourcesDir': null,
        'showControlPanel': true,
        'showProgress': true,
    }

    var settings = $.extend({}, defaults, options);

    if(settings['dataFile'] === null && settings['data'] === null) {
        throw "Need 'dataFile' or 'data' as parameter";
    }

    if(! settings['id']) {
        throw "Need 'id' as parameter.";
    }

    /* as a convention all resources (images,json, css etc.)
       are in the same dir. If the player references
       the json 'dataFile' we calculate resourcesDir.
       Another convention are the names of css/html animation file.
       They have the same filename as dataFile but with other
       postfix.
     */
    if(settings['dataFile'] !== null) {
        var parts = settings['dataFile'].split("/");
        settings['dataFileName'] = parts.pop();
        if(settings['resourcesDir'] === null) {
            settings['resourcesDir'] = parts.join("/");
        }

        parts = settings['dataFileName'].split(".");
        parts.pop();
        var filename = parts.join(".");
        if(! settings['cssFile']) {
            settings['cssFileName'] = filename + ".css";
            if(settings['resourcesDir'] !== '') {
                settings['cssFile'] = [settings['resourcesDir'], 
                    settings['cssFileName']].join("/");
            } else {
                settings['cssFile'] = settings['cssFileName'];
            }
        }
    }

    if(settings['cssFile'] === null && settings['resourcesDir'] == null) {
        throw "Need 'cssFile' or 'dataFile' or 'resourcesDir'";
    }

    // get the resourcesDir from cssFile
    if(settings['resourcesDir'] === null) {
        var parts = settings['cssFile'].split("/");
        settings['cssFileName'] = parts.pop();
        if(settings['resourcesDir'] === null) {
            settings['resourcesDir'] = parts.join("/");
        }
    }

    // query string parameters overwrite the players defaults
    $.each(['showControlPanel', 'autostart', 'showProgress'],
        function(index, name) {
            if(self.getParameterByName(name)) {
                var param = self.getParameterByName(name);
                settings[name] = param == 'true' ? true : false;
            }
        }
    );
    settings['onReady'] ? settings['onReady'] : null;
    this.settings = settings;
}

PP.Configuration.prototype = {
    get: function(name) {
         return this.settings[name];
    },

    set: function(key, value) {
        this.settings[key] = value;
    },

    resourceFileByName: function(name) {
        var dir = this.get('resourcesDir');
        var filename = this.get(name);
        return dir != "" ? [dir, filename].join("/") : filename;
    },

    resourceFileByFileName: function(filename) {
        var dir = this.get('resourcesDir');
        return dir != "" ? [dir, filename].join("/") : filename;
    },

    getParameterByName: function(name) {
        // fetched from:
        // http://stackoverflow.com/questions/901115/get-querystring-values-in-javascript
        name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
        var regexS = "[\\?&]"+name+"=([^&#]*)";
        var regex = new RegExp( regexS );
        var results = regex.exec( window.location.href );
        if( results == null )
            return "";
        else
            return decodeURIComponent(results[1].replace(/\+/g, " "));
    }
};

PP.Loader = function(stateController, config) {
    if(stateController  === undefined || config === undefined) {
        throw "Loader needs stateController and config";
    }

    // We need player here as event dispatcher becaue custom
    // events are bound to the players div.

    this.stateController = stateController;
    this.config = config;

    this.progress = 0;
    this.filesToLoad = 0;

    // the resulting json data
    this.jsonData = null;

    // callback which is called after all data
    // is successfully loaded
    this.callback = null;

    // the player could have a kind of progress meter
    // which is called back if we have progress.
    // could also be implemented as event?
    this.onProgress = null;
}

PP.Loader.prototype = {
    load: function(callback) {
        this.callback = callback;
        this.loadJson();
    },

    loadJson: function() {
        var self = this;
        this.filesToLoad = 1;
        var onDataReady = function(data) {
            self.jsonData = data;
            self.stateController.trigger('JSONDataReady', data);
            var images = self._findAssets(data, 'public.image');
            var videos = self._findAssets(data, 'public.movie');
            self.loadImages(images);
            self.loadVideos(videos);
            /* disable loading css on the fly because
             * loading via Ajax break webarchive
             * self.loadCss();
             */
            self.notifyProgress("json");
        };

        if(self.config.get('data') === null) {
            // load data via json
            $.get(this.config.resourceFileByName('dataFileName'),
                    function(content) {
                /* the 'json' content is a javascript file with
                   variable assignment (var myscene_data = ...)
                   We only take hopefully the json data out of this string
                 */
                var firstIndex = content.indexOf("{");
                var lastIndex = content.lastIndexOf("}");
                if(firstIndex > 0 && lastIndex > 0) {
                    content = content.substring(firstIndex, lastIndex+1);
                }
                var data = $.parseJSON(content);
                self.config.set('data', data);
                onDataReady(data);
            });
        } else {
            onDataReady(self.config.get('data'));
        }
    },

    loadImages: function(arrayOfImages) {
        var self = this;
        $(arrayOfImages).each(function() {
            self.filesToLoad++;
            var img = $('<img/>');
            img[0].src = self.config.resourceFileByFileName(this);
            img.bind('load', function() {
                self.notifyProgress("image");
            });
        });
    },

    loadVideos: function(arrayOfVideos) {
        var self = this;
        $(arrayOfVideos).each(function() {
            var src = self.config.resourceFileByFileName(this);
            var video = $('<video>')
                .attr('controls', 'controls');

            var wrapperDiv = $('<div>')
                .css('-webkit-transform', 'translateX(-1024px)')
                .css('-moz-transform', 'translateX(-1024px)')
                .append(video)
                .appendTo($('body'));

            // If we declare a source the 
            // canplaythrough handler is not called
            video.append($("<source>").
                attr('src', src));

            // Is it good style to declare the video type
            // or is it neccessary ??
            //attr('type', 'video/mp4'));

            // ipad/ipod/iphone are not able to
            // preload videos.
            if(! isIOS()) {
                self.filesToLoad++;
                video.bind('canplaythrough', function() {
                    video.unbind('canplaythrough');
                    self.notifyProgress("video");
                });
            }
            PRELOADED_VIDEOS[src] = video;
        });
    },

    loadCss: function() {
        var self = this;
        this.filesToLoad++;
        var cssResource = $("<link>");
        cssResource.bind('load', function(css) {
            self.notifyProgress("style");
        });

        cssResource.attr({
            rel: "stylesheet",
            type: "text/css",
            href: self.config.get("cssFile"),
        }).appendTo("head");
    },

    /* this is called by event handlers if resources
       are sucessfully loaded.
       if this.progress == this.filesToLoad everything is fine
       and the onLoaded handler is called
     */
    notifyProgress: function(resourceType) {
        this.progress++;
        if(this.onProgress !== null)
            this.onProgress(resourceType, this.progress, this.filesToLoad);
        if(this.progress >= this.filesToLoad)
            this.callback();
    },

    /* Helper method to search for 'imageURL' attributes in
       the given data. We return a list of unique images refs/sources
       I prefer to first scan the data for resources and later build
       the dom.
       The dom could be constructed while the images are still loading.
     */
    _findAssets: function(data, type) {
        function find(data, found) {
            if(data instanceof Object) {
                for(var value in data) {
                    if(value === "assetURL") {
                        url = data['assetURL'];
                        uti = data['uti'];
                        if(uti === type) {
                            found[url] = 1;
                        }
                    } else {
                        find(data[value], found);
                    }
                }
            }
            return found;
        }
        var found = find(data, {});
        var imageRefs = []
        for(f in found) imageRefs.push(f)
        return imageRefs;
    },
}

PP.Stage = function(player) {
    this.player = player;
    this.stateController = this.player.stateController;
    this.config = player.config;
    this.jsonData = this.config.get('jsonData');
    this.stageId = this.jsonData.id;
    this.buildStage();
}

PP.Stage.prototype = {
    /* build a nested structure of scenes. We start
       with the root scene that is our stage 
    */

    start: function() {
        if(this.stateController.animation.stateIsIn(['uninitialized', 'stopped'])) {
            // uninitialized is set on first start if the scene is build
            this.rootScene.start();
            this.stateController.animation.setState('playing');
        }
    },

    stop: function() {
        this.rootScene.stop();
    },

    pause: function() {
        if(this.stateController.animation.stateIsIn(['playing'])) {
            this.rootScene.pause();
            this.setState('paused');
        }
    },

    restart: function() {
        if(this.stateController.animation.stateIsIn(['playing', 'stopped'])) {
            this.reset();
            this.start();
        }
    },

    reset: function() {
        this.stageNode.remove();
        this.rootScene = null;
        this.stateController.animation.setState('stopped');
        this.buildStage();
    },

    buildStage: function() {
        var self = this;
        this.stageNode = $('<div>')
            .attr('id', this.stageId)
            .addClass('pLevel0 pp_front')
            .css({
                'width':this.jsonData.width,
                'height':this.jsonData.height,
                'overflow':'hidden'
            });

        this.player.playerDiv.append(this.stageNode);
        this.rootScene = PP.SceneBuilder.build(this.jsonData,
            this.stateController);
        this.rootScene.drawAll(this.stageNode);
    }
}


PP.SceneBuilder = {
    /* This SceneBuilder is responsible to build/create
       the divs for the rootScene (stage).
       It also creates a nested structure of PP.Scene and PP.Asset
     */

    build: function(jsonData, stateController) {
        var rootScene = new PP.Scene(null, jsonData, stateController);
        this.buildScenes(rootScene);
        return rootScene;
    },

    buildScenes: function(parentScene) {
        var self = this;
        var numChilds = parentScene.sceneData.childNodes.length;
        $(parentScene.sceneData.childNodes).each(function(index, nodeData) {
            var isSubScene = false;
            if(nodeData.childNodes && nodeData.childNodes.length > 0) {
                    isSubScene = true;
            }
            // detect empty clips/scenes
            if(parentScene.isRootScene && nodeData.childNodes.length == 0) {
                return;
            }

            if(nodeData.hidden != undefined && nodeData.hidden == 1) {
                return;
            }

            var level = parentScene.level + 1;
            // If we have a scene with subscenes
            // the first scene has to have a higher
            // zindex because in a transition its the
            // current running scene which is faded.
            // If we have a simple asset here the zindex
            // has to be in order of the elements
            var zindex = isSubScene ? numChilds - index : index;

            if(isSubScene) {
                var scene = new PP.Scene(parentScene, nodeData,
                    parentScene.stateController);
                scene.buildViewNode(level, zindex);
                parentScene.subScenes.push(scene);
                self.buildScenes(scene);
            } else {
                var asset = new PP.Asset(parentScene, nodeData,
                    parentScene.stateController);
                asset.buildViewNode(level, zindex);
                parentScene.assets.push(asset);
            }
        });
        parentScene.attachEventHandlers();
    }
}


PP.Scene = function(parentScene, sceneData, stateController) {
    this.parentScene = parentScene;
    this.stateController = stateController;
    this.sceneData = sceneData;

    this.subScenes = new Array();
    this.assets = new Array();
    this.viewNode;

    this.isRootScene = false;
    this.animationState = null;
    this.animationsEnded = 0;
    this.duration = null;
    this.level = null;
    this.zindex = null;
    this.sceneId = this.sceneData['id'];
    var self = this;

    // Level is the nested depth level
    if(parentScene === null) {
        this.isRootScene = true;
    }

    // a scene could have more 'sub'scenes.
    // We store the index of the current running 'sub'scene
    // to be able to track transitions between 'sub'scenes
    this.currentSubSceneIndex = null;
}

PP.Scene.prototype = {

    drawAll: function(parentView) {
        var self = this;
        self.animationState = null;
        if(! self.viewNode) {
            self.buildViewNode();
        }
        self.view = self.viewNode.appendTo(parentView);
        $(this.assets).each(function(index) {
           this.bindToView(self.view);
        });

        if(self.hasSubScenes()) {
            for(var i = 0; i < self.subScenes.length; i++) {
                var subScene = self.subScenes[i];
                subScene.drawAll(self.view);
            }
        }
    },

    start: function() {
        var self = this;
        // first start
        if(this.animationState === null || 
                this.animationState == 'stopped') {
            $.each(this.assets, function(index) {
                this.start();
            });
        } else {
            if(this.animationState == 'running') {
                return;
            }
            // this is paused
            this.view.children().each(function(index) {
                $(this).css('-webkit-animation-play-state', 'running');
                $(this).css('-moz-animation-play-state', 'running');
            });
        }

        if(this.hasSubScenes()) {
            this.currentSubScene().start();
        }
        this.animationState = 'running';
    },

    stop: function() {
        $(this).removeClass('track0');
        $.each(this.assets, function(index) {
            this.stop();
        });

        if(this.hasSubScenes()) {
            this.currentSubScene().stop();
        }
        this.animationState = 'stopped';
    },

    pause: function() {
        if(this.animationState === null || this.animationState == 'paused') {
            return;
        }
        this.animationState = "paused";
        this.view.children().each(function(index) {
            $(this).css('-webkit-animation-play-state', 'paused');
            $(this).css('-moz-animation-play-state', 'paused');
        });

        if(this.hasSubScenes()) {
            this.currentSubScene().pause();
        }
    },

    buildViewNode: function(level, zindex) {
        this.level = level;
        this.zindex = zindex;
        this.viewNode = $('<div>')
            .attr('id', this.sceneData.id)
            .css('position','absolute')
            .css('z-index', zindex)
            .addClass('pNode')
            .addClass('pLevel'+level);
    },

    jumpTo: function(sceneId) {
        /* jump from the current scene
           to another scene given by Id.
           Used by scene-buttons
         */
        var self = this;
        var currentScene = this.currentSubScene();
        var targetScene = this.getSubSceneById(sceneId);
        var transitionData = currentScene.sceneData.transitionToNext;
        // Copy transition data from the currentScene and
        // replace trigger with value 0 to (indicates that
        // the transition should start immediately)
        var transitionDataOnButtonPress = {
            trigger: 0,
            duration: transitionData.duration,
            transitionType: transitionData.transitionType,
            offset: transitionData.offset
        }

        if(transitionData.backgroundColor) {
            transitionDataOnButtonPress.backgroundColor =
                transitionData.backgroundColor;
        }

        var transition = new PP.Transition(this, currentScene, targetScene, transitionDataOnButtonPress);
        transition.start();
    },

    currentSubScene: function() {
        if(this.subScenes && this.subScenes.length > 0) {
            if(this.currentSubSceneIndex == null) {
                this.currentSubSceneIndex = 0;
            }
            return this.subScenes[this.currentSubSceneIndex];
        }
    },

    hasSubScenes: function() {
        return this.subScenes && this.subScenes.length > 0 ? true : false;
    },

    getSubSceneById: function(sceneId) {
        var scene = null;
        if(this.hasSubScenes()) {
            for(var i = 0; i < this.subScenes.length; i++) {
                var s = this.subScenes[i];
                if(s.sceneId == sceneId) {
                    scene = s;
                    break;
                }
            }
        }
        return scene;
    },

    makeSubSceneCurrent: function(subScene) {
        if(this.hasSubScenes()) {
            var index = 0;
            var found = null;
            while(index < this.subScenes.length) {
                var scene = this.subScenes[index];
                if(scene.sceneId == subScene.sceneId) {
                    found = index;
                    break;
                }
                index++;
            }
            if(found != null) {
                this.currentSubSceneIndex = index;
            }
        }
    },

    attachEventHandlers: function() {
        var self = this;
        if(this.subScenes.length > 1) {
            var index = 1;
            while(index < this.subScenes.length) {
                var from = this.subScenes[index-1];
                var to = this.subScenes[index];
                index++;
                $(from.viewNode).bind(
                    'webkitAnimationEnd',
                    { parentScene:self, from:from, to:to },
                    function(ev) {
                        //if(! $(ev.target).hasClass('endVisible')) {
                        //    console.log('disable element', ev.target);
                        //    $(ev.target).css('opacity', '0');
                        //}
                        var parentScene = ev.data.parentScene;
                        var from = ev.data.from;
                        var to = ev.data.to;
                        from.animationsEnded++;
                        // Every animationEnd event of an asset bubbles
                        // up and is fetched by the scenes event handler.
                        // we count the number of events. If it is equal
                        // to the number of assets we start the transition
                        if(from.animationsEnded != from.assets.length)
                            return
                        parentScene.transitionFromTo(from, to);
                    }
                );
            }
        }
        // If we are the root scene we have
        // to trigger 'animationEnded'.
        if(this.isRootScene && this.subScenes.length > 0) {
            var lastScene = this.subScenes[this.subScenes.length - 1];
            // If the last scene has a button defined we don't register
            // a webkitAnimationEnd
            var hasButton = false;
            $(lastScene.sceneData.childNodes).each(function(index, value) {
                if(value.isButton) {
                    hasButton = true;
                }
            });
            if(! hasButton) {
                lastScene.viewNode.bind('webkitAnimationEnd', function(ev) {
                    lastScene.animationsEnded++;
                    if(lastScene.animationsEnded != 
                            lastScene.assets.length) { 
                        return;
                    }
                    lastScene.stateController.animation.setState("stopped");
                    lastScene.stateController.trigger('animationEnded');
                });
            }
        }
    },

    transitionFromTo: function(fromScene, toScene) {
        var transitionData = fromScene.sceneData.transitionToNext;
        var transition = new PP.Transition(this, fromScene, toScene,
            transitionData);
        transition.start();
    }
}


PP.Animation = function(animationData) {
    var self = this;
    self.animationData = animationData;
    self.keyframes = new PP.Keyframes(animationData['keyframes']);
}

PP.Animation.prototype = {
    get: function(name) { return this.animationData[name]; }
}


PP.Keyframes = function(keyframesData) {
    var self = this;
    self.keyframesData = keyframesData;
    self.keyframes = new Array();
    $.each(keyframesData, function(index, data) {
        self.keyframes.push(new PP.Keyframe(this));
    });
}

PP.Keyframes.prototype = {
    keyframeByPercent: function(pc) {
    }
}


PP.Keyframe = function(keyframeData) {
    this.keyframeData = keyframeData;
}

PP.Keyframe.prototype = {
    get: function(name) { return this.keyframeData[name]; }
}


PP.Asset = function(parentScene, assetData, stateController) {
    this.parentScene = parentScene;
    this.stateController = stateController;
    this.assetData = assetData;

    this.viewNode = null;
    this.videoViewNode = null;
    this.level = null;
    this.animationsEnded = 0;
    this.duration = null;
    this.startTime = null;
    this.zindex = null;
    this.animation = new PP.Animation(assetData['animations'][0]);
}

PP.Asset.prototype = {
    start: function() {
        if(this.stateController.animation.getState() == 'paused') {
            //do something
        } else {
            // First start all asset nodes by attaching
            // the track0 name to the div classes.
            // if we are a video the play is triggered by
            // the event webkitAnimationStart
            this.viewNode.addClass('track0');
        }
    },

    stop: function() {
        this.viewNode.removeClass('track0');
        if(this.videoViewNode) {
            this.videoViewNode[0].pause();
        }
    },

    pause: function() {
        if(this.isVideoPlaying) {
            this.videoViewNode[0].pause();
        }

    },

    buildViewNode: function(level, zindex) {
        var self = this;
        this.level = level;
        this.zindex = zindex;
        var assetData = this.assetData;	    
        var viewNode = $('<div>')
            .attr('id', assetData.id)
            .css('position','absolute')
            .css('z-index', zindex)
            .addClass('pNode')
            .addClass('pLevel'+level);

        // see http://www.escape.gr/manuals/qdrop/UTI.html
        if(assetData.uti == "public.image") {
            var imageId = assetData.id + "_image";
            var imgElement = $('<img>')
                .attr('id', imageId)
                .attr('src', assetData.assetURL)
                .addClass('pImage')
                .css('width','100%')
                .css('height','100%')
                .appendTo(viewNode);

            if(assetData.isButton) {
                // Attention: The parentScene is the scene
                // there this node is underneath.
                // We need this scenes parent SceneController to
                // attach the onclick to.
                viewNode.click(function() {
                    self.parentScene.parentScene.jumpTo(
                        assetData.triggeredNode);
                });
            }
        } else if(assetData.uti == "public.movie") {
            var videoId = assetData.id + "_video";
            var video = PRELOADED_VIDEOS[assetData.assetURL];
            if(! video) {
                video = $('<video>')
                    .attr('src', assetData.assetURL)
                    .attr('preload', "auto");
            }

            // This seems to be another bug. I preloaded the
            // video on a hidden div.
            // (http://stackoverflow.com/questions/2908724/html5-video-on-ipad)
            // If I do not reassign 
            // the 'src' the video will not be visible and
            // the node into which the video is rendered is
            // invisible.
            video.attr('id', videoId)
                .attr('src', assetData.assetURL)
                .addClass('pVideo')
                .css('width','100%')
                .css('height','100%');
 
            video.appendTo(viewNode);
            this.videoViewNode = video;
            viewNode.bind('webkitAnimationEnd', function(ev) {
                video[0].pause();
            });
            viewNode.bind('webkitAnimationStart', function(ev) {
                video[0].play();
            });
        } else if(assetData.uti == "public.text") {
			viewNode.html(assetData.text)
			viewNode.addClass('pText');
/*            var textId = assetData.id + "_text";
            var divElement = $('<span>')
                //.attr('id', textId)
                .addClass('pText')
                //.css('width','100%')
                //.css('height','100%')
                .html(assetData.animations[0].keyframes[0].text)
                .appendTo(viewNode);*/
        }

        this.viewNode = viewNode;
    },

    bindToView: function(view) {
        if(! this.viewNode) {
            this.buildViewNode();
        }
        if(view.has(this.viewNode).size() == 0) {
            view.append(this.viewNode);
        }
    },
};


PP.Transition = function(parentScene, fromScene, toScene, transitionData) {
    this.parentScene = parentScene;
    this.fromScene = fromScene;
    this.toScene = toScene;
    this.transitionData = transitionData;
}

PP.Transition.prototype = {
    start: function() {
        if(this.executeTrigger()) {
            return;
        }
        switch(this.transitionData.transitionType) {
            case 0: this.hardcut(); break;
            case 1: this.crossfade(); break;
            case 2: this.colorfade(); break;
            default: this.hardcut();
        }
    },

    executeTrigger: function() {
        /* trigger: 0 => end of scene
         *          1 => wait for other button
         *          2 => wait for tap
         */
        if(! this.transitionData.trigger) {
            return false;
        }

        if(this.transitionData.trigger !== undefined &&
                this.transitionData.trigger != null) {
            if(this.transitionData.trigger == 1) {
                // this is the wait transition
                return true;
            } else if(this.transitionData.trigger == 2) {
                // click or tapEvent
                var transitionData = {};
                $.extend(transitionData, this.transitionData);
                transitionData.trigger = null;

                var newTransition = new PP.Transition(this.parentScene,
                    this.fromScene, this.toScene, transitionData);

                this.fromScene.view.click(function(ev) {
                    $(this).unbind('click', ev);
                    newTransition.start();
                });
                return true;
            }
        }
    },

    hardcut: function() {
        /* this is broken: We order of stopping and
         * playing is important because we use the hardcut
         * transition for buttons. It is possible to make
         * buttons which jumps to the same scene. To
         * make the hardcut transition possible we have
         * to stop the scene to set the right status/state
         * information.
         * Next we start the animation again. The css transitions
         * are sometimes lost because the fast switching
         * of animation-name css attributes does not reset
         * the animation.
         * I tried with a complete html rebuild of the animation.
         * This works fine but on iOS devices (tested on ipad2)
         * you can see a flicker.
         */
        this.fromScene.stop();
        this.fromScene.view.css('z-index', ZINDEX_ONHOLD);
        this.toScene.start();
        this.toScene.view.css('z-index', ZINDEX_VIEW);
        this.parentScene.makeSubSceneCurrent(this.toScene);
    },

    crossfade: function() {
        var self = this;
        var toScene = this.toScene;
        var fromScene = this.fromScene;
        var parentScene = this.parentScene;
        var transitionData = this.transitionData;
        var offset = transitionData.offset ? transitionData.offset : 0.5;

        var duration = transitionData.duration;
        var css = 'opacity ' + duration + "s cubic-bezier(" + 
            offset + ",0.5," + (0.5+0.5*offset) + ",0.75)";

        fromScene.view.css({
            'z-index':ZINDEX_VIEW,
            '-webkit-transition': css,
            'opacity':'0.0'
        });

        toScene.start();
        toScene.pause();
        toScene.view.css({
            'z-index':ZINDEX_TRANSITION,
            '-webkit-transition': css,
            'opacity':'0.0',
        });

        /* We have to set the opacity with a timing
         * delay. Else this won't work
         */
        self.wait(10).then(function() {
            toScene.view.css('opacity','1.0');
        });

        window.setTimeout(function() {
            fromScene.view.css('z-index', ZINDEX_ONHOLD);
            parentScene.makeSubSceneCurrent(toScene);
            toScene.start();
        }, duration * 1000);
    },

    colorfade: function() {
        var self = this;
        var transitionData = this.transitionData;
        var toScene = this.toScene;
        var fromScene = this.fromScene;
        var parentScene = this.parentScene;

        // the first half is used for blend to color,
        // the second half of duration is used to
        // blend into the new scene
        var duration = parseFloat(transitionData.duration) / 2.0;

        // the blending effect is done via changing the
        // opacity of the foreground layer.
        var css = 'opacity ' + duration + "s linear";

        // we 'replace' the toScene div with a colored
        // div. After doing the first half of the transition
        // we restore the old toScene DIV
        //var toElementDepth = toElement.css('z-index');
        //toElement.css('z-index', '0');

        fromScene.view.css('z-index', ZINDEX_VIEW);
        var color = transitionData.backgroundColor ? transitionData.backgroundColor
                                                   : '#FFFFFF';

        // attention: the color in json is in #aabbccFF
        // css does not really know the alpha channel.
        var color = color.substr(0, 7);
        var coloredDiv = $('<div>')
            .css('background-color', color)
            .css('-webkit-backface-visibility', 'hidden')
            .css('-webkit-perspective', '1000')
            .css('width', fromScene.view.width())
            .css('height', fromScene.view.height())
            .css('opacity', '1.0')
            .css('left', '0px')
            .css('top', '0px')
            .css('z-index', ZINDEX_TRANSITION)
            .css('position', 'absolute')
            .css('-webkit-transition', css)
            .appendTo(parentScene.view);

        fromScene.view.css({
            '-webkit-transition': css,
            'opacity':'0.0'
        });

        self.wait(duration * 1000).then(function() {
            fromScene.view.css('z-index', ZINDEX_ONHOLD);
            toScene.start();
            toScene.pause();
            toScene.view.css('z-index', ZINDEX_TRANSITION);
            coloredDiv.css('z-index', ZINDEX_VIEW);
            coloredDiv.css('opacity','0.0');
            self.wait(duration * 1000).then(function() {
                coloredDiv.remove();
                toScene.view.css('z-index', ZINDEX_VIEW);
            self.parentScene.makeSubSceneCurrent(toScene);
                toScene.start();
            });
        });
    },

    wait: function(duration) {
        return $.Deferred(function(dfd) {
            window.setTimeout(dfd.resolve, duration);
        });
    },
}

    return new PP.Player(options);

})(options); }

