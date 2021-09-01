videojs.registerPlugin('hideInbandCCLabel', function() {
    if (videojs.browser.IS_SAFARI) {
        return;
    }
    var player = this;
    player.on('loadedmetadata', function() {
        player.controlBar.subsCapsButton.items[3].el().style.display = 'none'
    });
});
