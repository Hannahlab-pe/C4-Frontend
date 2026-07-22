import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { X } from 'lucide-react'

interface AppDialogProps {
  open: boolean
  onClose: () => void
  title: string
  wide?: boolean
  size?: 'md' | 'wide' | 'xl'
  children: React.ReactNode
}

export default function AppDialog({ open, onClose, title, wide, size, children }: AppDialogProps) {
  const widthCls = size === 'xl' ? 'max-w-3xl' : (size === 'wide' || wide) ? 'max-w-2xl' : 'max-w-lg'
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition duration-200 ease-out data-closed:opacity-0"
      />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <DialogPanel
          transition
          className={`w-full ${widthCls} bg-white rounded-2xl shadow-xl max-h-[90vh] flex flex-col transition duration-200 ease-out data-closed:scale-95 data-closed:opacity-0`}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
            <DialogTitle className="font-semibold text-slate-800">{title}</DialogTitle>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-6 py-5 overflow-y-auto">
            {children}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
