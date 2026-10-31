import React, { useEffect, useRef, useState } from 'react';

export function VideoPlayer({ roomState, isHostOrMod, onPlay, onPause }) {
  const playerRef = useRef(null);
  const isSyncing = useRef(false);
  const [isMuted, setIsMuted] = useState(true);

  // 1. Load YouTube IFrame API and Initialize Player
  useEffect(() => {
    // If the YouTube script isn't loaded yet, add it
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }

    const initPlayer = () => {
      if (playerRef.current || !document.getElementById('youtube-player')) return;

      playerRef.current = new window.YT.Player('youtube-player', {
        videoId: roomState.videoId || 'aqz-KE-bpKQ',
        playerVars: {
          autoplay: 1,
          controls: isHostOrMod ? 1 : 0, // Disable native player controls for participants
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: (event) => {
            const player = event.target;
            player.mute(); // Mute initially so browser autoplay policy allows playing
            setIsMuted(true);

            // Seek to current room timestamp if room has already started
            if (roomState.currentTime > 0) {
              player.seekTo(roomState.currentTime, true);
            }

            if (roomState.isPlaying) {
              player.playVideo();
            }
          },
          onStateChange: handleStateChange
        }
      });
    };

    // Check if YouTube API is ready or wait for it
    let timer = null;
    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      timer = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(timer);
          initPlayer();
        }
      }, 100);
    }

    return () => {
      if (timer) clearInterval(timer);
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, []);

  // 2. Handle user clicking play/pause directly inside the YouTube video
  const handleStateChange = (event) => {
    // If this change was caused by an incoming socket update, ignore it (prevents infinite loop)
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

  // Unmute helper for browser autoplay audio policy
  const handleUnmute = () => {
    if (playerRef.current && playerRef.current.unMute) {
      playerRef.current.unMute();
      playerRef.current.setVolume(100);
      setIsMuted(false);
    }
  };

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-lg border border-slate-800">
      <div id="youtube-player" className="w-full h-full" />

      {/* Browser Autoplay Audio Unlock Button */}
      {isMuted && (
        <button
          onClick={handleUnmute}
          className="absolute top-3 right-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3.5 py-1.5 rounded-full font-medium shadow-xl z-20 transition active:scale-95 cursor-pointer flex items-center gap-1.5 animate-pulse"
        >
          <span>🔊</span>
          <span>Click to Unmute Audio</span>
        </button>
      )}
    </div>
  );
}
