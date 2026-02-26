'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { apiFetch } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileText, Plus, ExternalLink, Trash2, Link2, Filter, Search } from 'lucide-react'

const OUTLINE_STATUSES = ['Pending', 'Submitted', 'Approved', 'Rejected']
const TOPIC_APPROVALS  = ['Pending', 'Approved', 'Rejected']
const BLOG_APPROVALS   = ['Pending Review', 'Approved', 'Changes Required']
const BLOG_STATUSES    = ['Draft', 'In Progress', 'Sent for Approval', 'Published', 'Rejected']

const topicApprovalColors = {
  'Approved':  'bg-green-100 text-green-700 border-green-200',
  'Rejected':  'bg-red-100 text-red-700 border-red-200',
  'Pending':   'bg-gray-100 text-gray-500 border-gray-200',
}
const blogStatusColors = {
  'Published':         'bg-green-100 text-green-700 border-green-200',
  'Sent for Approval': 'bg-amber-100 text-amber-700 border-amber-200',
  'In Progress':       'bg-blue-100 text-blue-700 border-blue-200',
  'Draft':             'bg-gray-100 text-gray-600 border-gray-200',
  'Rejected':          'bg-red-100 text-red-700 border-red-200',
}
const approvalColors = {
  'Approved':          'bg-green-100 text-green-700 border-green-200',
  'Changes Required':  'bg-red-100 text-red-700 border-red-200',
  'Pending Review':    'bg-gray-100 text-gray-500 border-gray-200',
}

// Inline editable cell component
function EditableCell({ value, type = 'text', options = [], onSave, placeholder = '—' }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value || '')
  const inputRef = useRef(null)

  useEffect(() => setVal(value || ''), [value])
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus() }, [editing])

  const save = () => { setEditing(false); if (val !== (value || '')) onSave(val) }

  if (editing) {
    if (type === 'select') {
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
    return (
      <input
        ref={inputRef}
        type={type === 'date' ? 'date' : 'text'}
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
    if (type === 'topic_approval') return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${topicApprovalColors[val] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
        {val || 'Pending'}
      </span>
    )
    if (type === 'blog_status') return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${blogStatusColors[val] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
        {val || 'Draft'}
      </span>
    )
    if (type === 'blog_approval') return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${approvalColors[val] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
        {val || 'Pending Review'}
      </span>
    )
    return <span className="text-xs text-gray-700">{val || <span className="text-gray-300">—</span>}</span>
  }

  return (
    <div onClick={() => setEditing(true)}
      className="cursor-pointer hover:bg-blue-50 hover:ring-1 hover:ring-blue-200 rounded px-1 py-0.5 min-h-[24px] min-w-[60px] transition-all"
      title="Click to edit">
      {display()}
    </div>
  )
}

// Link cell component
function LinkCell({ value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value || '')
  const inputRef = useRef(null)

  useEffect(() => setVal(value || ''), [value])
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus() }, [editing])

  const save = () => { setEditing(false); if (val !== (value || '')) onSave(val) }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="url"
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setVal(value || ''); setEditing(false) } }}
        className="w-full px-2 py-1 text-xs border border-blue-400 rounded bg-white focus:outline-none min-w-[140px]"
        placeholder="https://..."
      />
    )
  }

  if (val) {
    return (
      <div className="flex items-center gap-1">
        <a href={val} target="_blank" rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium transition-colors"
          title={val}
        >
          <Link2 className="w-3 h-3" /> Open
        </a>
        <button onClick={() => setEditing(true)} className="text-gray-300 hover:text-gray-500 p-0.5 rounded">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
        </button>
      </div>
    )
  }

  return (
    <button onClick={() => setEditing(true)}
      className="inline-flex items-center gap-1 text-xs text-gray-300 hover:text-blue-500 transition-colors px-1 py-0.5 rounded hover:bg-blue-50"
      title="Add link">
      <Link2 className="w-3 h-3" /> Add link
    </button>
  )
}

export default function ContentCalendarPage() {
  const [content, setContent] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({})
  const [filters, setFilters] = useState({ client_id: '', blog_status: '', search: '' })
  const [showFilters, setShowFilters] = useState(false)

  const loadData = async () => {
    const [contentRes, clientsRes] = await Promise.all([
      apiFetch('/api/content'),
      apiFetch('/api/clients')
    ])
    const [contentData, clientsData] = await Promise.all([contentRes.json(), clientsRes.json()])
    setContent(Array.isArray(contentData) ? contentData : [])
    setClients(Array.isArray(clientsData) ? clientsData : [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const updateContent = async (contentId, field, value) => {
    setSaving(s => ({ ...s, [contentId]: true }))
    setContent(cs => cs.map(c => c.id === contentId ? { ...c, [field]: value } : c))
    await apiFetch(`/api/content/${contentId}`, { method: 'PUT', body: JSON.stringify({ [field]: value }) })
    setSaving(s => ({ ...s, [contentId]: false }))
  }

  const deleteContent = async (contentId) => {
    if (!confirm('Delete this content item?')) return
    await apiFetch(`/api/content/${contentId}`, { method: 'DELETE' })
    setContent(cs => cs.filter(c => c.id !== contentId))
  }

  // Filter content
  const filtered = content.filter(item => {
    if (filters.client_id && item.client_id !== filters.client_id) return false
    if (filters.blog_status && item.blog_status !== filters.blog_status) return false
    if (filters.search) {
      const search = filters.search.toLowerCase()
      const matchTitle = item.blog_title?.toLowerCase().includes(search)
      const matchKeyword = item.primary_keyword?.toLowerCase().includes(search)
      const matchWriter = item.writer?.toLowerCase().includes(search)
      if (!matchTitle && !matchKeyword && !matchWriter) return false
    }
    return true
  })

  // Stats
  const published = content.filter(c => c.blog_status === 'Published').length
  const drafts = content.filter(c => c.blog_status === 'Draft').length
  const inProgress = content.filter(c => c.blog_status === 'In Progress' || c.blog_status === 'Sent for Approval').length

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]))

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Calendar</h1>
          <p className="text-sm text-gray-500 mt-1">Manage blog content across all clients</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-1">
          <Filter className="w-4 h-4" /> Filters
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{content.length}</div>
          <div className="text-xs text-gray-500 mt-1">Total Posts</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{published}</div>
          <div className="text-xs text-gray-500 mt-1">Published</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{inProgress}</div>
          <div className="text-xs text-gray-500 mt-1">In Progress</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-400">{drafts}</div>
          <div className="text-xs text-gray-500 mt-1">Drafts</div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search title, keyword, writer..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className="w-64 h-8 text-sm"
            />
          </div>
          <Select value={filters.client_id || '__all__'} onValueChange={v => setFilters(f => ({ ...f, client_id: v === '__all__' ? '' : v }))}>
            <SelectTrigger className="w-48 h-8 text-sm"><SelectValue placeholder="All Clients" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Clients</SelectItem>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.blog_status || '__all__'} onValueChange={v => setFilters(f => ({ ...f, blog_status: v === '__all__' ? '' : v }))}>
            <SelectTrigger className="w-40 h-8 text-sm"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Statuses</SelectItem>
              {BLOG_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={() => setFilters({ client_id: '', blog_status: '', search: '' })}>Clear</Button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-auto">
        <table className="w-full text-sm" style={{ minWidth: '1300px' }}>
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 sticky top-0 z-10">
              <th className="w-5 px-2 py-2.5"></th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Client</th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-600" style={{ minWidth: 60 }}>Week</th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-600" style={{ minWidth: 200 }}>Blog Title</th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Primary Keyword</th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Writer</th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Topic Approval</th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Blog Status</th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Blog Approval</th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Blog Link</th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Published</th>
              <th className="px-2 py-2.5 w-6"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-16 text-center text-gray-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                  {content.length === 0 ? 'No content calendar items yet.' : 'No items match your filters.'}
                </td>
              </tr>
            ) : (
              filtered.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 group">
                  <td className="px-2 py-1.5">
                    {saving[item.id] && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse mx-auto" />}
                  </td>
                  <td className="px-3 py-1.5">
                    <Link href={`/dashboard/clients/${item.client_id}`} className="text-xs text-blue-600 hover:underline font-medium">
                      {clientMap[item.client_id] || 'Unknown'}
                    </Link>
                  </td>
                  <td className="px-3 py-1.5">
                    <EditableCell value={item.week} onSave={v => updateContent(item.id, 'week', v)} placeholder="Week" />
                  </td>
                  <td className="px-3 py-1.5">
                    <EditableCell value={item.blog_title} onSave={v => updateContent(item.id, 'blog_title', v)} />
                  </td>
                  <td className="px-3 py-1.5">
                    <EditableCell value={item.primary_keyword} onSave={v => updateContent(item.id, 'primary_keyword', v)} placeholder="keyword" />
                  </td>
                  <td className="px-3 py-1.5">
                    <EditableCell value={item.writer} onSave={v => updateContent(item.id, 'writer', v)} placeholder="Writer" />
                  </td>
                  <td className="px-3 py-1.5">
                    <EditableCell value={item.topic_approval_status || 'Pending'} type="topic_approval" options={TOPIC_APPROVALS} onSave={v => updateContent(item.id, 'topic_approval_status', v)} />
                  </td>
                  <td className="px-3 py-1.5">
                    <EditableCell value={item.blog_status || 'Draft'} type="blog_status" options={BLOG_STATUSES} onSave={v => updateContent(item.id, 'blog_status', v)} />
                  </td>
                  <td className="px-3 py-1.5">
                    <EditableCell value={item.blog_approval_status || 'Pending Review'} type="blog_approval" options={BLOG_APPROVALS} onSave={v => updateContent(item.id, 'blog_approval_status', v)} />
                  </td>
                  <td className="px-3 py-1.5">
                    <LinkCell value={item.blog_link} onSave={v => updateContent(item.id, 'blog_link', v)} />
                  </td>
                  <td className="px-3 py-1.5">
                    <EditableCell value={item.published_date} type="date" onSave={v => updateContent(item.id, 'published_date', v)} />
                  </td>
                  <td className="px-2 py-1.5">
                    <button onClick={() => deleteContent(item.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-red-400 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 text-sm text-gray-400">
        Showing {filtered.length} of {content.length} items
      </div>
    </div>
  )
}
