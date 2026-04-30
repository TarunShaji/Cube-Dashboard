'use client'

import { useEffect, useState, useRef, useMemo, Suspense } from 'react'
import { useScrollPreserve } from '@/hooks/use-scroll-preserve'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiFetch } from '@/lib/middleware/auth'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Trash2, RefreshCw, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { safeJSON, safeArray } from '@/lib/safe'
import { EditableCell } from '@/components/table/EditableCell'
import { LinkCell } from '@/components/table/LinkCell'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Pagination } from '@/components/shared/Pagination'
import { ClientSwitcher } from '@/components/shared/ClientSwitcher'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { STATUSES, CATEGORIES, PRIORITIES, APPROVALS, INTERNAL_APPROVALS, SOCIAL_STATUSES, SOCIAL_INTERNAL_APPROVALS, statusColors, priorityColors, approvalColors, internalApprovalColors, socialInternalApprovalColors, TASK_COLUMN_WIDTHS, EMAIL_COLUMN_WIDTHS, PAID_COLUMN_WIDTHS, SOCIAL_COLUMN_WIDTHS, SOCIAL_FORMATS, TEAM_LABELS } from '@/lib/constants'

function CommentsModal({ value, label, onClose, onSave }) {
  const [localComment, setLocalComment] = useState(value || '')
  const title = label || 'Task Description'
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Add or edit text. Ctrl+Enter to save quickly.</DialogDescription>
        </DialogHeader>
        <textarea
          autoFocus
          value={localComment}
          onChange={e => setLocalComment(e.target.value)}
          rows={10}
          placeholder={`Write ${title.toLowerCase()}...`}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-y"
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { onSave(localComment || null); onClose() }
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onSave(localComment || null); onClose() }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FeedbackModal({ value, onClose }) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Client Feedback</DialogTitle>
          <DialogDescription>Feedback provided by the client on this task.</DialogDescription>
        </DialogHeader>
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 whitespace-pre-wrap max-h-72 overflow-y-auto">
          {value || 'No feedback provided.'}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function toAssignedIds(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter(Boolean)
  if (typeof raw === 'string' && raw.trim() !== '') return [raw]
  return []
}

function AssigneeCell({ task, members, memberMap, onSave }) {
  const ids = toAssignedIds(task?.assigned_to)
  const names = ids.map((id) => memberMap[id]).filter(Boolean)
  const label = names.length ? names.join(', ') : 'Unassigned'

  const setForMember = (memberId, checked) => {
    const nextSet = new Set(ids)
    if (checked) nextSet.add(memberId)
    else nextSet.delete(memberId)
    const next = [...nextSet]
    if (next.length === 0) onSave(null)
    else if (next.length === 1) onSave(next[0])
    else onSave(next)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="w-full text-left rounded px-1 py-0.5 min-h-[24px] hover:bg-blue-50 hover:ring-1 hover:ring-blue-200 transition-all">
          <span className={`text-xs truncate block ${names.length ? 'text-gray-700' : 'text-gray-300'}`} title={label}>
            {label}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs">Assign Members</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={ids.length === 0}
          onCheckedChange={(checked) => { if (checked) onSave(null) }}
          className="text-xs"
        >
          Unassigned
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {safeArray(members).map((m) => (
          <DropdownMenuCheckboxItem
            key={m?.id}
            checked={ids.includes(m?.id)}
            onCheckedChange={(checked) => setForMember(m?.id, checked)}
            className="text-xs"
          >
            {m?.name}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}


function AssignedMemberSelect({ value, members, onSave }) {
  const ids = value ? (Array.isArray(value) ? value : [value]) : []
  const names = ids.map(id => safeArray(members).find(m => m?.id === id)?.name).filter(Boolean)
  const label = names.length ? names.join(', ') : 'Unassigned'

  const setForMember = (memberId, checked) => {
    const nextSet = new Set(ids)
    if (checked) nextSet.add(memberId)
    else nextSet.delete(memberId)
    const next = [...nextSet]
    if (next.length === 0) onSave(null)
    else if (next.length === 1) onSave(next[0])
    else onSave(next)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={`h-9 w-full px-3 text-xs rounded-md border bg-white flex items-center gap-1.5 ${ids.length > 0 ? 'border-blue-400 text-blue-700 font-semibold' : 'border-gray-200 text-gray-400'}`}>
          <span className="truncate flex-1 text-left">{label}</span>
          <span className="text-gray-400 flex-shrink-0">▾</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 max-h-72 overflow-y-auto">
        <DropdownMenuLabel className="text-xs">Assign Members</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={ids.length === 0}
          onCheckedChange={(checked) => { if (checked) onSave(null) }}
          className="text-xs"
        >
          Unassigned
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {safeArray(members).map((m) => (
          <DropdownMenuCheckboxItem
            key={m?.id}
            checked={ids.includes(m?.id)}
            onCheckedChange={(checked) => setForMember(m?.id, checked)}
            className="text-xs"
          >
            {m?.name}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function buildAddTaskBody(srv, data, clientId) {
  const pick = v => (v != null && v !== '') ? v : undefined
  const base = { client_id: clientId }
  if (srv === 'social') {
    const body = { ...base }
    if (pick(data.format)) body.format = data.format
    if (pick(data.status)) body.status = data.status
    if (pick(data.reference_link)) body.reference_link = data.reference_link
    if (pick(data.visual_brief)) body.visual_brief = data.visual_brief
    if (pick(data.content)) body.content = data.content
    if (pick(data.caption)) body.caption = data.caption
    if (pick(data.posting_date)) body.posting_date = data.posting_date
    if (pick(data.internal_approval)) body.internal_approval = data.internal_approval
    if (data.assigned_to != null) body.assigned_to = data.assigned_to
    if (pick(data.comments)) body.comments = data.comments
    return body
  }
  const body = { ...base, title: data.title.trim() }
  if (pick(data.status)) body.status = data.status
  if (data.assigned_to != null) body.assigned_to = data.assigned_to
  if (pick(data.link_url)) body.link_url = data.link_url
  if (pick(data.comments)) body.comments = data.comments
  if (srv === 'seo') {
    if (pick(data.category)) body.category = data.category
    if (pick(data.priority)) body.priority = data.priority
    if (pick(data.eta_end)) body.eta_end = data.eta_end
  }
  if (srv === 'email') {
    if (pick(data.campaign_live_date)) body.campaign_live_date = data.campaign_live_date
    if (pick(data.live_data)) body.live_data = data.live_data
  }
  return body
}

function AddTaskModal({ isOpen, onClose, service, clients, members, onAdd, isAdding }) {
  const isSocial = service === 'social'
  const mkEmpty = () => ({
    client_ids: [], title: '', format: '', category: '', status: '',
    priority: '', eta_end: '', assigned_to: null, comments: '', link_url: '',
    reference_link: '', visual_brief: '', content: '', caption: '',
    posting_date: '', internal_approval: '',
    campaign_live_date: '', live_data: '',
  })
  const [form, setForm] = useState(mkEmpty)
  useEffect(() => { if (isOpen) setForm(mkEmpty()) }, [isOpen])
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const canAdd = form.client_ids.length > 0 && (isSocial || form.title.trim())
  const statusOpts = service === 'social' ? SOCIAL_STATUSES : STATUSES
  const lbl = { seo: 'SEO', email: 'Email', paid: 'Paid Ads', social: 'Social Media' }[service] || service

  return (
    <Dialog open={isOpen} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add {lbl} Task</DialogTitle>
          <DialogDescription className="text-xs">Fill in the details below. Fields marked * are required.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Clients <span className="text-red-500">*</span></label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={`h-9 w-full px-3 text-xs rounded-md border bg-white flex items-center gap-1.5 ${form.client_ids.length > 0 ? 'border-blue-400 text-blue-700 font-semibold' : 'border-gray-200 text-gray-400'}`}>
                  {form.client_ids.length === 0 ? 'Select clients…' : form.client_ids.length === 1 ? (safeArray(clients).find(c => c?.id === form.client_ids[0])?.name || '1 client') : `${form.client_ids.length} clients selected`}
                  <span className="ml-auto text-gray-400">▾</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 max-h-72 overflow-y-auto">
                <DropdownMenuLabel className="text-xs flex items-center justify-between">
                  <span>Select Clients</span>
                  {form.client_ids.length > 0 && <button className="text-[10px] text-gray-400 hover:text-red-500 font-normal" onClick={() => set('client_ids', [])}>Clear all</button>}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {safeArray(clients).map(c => (
                  <DropdownMenuCheckboxItem key={c?.id} checked={form.client_ids.includes(c?.id)} onCheckedChange={checked => set('client_ids', checked ? [...form.client_ids, c.id] : form.client_ids.filter(id => id !== c.id))} className="text-xs">{c?.name}</DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {isSocial ? (
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Format</label>
              <Select value={form.format || '__none__'} onValueChange={v => set('format', v === '__none__' ? '' : v)}>
                <SelectTrigger className="h-9 text-xs border-gray-200"><SelectValue placeholder="Select format…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-xs text-gray-400">No format</SelectItem>
                  {SOCIAL_FORMATS.map(f => <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Title <span className="text-red-500">*</span></label>
              <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Task title…" className="h-9 text-xs border-gray-200" autoFocus />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Status</label>
              <Select value={form.status || '__none__'} onValueChange={v => set('status', v === '__none__' ? '' : v)}>
                <SelectTrigger className="h-9 text-xs border-gray-200"><SelectValue placeholder="Status…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-xs text-gray-400">No status</SelectItem>
                  {statusOpts.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {service === 'seo' && (
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">Priority</label>
                <Select value={form.priority || '__none__'} onValueChange={v => set('priority', v === '__none__' ? '' : v)}>
                  <SelectTrigger className="h-9 text-xs border-gray-200"><SelectValue placeholder="Priority…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" className="text-xs text-gray-400">No priority</SelectItem>
                    {PRIORITIES.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {isSocial && (
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">Internal Approval</label>
                <Select value={form.internal_approval || '__none__'} onValueChange={v => set('internal_approval', v === '__none__' ? '' : v)}>
                  <SelectTrigger className="h-9 text-xs border-gray-200"><SelectValue placeholder="Approval…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" className="text-xs text-gray-400">Not set</SelectItem>
                    {SOCIAL_INTERNAL_APPROVALS.map(a => <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {service === 'seo' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">Category</label>
                <Select value={form.category || '__none__'} onValueChange={v => set('category', v === '__none__' ? '' : v)}>
                  <SelectTrigger className="h-9 text-xs border-gray-200"><SelectValue placeholder="Category…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" className="text-xs text-gray-400">No category</SelectItem>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">ETA</label>
                <Input type="date" value={form.eta_end || ''} onChange={e => set('eta_end', e.target.value || null)} className="h-9 text-xs border-gray-200" />
              </div>
            </div>
          )}

          {isSocial && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1.5">Reference Link</label>
                  <Input value={form.reference_link || ''} onChange={e => set('reference_link', e.target.value || null)} placeholder="https://…" className="h-9 text-xs border-gray-200" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1.5">Posting Date</label>
                  <Input type="date" value={form.posting_date || ''} onChange={e => set('posting_date', e.target.value || null)} className="h-9 text-xs border-gray-200" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">Visual Brief</label>
                <textarea value={form.visual_brief || ''} onChange={e => set('visual_brief', e.target.value || null)} rows={2} placeholder="Describe the visual…" className="w-full border border-gray-200 rounded-md px-3 py-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-y" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">Content</label>
                <textarea value={form.content || ''} onChange={e => set('content', e.target.value || null)} rows={3} placeholder="Content / copy…" className="w-full border border-gray-200 rounded-md px-3 py-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-y" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">Caption</label>
                <textarea value={form.caption || ''} onChange={e => set('caption', e.target.value || null)} rows={2} placeholder="Social caption…" className="w-full border border-gray-200 rounded-md px-3 py-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-y" />
              </div>
            </>
          )}

          {!isSocial && (
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Link URL</label>
              <Input value={form.link_url || ''} onChange={e => set('link_url', e.target.value || null)} placeholder="https://…" className="h-9 text-xs border-gray-200" />
            </div>
          )}

          {service === 'email' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">Campaign Live Date</label>
                <Input type="date" value={form.campaign_live_date || ''} onChange={e => set('campaign_live_date', e.target.value || null)} className="h-9 text-xs border-gray-200" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">Live Data Date</label>
                <Input type="date" value={form.live_data || ''} onChange={e => set('live_data', e.target.value || null)} className="h-9 text-xs border-gray-200" />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Assigned To</label>
            <AssignedMemberSelect value={form.assigned_to} members={members} onSave={v => set('assigned_to', v)} />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Comments</label>
            <textarea value={form.comments || ''} onChange={e => set('comments', e.target.value || null)} rows={3} placeholder="Notes or comments…" className="w-full border border-gray-200 rounded-md px-3 py-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-y" />
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose} className="text-xs">Cancel</Button>
          <Button onClick={() => onAdd(form)} disabled={!canAdd || isAdding} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold">
            {isAdding ? 'Adding…' : form.client_ids.length > 1 ? `Add to ${form.client_ids.length} Clients` : 'Add Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TasksPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [tasks, setTasks] = useState([])
  const [clients, setClients] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 })
  const [saving, setSaving] = useState({})
  const [selected, setSelected] = useState([])
  const [bulkAction, setBulkAction] = useState('__none__')
  const [newTask, setNewTask] = useState({ title: '', client_ids: [], format: '' })
  const [addingTask, setAddingTask] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState(null)
  const [commentsModal, setCommentsModal] = useState(null)
  const [feedbackModal, setFeedbackModal] = useState(null)

  // Sync state with URL
  const filterClient = searchParams.get('client_id') || 'all'
  const filterStatus = searchParams.get('status') || 'all'
  const filterCategory = searchParams.get('category') || 'all'
  const filterAssignee = searchParams.get('assigned_to') || 'all'
  const filterPriority = searchParams.get('priority') || 'all'
  const filterSearch = searchParams.get('search') || ''
  const sortBy = searchParams.get('sort_by') || ''
  const sortDir = searchParams.get('sort_dir') === 'desc' ? 'desc' : 'asc'
  const service = searchParams.get('service') || 'seo'
  const page = parseInt(searchParams.get('page')) || 1

  const [localSearch, setLocalSearch] = useState(filterSearch)
  const [columnOrder, setColumnOrder] = useState([])
  const { scrollRef, saveScroll, restoreScroll } = useScrollPreserve()
  const sortConfig = useMemo(() => ({ field: sortBy || null, direction: sortDir }), [sortBy, sortDir])

  const getServiceConfig = (srv) => {
    switch (srv) {
      case 'email':
        return {
          endpoint: '/api/email-tasks',
          label: 'Email Tasks',
          columns: ['serial', 'selection', 'client', 'title', 'comments', 'status', 'team_label', 'assigned', 'started_date', 'created_at', 'link', 'internal_approval', 'send_link', 'campaign_live', 'live_data', 'client_approval', 'client_feedback', 'actions'],
          widths: EMAIL_COLUMN_WIDTHS
        }
      case 'paid':
        return {
          endpoint: '/api/paid-tasks',
          label: 'Paid Ads Tasks',
          columns: ['serial', 'selection', 'client', 'title', 'comments', 'status', 'team_label', 'assigned', 'started_date', 'created_at', 'link', 'internal_approval', 'send_link', 'client_approval', 'client_feedback', 'actions'],
          widths: PAID_COLUMN_WIDTHS
        }
      case 'social':
        return {
          endpoint: '/api/social-tasks',
          label: 'Social Media Tasks',
          columns: ['serial', 'selection', 'client', 'format', 'reference', 'visual_brief', 'content', 'caption', 'social_internal_approval', 'send_idea', 'content_idea_approval', 'content_idea_feedback', 'content_draft', 'send_draft', 'content_draft_approval', 'draft_feedback', 'live_link', 'posting_date', 'social_status', 'team_label', 'assigned', 'started_date', 'created_at', 'comments', 'actions'],
          widths: SOCIAL_COLUMN_WIDTHS
        }
      default:
        return {
          endpoint: '/api/tasks',
          label: 'SEO Tasks',
          columns: ['serial', 'selection', 'client', 'title', 'comments', 'comments_for_client', 'category', 'status', 'priority', 'eta', 'team_label', 'assigned', 'started_date', 'created_at', 'link', 'internal_approval', 'send_link', 'client_approval', 'client_feedback', 'actions'],
          widths: TASK_COLUMN_WIDTHS
        }
    }
  }

  const serviceConfig = useMemo(() => getServiceConfig(service), [service])

  const updateQueryParams = (updates) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value === 'all' || value === '') params.delete(key)
      else params.set(key, value)
    })
    if (!updates.page && page !== 1) params.delete('page')
    router.push(`/dashboard/tasks?${params.toString()}`, { scroll: false })
  }

  useEffect(() => {
    const saved = localStorage.getItem(`tasks_column_order_${service}`)
    const parsed = safeJSON(saved)
    if (parsed && Array.isArray(parsed)) {
      const currentCols = serviceConfig.columns
      const merged = parsed.filter(id => currentCols.includes(id))
      currentCols.forEach(id => {
        if (!merged.includes(id)) merged.push(id)
      })
      setColumnOrder(merged)
    } else {
      setColumnOrder(serviceConfig.columns)
    }
  }, [service, serviceConfig.columns])

  const loadLookups = async () => {
    try {
      const [clientsRes, membersRes] = await Promise.all([
        apiFetch('/api/clients?lite=1'),
        apiFetch('/api/team'),
      ])
      const [clientsData, membersData] = await Promise.all([
        clientsRes.json(), membersRes.json(),
      ])
      setClients(safeArray(clientsData))
      setMembers(safeArray(membersData))
    } catch (e) {
      console.error('Failed to load lookup data', e)
    }
  }

  const loadData = async () => {
    saveScroll() // preserve scroll position before the loading state wipes the DOM
    setLoading(true)
    // NOTE: Don't clear tasks here — keeping stale data visible prevents scroll reset

    const params = new URLSearchParams(searchParams.toString())
    params.delete('service') // API doesn't need the service param, it's in the URL
    // NOTE: sort_by/sort_dir are intentionally NOT removed — the API sorts MongoDB-side
    // so that sort applies to the full dataset across all pages, not just the current page.
    params.set('enrich', '0')
    if (!params.get('limit')) params.set('limit', '50')

    const tasksRes = await apiFetch(`${serviceConfig.endpoint}?${params.toString()}`)
    const tasksData = await tasksRes.json()

    setTasks(safeArray(tasksData.data))
    setPagination({
      total: tasksData.total || 0,
      page: tasksData.page || 1,
      totalPages: tasksData.totalPages || 1
    })
    setLoading(false)
    restoreScroll() // restore after React commits the new rows to the DOM
  }

  useEffect(() => { loadLookups() }, [])
  useEffect(() => { loadData() }, [searchParams, serviceConfig.endpoint])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filterSearch) {
        // Reset to page 1 when search changes so results are always from page 1
        updateQueryParams({ search: localSearch, page: 1 })
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [localSearch])

  const updateTask = async (taskId, field, value) => {
    const task = safeArray(tasks).find(t => t?.id === taskId)
    if (!task) return

    setSaving(s => ({ ...s, [taskId]: true }))
    setTasks(ts => ts.map(t => t.id === taskId ? { ...t, [field]: value } : t))

    try {
      const res = await apiFetch(`${serviceConfig.endpoint}/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({
          [field]: value,
          updated_at: task.updated_at
        })
      })

      if (res.status === 409) {
        const error = await res.json()
        alert(error.error || 'Concurrency error: Task was modified by another user.')
        loadData()
      } else if (res.ok) {
        const updatedTask = await res.json()
        setTasks(ts => ts.map(t => t.id === taskId ? updatedTask : t))
      }
    } catch (e) {
      console.error('Update failed', e)
    }

    setSaving(s => ({ ...s, [taskId]: false }))
  }

  const publishTask = async (taskId) => {
    const task = safeArray(tasks).find(t => t.id === taskId)
    setSaving(s => ({ ...s, [taskId]: true }))
    try {
      const res = await apiFetch(`${serviceConfig.endpoint}/${taskId}/publish`, {
        method: 'POST',
        body: JSON.stringify({ updated_at: task?.updated_at })
      })
      if (!res.ok) {
        const error = await res.json()
        alert(error.error || 'Publish failed')
        loadData()
      } else {
        const data = await res.json()
        if (data.task) {
          setTasks(ts => ts.map(t => t.id === taskId ? data.task : t))
        }
      }
    } catch (e) {
      console.error('Publish failed', e)
    }
    setSaving(s => ({ ...s, [taskId]: false }))
  }

  const sendSocialAction = async (taskId, action) => {
    const task = safeArray(tasks).find(t => t.id === taskId)
    setSaving(s => ({ ...s, [taskId]: true }))
    try {
      const res = await apiFetch(`${serviceConfig.endpoint}/${taskId}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ updated_at: task?.updated_at })
      })
      if (!res.ok) {
        const error = await res.json()
        alert(error.error || 'Action failed')
        loadData()
      } else {
        const data = await res.json()
        if (data.task) {
          setTasks(ts => ts.map(t => t.id === taskId ? data.task : t))
        }
      }
    } catch (e) {
      console.error('Social send action failed', e)
    }
    setSaving(s => ({ ...s, [taskId]: false }))
  }

  const deleteTask = (taskId) => {
    setConfirmConfig({
      title: 'Delete Task',
      description: 'This will permanently delete the task. This cannot be undone.',
      onConfirm: async () => {
        await apiFetch(`${serviceConfig.endpoint}/${taskId}`, { method: 'DELETE' })
        setTasks(ts => ts.filter(t => t.id !== taskId))
      }
    })
  }

  const toggleSelect = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  const handleBulkAction = async () => {
    if (!bulkAction || bulkAction === '__none__' || selected.length === 0) return
    const [field, value] = bulkAction.split(':')
    // NOTE: Bulk update endpoint might need to be service-specific if it changes, 
    // but for now, we'll assume a shared /bulk-update if possible or specific ones.
    // For safety, let's use service-specific ones if we decide to implement them.
    const bulkUrl = service === 'seo' ? '/api/tasks/bulk-update' : `${serviceConfig.endpoint}/bulk-update`
    await apiFetch(bulkUrl, {
      method: 'POST',
      body: JSON.stringify({ task_ids: selected, updates: { [field]: value } }),
    })
    setSelected([])
    setBulkAction('__none__')
    loadData()
  }

  const addTask = async (formData) => {
    const isSocial = service === 'social'
    if (!isSocial && !formData.title?.trim()) return
    if (!formData.client_ids?.length) return
    setAddingTask(true)
    try {
      const results = await Promise.allSettled(
        formData.client_ids.map(client_id => {
          const body = buildAddTaskBody(service, formData, client_id)
          return apiFetch(serviceConfig.endpoint, { method: 'POST', body: JSON.stringify(body) })
        })
      )
      const succeeded = results.filter(r => r.status === 'fulfilled' && r.value?.ok).length
      if (succeeded > 0) {
        setShowAddModal(false)
        loadData()
      }
      if (succeeded < formData.client_ids.length) {
        alert(`Warning: ${formData.client_ids.length - succeeded} task(s) failed to save.`)
      }
    } catch (e) {
      console.error('Add task failed', e)
    }
    setAddingTask(false)
  }

  const allTasks = useMemo(() => safeArray(tasks), [tasks])
  const memberMap = useMemo(() => Object.fromEntries(safeArray(members).map(m => [m?.id, m?.name])), [members])
  const clientMap = useMemo(() => Object.fromEntries(safeArray(clients).map(c => [c?.id, c?.name])), [clients])
  const anyFilter = useMemo(() => filterClient !== 'all' || filterStatus !== 'all' || filterCategory !== 'all' || filterAssignee !== 'all' || filterPriority !== 'all' || filterSearch.trim() !== '', [filterClient, filterStatus, filterCategory, filterAssignee, filterPriority, filterSearch])

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

  const getSortableValue = (task, sortField) => {
    if (!task || !sortField) return ''
    if (sortField === 'client_name') return clientMap[task.client_id] || task.client_name || ''
    if (sortField === 'assigned_name') return toAssignedIds(task.assigned_to).map((id) => memberMap[id]).filter(Boolean).join(', ')
    if (sortField === 'eta_end' || sortField === 'campaign_live_date' || sortField === 'live_data' || sortField === 'live_date') return getDateValue(task[sortField])
    return task[sortField] ?? ''
  }

  const sorted = useMemo(() => {
    if (!sortConfig.field) return allTasks
    const factor = sortConfig.direction === 'asc' ? 1 : -1
    return [...allTasks].sort((a, b) => {
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
  }, [allTasks, sortConfig, clientMap, memberMap])


  const handleSort = (field) => {
    if (!field) return
    const nextDirection = sortConfig.field === field && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    updateQueryParams({ sort_by: field, sort_dir: nextDirection, page: 1 })
  }

  const SortableHeader = ({ id, label, sortField: sField }) => {
    const isSticky = id === 'title' || id === 'serial' || id === 'selection' || id === 'client'
    const leftPosMap = { serial: '0px', selection: '55px', client: '115px', title: '255px' }
    const style = {
      width: serviceConfig.widths[id] || 'auto',
      minWidth: serviceConfig.widths[id] || 'auto',
      position: isSticky ? 'sticky' : undefined,
      left: isSticky ? leftPosMap[id] : undefined,
      background: isSticky ? '#f9fafb' : undefined,
      zIndex: isSticky ? 30 : undefined,
      boxShadow: id === 'title' ? '4px 0 8px -4px rgba(0,0,0,0.1)' : undefined,
      borderRight: isSticky ? '1px solid #e5e7eb' : undefined
    }
    return (
      <th style={style} className="text-left px-3 py-2.5 font-semibold text-gray-600 bg-gray-50 border-r border-gray-100 last:border-0">
        <div className="flex items-center gap-1 overflow-hidden">
          <button
            type="button"
            onClick={() => handleSort(sField)}
            className={`truncate inline-flex items-center gap-1 ${sField ? 'cursor-pointer hover:text-gray-900' : 'cursor-default'}`}
            title={label}
            disabled={!sField}
          >
            <span className="truncate">{label}</span>
            {sField && (
              sortConfig.field === sField
                ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 flex-shrink-0" /> : <ArrowDown className="w-3 h-3 flex-shrink-0" />)
                : <ArrowUpDown className="w-3 h-3 flex-shrink-0 text-gray-400" />
            )}
          </button>
        </div>
      </th>
    )
  }

  const SortableRow = ({ task }) => {
    if (!task?.id) return null
    const serialNum = (pagination.page - 1) * 50 + sorted.findIndex(t => t.id === task.id) + 1

    return (
      <tr className={`hover:bg-gray-50 group border-b border-gray-100 ${selected.includes(task?.id) ? 'bg-blue-50' : ''}`}>
        {safeArray(columnOrder).map(colId => {
          const isSticky = colId === 'title' || colId === 'serial' || colId === 'selection' || colId === 'client'
          const leftPosMap = { serial: '0px', selection: '55px', client: '115px', title: '255px' }
          const stickyStyle = isSticky ? {
            position: 'sticky',
            left: leftPosMap[colId],
            background: selected.includes(task?.id) ? '#eff6ff' : '#fff',
            zIndex: 20,
            borderRight: '1px solid #f3f4f6',
            boxShadow: colId === 'title' ? '4px 0 8px -4px rgba(0,0,0,0.1)' : ''
          } : {}
          return (
            <td key={colId} className={`px-3 py-1.5 overflow-hidden ${!isSticky && (colId === 'internal_approval' || colId === 'send_link') ? 'bg-gray-50/50' : ''}`}
              style={{ width: serviceConfig.widths[colId], minWidth: serviceConfig.widths[colId], ...stickyStyle }}>
              {colId === 'serial' && (
                <div className="text-[10px] font-mono text-gray-400 text-center select-none">
                  {serialNum}
                </div>
              )}
              {colId === 'selection' && (
                <div className="flex items-center gap-3 px-1">
                  <Checkbox checked={selected.includes(task.id)} onCheckedChange={() => toggleSelect(task.id)} />
                </div>
              )}
              {colId === 'client' && (
                <span className="text-xs font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded whitespace-nowrap">
                  {clients.find(c => c.id === task.client_id)?.name || task.client_name || '?'}
                </span>
              )}
              {colId === 'title' && <EditableCell value={task.title} onSave={v => updateTask(task.id, 'title', v)} />}
              {colId === 'category' && <EditableCell value={task.category} type="select" options={CATEGORIES} onSave={v => updateTask(task.id, 'category', v)} />}
              {colId === 'status' && <EditableCell value={task.status} type="status" options={STATUSES} onSave={v => updateTask(task.id, 'status', v)} />}
              {colId === 'priority' && <EditableCell value={task.priority} type="priority" options={PRIORITIES} onSave={v => updateTask(task.id, 'priority', v)} />}
              {colId === 'eta' && <EditableCell value={task.eta_end} type="date" onSave={v => updateTask(task.id, 'eta_end', v)} />}
              {colId === 'started_date' && <EditableCell value={task.started_date} type="date" onSave={v => updateTask(task.id, 'started_date', v)} />}
              {colId === 'created_at' && (
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {task.created_at ? new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                </span>
              )}
              {colId === 'team_label' && <EditableCell value={task.team_label} type="select" options={TEAM_LABELS} onSave={v => updateTask(task.id, 'team_label', v)} />}
              {colId === 'assigned' && (
                <AssigneeCell
                  task={task}
                  members={members}
                  memberMap={memberMap}
                  onSave={(value) => updateTask(task.id, 'assigned_to', value)}
                />
              )}
              {colId === 'link' && <LinkCell value={task.link_url} onSave={v => updateTask(task.id, 'link_url', v)} />}
              {/* ── Social Media columns ───────────────────────────────────── */}
              {colId === 'format' && (
                <EditableCell value={task.format} type="select" options={SOCIAL_FORMATS} onSave={v => updateTask(task.id, 'format', v)} />
              )}
              {colId === 'social_status' && (
                <EditableCell value={task.status} type="status" options={SOCIAL_STATUSES} onSave={v => updateTask(task.id, 'status', v)} />
              )}
              {colId === 'reference' && <EditableCell type="expandable" value={task.reference_link} placeholder="Reference" onSave={v => updateTask(task.id, 'reference_link', v)} />}
              {colId === 'visual_brief' && <EditableCell type="expandable" value={task.visual_brief} placeholder="Visual Brief" onSave={v => updateTask(task.id, 'visual_brief', v)} />}
              {colId === 'content' && <EditableCell type="expandable" value={task.content} placeholder="Content" onSave={v => updateTask(task.id, 'content', v)} />}
              {colId === 'caption' && <EditableCell type="expandable" value={task.caption} placeholder="Caption" onSave={v => updateTask(task.id, 'caption', v)} />}
              {colId === 'send_idea' && (
                <Button
                  size="sm"
                  variant={task.content_idea_sent ? 'ghost' : 'default'}
                  className={`h-7 px-2 text-[10px] uppercase tracking-wider font-bold whitespace-nowrap ${task.content_idea_sent ? 'text-green-600' : ''}`}
                  disabled={saving[task.id]}
                  onClick={() => setConfirmConfig({
                    title: 'Send Content Idea',
                    description: task.content_idea_sent
                      ? 'This will re-send the content idea to the client and reset their approval. Are you sure?'
                      : 'This will share the format, visual brief, content, and caption with the client for their approval. Are you sure?',
                    onConfirm: () => sendSocialAction(task.id, 'send-idea'),
                    confirmText: 'Send',
                    confirmClass: 'bg-blue-600 hover:bg-blue-700 text-white'
                  })}
                >
                  {task.content_idea_sent ? 'Re-send Idea' : 'Send Idea'}
                </Button>
              )}
              {colId === 'content_idea_approval' && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  task.content_idea_approval === 'Approved' ? 'bg-green-100 text-green-700 border-green-200' :
                  task.content_idea_approval === 'Required Changes' ? 'bg-red-100 text-red-700 border-red-200' :
                  task.content_idea_approval === 'Rejected' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                  'bg-gray-100 text-gray-400 border-gray-200'
                }`}>
                  {task.content_idea_approval || 'Pending'}
                </span>
              )}
              {colId === 'content_idea_feedback' && (
                <div className="max-w-[150px]">
                  {(task.content_idea_approval === 'Required Changes' || task.content_idea_approval === 'Rejected') && task.content_idea_feedback ? (
                    <button type="button" className="w-full text-left cursor-pointer" onClick={() => setFeedbackModal(task.content_idea_feedback)}>
                      <span className="block text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 truncate hover:bg-red-100 transition-colors" title={task.content_idea_feedback}>
                        {task.content_idea_feedback}
                      </span>
                    </button>
                  ) : <span className="text-gray-300 text-xs">—</span>}
                </div>
              )}
              {colId === 'content_draft' && <LinkCell value={task.content_draft_link} onSave={v => updateTask(task.id, 'content_draft_link', v)} />}
              {colId === 'send_draft' && (
                <Button
                  size="sm"
                  variant={task.content_draft_sent ? 'ghost' : 'default'}
                  className={`h-7 px-2 text-[10px] uppercase tracking-wider font-bold whitespace-nowrap ${task.content_draft_sent ? 'text-green-600' : ''}`}
                  disabled={saving[task.id]}
                  onClick={() => setConfirmConfig({
                    title: 'Send Content Draft',
                    description: task.content_draft_sent
                      ? 'This will re-send the content draft to the client and reset their draft approval. Are you sure?'
                      : 'This will share the content draft link with the client for their approval. Are you sure?',
                    onConfirm: () => sendSocialAction(task.id, 'send-draft'),
                    confirmText: 'Send',
                    confirmClass: 'bg-blue-600 hover:bg-blue-700 text-white'
                  })}
                >
                  {task.content_draft_sent ? 'Re-send Draft' : 'Send Draft'}
                </Button>
              )}
              {colId === 'content_draft_approval' && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  task.content_draft_approval === 'Approved' ? 'bg-green-100 text-green-700 border-green-200' :
                  task.content_draft_approval === 'Required Changes' ? 'bg-red-100 text-red-700 border-red-200' :
                  task.content_draft_approval === 'Rejected' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                  'bg-gray-100 text-gray-400 border-gray-200'
                }`}>
                  {task.content_draft_approval || 'Pending'}
                </span>
              )}
              {colId === 'draft_feedback' && (
                <div className="max-w-[150px]">
                  {(task.content_draft_approval === 'Required Changes' || task.content_draft_approval === 'Rejected') && task.draft_feedback ? (
                    <button type="button" className="w-full text-left cursor-pointer" onClick={() => setFeedbackModal(task.draft_feedback)}>
                      <span className="block text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 truncate hover:bg-red-100 transition-colors" title={task.draft_feedback}>
                        {task.draft_feedback}
                      </span>
                    </button>
                  ) : <span className="text-gray-300 text-xs">—</span>}
                </div>
              )}
              {colId === 'posting_date' && <EditableCell value={task.posting_date} type="date" onSave={v => updateTask(task.id, 'posting_date', v)} />}
              {colId === 'social_internal_approval' && (
                <EditableCell
                  value={task.internal_approval}
                  type="select"
                  options={SOCIAL_INTERNAL_APPROVALS}
                  onSave={v => updateTask(task.id, 'internal_approval', v)}
                  placeholder="Internal Approval"
                />
              )}
              {/* ── End Social columns ─────────────────────────────────────── */}
              {colId === 'internal_approval' && (
                <EditableCell
                  value={task.internal_approval || 'Pending'}
                  type="internal_approval"
                  options={INTERNAL_APPROVALS}
                  disabled={task.status !== 'Completed' && task.status !== 'Implemented'}
                  onSave={v => updateTask(task.id, 'internal_approval', v)}
                />
              )}
              {colId === 'campaign_live' && <EditableCell value={task.campaign_live_date} type="date" onSave={v => updateTask(task.id, 'campaign_live_date', v)} />}
              {colId === 'live_data' && <EditableCell value={task.live_data} type="date" onSave={v => updateTask(task.id, 'live_data', v)} />}
              {colId === 'live_link' && <LinkCell value={task.live_link} onSave={v => updateTask(task.id, 'live_link', v)} />}
              {colId === 'live_date' && <EditableCell value={task.live_date} type="date" onSave={v => updateTask(task.id, 'live_date', v)} />}
              {colId === 'send_link' && (
                <Button
                  size="sm"
                  variant={task.client_link_visible ? "ghost" : "default"}
                  className={`h-7 px-2 text-[10px] uppercase tracking-wider font-bold ${task.client_link_visible ? 'text-green-600' : ''}`}
                  disabled={
                    (task.status !== 'Completed' && task.status !== 'Implemented') ||
                    task.internal_approval !== 'Approved' ||
                    !task.link_url ||
                    task.client_link_visible === true
                  }
                  onClick={() => publishTask(task.id)}
                >
                  {task.client_link_visible ? 'Sent' : 'Send Link'}
                </Button>
              )}
              {colId === 'client_approval' && <EditableCell value={task.client_approval} type="approval" disabled={true} />}
              {colId === 'client_feedback' && (
                <div className="max-w-[150px]">
                  {task.client_approval === 'Required Changes' && task.client_feedback_note ? (
                    <button
                      type="button"
                      className="w-full text-left cursor-pointer"
                      onClick={() => setFeedbackModal(task.client_feedback_note)}
                    >
                      <span className="block text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 truncate hover:bg-red-100 transition-colors" title={task.client_feedback_note}>
                        {task.client_feedback_note}
                      </span>
                    </button>
                  ) : <span className="text-gray-300 text-xs">—</span>}
                </div>
              )}
              {colId === 'comments' && (
                <div
                  className="cursor-pointer px-1 py-0.5 rounded hover:bg-blue-50 hover:ring-1 hover:ring-blue-200 transition-all min-h-[24px] max-w-[200px]"
                  title={task.comments || 'Click to add task description'}
                  onClick={() => setCommentsModal({ taskId: task.id, value: task.comments || '', field: 'comments', label: 'Task Description' })}
                >
                  {task.comments
                    ? <span className="text-xs text-gray-600 truncate block">{task.comments}</span>
                    : <span className="text-gray-300 text-xs">Add description...</span>}
                </div>
              )}
              {colId === 'comments_for_client' && (
                <div
                  className="cursor-pointer px-1 py-0.5 rounded hover:bg-blue-50 hover:ring-1 hover:ring-blue-200 transition-all min-h-[24px] max-w-[200px]"
                  title={task.comments_for_client || 'Click to add comment for client'}
                  onClick={() => setCommentsModal({ taskId: task.id, value: task.comments_for_client || '', field: 'comments_for_client', label: 'Comments for Client' })}
                >
                  {task.comments_for_client
                    ? <span className="text-xs text-gray-600 truncate block">{task.comments_for_client}</span>
                    : <span className="text-gray-300 text-xs">Add comment...</span>}
                </div>
              )}
              {colId === 'actions' && (
                <button onClick={() => deleteTask(task?.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-red-400 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </td>
          );
        })}
      </tr>
    )
  }

  const columnLabels = {
    selection: '', serial: '#', client: 'Client', title: 'Task', category: 'Category', status: 'Status', priority: 'Priority',
    eta: 'ETA End', started_date: 'Start Date', created_at: 'Created', team_label: 'Team', assigned: 'Assigned', link: 'Link',
    internal_approval: 'Internal Approval', send_link: 'Send Link',
    campaign_live: 'Campaign Live', live_data: 'Live Data',
    live_link: 'Live Link', live_date: 'Live Date',
    client_approval: 'Client Approval', client_feedback: 'Client Feedback',
    comments: 'Task Description', comments_for_client: 'Comments', actions: '',
    // Social
    format: 'Format', social_status: 'Status', reference: 'Reference', visual_brief: 'Visual Brief', content: 'Content', caption: 'Caption',
    send_idea: 'Send Idea', content_idea_approval: 'Idea Approval', content_idea_feedback: 'Idea Feedback',
    content_draft: 'Draft', send_draft: 'Send Draft', content_draft_approval: 'Draft Approval', draft_feedback: 'Draft Feedback',
    posting_date: 'Posting Date', social_internal_approval: 'Internal Approval',
  }
  const columnSortFields = {
    client: 'client_name',
    title: 'title',
    category: 'category',
    status: 'status',
    priority: 'priority',
    eta: 'eta_end',
    started_date: 'started_date',
    created_at: 'created_at',
    team_label: 'team_label',
    assigned: 'assigned_name',
    link: 'link_url',
    live_link: 'live_link',
    live_date: 'live_date',
    internal_approval: 'internal_approval',
    campaign_live: 'campaign_live_date',
    live_data: 'live_data',
    client_approval: 'client_approval',
    client_feedback: 'client_feedback_note',
    comments: 'comments',
    comments_for_client: 'comments_for_client',
    // Social
    format: 'format',
    social_status: 'status',
    posting_date: 'posting_date',
    content_idea_approval: 'content_idea_approval',
    content_draft_approval: 'content_draft_approval',
    social_internal_approval: 'internal_approval',
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Tasks</h1>
          <p className="text-gray-500 text-sm mt-1">{pagination.total} {serviceConfig.label} across all clients</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100/80 p-1.5 rounded-xl border border-gray-200/50 shadow-inner">
            <button
              onClick={() => updateQueryParams({ service: 'seo', page: 1 })}
              className={`px-6 py-2 text-xs font-bold rounded-lg transition-all ${service === 'seo' ? 'bg-white text-blue-700 shadow-md border border-blue-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
            >
              SEO Tasks
            </button>
            <button
              onClick={() => updateQueryParams({ service: 'email', page: 1 })}
              className={`px-6 py-2 text-xs font-bold rounded-lg transition-all ${service === 'email' ? 'bg-white text-blue-700 shadow-md border border-blue-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
            >
              Email Tasks
            </button>
            <button
              onClick={() => updateQueryParams({ service: 'paid', page: 1 })}
              className={`px-6 py-2 text-xs font-bold rounded-lg transition-all ${service === 'paid' ? 'bg-white text-blue-700 shadow-md border border-blue-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
            >
              Paid Ads Tasks
            </button>
            <button
              onClick={() => updateQueryParams({ service: 'social', page: 1 })}
              className={`px-6 py-2 text-xs font-bold rounded-lg transition-all ${service === 'social' ? 'bg-white text-blue-700 shadow-md border border-blue-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
            >
              Social Media
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={loadData} className="h-10 px-4 gap-2 border-gray-200 hover:bg-gray-50 hover:text-blue-600 transition-all shadow-sm font-semibold">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
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
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add {serviceConfig.label.slice(0, -1)}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4 p-3 bg-white border border-gray-200 rounded-lg">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <Input
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            placeholder="Search within tasks..."
            className="h-8 text-xs pl-8 w-60 border-gray-200"
          />
        </div>

        <Select value={filterStatus} onValueChange={v => updateQueryParams({ status: v })}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s === 'Pending Review' ? 'Review' : s}</SelectItem>)}
          </SelectContent>
        </Select>
        {service === 'seo' && (
          <Select value={filterCategory} onValueChange={v => updateQueryParams({ category: v })}>
            <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Categories</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={filterAssignee} onValueChange={v => updateQueryParams({ assigned_to: v })}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="All Members" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Members</SelectItem>
            {safeArray(members).map(m => <SelectItem key={m?.id} value={m?.id} className="text-xs">{m?.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {service === 'seo' && (
          <Select value={filterPriority} onValueChange={v => updateQueryParams({ priority: v })}>
            <SelectTrigger className="h-8 text-xs w-28"><SelectValue placeholder="All Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Priority</SelectItem>
              {PRIORITIES.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {anyFilter && (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-400" onClick={() => {
            updateQueryParams({
              client_id: 'all', status: 'all', category: 'all',
              assigned_to: 'all', priority: 'all', search: ''
            })
            setLocalSearch('')
          }}>Clear filters</Button>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm text-blue-700 font-medium">{selected.length} selected</span>
          <Select value={bulkAction} onValueChange={setBulkAction}>
            <SelectTrigger className="h-7 text-xs w-48 bg-white"><SelectValue placeholder="Bulk action..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-xs text-gray-400">Choose action…</SelectItem>
              <SelectItem value="status:In Progress" className="text-xs">Set: In Progress</SelectItem>
              <SelectItem value="status:Completed" className="text-xs">Set: Completed</SelectItem>
              <SelectItem value="status:Implemented" className="text-xs">Set: Implemented</SelectItem>
              <SelectItem value="status:Blocked" className="text-xs">Set: Blocked</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="h-7 text-xs" onClick={handleBulkAction} disabled={bulkAction === '__none__'}>Apply</Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelected([])}>Clear</Button>
        </div>
      )}

      <div ref={scrollRef} className="bg-white border border-gray-200 rounded-lg overflow-auto shadow-sm" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          <table className="w-full text-sm" style={{ minWidth: '1800px', tableLayout: 'fixed' }}>
            <thead className="sticky top-0 z-40 bg-gray-50">
                <tr className="border-b border-gray-200 bg-gray-50/80">
                  {columnOrder.map(colId => (
                    <SortableHeader key={colId} id={colId} label={columnLabels[colId]} sortField={columnSortFields[colId]} />
                  ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={columnOrder.length} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={columnOrder.length} className="px-4 py-8 text-center text-gray-400">No tasks found</td></tr>
              ) : (
                sorted.map(task => <SortableRow key={task.id} task={task} />)
              )}

            </tbody>
          </table>
      <Pagination
          total={pagination.total}
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(p) => updateQueryParams({ page: p })}
        />
      </div>
      <AddTaskModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} service={service} clients={clients} members={members} onAdd={addTask} isAdding={addingTask} />
      <ConfirmDialog config={confirmConfig} onClose={() => setConfirmConfig(null)} />
      {commentsModal && (
        <CommentsModal
          key={commentsModal.taskId + '_' + commentsModal.field}
          value={commentsModal.value}
          label={commentsModal.label}
          onClose={() => setCommentsModal(null)}
          onSave={(val) => updateTask(commentsModal.taskId, commentsModal.field, val)}
        />
      )}
      {feedbackModal && (
        <FeedbackModal
          value={feedbackModal}
          onClose={() => setFeedbackModal(null)}
        />
      )}
    </div>
  )
}

export default function AllTasksPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Loading Dashboard...</div>}>
      <TasksPageContent />
    </Suspense>
  )
}
