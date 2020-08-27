videojs.registerPlugin('logoOverlay', function (options) {
    var player = this,

    function isDefined(x) {
        if (x === '' || x === null || x === undefined || x === NaN) {
            return false;
        }
        return true;
    }

    player.on('loadstart', function () {
        if (
            isDefined(
                parseFloat(player.mediainfo.customFields['logo_start_time'])
            )
        ) {
            var startTime = parseFloat(
                player.mediainfo.customFields['logo_start_time']
            );
            // Show logo for 6 seconds
            endTime = startTime + 6;
        }
        // if (
        //     isDefined(
        //         parseFloat(player.mediainfo.customFields['logo_end_time'])
        //     )
        // ) {
        //     var endTime = parseFloat(
        //         player.mediainfo.customFields['logo_end_time']
        //     );
        // }


        // First check if the there are values in custom fields - logo_start_time and logo_end_time
        if (startTime && endTime) {
            player.overlay({
                content: options["content"],
                overlays: [
                    {
                        start: startTime,
                        end: endTime,
                        align: options["align"],
                    },
                ],
            });
        }
    });
});
