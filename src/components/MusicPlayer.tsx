import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Upload,
  Music,
  ListMusic,
  Repeat,
  ListOrdered,
  Shuffle,
  Repeat1,
} from "lucide-react";
import { cn } from "@/lib/utils";

type PlayMode = "order" | "listLoop" | "shuffle" | "singleLoop";

const PLAY_MODES: PlayMode[] = ["order", "listLoop", "shuffle", "singleLoop"];

const PLAY_MODE_LABELS: Record<PlayMode, string> = {
  order: "顺序播放",
  listLoop: "列表循环",
  shuffle: "随机播放",
  singleLoop: "单曲循环",
};

const PLAY_MODE_ICONS: Record<PlayMode, React.ComponentType<{ className?: string }>> = {
  order: ListOrdered,
  listLoop: Repeat,
  shuffle: Shuffle,
  singleLoop: Repeat1,
};

interface Track {
  id: string;
  file: File;
  name: string;
  url: string;
  duration: number;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function MusicPlayer() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [playMode, setPlayMode] = useState<PlayMode>("listLoop");
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentTrack = currentIndex >= 0 ? tracks[currentIndex] : null;

  // Load tracks from files
  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const audioFiles = Array.from(files).filter((f) =>
        f.type.startsWith("audio/")
      );

      const newTracks: Track[] = audioFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        name: file.name.replace(/\.[^/.]+$/, ""),
        url: URL.createObjectURL(file),
        duration: 0,
      }));

      setTracks((prev) => [...prev, ...newTracks]);

      // If no track is playing, start with the first new track
      if (currentIndex === -1 && newTracks.length > 0) {
        setCurrentIndex(tracks.length);
      }
    },
    [currentIndex, tracks.length]
  );

  // Play/Pause
  const togglePlay = useCallback(() => {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, currentTrack]);

  // Play specific track
  const playTrack = useCallback(
    (index: number) => {
      if (index < 0 || index >= tracks.length) return;
      setCurrentIndex(index);
      setIsPlaying(true);
    },
    [tracks.length]
  );

  // Determine next track index based on play mode
  const getNextIndex = useCallback((): number | null => {
    if (tracks.length === 0) return null;

    switch (playMode) {
      case "singleLoop":
        return currentIndex; // same track
      case "shuffle":
        return Math.floor(Math.random() * tracks.length);
      case "listLoop":
        return (currentIndex + 1) % tracks.length;
      case "order":
      default:
        if (currentIndex < tracks.length - 1) {
          return currentIndex + 1;
        }
        return null; // stop at end
    }
  }, [tracks.length, currentIndex, playMode]);

  // Next track
  const nextTrack = useCallback(() => {
    const nextIndex = getNextIndex();
    if (nextIndex === null) {
      // order mode reached end
      setIsPlaying(false);
      return;
    }
    setCurrentIndex(nextIndex);
    setIsPlaying(true);
  }, [getNextIndex]);

  // Previous track
  const prevTrack = useCallback(() => {
    if (tracks.length === 0) return;
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    const prevIndex =
      (currentIndex - 1 + tracks.length) % tracks.length;
    setCurrentIndex(prevIndex);
    setIsPlaying(true);
  }, [tracks.length, currentIndex]);

  // Volume control
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Handle track ended
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      const nextIndex = getNextIndex();
      if (nextIndex === null) {
        // order mode reached end
        setIsPlaying(false);
        return;
      }
      if (nextIndex === currentIndex) {
        // singleLoop: replay current
        audio.currentTime = 0;
        audio.play();
      } else {
        setCurrentIndex(nextIndex);
        setIsPlaying(true);
      }
    };

    audio.addEventListener("ended", handleEnded);
    return () => audio.removeEventListener("ended", handleEnded);
  }, [currentIndex, tracks.length, playMode, getNextIndex]);

  // Auto-play when current index changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    audio.src = currentTrack.url;
    audio.load();
    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    }
  }, [currentIndex, currentTrack?.url]);

  // Time update
  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);
    setDuration(audio.duration || 0);
  }, []);

  // --- Progress seek helpers ---
  const setProgressFromEvent = useCallback((clientX: number) => {
    const audio = audioRef.current;
    const progress = progressRef.current;
    if (!audio || !progress) return;
    const rect = progress.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    audio.currentTime = percent * (audio.duration || 0);
    setCurrentTime(audio.currentTime);
  }, []);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      setProgressFromEvent(e.clientX);
    },
    [setProgressFromEvent]
  );

  const handleProgressMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      setIsDraggingProgress(true);
      setProgressFromEvent(e.clientX);
    },
    [setProgressFromEvent]
  );

  // --- Volume seek helpers ---
  const setVolumeFromEvent = useCallback((clientX: number) => {
    const vol = volumeRef.current;
    if (!vol) return;
    const rect = vol.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setVolume(percent);
    setIsMuted(false);
  }, []);

  const handleVolumeClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      setVolumeFromEvent(e.clientX);
    },
    [setVolumeFromEvent]
  );

  const handleVolumeMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      setIsDraggingVolume(true);
      setVolumeFromEvent(e.clientX);
    },
    [setVolumeFromEvent]
  );

  // Global mouse move/up for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingProgress) {
        setProgressFromEvent(e.clientX);
      }
      if (isDraggingVolume) {
        setVolumeFromEvent(e.clientX);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingProgress(false);
      setIsDraggingVolume(false);
    };

    if (isDraggingProgress || isDraggingVolume) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingProgress, isDraggingVolume, setProgressFromEvent, setVolumeFromEvent]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volumePercent = isMuted ? 0 : volume * 100;

  // Cycle play mode
  const cyclePlayMode = () => {
    const currentIdx = PLAY_MODES.indexOf(playMode);
    const nextIdx = (currentIdx + 1) % PLAY_MODES.length;
    setPlayMode(PLAY_MODES[nextIdx]);
  };

  const PlayModeIcon = PLAY_MODE_ICONS[playMode];

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-blue-100 via-white to-blue-50">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-30 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(59,130,246,0.5) 0%, rgba(147,197,253,0.2) 50%, transparent 70%)",
            animation: "float1 8s ease-in-out infinite",
          }}
        />
        <div
          className="absolute top-1/3 -right-24 w-80 h-80 rounded-full opacity-25 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(96,165,250,0.5) 0%, rgba(191,219,254,0.2) 50%, transparent 70%)",
            animation: "float2 10s ease-in-out infinite",
          }}
        />
        <div
          className="absolute -bottom-24 left-1/4 w-72 h-72 rounded-full opacity-20 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(147,197,253,0.5) 0%, rgba(219,234,254,0.2) 50%, transparent 70%)",
            animation: "float3 12s ease-in-out infinite",
          }}
        />
      </div>

      {/* Global styles for animations */}
      <style>{`
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, 30px) scale(1.1); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, -40px) scale(1.05); }
        }
        @keyframes float3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, -20px) scale(1.08); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%) rotate(25deg); }
          100% { transform: translateX(200%) rotate(25deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(59,130,246,0.15), 0 8px 32px rgba(59,130,246,0.1); }
          50% { box-shadow: 0 0 40px rgba(59,130,246,0.25), 0 8px 32px rgba(59,130,246,0.15); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes wave {
          0%, 100% { transform: scaleY(0.5); }
          50% { transform: scaleY(1); }
        }
      `}</style>

      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleTimeUpdate}
      />

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4 md:p-8">
        <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-6">
          {/* Main Player */}
          <div
            className="flex-1 rounded-2xl overflow-hidden relative"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.4) 100%)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.5)",
              boxShadow:
                "0 8px 32px rgba(59,130,246,0.1), 0 2px 8px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.6)",
              animation: "pulse-glow 4s ease-in-out infinite",
            }}
          >
            {/* Shimmer effect */}
            <div
              className="absolute inset-0 overflow-hidden pointer-events-none"
              style={{ borderRadius: "1rem" }}
            >
              <div
                className="absolute top-0 left-0 w-1/2 h-full"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
                  animation: "shimmer 3s ease-in-out infinite",
                }}
              />
            </div>

            <div className="relative z-10 p-6 md:p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <Music className="w-5 h-5 text-blue-500" />
                  <h1 className="text-lg font-semibold text-blue-900">
                    Music Player
                  </h1>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(59,130,246,0.9) 0%, rgba(96,165,250,0.9) 100%)",
                    color: "white",
                    boxShadow: "0 4px 12px rgba(59,130,246,0.3)",
                  }}
                >
                  <Upload className="w-4 h-4" />
                  添加音乐
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
              </div>

              {/* Album Art / Visualizer */}
              <div className="flex flex-col items-center mb-8">
                <div
                  className="relative w-48 h-48 md:w-56 md:h-56 rounded-full overflow-hidden mb-6"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(147,197,253,0.3) 50%, rgba(219,234,254,0.4) 100%)",
                    boxShadow:
                      "0 8px 32px rgba(59,130,246,0.2), inset 0 0 30px rgba(255,255,255,0.3)",
                    border: "2px solid rgba(255,255,255,0.5)",
                    animation: currentTrack
                      ? "spin-slow 8s linear infinite"
                      : "none",
                    animationPlayState: isPlaying ? "running" : "paused",
                  }}
                >
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      background:
                        "radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.3) 30%, transparent 60%)",
                    }}
                  >
                    <Music
                      className="w-16 h-16 text-blue-400"
                      style={{
                        animation: isPlaying ? "wave 1s ease-in-out infinite" : "none",
                      }}
                    />
                  </div>
                  {/* Center hole */}
                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(219,234,254,0.8) 100%)",
                      boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1)",
                    }}
                  />
                </div>

                {/* Track Info */}
                <div className="text-center">
                  <h2 className="text-xl md:text-2xl font-bold text-blue-950 mb-1 truncate max-w-xs md:max-w-sm">
                    {currentTrack?.name || "未选择歌曲"}
                  </h2>
                  <p className="text-sm text-blue-400">
                    {currentTrack
                      ? `${tracks.length} 首歌曲`
                      : "点击添加音乐开始播放"}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div
                  ref={progressRef}
                  className="relative h-2 rounded-full cursor-pointer group"
                  style={{
                    background: "rgba(59,130,246,0.15)",
                  }}
                  onClick={handleProgressClick}
                  onMouseDown={handleProgressMouseDown}
                >
                  <div
                    className="absolute top-0 left-0 h-full rounded-full transition-all duration-100"
                    style={{
                      width: `${progressPercent}%`,
                      background:
                        "linear-gradient(90deg, rgba(59,130,246,0.8) 0%, rgba(96,165,250,0.9) 100%)",
                      boxShadow: "0 0 10px rgba(59,130,246,0.4)",
                    }}
                  />
                  {/* Thumb */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{
                      left: `calc(${progressPercent}% - 8px)`,
                      background: "white",
                      boxShadow: "0 0 8px rgba(59,130,246,0.5), 0 2px 4px rgba(0,0,0,0.1)",
                      border: "2px solid rgba(59,130,246,0.8)",
                    }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-blue-400">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4 md:gap-6">
                {/* Play Mode Button */}
                <button
                  onClick={cyclePlayMode}
                  className="p-2 rounded-lg transition-all duration-200 hover:scale-110 relative group"
                  title={PLAY_MODE_LABELS[playMode]}
                  style={{
                    color: playMode !== "order" ? "rgb(59,130,246)" : "rgb(147,197,253)",
                    backgroundColor: playMode !== "order" ? "rgba(59,130,246,0.08)" : "transparent",
                  }}
                >
                  <PlayModeIcon className="w-5 h-5" />
                  {/* Tooltip */}
                  <span
                    className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{
                      background: "rgba(30,58,138,0.8)",
                      color: "white",
                    }}
                  >
                    {PLAY_MODE_LABELS[playMode]}
                  </span>
                </button>

                <button
                  onClick={prevTrack}
                  className="p-2 text-blue-600 hover:text-blue-700 transition-all duration-200 hover:scale-110 active:scale-95"
                >
                  <SkipBack className="w-6 h-6" fill="currentColor" />
                </button>

                <button
                  onClick={togglePlay}
                  disabled={!currentTrack}
                  className="p-4 rounded-full text-white transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(59,130,246,0.9) 0%, rgba(96,165,250,0.9) 100%)",
                    boxShadow: "0 4px 16px rgba(59,130,246,0.4)",
                  }}
                >
                  {isPlaying ? (
                    <Pause className="w-7 h-7" fill="currentColor" />
                  ) : (
                    <Play className="w-7 h-7" fill="currentColor" />
                  )}
                </button>

                <button
                  onClick={nextTrack}
                  className="p-2 text-blue-600 hover:text-blue-700 transition-all duration-200 hover:scale-110 active:scale-95"
                >
                  <SkipForward className="w-6 h-6" fill="currentColor" />
                </button>

                {/* Spacer for symmetry */}
                <div className="w-9" />
              </div>

              {/* Volume */}
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-blue-400 hover:text-blue-600 transition-colors"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
                <div
                  ref={volumeRef}
                  className="relative w-32 h-1.5 rounded-full cursor-pointer group"
                  style={{ background: "rgba(59,130,246,0.15)" }}
                  onClick={handleVolumeClick}
                  onMouseDown={handleVolumeMouseDown}
                >
                  {/* Fill */}
                  <div
                    className="absolute top-0 left-0 h-full rounded-full pointer-events-none"
                    style={{
                      width: `${volumePercent}%`,
                      background:
                        "linear-gradient(90deg, rgba(59,130,246,0.6) 0%, rgba(96,165,250,0.8) 100%)",
                    }}
                  />
                  {/* Thumb */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{
                      left: `calc(${volumePercent}% - 6px)`,
                      background: "white",
                      boxShadow: "0 0 6px rgba(59,130,246,0.4)",
                      border: "1.5px solid rgba(59,130,246,0.6)",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Playlist */}
          <div
            className="w-full lg:w-80 rounded-2xl overflow-hidden relative"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.35) 100%)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.5)",
              boxShadow:
                "0 8px 32px rgba(59,130,246,0.08), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)",
            }}
          >
            {/* Shimmer effect */}
            <div
              className="absolute inset-0 overflow-hidden pointer-events-none"
              style={{ borderRadius: "1rem" }}
            >
              <div
                className="absolute top-0 left-0 w-1/2 h-full"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)",
                  animation: "shimmer 3.5s ease-in-out infinite",
                }}
              />
            </div>

            <div className="relative z-10 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ListMusic className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold text-blue-900">播放列表</h3>
                  <span className="text-xs text-blue-400 bg-blue-50 px-2 py-0.5 rounded-full">
                    {tracks.length}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 max-h-[400px] lg:max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                {tracks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Music className="w-12 h-12 text-blue-200 mb-3" />
                    <p className="text-sm text-blue-300">
                      暂无歌曲，点击"添加音乐"开始
                    </p>
                  </div>
                ) : (
                  tracks.map((track, index) => (
                    <button
                      key={track.id}
                      onClick={() => playTrack(index)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group",
                        currentIndex === index
                          ? "bg-blue-100/80 shadow-sm"
                          : "hover:bg-white/50"
                      )}
                    >
                      {/* Track number / playing indicator */}
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
                        {currentIndex === index && isPlaying ? (
                          <div className="flex items-end gap-0.5 h-4">
                            <div
                              className="w-1 bg-blue-500 rounded-full"
                              style={{
                                animation: "wave 0.6s ease-in-out infinite",
                                height: "60%",
                              }}
                            />
                            <div
                              className="w-1 bg-blue-500 rounded-full"
                              style={{
                                animation: "wave 0.6s ease-in-out infinite 0.1s",
                                height: "100%",
                              }}
                            />
                            <div
                              className="w-1 bg-blue-500 rounded-full"
                              style={{
                                animation: "wave 0.6s ease-in-out infinite 0.2s",
                                height: "40%",
                              }}
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-blue-300 group-hover:text-blue-500 transition-colors">
                            {index + 1}
                          </span>
                        )}
                      </div>

                      {/* Track name */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-sm font-medium truncate",
                            currentIndex === index
                              ? "text-blue-600"
                              : "text-blue-900"
                          )}
                        >
                          {track.name}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom scrollbar styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59,130,246,0.2);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59,130,246,0.4);
        }
      `}</style>
    </div>
  );
}
