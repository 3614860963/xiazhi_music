import { useState, useEffect } from "react";
import { Shield, Check, Music } from "lucide-react";

const STORAGE_KEY = "music-player-disclaimer-acknowledged";
const COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours

interface DisclaimerModalProps {
  onConfirm: () => void;
}

export function DisclaimerModal({ onConfirm }: DisclaimerModalProps) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const acknowledgedAt = localStorage.getItem(STORAGE_KEY);
    if (acknowledgedAt) {
      const elapsed = Date.now() - parseInt(acknowledgedAt, 10);
      if (elapsed < COOLDOWN_MS) return; // still within cooldown
    }
    // Show after a short delay for entrance animation
    const timer = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleConfirm = () => {
    setExiting(true);
    setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
      setVisible(false);
      onConfirm();
    }, 300);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        animation: exiting ? "fadeOut 0.3s ease-out forwards" : "fadeIn 0.4s ease-out forwards",
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background: "rgba(30, 58, 138, 0.3)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
        onClick={handleConfirm}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.6) 100%)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.6)",
          boxShadow:
            "0 24px 48px rgba(30,58,138,0.15), 0 8px 16px rgba(30,58,138,0.1), inset 0 1px 0 rgba(255,255,255,0.8)",
          animation: exiting
            ? "scaleOut 0.3s ease-in forwards"
            : "scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
      >
        {/* Shimmer */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
          <div
            className="absolute top-0 left-0 w-1/2 h-full"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
              animation: "shimmer 3s ease-in-out infinite",
            }}
          />
        </div>

        <div className="relative z-10 p-6 md:p-8">
          {/* Icon */}
          <div className="flex justify-center mb-5">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(96,165,250,0.1) 100%)",
                border: "1px solid rgba(59,130,246,0.2)",
              }}
            >
              <Shield className="w-7 h-7 text-blue-500" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-center text-blue-950 mb-2">
            使用声明
          </h2>
          <p className="text-sm text-center text-blue-400 mb-6">
            使用前请阅读并确认以下内容
          </p>

          {/* Content */}
          <div
            className="rounded-xl p-4 mb-6 space-y-3 text-sm leading-relaxed"
            style={{
              background: "rgba(59,130,246,0.06)",
              border: "1px solid rgba(59,130,246,0.1)",
            }}
          >
            <div className="flex gap-3">
              <Music className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-blue-800">
                本播放器为纯前端本地应用，<strong>不会上传、存储或分享</strong>您的任何音频文件，所有数据仅在您的浏览器中处理。
              </p>
            </div>
            <div className="flex gap-3">
              <Shield className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-blue-800">
                请确保您对所播放的音乐拥有合法使用权。本工具仅供个人学习与娱乐，请勿用于传播未经授权的版权内容。
              </p>
            </div>
            <div className="flex gap-3">
              <Check className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-blue-800">
                关闭页面后播放列表将自动清空，不会在本地保留任何记录。
              </p>
            </div>
          </div>

          {/* Confirm Button */}
          <button
            onClick={handleConfirm}
            className="w-full py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background:
                "linear-gradient(135deg, rgba(59,130,246,0.9) 0%, rgba(96,165,250,0.9) 100%)",
              boxShadow: "0 4px 16px rgba(59,130,246,0.35)",
            }}
          >
            我已了解，开始使用
          </button>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.92) translateY(12px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes scaleOut {
          from { opacity: 1; transform: scale(1) translateY(0); }
          to { opacity: 0; transform: scale(0.92) translateY(12px); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%) rotate(25deg); }
          100% { transform: translateX(200%) rotate(25deg); }
        }
      `}</style>
    </div>
  );
}
