videojs.registerPlugin('akamaiAnalytics', function () {
    var myPlayer = this;
    var analyticsLoader = new Brightcove_AkamaiMediaAnalytics("https://ma1487-r.analytics.edgekey.net/config/beacon-28762.xml");
  analyticsLoader.setMediaPlayer(myPlayer);
});
