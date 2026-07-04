import { useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { QrCode, Copy, Download, X } from 'lucide-react'

interface QRCodeModalProps {
  groupName: string
  accessCode: string
  onClose: () => void
}

export function QRCodeModal({ groupName, accessCode, onClose }: QRCodeModalProps) {
  const qrRef = useRef<HTMLCanvasElement>(null)
  const joinUrl = `${window.location.origin}/groups/join?code=${accessCode}`

  function handleCopyLink() {
    navigator.clipboard.writeText(joinUrl)
  }

  function handleDownload() {
    const canvas = qrRef.current
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `peladafc-${accessCode}.png`
    a.click()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm z-10" onClick={e => e.stopPropagation()}>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-yellow-500/30 shadow-[0_0_60px_rgba(0,0,0,0.6)] shadow-yellow-500/10">
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-gradient-to-br from-yellow-500/15 to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-gradient-to-br from-yellow-500/5 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500/60 to-transparent" />

          <div className="relative px-6 pt-8 pb-6 text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/30">
              <QrCode size={28} className="text-[#0a0e17]" />
            </div>

            <h2 className="text-white font-black text-xl mb-2 tracking-tight">
              Compartilhar Grupo
            </h2>

            <p className="text-yellow-400/80 font-bold text-sm mb-4 uppercase tracking-wider">
              {groupName}
            </p>

            {/* QR Code */}
            <div className="flex justify-center mb-4">
              <div className="bg-white p-3 rounded-xl">
                <QRCodeCanvas ref={qrRef} value={joinUrl} size={180} level="M" />
              </div>
            </div>

            {/* Access Code */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="text-[10px] text-gray-600 uppercase tracking-[0.15em]">Código</span>
              <span className="font-mono font-bold text-yellow-400/80 text-sm bg-yellow-500/10 px-3 py-1 rounded-md border border-yellow-500/20">
                {accessCode}
              </span>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 mb-3">
              <button onClick={handleCopyLink}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.06] text-white/80 font-bold text-sm hover:bg-white/[0.10] transition-all duration-200 border border-white/[0.08]">
                <Copy size={16} /> Copiar Link
              </button>
              <button onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.06] text-white/80 font-bold text-sm hover:bg-white/[0.10] transition-all duration-200 border border-white/[0.08]">
                <Download size={16} /> PNG
              </button>
            </div>

            <button onClick={onClose}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-[#0a0e17] font-black text-sm hover:from-yellow-400 hover:to-amber-500 transition-all duration-200 shadow-lg shadow-yellow-500/25 flex items-center justify-center gap-2">
              <X size={16} /> Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
