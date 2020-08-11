/*
 * brightcove_AkamaiMediaAnalytics.js
 * Version - 3.1
 *
 * This file is part of the Media Analytics, http://www.akamai.com
 * Media Analytics is a proprietary Akamai software that you may use and modify per the license agreement here:
 * http://www.akamai.com/product/licenses/mediaanalytics.html
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES,
 * INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *
 *
 * Created by Vishvesh on 9th June 2018.
 *
 */

function Brightcove_AkamaiMediaAnalytics(configXML) {
  /**
   * @member loaderVersion
   * @desc The version of the Brightcove Player Loader
   */
  var loaderVersion = "3.1.15";

  /**
   * @member loaderName
   * @desc The name of the Loader
   */
  var loaderName = "BrightcovePlayerLoader";

  /**
   * @member mediaAnalyticsLibrary
   * @desc The instance of Media Analytics Library
   */
  var mediaAnalyticsLibrary = null;

  /**
   * @member configurationXML
   * @desc Path to the Beacon XML
   */
  var configurationXML = configXML;

  /**
   * @member brightcovePlayerInstance
   * @desc The player instance passed
   */
  var brightcovePlayerInstance = null;

  // The different states the player can be in.
  var PlayerStateEnum = {
    // Not initialized yet.
    NotReady: 0,
    // Indicates that the player is initializing.
    Init: 1,
    // Indicates that the player is playing video.
    Playing: 2,
    // Indicates that the player is paused.
    Pause: 4,
    // Indicates that the player is buffering.
    Rebuffer: 8,
    // Indicates that the player is in Seek or Seek buffer state.
    Seeking: 16,
    // Indicates that the session is completed with either error or successful playback.
    SessionComplete: 32
  };

  // Brightcove Player Error Messages.
  // NOTE: Whenever new errors are added to this object, please ensure firstError point to first defined and the
  // last to last defined error. Please ensure the order is maintained.
  var BrightcoveErrorCodes = {
    // Indicates that the player could not download the media.
    "-2": "PLAYER_ERR_TIMEOUT",
    // Indicates that  no media has been loaded.
    "-1": "PLAYER_ERR_NO_SRC",
    // Indicates that an unanticipated problem was encountered,.
    "0": "MEDIA_ERR_UNKNOWN",
    // Indicates that the media download was cancelled.
    "1": "MEDIA_ERR_ABORTED",
    // Indicates that the media connection was lost.
    "2": "MEDIA_ERR_NETWORK",
    // Indicates that the media is bad or in a format that can't be played on currently used browser.
    "3": "MEDIA_ERR_DECODE",
    // Indicates that the media is either unavailable or not supported in this browser.
    "4": "MEDIA_ERR_SRC_NOT_SUPPORTED",
    // Indicates that the media user is trying to watch is encrypted and the player doesn't know how to decrypt it.
    "5": "MEDIA_ERR_ENCRYPTED"
  };

  /**
   * @member firstError
   * @desc Representing PLAYER_ERR_TIMEOUT error right now.
   */
  var firstError = -2;

  /**
   * @member lastError
   * @desc Representing MEDIA_ERR_ENCRYPTED error right now.
   */
  var lastError = 5;

  /**
   * @member playerState
   * @desc Indicates the current state of the player. Refer "PlayerStateEnum", for possible values.
   */
  var playerState = PlayerStateEnum.NotReady;

  /**
   * @member isAdLoaded
   * @desc Flag indicating whether ad load was triggered or not.
   */
  var isAdLoaded = false;

  /**
   * @member currentBitrate
   * @desc Current rendition quality.
   */
  var currentBitrate = 0;

  /**
   * @member shouldSetBitrate
   * @desc If mediachange is called before playback begins, this flag will be true.
   */
  var shouldSetBitrate = false;

  /**
   * @function loadMediaAnalytics
   * @summary Registers for all the player events.
   */
  function loadMediaAnalytics() {
    try {
      // Adding playback and load related event listeners.
      brightcovePlayerInstance.on('loadstart', onLoad);
      brightcovePlayerInstance.on('loadedmetadata', onMetaDataLoadComplete);
      brightcovePlayerInstance.on('ended', onEnd);
      brightcovePlayerInstance.on('error', onError);
      brightcovePlayerInstance.on('pause', onPause);
      brightcovePlayerInstance.on('playing', onPlay);
      brightcovePlayerInstance.on('seeking', onSeek);
      brightcovePlayerInstance.on('waiting', onBuffering);
      brightcovePlayerInstance.on('mediachange', onMediaInfoChange);

      // Adding ad related event listeners.
      brightcovePlayerInstance.on('ads-load', onAdLoad);
      brightcovePlayerInstance.on('ads-ad-started', onAdStart);
      brightcovePlayerInstance.on('ads-first-quartile', onFirstQuartileComplete);
      brightcovePlayerInstance.on('ads-midpoint', onMidpointComplete);
      brightcovePlayerInstance.on('ads-third-quartile', onThirdQuartileComplete);
      brightcovePlayerInstance.on('ads-ad-ended', onAdEnded);
      brightcovePlayerInstance.on('ads-ad-skipped', onAdSkip);

      // Adding playlist item change listener.
      brightcovePlayerInstance.on('beforeplaylistitem', onEnd);

      /**
       * @function onLoad
       * @summary Dispatched when the player is initialized, and if it’s re-initialized in the case of giving it a new source to play
       */
      function onLoad() {
        if (playerState >= PlayerStateEnum.Init && playerState < PlayerStateEnum.SessionComplete) {
          onEnd();
        }
        initializeMediaAnalytics();
      }

      /**
       * @function onMetaDataLoadComplete
       * @summary Dispatched when the player has initial duration and dimension information, in other words, when the first segment is downloaded.
       */
      function onMetaDataLoadComplete() {
        setStreamInformation();
      }

      /**
       * @function onEnd
       * @summary Dispatched when the end of the media resource is reached.
       */
      function onEnd() {
        mediaAnalyticsLibrary.handlePlayEnd("Play.End.Detected");
        playerState = PlayerStateEnum.SessionComplete;
      }

      /**
       * @function onError
       * @summary Dispatched when error occurs during playback.
       */
      function onError() {
        if (playerState < PlayerStateEnum.Init || PlayerStateEnum.SessionComplete === playerState) {
          initializeMediaAnalytics();
        }
        var error = brightcovePlayerInstance.error();
        var errorMessage = BrightcoveErrorCodes[0];
        if (error && error.code) {
          // Error code can be either number or text. If it's number we perform look up.
          var errorCode = error.code;
          if (Number.isInteger(errorCode)) {
            if (errorCode >= firstError && errorCode <= lastError) {
              errorMessage = BrightcoveErrorCodes[errorCode];
            }
          } else {
            errorMessage = errorCode;
          }
        }
        mediaAnalyticsLibrary.handleError(errorMessage);
        playerState = PlayerStateEnum.SessionComplete;
      }

      /**
       * @function onPause
       * @summary Dispatched when the media has been paused or stopped.
       */
      function onPause() {
        mediaAnalyticsLibrary.handlePause();
        playerState = PlayerStateEnum.Pause;
      }

      /**
       * @function onPlay
       * @summary Dispatched every time media has begun or resumed playback.
       */
      function onPlay() {
        if (PlayerStateEnum.Rebuffer === playerState) {
          mediaAnalyticsLibrary.handleBufferEnd();
        } else {
          mediaAnalyticsLibrary.handlePlaying();
          if (shouldSetBitrate) {
            mediaAnalyticsLibrary.handleBitRateSwitch(currentBitrate);
            shouldSetBitrate = false;
          }
        }
        playerState = PlayerStateEnum.Playing;
      }

      /**
       * @function onSeek
       * @summary Dispatched when the media is being seeked to a new position.
       */
      function onSeek() {
        if (PlayerStateEnum.SessionComplete === playerState) {
          initializeMediaAnalytics();
          setStreamInformation();
        } else {
          mediaAnalyticsLibrary.handleSeekStart();
          playerState = PlayerStateEnum.Seeking;
        }
      }

      /**
       * @function onBuffering
       * @summary Dispatched when the playback stops because of a temporary lack of video data.
       */
      function onBuffering() {
        if (PlayerStateEnum.Init !== playerState && PlayerStateEnum.Seeking !== playerState) {
          mediaAnalyticsLibrary.handleBufferStart();
          playerState = PlayerStateEnum.Rebuffer;
        }
      }

      /**
       * @function onAdLoad
       * @summary Dispatched when the ad data is available following an ad request.
       */
      function onAdLoad() {
        // We don't have any ad related information available right now. Sending empyt
        var adInfoObject = {};
        mediaAnalyticsLibrary.handleAdLoaded(adInfoObject);
        isAdLoaded = true;
      }

      /**
       * @function onAdStart
       * @param {Object} eventInfo  Contains information about the ad being played.
       * @summary Dispatched when nn ad has started playing.
       */
      function onAdStart(eventInfo) {
        if (!isAdLoaded) {
          onAdLoad();
        }
        var adObject = brightcovePlayerInstance.ads.ad;
        var adInfoObject = {};
        if (adObject) {
          adInfoObject.id = typeof (adObject.id) !== 'undefined' ? adObject.id : "";
          adInfoObject.adPartnerId = typeof (adObject.id) !== 'undefined' ? adObject.id : "";
          adInfoObject.adDuration = typeof (adObject.duration) !== 'undefined' ? adObject.duration * 1000 : "";
          if ("PREROLL" === adObject.type) {
            adInfoObject.adType = "0";
          } else if ("MIDROLL" === adObject.type) {
            adInfoObject.adType = "1";
          } else {
            adInfoObject.adType = "2";
          }
        }
        if (eventInfo && eventInfo.emitter && eventInfo.emitter.J) {
          var parser = document.createElement('a');
          parser.href = eventInfo.emitter.J;
          adInfoObject.adServer = parser.host;
        }
        mediaAnalyticsLibrary.handleAdStarted(adInfoObject);
      }

      /**
       * @function onFirstQuartileComplete
       * @summary Dispatched when the ad has played 25% of its total duration.
       */
      function onFirstQuartileComplete() {
        mediaAnalyticsLibrary.handleAdFirstQuartile();
      }

      /**
       * @function onMidpointComplete
       * @summary Dispatched when the ad has played 50% of its total duration.
       */
      function onMidpointComplete() {
        mediaAnalyticsLibrary.handleAdMidPoint();
      }

      /**
       * @function onThirdQuartileComplete
       * @summary Dispatched when the ad has played 75% of its total duration.
       */
      function onThirdQuartileComplete() {
        mediaAnalyticsLibrary.handleAdThirdQuartile();
      }

      /**
       * @function onAdEnded
       * @summary Dispatched when an ad has finished playing.
       */
      function onAdEnded() {
        mediaAnalyticsLibrary.handleAdComplete();
        isAdLoaded = false;
      }

      /**
       * @function onAdSkip
       * @summary Dispatched when An ad is skipped.
       */
      function onAdSkip() {
        mediaAnalyticsLibrary.handleAdSkipped();
        isAdLoaded = false;
      }
    } catch (e) {
      console.log(e);
    }
  }

  /**
   * @function onMediaInfoChange
   * @summary Dispatched when the rendition quality changes.
   */
  function onMediaInfoChange() {
    if (brightcovePlayerInstance.tech(true).hls && brightcovePlayerInstance.tech(true).hls.playlists &&
      brightcovePlayerInstance.tech(true).hls.playlists.media() && brightcovePlayerInstance.tech(true).hls.playlists.media().attributes) {
      renditionQuality = brightcovePlayerInstance.tech(true).hls.playlists.media().attributes.BANDWIDTH;
      if (renditionQuality > 0 && renditionQuality !== currentBitrate) {
        if (PlayerStateEnum.Playing !== playerState) {
          shouldSetBitrate = true;
        } else {
          mediaAnalyticsLibrary.handleBitRateSwitch(renditionQuality);
        }
        currentBitrate = renditionQuality;
      }
    }
  }

  /**
   * @function setData
   * @param {String} key  The key to be added
   * @param {String} value The data associated with the key
   * @summary This method can be used for setting custom dimensions.
   */
  this.setData = function (name, value) {
    mediaAnalyticsLibrary.setData(name, value);
  }


  /**
   * @function enableLocation
   * @summary This API enables location tracking in MA Library.
   */
  this.enableLocation = function () {
    mediaAnalyticsLibrary.enableLocation();
  };

  /**
   * @function disableLocation
   * @summary This API disables location tracking in MA Library.
   */
  this.disableLocation = function () {
    mediaAnalyticsLibrary.disableLocation();
  };

  /**
   * @function enableServerIPLookUp
   * @summary ServerIP detection works only with akamai stream urls. Use this API to enable
   *          the feature. It is recommended that this feature is turned off, if cdn used is not Akamai.
   */
  this.enableServerIPLookUp = function () {
    mediaAnalyticsLibrary.enableServerIPLookUp();
  };

  /**
   * @function disableServerIPLookUp
   * @summary ServerIP detection works only with akamai stream urls. Use this API to disable
   *          the feature. It is recommended that this feature is turned off, if cdn used is not Akamai.
   */
  this.disableServerIPLookUp = function () {
    mediaAnalyticsLibrary.disableServerIPLookUp();
  };

  /**
   * @function setMediaPlayer
   * @param {Object} brightcovePlayer The player to be tracked.
   * @summary An API to set the player to be tracked.
   */
  this.setMediaPlayer = function (brightcovePlayer) {
    if (brightcovePlayer) {
      this.resetMediaPlayer();
      brightcovePlayerInstance = brightcovePlayer;
      loadMediaAnalytics();
    }
  };

  /**
   * @function resetMediaPlayer
   * @summary An API to reset the player being tracked.
   */
  this.resetMediaPlayer = function () {
    if (brightcovePlayerInstance) {
      // If player is valid, remove listeners first.
      removeAllListeners();
      brightcovePlayerInstance = null;
    }
  };

  /**
   * @function removeAllListeners
   * @summary Removes all the event listeners
   */
  function removeAllListeners() {
    if (PlayerStateEnum.SessionComplete !== playerState) {
      mediaAnalyticsLibrary.handlePlayEnd("Play.End.Detected");
      playerState = PlayerStateEnum.SessionComplete;
    }
    if (brightcovePlayerInstance) {
      brightcovePlayerInstance.off('loadstart', onLoad);
      brightcovePlayerInstance.off('loadedmetadata', onMetaDataLoadComplete);
      brightcovePlayerInstance.off('ended', onEnd);
      brightcovePlayerInstance.off('error', onError);
      brightcovePlayerInstance.off('pause', onPause);
      brightcovePlayerInstance.off('playing', onPlay);
      brightcovePlayerInstance.off('seeking', onSeek);
      brightcovePlayerInstance.off('waiting', onBuffering);
      brightcovePlayerInstance.off('ads-load', onAdLoad);
      brightcovePlayerInstance.off('ads-ad-started', onAdStart);
      brightcovePlayerInstance.off('ads-first-quartile', onFirstQuartileComplete);
      brightcovePlayerInstance.off('ads-midpoint', onMidpointComplete);
      brightcovePlayerInstance.off('ads-third-quartile', onThirdQuartileComplete);
      brightcovePlayerInstance.off('ads-ad-ended', onAdEnded);
      brightcovePlayerInstance.off('ads-ad-skipped', onAdSkip);
      brightcovePlayerInstance.off('beforeplaylistitem', onEnd);
      brightcovePlayerInstance.off('mediachange', onMediaInfoChange);
    }
  }

  /**
   * @function handleTitleSwitch
   * @param {Dictionary} customData Dictionary containing the key value pairs for the
   *  custom data that the client wants to set to the session.
   * @summary This API handles the title switch
   */
  this.handleTitleSwitch = function (customData) {
    mediaAnalyticsLibrary.handleTitleSwitch(customData);
    playerState = validPlayerStates.Playing;
  };

  /**
   * @function setViewerId
   * @param {String} viewerId A unique string to identify the user with.
   * @summary Allows Viewer ID to be set. If this API is not called MA Library will set a unique string.
   */
  this.setViewerId = function (viewerId) {
    mediaAnalyticsLibrary.setViewerId(viewerId);
  };

  /**
   * @function setViewerDiagnosticsId
   * @param {String} viewerDiagnosticsId A unique string to identify the user with.
   * @summary Allows Viewer Diagnostics ID to be set. If this API is not called MA Library will set a unique string.
   */
  this.setViewerDiagnosticId = function (viewerDiagnosticId) {
    mediaAnalyticsLibrary.setViewerDiagnosticsId(viewerDiagnosticId);
  };

  /**
   * @function initializeMediaAnalytics
   * @summary Initializes the Media Analytics Library
   */
  function initializeMediaAnalytics() {
    var akaCallBack = {};
    akaCallBack.getStreamHeadPosition = function () {
      return brightcovePlayerInstance.currentTime();
    }
    akaCallBack.droppedFrames = function () {
      var quality = brightcovePlayerInstance.getVideoPlaybackQuality();
      return quality.droppedVideoFrames();
    }
    akaCallBack.bytesLoaded = function () {
      var bytesDownloaded = 0;
      if (brightcovePlayerInstance.tech(true).hls && brightcovePlayerInstance.tech(true).hls.stats) {
        bytesDownloaded = brightcovePlayerInstance.tech(true).hls.stats.mediaBytesTransferred;
      }
      return bytesDownloaded;
    }
    mediaAnalyticsLibrary.setPlayerLoaderVersion(loaderName + "-" + loaderVersion);
    mediaAnalyticsLibrary.handleSessionInit(akaCallBack);
    playerState = PlayerStateEnum.Init;
  }

  /**
   * @function setStreamInformation
   * @summary Sets stream information like stream url, duration, live or vod etc.
   */
  function setStreamInformation() {
    mediaAnalyticsLibrary.setStreamURL(brightcovePlayerInstance.currentSrc(), false);
    var duration = brightcovePlayerInstance.duration();
    var deliveryType = "O";
    if (!Number.isFinite(duration)) {
      // Live streams will always return a duration of infinity
      duration = -1;
      deliveryType = "L";
    }
    mediaAnalyticsLibrary.setStreamDuration(duration);
    mediaAnalyticsLibrary.setData("deliveryType", deliveryType);
    if (brightcovePlayerInstance.bcAnalytics && brightcovePlayerInstance.bcAnalytics.settings) {
      mediaAnalyticsLibrary.setData("playerVersion", brightcovePlayerInstance.bcAnalytics.settings.platformVersion);
    }
    mediaAnalyticsLibrary.setData("playerType", "BrightcovePlayer-" + brightcovePlayerInstance.techName_);
    var sourceMimeType = brightcovePlayerInstance.currentType();
    var format = "-";
    if ("application/vnd.apple.mpegurl" === sourceMimeType) {
      format = "hls";
      // Report the first bitrate selected.
      onMediaInfoChange();
    } else if ("application/dash+xml" === sourceMimeType) {
      format = "dash";
      // Report the first bitrate selected.
      onMediaInfoChange();
    } else if ("video/mp4" === sourceMimeType) {
      format = "mp4";
    }
    mediaAnalyticsLibrary.setData("format", format);
  }
  mediaAnalyticsLibrary = new JS_AkamaiMediaAnalytics(configurationXML);
}
