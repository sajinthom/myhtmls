videojs.registerPlugin('logoOverlay', function (options) {
    var player = this,
        overlayOptions,
        overlayContent;

    if (isDefined(parseFloat(player.mediainfo.customFields["logo_start_time"]))) {
        var startTime = parseFloat(player.mediainfo.customFields["logo_start_time"]);
    }
    if (isDefined(parseFloat(player.mediainfo.customFields["logo_end_time"]))) {
        var endTime = parseFloat(player.mediainfo.customFields["logo_end_time"]);
    }


    // First check if the there are values in custom fields - logo_start_time and logo_end_time
    if (startTime && endTime) {

        // +++ Add overlay function +++
        function showOverlay() {
            player.overlay({
                content: overlayContent,
                overlays: [{
                    start: overlayOptions.start,
                    align: overlayOptions.align
                }]
            });

        }


        // +++ Remove overlay  +++
        function endOverlay() {
            if (player.currentTime() >= endTime) {
                player.off('timeupdate', endOverlay);
                document.getElementsByClassName('vjs-overlay')[0].className += ' bcls-hide-overlay';
            }
        }



        /**
         * tests for all the ways a variable might be undefined or not have a value
         * @param {*} x the variable to test
         * @return {Boolean} true if variable is defined and has a value
         */
        function isDefined(x) {
            if (x === '' || x === null || x === undefined || x === NaN) {
                return false;
            }
            return true;
        }

        // +++ Function to merge passed in configuration with defaults +++
        /**
         * merges inputs or default values into a new settings object
         * @param {Object} inputOptions the input values
         * @return {Object} the settings object
         */
        function setOptions(inputOptions) {
            var prop, settings = {},
                aTag, imgTag;
            for (prop in inputOptions) {
                if (inputOptions.hasOwnProperty(prop)) {
                    settings[prop] = inputOptions[prop];
                }
            }
            return settings;
        }

        // +++ Call function to merge default options with passed in options +++
        overlayOptions = setOptions(options);
        // set the content
        imgTag = new Image();
        imgTag.onLoad = function () {
            imgTag.setAttribute('width', this.width);
            imgTag.setAttribute('height'.this.height);
        };
        imgTag.src = overlayOptions.imageURL;
        if (isDefined(overlayOptions.clickThruURL)) {
            aTag = document.createElement('a');
            aTag.setAttribute('href', overlayOptions.clickThruURL);
            aTag.setAttribute('target', '_blank');
            aTag.appendChild(imgTag);
            overlayContent = aTag.outerHTML;
        } else {
            overlayContent = imgTag.outerHTML;
        }


        if (player.currentTime() >= startTime) {
            // handler for timeupdate events
            player.on('timeupdate', showOverlay);

        }


    }
    //else do nothing


});
