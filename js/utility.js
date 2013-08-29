/**
 * User: anch
 * Date: 1/13/13
 * Time: 9:56 PM
 */

var UTILITY = function (namesapce){
    return _.extend(namesapce || {}, {
        /**
         * Get scroll bar width
         * http://stackoverflow.com/questions/986937/how-can-i-get-the-browsers-scrollbar-sizes
         * @return {number}
         */
        getScrollBarWidth : function() {
            var inner = document.createElement('p');
            inner.style.width = "100%";
            inner.style.height = "200px";

            var outer = document.createElement('div');
            outer.style.position = "absolute";
            outer.style.top = "0px";
            outer.style.left = "0px";
            outer.style.visibility = "hidden";
            outer.style.width = "200px";
            outer.style.height = "150px";
            outer.style.overflow = "hidden";
            outer.appendChild (inner);

            document.body.appendChild (outer);
            var w1 = inner.offsetWidth;
            outer.style.overflow = 'scroll';
            var w2 = inner.offsetWidth;
            if (w1 == w2) w2 = outer.clientWidth;

            document.body.removeChild (outer);

            return (w1 - w2);
        },

        preloadImage: function(src){
            var deferred = new $.Deferred();
            var $div = $('<div/>').css({
                position: 'absolute',
                visibility: 'hidden'
            });
            $div.appendTo($('body'));

            var $img = $('<img/>').attr('src', src).appendTo($div);
            $img.imagesLoaded(function(imageLoadedInstance){				
				var loadingImage = imageLoadedInstance.images[0];
				var $loadedImg = $(loadingImage.img);
                if(loadingImage.isLoaded && $loadedImg.attr('src') === src){
                    var dimension = {width: $img.width(), height: $img.height()};
                    $img.remove();
                    deferred.resolve($img, dimension);
                }else{
                    deferred.reject();
                }
                $div.remove();
            });

            return deferred;
        }
    })
}(UTILITY);
