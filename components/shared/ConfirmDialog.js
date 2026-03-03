'use client'

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'

/**
 * ConfirmDialog – a reusable modal confirmation that replaces native window.confirm().
 *
 * Usage:
 *   const [confirm, setConfirm] = useState(null)
 *   // When you want to ask: setConfirm({ title, description, onConfirm })
 *   <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
 *
 * @param {object} config   - { title, description, onConfirm }
 * @param {function} onClose - called when the dialog should be dismissed
 */
export function ConfirmDialog({ config, onClose }) {
    if (!config) return null
    return (
        <AlertDialog open={!!config} onOpenChange={(open) => { if (!open) onClose() }}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{config.title || 'Are you sure?'}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {config.description || 'This action cannot be undone.'}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => { config.onConfirm(); onClose() }}
                    >
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
