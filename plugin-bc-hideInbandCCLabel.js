videojs.registerPlugin('hideInbandCCLabel', function () {
    if (videojs.browser.IS_SAFARI) {
        return;
    }
    var player = this;
    subCapButton = player.controlBar.subsCapsButton;
    subCapButton.one(['click', 'mouseover'], function () {
        var items = subCapButton.items;

        for (var i = 0; i < items.length; i++) {
            if (items[i].track.kind === 'captions') {
                items[i].el().style.display = 'none';
            }
        }
    });
});
