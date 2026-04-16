'use client'

import { useEffect, useState, useRef, useMemo, Suspense } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiFetch, swrFetcher } from '@/lib/middleware/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EditableCell } from '@/components/table/EditableCell'
import { LinkCell } from '@/components/table/LinkCell'
import { FileText, Plus, Trash2, Filter, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { safeJSON, safeArray } from '@/lib/safe'
import { Pagination } from '@/components/shared/Pagination'
import { ClientSwitcher } from '@/components/shared/ClientSwitcher'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

import {
  OUTLINE_STATUSES, TOPIC_APPROVALS, BLOG_APPROVALS, BLOG_STATUSES, CONTENT_INTERNAL_APPROVALS,
  INTERN_STATUSES, CONTENT_PRIORITIES,
  topicApprovalColors, blogStatusColors, approvalColors, internStatusColors, priorityColors, CONTENT_COLUMN_WIDTHS
} from '@/lib/constants'

function AddContentModal({ isOpen, onClose, clients, onAdd, isAdding }) {
  const mkEmpty = () => ({
    client_id: '',
    blog_title: '',
    week: '',
    primary_keyword: '',
    secondary_keywords: '',
    writer: '',
    required_by: '',
    search_volume: '',
    blog_status: '',
    intern_status: '',
    outline_link: '',
    blog_doc_link: '',
  })
  const [form, setForm] = useState(mkEmpty)
  useEffect(() => { if (isOpen) setForm(mkEmpty()) }, [isOpen])
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const canAdd = form.client_id && form.blog_title.trim()

  return (
    <Dialog open={isOpen} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Content Item</DialogTitle>
          <DialogDescription className="text-xs">Fill in the details below. Fields marked * are required.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          {/* Client */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Client <span className="text-red-500">*</span></label>
            <Select value={form.client_id || '__none__'} onValueChange={v => set('client_id', v === '__none__' ? '' : v)}>
              <SelectTrigger className="h-9 text-xs border-gray-200"><SelectValue placeholder="Select client…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-xs text-gray-400">Select client…</SelectItem>
                {safeArray(clients).map(c => <SelectItem key={c?.id} value={c?.id} className="text-xs">{c?.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Blog Title */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Blog Title <span className="text-red-500">*</span></label>
            <Input value={form.blog_title} onChange={e => set('blog_title', e.target.value)} placeholder="Topic / Blog Title…" className="h-9 text-xs border-gray-200" autoFocus />
          </div>

          {/* Week + Required By */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Week</label>
              <Input value={form.week || ''} onChange={e => set('week', e.target.value || null)} placeholder="e.g. W1, Week 1…" className="h-9 text-xs border-gray-200" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Required By</label>
              <Input type="date" value={form.required_by || ''} onChange={e => set('required_by', e.target.value || null)} className="h-9 text-xs border-gray-200" />
            </div>
          </div>

          {/* Primary Keyword + Search Volume */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Primary Keyword</label>
              <Input value={form.primary_keyword || ''} onChange={e => set('primary_keyword', e.target.value || null)} placeholder="Target keyword…" className="h-9 text-xs border-gray-200" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Search Volume</label>
              <Input type="number" value={form.search_volume || ''} onChange={e => set('search_volume', e.target.value || null)} placeholder="e.g. 1200" className="h-9 text-xs border-gray-200" />
            </div>
          </div>

          {/* Secondary Keywords */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Secondary Keywords</label>
            <Input value={form.secondary_keywords || ''} onChange={e => set('secondary_keywords', e.target.value || null)} placeholder="Comma-separated secondary keywords…" className="h-9 text-xs border-gray-200" />
          </div>

          {/* Writer + Intern Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Writer</label>
              <Input value={form.writer || ''} onChange={e => set('writer', e.target.value || null)} placeholder="Writer name…" className="h-9 text-xs border-gray-200" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Intern Status</label>
              <Select value={form.intern_status || '__none__'} onValueChange={v => set('intern_status', v === '__none__' ? '' : v)}>
                <SelectTrigger className="h-9 text-xs border-gray-200"><SelectValue placeholder="Status…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-xs text-gray-400">None</SelectItem>
                  {INTERN_STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Blog Status */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Blog Status</label>
            <Select value={form.blog_status || '__none__'} onValueChange={v => set('blog_status', v === '__none__' ? '' : v)}>
              <SelectTrigger className="h-9 text-xs border-gray-200"><SelectValue placeholder="Status…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-xs text-gray-400">Default (Draft)</SelectItem>
                {BLOG_STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Outline Link + Blog Doc Link */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Outline Link</label>
              <Input value={form.outline_link || ''} onChange={e => set('outline_link', e.target.value || null)} placeholder="https://…" className="h-9 text-xs border-gray-200" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Blog Doc Link</label>
              <Input value={form.blog_doc_link || ''} onChange={e => set('blog_doc_link', e.target.value || null)} placeholder="https://…" className="h-9 text-xs border-gray-200" />
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose} className="text-xs">Cancel</Button>
          <Button
            onClick={() => onAdd(form)}
            disabled={!canAdd || isAdding}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
          >
            {isAdding ? 'Adding…' : 'Add Content'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TitleModal({ value, onClose, onSave }) {
  const [local, setLocal] = useState(value || '')
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Blog Title</DialogTitle>
          <DialogDescription>View or edit the full blog title. Ctrl+Enter to save.</DialogDescription>
        </DialogHeader>
        <textarea
          autoFocus
          value={local}
          onChange={e => setLocal(e.target.value)}
          rows={4}
          placeholder="Enter blog title..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-y"
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { onSave(local); onClose() }
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onSave(local); onClose() }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const COL_ORDER_KEY = 'content_column_order_v6'
const DEFAULT_COL_ORDER = [
  'client', 'week', 'title', 'primary_keyword', 'search_volume', 'secondary_keyword',
  'topic_approval', 'content_priority', 'required_by',
  'writer', 'outline', 'intern_status',
  'blog_doc', 'blog_internal_approval', 'blog_status',
  'send_link', 'date_sent', 'blog_approval', 'approved_on', 'blog_feedback',
  'link', 'published', 'comments', 'actions'
]

function ContentCalendarContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Sync state with URL
  const filterClient = searchParams.get('client_id') || 'all'
  const filterStatus = searchParams.get('blog_status') || 'all'
  const filterWeek = searchParams.get('week') || ''
  const filterWriter = searchParams.get('writer') || ''
  const filterTopicApproval = searchParams.get('topic_approval') || 'all'
  const filterInternalApproval = searchParams.get('internal_approval') || 'all'
  const filterClientApproval = searchParams.get('client_approval') || 'all'
  const filterPublished = searchParams.get('published') || 'all'
  const filterSearch = searchParams.get('search') || ''
  const sortBy = searchParams.get('sort_by') || ''
  const sortDir = searchParams.get('sort_dir') === 'desc' ? 'desc' : 'asc'
  const page = parseInt(searchParams.get('page')) || 1

  const queryParams = new URLSearchParams(searchParams.toString())
  queryParams.delete('sort_by')
  queryParams.delete('sort_dir')
  queryParams.set('enrich', '0')
  if (!queryParams.get('limit')) queryParams.set('limit', '50')

  const { data: contentResponse, mutate: mutateContent, error: contentErr } = useSWR(`/api/content?${queryParams.toString()}`, swrFetcher)
  const { data: clientsData } = useSWR('/api/clients?lite=1', swrFetcher)

  const content = useMemo(() => safeArray(contentResponse?.data), [contentResponse])
  const pagination = useMemo(() => ({
    total: contentResponse?.total || 0,
    page: contentResponse?.page || 1,
    totalPages: contentResponse?.totalPages || 1
  }), [contentResponse])

  const clients = useMemo(() => safeArray(clientsData), [clientsData])
  const loading = !contentResponse && !contentErr
  const [saving, setSaving] = useState({})

  const [localSearch, setLocalSearch] = useState(filterSearch)
  const [showFilters, setShowFilters] = useState(true)
  const [columnOrder, setColumnOrder] = useState([])
  const sortConfig = useMemo(() => ({ field: sortBy || null, direction: sortDir }), [sortBy, sortDir])
  const [newContent, setNewContent] = useState({ blog_title: '', client_id: '' })
  const [addingContent, setAddingContent] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  // Title expand modal state: { value, contentId }
  const [titleModal, setTitleModal] = useState(null)

  const updateQueryParams = (updates) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value === 'all' || value === '') params.delete(key)
      else params.set(key, value)
    })
    if (!updates.page) params.delete('page')
    router.push(`/dashboard/content?${params.toString()}`)
  }

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filterSearch) {
        // Reset to page 1 when search changes
        updateQueryParams({ search: localSearch, page: 1 })
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [localSearch])

  useEffect(() => {
    // Bump to v6 to clear stale column orders
    localStorage.removeItem('content_column_order_v2')
    localStorage.removeItem('content_column_order_v3')
    localStorage.removeItem('content_column_order_v4')
    localStorage.removeItem('content_column_order_v5')

    const saved = localStorage.getItem(COL_ORDER_KEY)
    const parsed = safeJSON(saved)
    if (parsed && Array.isArray(parsed)) {
      // Merge: add new cols not in saved, remove obsolete ones
      const merged = parsed.filter(id => DEFAULT_COL_ORDER.includes(id))
      DEFAULT_COL_ORDER.forEach(id => { if (!merged.includes(id)) merged.push(id) })
      setColumnOrder(merged)
    } else {
      setColumnOrder(DEFAULT_COL_ORDER)
    }
  }, [])

  const updateContent = async (contentId, field, value) => {
    setSaving(s => ({ ...s, [contentId]: true }))
    const optimistic = content.map(c => c?.id === contentId ? { ...c, [field]: value } : c)
    // Preserve the paginated envelope — only replace the data array
    mutateContent({ ...contentResponse, data: optimistic }, false)
    const res = await apiFetch(`/api/content/${contentId}`, {
      method: 'PUT',
      body: JSON.stringify({
        [field]: value,
        updated_at: (content.find(c => c?.id === contentId))?.updated_at
      })
    })

    if (res.status === 409) {
      alert('Concurrency error: Content was modified by another user.')
      mutateContent()
    } else if (res.ok) {
      const updated = await res.json()
      mutateContent({ ...contentResponse, data: optimistic.map(c => c.id === contentId ? updated : c) }, false)
    } else {
      mutateContent()
    }
    setSaving(s => ({ ...s, [contentId]: false }))
  }

  const addContent = async (formData) => {
    if (!formData.blog_title.trim() || !formData.client_id) return
    setAddingContent(true)
    try {
      const body = { blog_title: formData.blog_title.trim(), client_id: formData.client_id }
      if (formData.week?.trim()) body.week = formData.week.trim()
      if (formData.primary_keyword?.trim()) body.primary_keyword = formData.primary_keyword.trim()
      if (formData.secondary_keywords?.trim()) body.secondary_keywords = formData.secondary_keywords.trim()
      if (formData.writer?.trim()) body.writer = formData.writer.trim()
      if (formData.required_by) body.required_by = formData.required_by
      if (formData.search_volume) body.search_volume = parseInt(formData.search_volume, 10) || null
      if (formData.blog_status) body.blog_status = formData.blog_status
      if (formData.intern_status) body.intern_status = formData.intern_status
      if (formData.outline_link?.trim()) body.outline_link = formData.outline_link.trim()
      if (formData.blog_doc_link?.trim()) body.blog_doc_link = formData.blog_doc_link.trim()

      const res = await apiFetch('/api/content', {
        method: 'POST',
        body: JSON.stringify(body)
      })
      if (res.ok) {
        setShowAddModal(false)
        mutateContent()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to add content')
      }
    } catch (e) {
      console.error('Add content failed', e)
    }
    setAddingContent(false)
  }

  const publishContent = async (contentId) => {
    const item = content.find(c => c?.id === contentId)
    setSaving(s => ({ ...s, [contentId]: true }))
    try {
      const res = await apiFetch(`/api/content/${contentId}/publish`, {
        method: 'POST',
        body: JSON.stringify({ updated_at: item?.updated_at })
      })
      if (!res.ok) {
        const error = await res.json()
        alert(error.error || 'Publish failed')
        mutateContent()
      } else {
        const data = await res.json()
        if (data.content) {
          // Preserve envelope so the page does not go blank
          mutateContent({ ...contentResponse, data: content.map(c => c.id === contentId ? data.content : c) }, false)
        }
      }
    } catch (e) {
      console.error('Publish failed', e)
    }
    setSaving(s => ({ ...s, [contentId]: false }))
  }

  const deleteContent = (contentId) => {
    setConfirmConfig({
      title: 'Delete Content Item',
      description: 'This will permanently delete this blog content item. This cannot be undone.',
      onConfirm: async () => {
        await apiFetch(`/api/content/${contentId}`, { method: 'DELETE' })
        mutateContent()
      }
    })
  }

  const clientMap = useMemo(() => Object.fromEntries(clients.map(c => [c?.id, c?.name])), [clients])
  const getDateValue = (value) => {
    if (!value) return Number.NaN
    if (value instanceof Date) return value.getTime()
    const str = String(value).trim()
    if (!str) return Number.NaN
    const direct = Date.parse(str)
    if (!Number.isNaN(direct)) return direct
    const ddmmyyyy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
    if (ddmmyyyy) {
      const day = Number(ddmmyyyy[1])
      const month = Number(ddmmyyyy[2]) - 1
      let year = Number(ddmmyyyy[3])
      if (year < 100) year += 2000
      return new Date(year, month, day).getTime()
    }
    return Number.NaN
  }

  const getSortableValue = (item, sortField) => {
    if (!item || !sortField) return ''
    if (sortField === 'client_name') return clientMap[item.client_id] || ''
    if (['required_by', 'published_date', 'blog_approval_date', 'date_sent_for_approval'].includes(sortField)) return getDateValue(item[sortField])
    return item[sortField] ?? ''
  }

  const filtered = useMemo(() => {
    if (!sortConfig.field) return content
    const factor = sortConfig.direction === 'asc' ? 1 : -1
    return [...content].sort((a, b) => {
      const aVal = getSortableValue(a, sortConfig.field)
      const bVal = getSortableValue(b, sortConfig.field)
      const aNum = typeof aVal === 'number'
      const bNum = typeof bVal === 'number'
      if (aNum && bNum) {
        const aNaN = Number.isNaN(aVal)
        const bNaN = Number.isNaN(bVal)
        if (aNaN && bNaN) return 0
        if (aNaN) return 1
        if (bNaN) return -1
        return (aVal - bVal) * factor
      }
      return String(aVal).localeCompare(String(bVal), undefined, { sensitivity: 'base', numeric: true }) * factor
    })
  }, [content, sortConfig, clientMap])


  const handleSort = (field) => {
    if (!field) return
    const nextDirection = sortConfig.field === field && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    updateQueryParams({ sort_by: field, sort_dir: nextDirection, page: 1 })
  }

  const ColumnHeader = ({ id, label, sortField }) => {
    const isSticky = id === 'title'
    const style = {
      width: CONTENT_COLUMN_WIDTHS[id] || 'auto',
      minWidth: CONTENT_COLUMN_WIDTHS[id] || 'auto',
      ...(isSticky ? { position: 'sticky', left: '55px', background: '#f9fafb', zIndex: 20, borderRight: '1px solid #f3f4f6' } : {})
    }
    return (
      <th style={style} className="text-left px-3 py-2.5 font-semibold text-gray-600 bg-gray-50 border-r border-gray-100 last:border-0">
        <div className="flex items-center gap-1 overflow-hidden">
          <button
            type="button"
            onClick={() => handleSort(sortField)}
            className={`truncate inline-flex items-center gap-1 ${sortField ? 'cursor-pointer hover:text-gray-900' : 'cursor-default'}`}
            title={label}
            disabled={!sortField}
          >
            <span className="truncate">{label}</span>
            {sortField && (
              sortConfig.field === sortField
                ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 flex-shrink-0" /> : <ArrowDown className="w-3 h-3 flex-shrink-0" />)
                : <ArrowUpDown className="w-3 h-3 flex-shrink-0 text-gray-400" />
            )}
          </button>
        </div>
      </th>
    )
  }

  const SortableRow = ({ item, rowIndex }) => {
    if (!item?.id) return null
    const serialNum = (pagination.page - 1) * 50 + rowIndex + 1
    return (
      <tr className="hover:bg-gray-50 group border-b border-gray-100">
        {/* Serial number — always leftmost, not draggable */}
        <td className="px-2 py-1.5 text-center text-gray-400 font-mono text-[11px] bg-white border-r border-gray-100 select-none"
          style={{ width: CONTENT_COLUMN_WIDTHS.serial, minWidth: CONTENT_COLUMN_WIDTHS.serial, position: 'sticky', left: 0, background: '#fff', zIndex: 20 }}>
          {serialNum}
        </td>
        {safeArray(columnOrder).map(colId => {
          const isSticky = colId === 'title'
          const stickyStyle = isSticky ? { position: 'sticky', left: '55px', background: '#fff', zIndex: 20, borderRight: '1px solid #f3f4f6', boxShadow: '4px 0 8px -4px rgba(0,0,0,0.1)' } : {}
          return (
            <td key={colId} className={`px-3 py-1.5 overflow-hidden ${colId === 'blog_internal_approval' || colId === 'send_link' ? 'bg-gray-50/50' : ''}`}
              style={{ width: CONTENT_COLUMN_WIDTHS[colId], minWidth: CONTENT_COLUMN_WIDTHS[colId], ...stickyStyle }}>
              {colId === 'client' && (
                <div className="flex items-center gap-2">
                  <Link href={`/dashboard/clients/${item?.client_id}`} className="text-xs text-blue-600 hover:underline font-medium">
                    {clients.find(c => c.id === item?.client_id)?.name || clientMap[item?.client_id] || 'Unknown'}
                  </Link>
                </div>
              )}
              {colId === 'week' && <EditableCell value={item.week} onSave={v => updateContent(item.id, 'week', v)} placeholder="Week" />}
              {colId === 'title' && (
                <div
                  className="cursor-pointer px-1 py-0.5 rounded hover:bg-blue-50 hover:ring-1 hover:ring-blue-200 transition-all min-h-[24px] w-full"
                  onClick={() => setTitleModal({ value: item.blog_title || '', contentId: item.id })}
                  title={item.blog_title || 'Click to view/edit title'}
                >
                  <span className="text-xs text-gray-700 truncate block">{item.blog_title || <span className="text-gray-300">—</span>}</span>
                </div>
              )}
              {colId === 'primary_keyword' && <EditableCell value={item.primary_keyword} onSave={v => updateContent(item.id, 'primary_keyword', v)} placeholder="Primary Keyword" />}
              {colId === 'secondary_keyword' && <EditableCell value={item.secondary_keywords} onSave={v => updateContent(item.id, 'secondary_keywords', v)} placeholder="Secondary Keyword" />}
              {colId === 'writer' && <EditableCell value={item.writer} onSave={v => updateContent(item.id, 'writer', v)} placeholder="Writer" />}
              {colId === 'search_volume' && <EditableCell value={item.search_volume != null ? String(item.search_volume) : ''} onSave={v => updateContent(item.id, 'search_volume', v ? parseInt(v.replace(/,/g, ''), 10) : null)} placeholder="Vol" />}
              {colId === 'outline' && <LinkCell value={item.outline_link} onSave={v => updateContent(item.id, 'outline_link', v)} />}
              {colId === 'intern_status' && (
                <select
                  value={item.intern_status || ''}
                  onChange={e => updateContent(item.id, 'intern_status', e.target.value || null)}
                  className={`text-[10px] px-2 py-1 rounded-full border font-medium appearance-none cursor-pointer ${internStatusColors[item.intern_status] || 'bg-gray-50 text-gray-400 border-gray-200'}`}
                >
                  <option value="">— None —</option>
                  {INTERN_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
              {colId === 'required_by' && <EditableCell value={item.required_by} type="date" onSave={v => updateContent(item.id, 'required_by', v)} />}
              {colId === 'topic_approval' && <EditableCell value={item.topic_approval_status || 'Pending'} type="topic_approval" options={TOPIC_APPROVALS} onSave={v => updateContent(item.id, 'topic_approval_status', v)} />}
              {colId === 'content_priority' && (
                <EditableCell
                  value={item.content_priority}
                  type="priority"
                  options={CONTENT_PRIORITIES}
                  onSave={v => updateContent(item.id, 'content_priority', v || null)}
                />
              )}
              {colId === 'blog_status' && <EditableCell value={item.blog_status || 'Draft'} type="blog_status" options={BLOG_STATUSES} onSave={v => updateContent(item.id, 'blog_status', v)} />}
              {colId === 'blog_internal_approval' && (
                <EditableCell
                  value={item.blog_internal_approval || 'Pending'}
                  type="internal_approval"
                  options={CONTENT_INTERNAL_APPROVALS}
                  disabled={!item.blog_doc_link}
                  onSave={v => updateContent(item.id, 'blog_internal_approval', v)}
                />
              )}
              {colId === 'send_link' && (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant={item.client_link_visible_blog ? 'ghost' : 'default'}
                    className={`h-7 px-2 text-[10px] uppercase tracking-wider font-bold ${item.client_link_visible_blog ? 'text-green-600 cursor-default' : ''}`}
                    disabled={
                      item.blog_internal_approval !== 'Approved' ||
                      !item.blog_doc_link ||
                      item.client_link_visible_blog === true
                    }
                    onClick={() => setConfirmConfig({
                      title: 'Send to Client Portal',
                      description: 'This will make the blog document visible to the client on their portal. Please confirm before proceeding.',
                      onConfirm: () => publishContent(item.id),
                      confirmText: 'Send to Client',
                      confirmClass: 'bg-blue-600 hover:bg-blue-700 text-white'
                    })}
                  >
                    {item.client_link_visible_blog ? 'Sent' : 'Send Link'}
                  </Button>
                  {item.client_link_visible_blog && (
                    <button
                      title="Unsend — remove from client portal"
                      className="h-7 px-1.5 text-[10px] text-gray-400 hover:text-red-500 hover:bg-red-50 rounded border border-transparent hover:border-red-100 transition-all"
                      onClick={() => setConfirmConfig({
                        title: 'Unsend from Client Portal',
                        description: 'This will hide the blog document from the client portal. The client will no longer be able to view or approve it until you send it again.',
                        onConfirm: () => updateContent(item.id, 'client_link_visible_blog', false),
                        confirmText: 'Unsend',
                        confirmClass: 'bg-red-600 hover:bg-red-700 text-white'
                      })}
                    >
                      Unsend
                    </button>
                  )}
                </div>
              )}
              {colId === 'blog_approval' && (
                <EditableCell value={item.blog_approval_status || 'Pending Review'} type="blog_approval" options={BLOG_APPROVALS} disabled={true} />
              )}
              {colId === 'approved_on' && (
                <span className="text-xs text-gray-500">{item.blog_approval_date || '—'}</span>
              )}
              {colId === 'blog_feedback' && (
                <div className="max-w-[160px]">
                  {item.blog_approval_status === 'Changes Required' ? (
                    <div className="text-[10px] text-red-600 bg-red-50 p-1 rounded border border-red-100 line-clamp-2" title={item.blog_client_feedback_note}>
                      {item.blog_client_feedback_note || 'Changes requested'}
                    </div>
                  ) : <span className="text-gray-300 text-xs">—</span>}
                </div>
              )}
              {colId === 'blog_doc' && <LinkCell value={item.blog_doc_link} onSave={v => updateContent(item.id, 'blog_doc_link', v)} />}
              {colId === 'link' && <LinkCell value={item.blog_link} onSave={v => updateContent(item.id, 'blog_link', v)} />}
              {colId === 'published' && <EditableCell value={item.published_date} type="date" onSave={v => updateContent(item.id, 'published_date', v)} />}
              {colId === 'date_sent' && (
                <span className="text-xs text-gray-500">{item.date_sent_for_approval || '—'}</span>
              )}
              {colId === 'comments' && <EditableCell value={item.comments} onSave={v => updateContent(item.id, 'comments', v)} placeholder="Notes..." />}
              {colId === 'actions' && (
                <button onClick={() => deleteContent(item.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-red-400 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </td>
          )
        })}
      </tr>
    )
  }

  const columnLabels = {
    client: 'Client', week: 'Week', title: 'Blog Title',
    primary_keyword: 'Primary Keyword', secondary_keyword: 'Secondary Keyword',
    writer: 'Writer', search_volume: 'Search Vol.', outline: 'Outline',
    intern_status: 'Intern Status', required_by: 'Required By',
    content_priority: 'Priority', topic_approval: 'Topic Approval', blog_status: 'Blog Status',
    blog_doc: 'Blog Doc', blog_internal_approval: 'Internal Approval', send_link: 'Send Link',
    date_sent: 'Sent For Appr.',
    blog_approval: 'Client Approval', approved_on: 'Approved On', blog_feedback: 'Feedback',
    link: 'Blog Link', published: 'Published', comments: 'Notes', actions: ''
  }
  const columnSortFields = {
    client: 'client_name',
    week: 'week',
    title: 'blog_title',
    primary_keyword: 'primary_keyword',
    secondary_keyword: 'secondary_keywords',
    writer: 'writer',
    outline: 'outline_link',
    intern_status: 'intern_status',
    search_volume: 'search_volume',
    topic_approval: 'topic_approval_status',
    blog_status: 'blog_status',
    blog_doc: 'blog_doc_link',
    blog_internal_approval: 'blog_internal_approval',
    date_sent: 'date_sent_for_approval',
    blog_approval: 'blog_approval_status',
    approved_on: 'blog_approval_date',
    blog_feedback: 'blog_client_feedback_note',
    link: 'blog_link',
    required_by: 'required_by',
    published: 'published_date'
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Calendar</h1>
          <p className="text-sm text-gray-500 mt-1">Manage blog content across all clients</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-1">
          <Filter className="w-4 h-4" /> Filters
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-5">
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{pagination.total}</div>
          <div className="text-xs text-gray-500 mt-1">Total Posts</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{contentResponse?.stats?.published || 0}</div>
          <div className="text-xs text-gray-500 mt-1">Published</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{contentResponse?.stats?.inProgress || 0}</div>
          <div className="text-xs text-gray-500 mt-1">In Progress</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-400">{contentResponse?.stats?.drafts || 0}</div>
          <div className="text-xs text-gray-500 mt-1">Drafts</div>
        </div>
      </div>

      <ClientSwitcher
        clients={clients}
        activeId={filterClient}
        onSelect={(id) => updateQueryParams({ client_id: id })}
      />

      <div className="mb-4">
        <Button
          onClick={() => setShowAddModal(true)}
          className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Content
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4 p-3 bg-white border border-gray-200 rounded-lg items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <Input
            type="text" placeholder="Search blog titles..."
            value={localSearch} onChange={e => setLocalSearch(e.target.value)}
            className="h-8 text-xs pl-8 w-60 border-gray-200"
          />
        </div>

        {showFilters && (
          <>
            <Input
              type="text" placeholder="Week..."
              value={filterWeek} onChange={e => updateQueryParams({ week: e.target.value })}
              className="w-24 h-8 text-xs border-gray-200"
            />
            <Input
              type="text" placeholder="Writer..."
              value={filterWriter} onChange={e => updateQueryParams({ writer: e.target.value })}
              className="w-32 h-8 text-xs border-gray-200"
            />
            <Select value={filterTopicApproval} onValueChange={v => updateQueryParams({ topic_approval: v })}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Topic Appr." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Topic Appr.</SelectItem>
                {TOPIC_APPROVALS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={v => updateQueryParams({ blog_status: v })}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Blog Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Status</SelectItem>
                {BLOG_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterInternalApproval} onValueChange={v => updateQueryParams({ internal_approval: v })}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Int. Appr." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Int. Appr.</SelectItem>
                {CONTENT_INTERNAL_APPROVALS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterClientApproval} onValueChange={v => updateQueryParams({ client_approval: v })}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Client Appr." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Client Appr.</SelectItem>
                {BLOG_APPROVALS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterPublished} onValueChange={v => updateQueryParams({ published: v })}>
              <SelectTrigger className="w-28 h-8 text-xs"><SelectValue placeholder="Published?" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Publish</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}
        {(filterSearch || filterClient !== 'all' || filterStatus !== 'all' || filterWeek || filterWriter || filterTopicApproval !== 'all' || filterInternalApproval !== 'all' || filterClientApproval !== 'all' || filterPublished !== 'all') && (
          <button onClick={() => {
            updateQueryParams({
              client_id: 'all', blog_status: 'all', week: '', writer: '',
              topic_approval: 'all', internal_approval: 'all', client_approval: 'all',
              published: 'all', search: ''
            })
            setLocalSearch('')
          }} className="text-xs text-gray-400 hover:text-gray-600 underline ml-1">Clear</button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-auto shadow-sm text-xs" style={{ maxHeight: 'calc(100vh - 220px)' }}>
          <table className="w-full text-sm" style={{ minWidth: '2500px', tableLayout: 'fixed' }}>
            <thead className="sticky top-0 z-30 bg-gray-50">
              {/* Serial number fixed header */}
                <tr className="border-b border-gray-100 bg-gray-50/80 text-xs">
                  <th className="px-2 py-2.5 text-center text-gray-400 font-semibold bg-gray-50 border-r border-gray-100"
                    style={{ width: CONTENT_COLUMN_WIDTHS.serial, minWidth: CONTENT_COLUMN_WIDTHS.serial, position: 'sticky', left: 0, zIndex: 15 }}>
                    #
                  </th>
                  {columnOrder.map(colId => (
                    <ColumnHeader key={colId} id={colId} label={columnLabels[colId] || colId} sortField={columnSortFields[colId]} />
                  ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs">
              {loading ? (
                <tr><td colSpan={columnOrder.length} className="py-16 text-center text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={columnOrder.length} className="py-16 text-center text-gray-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                    {content.length === 0 ? 'No content calendar items yet.' : 'No items match your filters.'}
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => <SortableRow key={item.id} item={item} rowIndex={idx} />)
              )}
            </tbody>
          </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-gray-400">
          Drag headers to reorder columns
        </div>
        <Pagination
          total={pagination.total}
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={p => updateQueryParams({ page: p })}
        />
      </div>
      <ConfirmDialog config={confirmConfig} onClose={() => setConfirmConfig(null)} />
      <AddContentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        clients={clients}
        onAdd={addContent}
        isAdding={addingContent}
      />
      {titleModal && (
        <TitleModal
          key={titleModal.contentId}
          value={titleModal.value}
          onClose={() => setTitleModal(null)}
          onSave={(val) => { updateContent(titleModal.contentId, 'blog_title', val || ''); setTitleModal(null) }}
        />
      )}
    </div>
  )
}

export default function ContentCalendarPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400">Loading...</div>}>
      <ContentCalendarContent />
    </Suspense>
  )
}
