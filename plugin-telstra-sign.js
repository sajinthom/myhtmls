var registerPlugin = videojs.registerPlugin || videojs.plugin;

var defaults = {};

var onPlayerReady = function (player, options) {
    videojs.use('*', function (player) {
        return {
            setSource(srcObj, next) {
                // modify source URL here
                // source url will be available in srcObj.src
                srcObj.src = sign(srcObj.src, options);
                next(null, srcObj);
            }
        };
    });
};

var myPlugin = function (options) {
    this.ready(() => {
        onPlayerReady(this, videojs.mergeOptions(defaults, options));
    });
};

registerPlugin('telstrasign', myPlugin);
