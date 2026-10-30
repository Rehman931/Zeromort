import React, { useEffect, useRef } from 'react';

export function VideoPlayer({ roomState, isHostOrMod, onPlay, onPause }) {
  const playerRef = useRef(null);
  const isSyncing = useRef(false);

  // 1. Load YouTube IFrame API
  useEffect(() => {
    // If the YouTube script isn't loaded yet, add it to <head>
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }

    // Function to create player once YouTube API is ready
    const initPlayer = () => {
      if (playerRef.current) return;

      playerRef.current = new window.YT.Player('youtube-player', {
        videoId: roomState.videoId || 'aqz-KE-bpKQ',
        playerVars: {
          autoplay: 1,
          controls: isHostOrMod ? 1 : 0, // Disable native player controls for participants
        },
        events: {
          onReady: (event) => {
            // Mute by default so browser allows autoplay
            event.target.mute();
            if (roomState.isPlaying) {
              event.target.playVideo();
            }
          },
          onStateChange: handleStateChange
        }
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }
  }, []);

  // 2. Handle user clicking play/pause directly inside YouTube video
  const handleStateChange = (event) => {
    // If this change was caused by a socket update, ignore it (prevents infinite loop)
    if (isSyncing.current) return;

    const player = event.target;
    const currentTime = player.getCurrentTime() || 0;

    // 1 = PLAYING, 2 = PAUSED
    if (event.data === window.YT.PlayerState.PLAYING) {
      if (isHostOrMod) {
        onPlay(currentTime);
      } else {
        // Participants cannot control; revert
        isSyncing.current = true;
        if (!roomState.isPlaying) player.pauseVideo();
        setTimeout(() => { isSyncing.current = false; }, 300);
      }
    } else if (event.data === window.YT.PlayerState.PAUSED) {
      if (isHostOrMod) {
        onPause(currentTime);
      } else {
        isSyncing.current = true;
        if (roomState.isPlaying) player.playVideo();
        setTimeout(() => { isSyncing.current = false; }, 300);
      }
    }
  };

  // 3. React to socket updates from the roomState prop
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !player.getPlayerState) return;

    // Video changed
    const currentUrl = player.getVideoUrl ? player.getVideoUrl() : '';
    if (roomState.videoId && !currentUrl.includes(roomState.videoId)) {
      isSyncing.current = true;
      player.loadVideoById(roomState.videoId, roomState.currentTime || 0);
      setTimeout(() => { isSyncing.current = false; }, 500);
      return;
    }

    // Play / Pause sync
    const currentState = player.getPlayerState();
    if (roomState.isPlaying && currentState !== window.YT.PlayerState.PLAYING) {
      isSyncing.current = true;
      player.playVideo();
      setTimeout(() => { isSyncing.current = false; }, 300);
    } else if (!roomState.isPlaying && currentState === window.YT.PlayerState.PLAYING) {
      isSyncing.current = true;
      player.pauseVideo();
      setTimeout(() => { isSyncing.current = false; }, 300);
    }

    // Time seek sync (only if difference is more than 1.5 seconds)
    const localTime = player.getCurrentTime ? player.getCurrentTime() : 0;
    if (Math.abs(localTime - roomState.currentTime) > 1.5) {
      isSyncing.current = true;
      player.seekTo(roomState.currentTime, true);
      setTimeout(() => { isSyncing.current = false; }, 300);
    }
  }, [roomState]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-lg border border-slate-800">
      <div id="youtube-player" className="w-full h-full" />
    </div>
  );
}
