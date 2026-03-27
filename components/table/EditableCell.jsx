'use client'

import { useEffect, useState, useRef } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { statusColors, priorityColors, approvalColors, topicApprovalColors, blogStatusColors } from '@/lib/constants'

export function EditableCell({ value, type = 'text', options = [], onSave, placeholder = '—', disabled = false }) {
    const [editing, setEditing] = useState(false)
    const [val, setVal] = useState(value || '')
    const inputRef = useRef(null)

    useEffect(() => setVal(value || ''), [value])
    useEffect(() => { if (editing && inputRef.current) inputRef.current.focus() }, [editing])

    const save = () => { setEditing(false); if (val !== (value || '')) onSave(val) }

    // ── Expandable textarea type — modal overlay for long-text fields ──────────
    if (type === 'expandable') {
        return (
            <>
                <div
                    onClick={() => !disabled && setEditing(true)}
                    className={`rounded px-1 py-0.5 min-h-[24px] w-full transition-all overflow-hidden ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-blue-50 hover:ring-1 hover:ring-blue-200'}`}
                    title={disabled ? 'Disabled' : (val || 'Click to edit')}
                >
                    <span className="text-xs text-gray-700 line-clamp-2 block">{val || <span className="text-gray-300">—</span>}</span>
                </div>
                {editing && !disabled && (
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
                        onClick={save}
                    >
                        <div
                            className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6"
                            onClick={e => e.stopPropagation()}
                        >
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
                                <button
                                    type="button"
                                    onClick={() => { setVal(value || ''); setEditing(false) }}
                                    className="flex-1 h-9 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={save}
                                    className="flex-1 h-9 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        )
    }

    if (editing && !disabled) {
        if (type === 'select' || type === 'status' || type === 'priority' || type === 'approval' || type === 'internal_approval' || type === 'topic_approval' || type === 'blog_status' || type === 'blog_approval') {
            return (
                <Select
                    value={val || '__none__'}
                    onValueChange={v => {
                        const real = v === '__none__' ? '' : v
                        setVal(real); setEditing(false)
                        if (real !== (value || '')) onSave(real)
                    }}
                >
                    <SelectTrigger className="h-7 text-xs border-blue-400 min-w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__none__" className="text-xs text-gray-400">(none)</SelectItem>
                        {options.filter(o => o !== '').map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
                    </SelectContent>
                </Select>
            )
        }
        if (type === 'date') {
            return (
                <div className="flex flex-col gap-1">
                    <input
                        ref={inputRef}
                        type="date"
                        value={val}
                        onChange={e => setVal(e.target.value)}
                        onBlur={save}
                        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setVal(value || ''); setEditing(false) } }}
                        className="w-full px-2 py-1 text-xs border border-blue-400 rounded shadow-sm bg-white focus:outline-none min-w-[80px]"
                    />
                    {val && (
                        <button
                            type="button"
                            onMouseDown={e => {
                                e.preventDefault()
                                setEditing(false)
                                setVal('')
                                onSave(null)
                            }}
                            className="text-[10px] text-red-400 hover:text-red-600 text-left px-1 flex items-center gap-0.5 transition-colors"
                        >
                            × Clear date
                        </button>
                    )}
                </div>
            )
        }
        return (
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
        )
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
        return <span className={`text-xs truncate block ${disabled ? 'text-gray-400' : 'text-gray-700'}`} title={val}>{val || <span className="text-gray-300">—</span>}</span>
    }

    return (
        <div onClick={() => !disabled && setEditing(true)}
            className={`rounded px-1 py-0.5 min-h-[24px] w-full transition-all overflow-hidden ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-blue-50 hover:ring-1 hover:ring-blue-200'}`}
            title={disabled ? 'Disabled' : 'Click to edit'}>
            {display()}
        </div>
    )
}
