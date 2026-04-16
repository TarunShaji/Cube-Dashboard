'use client'

import { useEffect, useState, useRef } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { statusColors, priorityColors, approvalColors, topicApprovalColors, blogStatusColors } from '@/lib/constants'

/** Format a stored YYYY-MM-DD date string for display as DD-MM-YYYY */
function fmtDate(v) {
    if (!v) return ''
    const s = String(v).trim()
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m) return `${m[3]}-${m[2]}-${m[1]}`
    return s
}

const SELECT_TYPES = new Set(['select', 'status', 'priority', 'approval', 'internal_approval', 'topic_approval', 'blog_status', 'blog_approval'])

export function EditableCell({ value, type = 'text', options = [], onSave, placeholder = '—', disabled = false }) {
    const [editing, setEditing] = useState(false)
    const [val, setVal] = useState(value || '')
    const inputRef = useRef(null)
    // containerRef is on the OUTERMOST wrapper — always in the DOM regardless of editing state.
    // This lets us move focus here BEFORE unmounting the Select, which prevents the browser
    // from falling back to <body> and triggering a scrollIntoView that scrolls <main> to top.
    const containerRef = useRef(null)

    useEffect(() => setVal(value || ''), [value])
    useEffect(() => { if (editing && inputRef.current) inputRef.current.focus() }, [editing])

    const save = () => { setEditing(false); if (val !== (value || '')) onSave(val) }

    const closeSelect = (newVal) => {
        // Step 1: move focus to our container WHILE Select is still mounted.
        // This means when setEditing(false) unmounts the Select, focus is already
        // on the container — not on <body> — so no scrollIntoView fires.
        containerRef.current?.focus()
        const real = newVal === '__none__' ? '' : newVal
        setVal(real)
        setEditing(false)
        if (real !== (value || '')) onSave(real)
    }

    const display = () => {
        if (type === 'status') return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap ${statusColors[val] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                {val || <span className="text-gray-300">—</span>}
            </span>
        )
        if (type === 'priority') return (
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${priorityColors[val] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                {val || <span className="text-gray-300">—</span>}
            </span>
        )
        if (type === 'approval' || type === 'blog_approval') return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap ${approvalColors[val] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                {val === null ? 'Pending Review' : (val || 'Pending Review')}
            </span>
        )
        if (type === 'internal_approval') return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap ${val === 'Approved' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                {val || 'Pending'}
            </span>
        )
        if (type === 'topic_approval') return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap ${topicApprovalColors[val] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                {val || 'Pending'}
            </span>
        )
        if (type === 'blog_status') return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap ${blogStatusColors[val] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                {val || 'Draft'}
            </span>
        )
        if (type === 'date') {
            const d = fmtDate(val)
            return <span className={`text-xs truncate block ${disabled ? 'text-gray-400' : 'text-gray-700'}`} title={d}>{d || <span className="text-gray-300">—</span>}</span>
        }
        return <span className={`text-xs truncate block ${disabled ? 'text-gray-400' : 'text-gray-700'}`} title={val}>{val || <span className="text-gray-300">—</span>}</span>
    }

    // ── Expandable textarea — uses its own modal overlay, no scroll issue ───────
    if (type === 'expandable') {
        return (
            <>
                <div
                    onClick={() => !disabled && setEditing(true)}
                    className={`rounded px-1 py-0.5 min-h-[24px] w-full transition-all overflow-hidden ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-blue-50 hover:ring-1 hover:ring-blue-200'}`}
                    title={disabled ? 'Disabled' : (val || 'Click to edit')}
                >
                    <span className="text-xs text-gray-700 line-clamp-2">{val || <span className="text-gray-300">—</span>}</span>
                </div>
                {editing && !disabled && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={save}>
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                {placeholder !== '—' ? placeholder : 'Edit'}
                            </p>
                            <textarea
                                ref={inputRef}
                                value={val}
                                onChange={e => setVal(e.target.value)}
                                rows={8}
                                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-y"
                                autoFocus
                            />
                            <div className="flex gap-2 mt-4">
                                <button type="button" onClick={() => { setVal(value || ''); setEditing(false) }} className="flex-1 h-9 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                                <button type="button" onClick={save} className="flex-1 h-9 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Save</button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        )
    }

    // ── Date input ───────────────────────────────────────────────────────────────
    const toInputDate = (v) => {
        if (!v) return ''
        const s = String(v).trim()
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
        const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
        if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
        return ''
    }

    // ── All non-expandable types share a permanent outer wrapper ─────────────────
    // The outer div (containerRef) is ALWAYS in the DOM. For select types, closeSelect()
    // focuses it before unmounting the Select, so focus never falls through to <body>.
    return (
        <div ref={containerRef} tabIndex={-1} className="outline-none w-full">
            {editing && !disabled ? (
                <>
                    {SELECT_TYPES.has(type) && (
                        <Select value={val || '__none__'} onValueChange={closeSelect}>
                            <SelectTrigger className="h-7 text-xs border-blue-400 min-w-[120px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none__" className="text-xs text-gray-400">(none)</SelectItem>
                                {options.filter(o => o !== '').map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                    {type === 'date' && (
                        <div className="flex flex-col gap-1">
                            <input
                                ref={inputRef}
                                type="date"
                                value={toInputDate(val)}
                                onChange={e => setVal(e.target.value)}
                                onBlur={save}
                                onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setVal(value || ''); setEditing(false) } }}
                                className="w-full px-2 py-1 text-xs border border-blue-400 rounded shadow-sm bg-white focus:outline-none min-w-[80px]"
                            />
                            {toInputDate(val) && (
                                <button
                                    type="button"
                                    onMouseDown={e => { e.preventDefault(); setEditing(false); setVal(''); onSave(null) }}
                                    className="text-[10px] text-red-400 hover:text-red-600 text-left px-1 flex items-center gap-0.5 transition-colors"
                                >
                                    × Clear date
                                </button>
                            )}
                        </div>
                    )}
                    {!SELECT_TYPES.has(type) && type !== 'date' && (
                        <input
                            ref={inputRef}
                            type="text"
                            value={val}
                            onChange={e => setVal(e.target.value)}
                            onBlur={save}
                            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setVal(value || ''); setEditing(false) } }}
                            className="w-full px-2 py-1 text-xs border border-blue-400 rounded shadow-sm bg-white focus:outline-none min-w-[80px]"
                            placeholder={placeholder}
                        />
                    )}
                </>
            ) : (
                <div
                    onClick={() => !disabled && setEditing(true)}
                    className={`rounded px-1 py-0.5 min-h-[24px] w-full transition-all overflow-hidden ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-blue-50 hover:ring-1 hover:ring-blue-200'}`}
                    title={disabled ? 'Disabled' : 'Click to edit'}
                >
                    {display()}
                </div>
            )}
        </div>
    )
}
