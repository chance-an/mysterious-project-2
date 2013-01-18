/**
 * User: anch
 * Date: 1/13/13
 * Time: 6:19 PM
 */

(function(){
    var MEME_WIDTH = 480;
    var COLUMN_SPACING = 10;
    var THIS_WEB_PAGE = window.location.href;
    var FACEBOOK_APP_ID = 550779301601511;
    var _data = null;
    var _columns = [];
    var _rendering = false;

    function initialize(){
        $.when(
            Facebook.initialize(),
            downloadData()
        ).done(setupUI);
    }

    function downloadData(){
        return $.ajax('data/memes.json',{
            dataType: 'json'
        }).done(function(data, status, xhr){
            installData(data);
            renderData();
        }).fail(function(){
            console.log("Loading data failed.");
        })
    }

    function setupUI(){
        $(window).on('resize', _.debounce(renderData));
        $(document).on('scroll', _.debounce(renderData));
    }

    function installData(response){
        _data = response.data;
    }

    function renderData(){

        if(_rendering ){
            return;
        }
        _rendering = true;
        var signal = new $.Deferred();

        adjustColumns();

        function isColumnFull(columnEntry){
            // if there is only one column, (mobile devices case), then the column never gets full
            var columnLimit = columnsCount === 1 ? Infinity : dimension.viewportBottom;
            return columnEntry.height >= columnLimit ;
        }
        function getUnfilledColumns(){
            return _.reject(_columns, isColumnFull);
        }

        function getExistingMemes(){
            return _.reduce(_.map(_columns, function(e){
                return e.memes.length;
            }), function(pv, cv) { return pv + cv; }, 0);
        }

        var columnsRotation = 0;
        var memeCounter = getExistingMemes(); // start from the next meme : (count on existing ones + 1)
        var dimension = getDimension();
        var columnsCount = _columns.length;

        function iteration(){
            dimension = getDimension();
            if( memeCounter >= _data.length){
                signal.resolve(); //no further memes to show
                _rendering = false;
                return
            }

            var unfilledColumns = getUnfilledColumns();
            if( unfilledColumns.length == 0){
                signal.resolve(); // all columns are filled, done
                _rendering = false;
                return;
            }

            //get next unfilled columns
            while(true){
                var laneID = (columnsRotation++) % columnsCount;
                var columnEntry = _columns[laneID];

                if(isColumnFull(columnEntry)){
                    continue;
                }

                break;
            }

            var meme = new Meme(_data[memeCounter]);
            //meme.getPresentation() might take sometime, so here it is asynchronous
            meme.getPresentation().done(function($ui){
                columnEntry.ui.append($ui);
                columnEntry.height += meme.getDimension().height;
                columnEntry.memes.push(meme);
                memeCounter ++;
                setTimeout(iteration, 1);
            });
        }
        iteration();

        return signal;
    }

    function adjustColumns(){
        var dimension = getDimension();
        var numberOfColumns = Math.floor(dimension.width / MEME_WIDTH) || 1; // at least 1

        if( numberOfColumns === _columns.length ){
            return ; //do nothing
        }
        if(numberOfColumns > 1){
            //if the memes are not displayed in one column, add some spacing between each columns,
            //and recalculate the number of columns
            numberOfColumns = Math.floor((dimension.width - COLUMN_SPACING  ) / (COLUMN_SPACING  + MEME_WIDTH)) || 1;
        }
        var columnSpacing = numberOfColumns > 1 ? COLUMN_SPACING - 1 : 0;

        // or otherwise, draw the lanes of numberOfColumns
        var $lane = $(getTemplateElement('lane'));
        $lane.width(MEME_WIDTH);

        $('body > .container').empty();
        _columns = [];
        _(numberOfColumns).times(function(){
            var $newLane = $lane.clone().css({
                'marginLeft': columnSpacing,
                'marginRight': columnSpacing,
                'borderWidth': numberOfColumns > 1 ? 1 : 0
            });
            $('body > .container').append( $newLane );
            _columns.push({height: 0, memes: [], ui: $newLane});
        })
    }

    function getDimension(){
        return {
            width: $('body').innerWidth() - UTILITY.getScrollBarWidth(),
            height: $(window).height(),
            viewportTop: $(document).scrollTop(),
            viewportBottom: $(document).scrollTop() + $(window).height()
        }
    }

    function getTemplateElement(name){
        return $('script[name="template-' + name + '"]').html();
    }

    $(document).ready(initialize);

    function Meme(data){
        this._data = data;
        this._viewVariables = null;
        this._$ui = null;
    }

    _.extend(Meme.prototype, {
        getPresentation: function(){
            if(!this._$ui){
                // randomly pick on picture from this._data['picture'] for ['picture']
                var viewVariables = _.extend({}, this._data, {
                    picture: this._data['picture'][Math.floor(Math.random() * this._data['picture'].length)]
                });
                var template = _.template(getTemplateElement('meme'), viewVariables);
                this._$ui = $(template);
                this._viewVariables = viewVariables;
            }
            // whether this html section has any imgs? if there any preload it
            var signals = _.map(this._$ui.find('img'), function(img){
                var src = $(img).attr('src');
                var signal = new $.Deferred();
                UTILITY.preloadImage(src).pipe(function($preloadImg, dimension){
                    if(dimension.width > MEME_WIDTH *.9){
                        $(img).width(MEME_WIDTH *.9);
                    }
                }).always(function(){ // resolve even if the request wasn't successful
                    signal.resolve();
                });
                return signal;
            });

            $.when.apply(null, signals);

            return $.when.apply(null, signals).pipe(_.bind(function(){
                this._bindEvents();
                return this._$ui;
            }, this));
        },

        _bindEvents: function(){
            var instance = this;
            this._$ui.find('[name="share"].compound-button').on('click', function(){
                Facebook.showFeedDialog(instance);
            });
        },

        getDimension: function(){
            return {
                width: MEME_WIDTH,
                height: this._$ui && this._$ui.height() || 0
            };
        },

        getViewVariableByName: function(name){
            return this._viewVariables[name];
        },

        getViewImagePath: function(){
            var imgUrl = this.getViewVariableByName('picture');
            if(imgUrl.match(/^http/i)){
                return imgUrl;
            }
            return THIS_WEB_PAGE.replace(/\/([^\/])*$/, '') + ('/' + imgUrl).replace(/\/{2+}/g, '/');
        }
    });


    //Facebook integration
    var Facebook = {
        FEED_SERVICE_ENTRY_POINT: 'https://www.facebook.com/dialog/feed',

        initialize:  function (){
            var deferred = new $.Deferred();

            window.fbAsyncInit = function() {

                FB.init({
                    appId      : FACEBOOK_APP_ID, // App ID
                    channelUrl : '//channel.html', // Channel File
                    status     : true, // check login status
                    cookie     : true, // enable cookies to allow the server to access the session
                    xfbml      : false,  // parse XFBML,
                    logging    : true
                });

                // Additional initialization code here
                //notification
                deferred.resolve((new Date()).getTime());
            };

            (function(d){
                var js, id = 'facebook-jssdk'; if (d.getElementById(id)) {return;}
                js = d.createElement('script'); js.id = id; js.async = true;
                js.src = "//connect.facebook.net/en_US/all.js";
                d.getElementsByTagName('head')[0].appendChild(js);
            }(document));

            return deferred;
        },

        showFeedDialogOld: function(meme){
            var obj = {
                method: 'feed',
                redirect_uri: THIS_WEB_PAGE,
                link: THIS_WEB_PAGE,
                picture: meme.getViewImagePath(),
                name: 'Share My Inspiration',
                caption: meme.getViewVariableByName('name'),
                description: meme.getViewVariableByName('bio'),
                display: 'dialog'
            };

            //show the dialog only when user is logged in
            Facebook.isUserLoggedIn().done(function(){
//                FB.ui(obj, callbackFunction);
                FB.ui(obj);
            });
        },

        showFeedDialog: function(meme){
            var parameters = {
                app_id: FACEBOOK_APP_ID,
                redirect_uri: THIS_WEB_PAGE,
                link: THIS_WEB_PAGE,
                picture: meme.getViewImagePath(),
                name: 'Share My Inspiration',
                caption: meme.getViewVariableByName('name'),
                description: meme.getViewVariableByName('bio')
            };

            window.location = Facebook.FEED_SERVICE_ENTRY_POINT + '?' + _.map(parameters, function(v, k){
                return k + '=' + encodeURIComponent(v);
            }).join('&');

//            window.location = 'https://www.facebook.com/dialog/feed?app_id=458358780877780&link=https://developers.facebook.com/docs/reference/dialogs/&picture=http://fbrell.com/f8.jpg&'
//                +"name=Facebook%20Dialogs&caption=Reference%20Documentation&description=Using%20Dialogs%20to%20interact%20with%20users.&redirect_uri=https://mighty-lowlands-6381.herokuapp.com/";

        },

        isUserLoggedIn: function(){
            var deferred = new $.Deferred();

            FB.getLoginStatus(function(response) {
                if (response.status === 'connected') {
                    // connected
                    deferred.resolve();
                } else {
                    // not_logged_in, try log in
                    Facebook.login().done(function(){
                        deferred.resolve();
                    });
                }
            });

            return deferred;
        },

        login: function (){
            var deferred = new $.Deferred();

            FB.login(function(response) {
                if (response.authResponse) {
                    // connected
                    deferred.resolve();
                } else {
                    // cancelled
                    deferred.reject();
                }
            });

            return deferred;
        }

    }
})();
