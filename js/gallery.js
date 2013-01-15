/**
 * User: anch
 * Date: 1/13/13
 * Time: 6:19 PM
 */

(function(){
    var MEME_WIDTH = 480;
    var COLUMN_SPACING = 10;
    var _data = null;
    var _columns = [];
    var _rendering = false;

    function initialize(){
        downloadData().done(setupUI);
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
        $(window).on('scroll', _.debounce(renderData));
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

        function getUnfilledColumns(){
            return _.filter(_columns, function(e){
                return e.height < dimension.viewportBottom;
            })
        }

        function getExistingMemes(){
            return _.reduce(_.map(_columns, function(e){
                return e.memes.length;
            }), function(pv, cv) { return pv + cv; }, 0);
        }

        var dimension = getDimension();
        var columnsCount = _columns.length;

        var columnsRotation = 0;
        var memeCounter = getExistingMemes(); // start from the next meme : (count on existing ones + 1)


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
                if(columnEntry.height >= dimension.viewportBottom){
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
        this._$ui = null;
    }

    _.extend(Meme.prototype, {
        getPresentation: function(){
            if(!this._$ui){
                var template = _.template(getTemplateElement('meme'), this._data);
                this._$ui = $(template);
            }

            // whether this html section has any imgs? if there any preload it
            var signals = _.map(this._$ui.find('img'), function(img){
                var src = $(img).attr('src');
                return UTILITY.preloadImage(src).pipe(function($preloadImg, dimension){
                    if(dimension.width > MEME_WIDTH *.9){
                        $(img).width(MEME_WIDTH *.9);
                    }
                });
            });

            $.when.apply(null, signals);

            return $.when.apply(null, signals).pipe(_.bind(function(){
                return this._$ui;
            }, this));
        },

        getDimension: function(){
            return {
                width: MEME_WIDTH,
                height: this._$ui && this._$ui.height() || 0
            };
        }
    });

})();
