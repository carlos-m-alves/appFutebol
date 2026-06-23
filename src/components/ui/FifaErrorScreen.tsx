import { X, Swords } from 'lucide-react'

interface FifaErrorScreenProps {
  open: boolean
  title: string
  message: string
  onDismiss: () => void
  actionLabel?: string
  onAction?: () => void
}

export function FifaErrorScreen({
  open,
  title,
  message,
  onDismiss,
  actionLabel,
  onAction,
}: FifaErrorScreenProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-black/80 backdrop-blur-sm" onClick={onDismiss} />
      <div className="relative bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a] border border-[#e94560]/30 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#e94560] via-[#ff6b6b] to-[#e94560]" />

        <button onClick={onDismiss}
          className="absolute top-3 right-3 text-gray-500 hover:text-white transition z-10">
          <X size={18} />
        </button>

        <div className="p-8 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#e94560]/20 to-[#ff6b6b]/10 flex items-center justify-center mb-5 border-2 border-[#e94560]/40">
            <Swords size={36} className="text-[#e94560]" />
          </div>

          <h2 className="text-xl font-black text-white mb-2 uppercase tracking-wide">
            {title}
          </h2>

          <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-[#e94560] to-transparent mb-4" />

          <p className="text-sm text-gray-400 leading-relaxed mb-6">
            {message}
          </p>

          <div className="flex gap-3 w-full">
            {actionLabel && onAction && (
              <button onClick={onAction}
                className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-[#e94560] to-[#ff6b6b] text-white text-sm font-bold uppercase tracking-wider hover:from-[#ff6b6b] hover:to-[#e94560] transition shadow-lg shadow-[#e94560]/20">
                {actionLabel}
              </button>
            )}
            <button onClick={onDismiss}
              className={`${actionLabel ? 'flex-1' : 'w-full'} px-4 py-3 rounded-lg border border-gray-700 text-gray-300 text-sm font-medium hover:bg-gray-800 transition`}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
