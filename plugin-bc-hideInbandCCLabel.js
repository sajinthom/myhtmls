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

        var tt = player.textTracks();
        tt.addEventListener('change', function (e) {
          for (var i = 0; i < tt.length; i++) {
            if (tt[i].mode === 'showing') {
              tt[i].mode = 'hidden';
              this.removeEventListener('change', arguments.callee);
            }
          }
        });
      });
