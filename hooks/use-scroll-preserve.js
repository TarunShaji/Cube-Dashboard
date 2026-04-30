import { useRef, useCallback } from 'react'

/**
 * useScrollPreserve
 *
 * Attach `scrollRef` to the scrollable container element.
 * Call `saveScroll()` before triggering a reload, then
 * `restoreScroll()` after the new data has been set.
 *
 * Uses requestAnimationFrame so the restore runs after
 * React has committed the new DOM to the screen.
 */
export function useScrollPreserve() {
    const scrollRef = useRef(null)
    const savedTop = useRef(0)

    const saveScroll = useCallback(() => {
        if (scrollRef.current) {
            savedTop.current = scrollRef.current.scrollTop
        }
    }, [])

    const restoreScroll = useCallback(() => {
        requestAnimationFrame(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = savedTop.current
            }
        })
    }, [])

    return { scrollRef, saveScroll, restoreScroll }
}
