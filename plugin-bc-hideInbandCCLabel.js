videojs.registerPlugin('hideInbandCCLabel', function () {
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
    player.one('playing', function () {
        var tt = player.textTracks();
        for (var i = 0; i < tt.length; i++) {
            if (tt[i].mode === 'showing') {
                tt[i].mode = 'disabled';
            }
        }
    });
});
