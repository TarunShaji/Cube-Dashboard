'use client'

import { useState, useMemo, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { apiFetch, swrFetcher } from '@/lib/middleware/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Plus, ExternalLink, Search, X } from 'lucide-react'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { SERVICE_TYPES } from '@/lib/constants'
import { safeArray } from '@/lib/safe'

/**
 * Inline member-select cell — shows member name, click to open dropdown, saves on select.
 */
function MemberSelectCell({ client, field, members, onSave }) {
  const [open, setOpen] = useState(false)
  const value = client?.[field]
  const isChurned = client?.is_churned === true
  const currentMember = members.find(m => m.id === value)

  const handleChange = (memberId) => {
    setOpen(false)
    if (memberId === '__churned__') {
      const ok = typeof window !== 'undefined'
        ? window.confirm('Are you sure you want to mark this client as churned?')
        : true
      if (ok) onSave({ is_churned: true })
      return
    }

    const newVal = memberId === '__none__' ? null : memberId
    const patch = { [field]: newVal }
    if (field === 'npl_member_id') patch.is_churned = false
    if (newVal !== value || field === 'npl_member_id') onSave(patch)
  }

  if (isChurned && field !== 'npl_member_id') {
    return (
      <span className="inline-flex items-center text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 font-semibold">
        Churned
      </span>
    )
  }

  if (open) {
    return (
      <Select
        defaultOpen
        value={value || '__none__'}
        onValueChange={handleChange}
        onOpenChange={o => { if (!o) setOpen(false) }}
      >
        <SelectTrigger
          className="h-7 text-xs border-blue-400 min-w-[120px]"
          onClick={e => e.stopPropagation()}
        >
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent onClick={e => e.stopPropagation()}>
          {field === 'npl_member_id' && (
            <SelectItem value="__churned__">
              <span className="text-red-600 text-xs font-semibold">Churned</span>
            </SelectItem>
          )}
          <SelectItem value="__none__"><span className="text-gray-400 text-xs">— Unassigned</span></SelectItem>
          {members.map(m => (
            <SelectItem key={m.id} value={m.id} className="text-xs">
              {m.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <span
      className={`cursor-pointer text-xs px-1.5 py-0.5 rounded transition-colors ${isChurned
        ? 'bg-red-100 text-red-700 hover:bg-red-200 font-semibold'
        : currentMember
          ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
          : 'text-gray-300 hover:bg-gray-100 hover:text-gray-500'
        }`}
      onClick={e => { e.stopPropagation(); setOpen(true) }}
      title="Click to assign member"
    >
      {isChurned ? 'Churned' : (currentMember ? currentMember.name : '—')}
    </span>
  )
}

function EditableEmailCell({ value, onSave }) {
  const [isEditing, setIsEditing] = useState(false)
  const [temp, setTemp] = useState(value || '')

  const handleBlur = () => {
    setIsEditing(false)
    if (temp !== (value || '')) onSave(temp)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleBlur()
    if (e.key === 'Escape') {
      setIsEditing(false)
      setTemp(value || '')
    }
  }

  if (isEditing) {
    return (
      <Input
        autoFocus
        value={temp}
        onChange={e => setTemp(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="h-7 text-xs border-blue-400 min-w-[150px]"
        onClick={e => e.stopPropagation()}
      />
    )
  }

  return (
    <div
      className={`cursor-pointer px-2 py-1 rounded transition-colors text-xs truncate max-w-[200px] ${value ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-300 hover:bg-gray-50'}`}
      onClick={e => { e.stopPropagation(); setIsEditing(true) }}
      title="Click to edit emails"
    >
      {value || 'Add emails...'}
    </div>
  )
}

function DashboardPageContent() {
  const router = useRouter()
  const { data: clients, mutate, error } = useSWR('/api/clients', swrFetcher)
  const { data: membersData } = useSWR('/api/team', swrFetcher)
  const [search, setSearch] = useState('')
  const [filterService, setFilterService] = useState([])
  const [filterNpl, setFilterNpl] = useState('all')
  const [filterTpl, setFilterTpl] = useState('all')
  const [filterCpl, setFilterCpl] = useState('all')
  const [filterStatus, setFilterStatus] = useState('active') // 'all' | 'active' | 'churned'
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', service_type: [], portal_password: '', email: '', website_access_id: '' })
  const [saving, setSaving] = useState(false)
  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || ''

  const clientList = safeArray(clients)
  const members = safeArray(membersData)

  const filtered = useMemo(() => {
    let list = clientList

    // Status filter
    if (filterStatus === 'active') list = list.filter(c => c?.is_churned !== true)
    else if (filterStatus === 'churned') list = list.filter(c => c?.is_churned === true)

    // Text search across name, email (coerce to string to guard against array-typed fields)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c => {
        const srv = Array.isArray(c?.service_type) ? c.service_type.join(', ') : (c?.service_type || '')
        const name = String(c?.name || '').toLowerCase()
        const email = Array.isArray(c?.email) ? c.email.join(', ').toLowerCase() : String(c?.email || '').toLowerCase()
        return name.includes(q) || srv.toLowerCase().includes(q) || email.includes(q)
      })
    }

    // Service type filter (multi-select, OR logic within)
    if (filterService.length > 0) {
      list = list.filter(c => {
        const types = Array.isArray(c?.service_type) ? c.service_type : (c?.service_type ? [c.service_type] : [])
        return filterService.some(s => types.includes(s))
      })
    }

    // NPL member filter
    if (filterNpl !== 'all') {
      list = list.filter(c => filterNpl === '__none__' ? !c?.npl_member_id : c?.npl_member_id === filterNpl)
    }

    // TPL member filter
    if (filterTpl !== 'all') {
      list = list.filter(c => filterTpl === '__none__' ? !c?.tpl_member_id : c?.tpl_member_id === filterTpl)
    }

    // CPL member filter
    if (filterCpl !== 'all') {
      list = list.filter(c => filterCpl === '__none__' ? !c?.cpl_member_id : c?.cpl_member_id === filterCpl)
    }

    return list.sort((a, b) => {
      const ac = a?.is_churned === true ? 1 : 0
      const bc = b?.is_churned === true ? 1 : 0
      return ac - bc
    })
  }, [clientList, search, filterService, filterNpl, filterTpl, filterCpl, filterStatus])

  const anyFilter = search.trim() || filterService.length > 0 || filterNpl !== 'all' || filterTpl !== 'all' || filterCpl !== 'all' || filterStatus !== 'active'

  const clearFilters = () => {
    setSearch('')
    setFilterService([])
    setFilterNpl('all')
    setFilterTpl('all')
    setFilterCpl('all')
    setFilterStatus('active')
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    const res = await apiFetch('/api/clients', {
      method: 'POST',
      body: JSON.stringify(form)
    })
    if (res.ok) {
      setShowAdd(false)
      setForm({ name: '', service_type: [], portal_password: '', email: '', website_access_id: '' })
      mutate()
    }
    setSaving(false)
  }

  const updateClientFields = async (clientId, patch) => {
    // Optimistic local update
    mutate(
      clientList.map(c => c.id === clientId ? { ...c, ...patch } : c),
      false
    )
    try {
      await apiFetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        body: JSON.stringify(patch)
      })
    } catch (e) {
      console.error('updateClientFields failed', e)
    }
    mutate()
  }

  if (!clients && !error) return <div className="p-8 text-gray-400">Loading dashboard...</div>

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-gray-500 text-sm">
              {clientList.filter(c => c?.is_active !== false && c?.is_churned !== true).length} active clients
            </p>
            {clientList.filter(c => c?.is_churned === true).length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                {clientList.filter(c => c?.is_churned === true).length} churned
              </span>
            )}
          </div>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Client
        </Button>
      </div>

      {/* Search + Filters */}
      <div className="mb-4 space-y-2">
        {/* Row 1: Search + Status toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search clients..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Status toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
            {[['all', 'All'], ['active', 'Active'], ['churned', 'Churned']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFilterStatus(val)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  filterStatus === val
                    ? val === 'churned' ? 'bg-red-500 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {anyFilter && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 px-2 py-1.5 rounded hover:bg-gray-100 transition-all"
            >
              <X className="w-3 h-3" /> Clear filters
            </button>
          )}
        </div>

        {/* Row 2: Column filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Service Type — multi-select */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`h-8 px-3 text-xs rounded-md border flex items-center gap-1.5 transition-all ${
                filterService.length > 0 ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
              }`}>
                {filterService.length === 0 ? 'Service Type' : filterService.length === 1 ? filterService[0] : `${filterService.length} services`}
                <span className="text-gray-400">▾</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-xs">Filter by Service</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {SERVICE_TYPES.map(s => (
                <DropdownMenuCheckboxItem
                  key={s}
                  checked={filterService.includes(s)}
                  onCheckedChange={checked => setFilterService(prev => checked ? [...prev, s] : prev.filter(x => x !== s))}
                  className="text-xs"
                >
                  {s}
                </DropdownMenuCheckboxItem>
              ))}
              {filterService.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <button onClick={() => setFilterService([])} className="w-full text-left px-2 py-1 text-[10px] text-gray-400 hover:text-red-500">Clear</button>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* NPL filter */}
          <Select value={filterNpl} onValueChange={setFilterNpl}>
            <SelectTrigger className={`h-8 text-xs w-36 ${filterNpl !== 'all' ? 'border-blue-300 bg-blue-50 text-blue-700 font-semibold' : 'border-gray-200'}`}>
              <SelectValue placeholder="NPL" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs text-gray-500">All NPL</SelectItem>
              <SelectItem value="__none__" className="text-xs text-gray-400">— Unassigned</SelectItem>
              {members.map(m => <SelectItem key={m.id} value={m.id} className="text-xs">{m.name}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* TPL filter */}
          <Select value={filterTpl} onValueChange={setFilterTpl}>
            <SelectTrigger className={`h-8 text-xs w-36 ${filterTpl !== 'all' ? 'border-blue-300 bg-blue-50 text-blue-700 font-semibold' : 'border-gray-200'}`}>
              <SelectValue placeholder="TPL" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs text-gray-500">All TPL</SelectItem>
              <SelectItem value="__none__" className="text-xs text-gray-400">— Unassigned</SelectItem>
              {members.map(m => <SelectItem key={m.id} value={m.id} className="text-xs">{m.name}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* CPL filter */}
          <Select value={filterCpl} onValueChange={setFilterCpl}>
            <SelectTrigger className={`h-8 text-xs w-36 ${filterCpl !== 'all' ? 'border-blue-300 bg-blue-50 text-blue-700 font-semibold' : 'border-gray-200'}`}>
              <SelectValue placeholder="CPL" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs text-gray-500">All CPL</SelectItem>
              <SelectItem value="__none__" className="text-xs text-gray-400">— Unassigned</SelectItem>
              {members.map(m => <SelectItem key={m.id} value={m.id} className="text-xs">{m.name}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Active filter count badge */}
          {anyFilter && (
            <span className="text-[10px] text-gray-400">
              {filtered.length} of {clientList.length} clients
            </span>
          )}
        </div>
      </div>

      {/* Clients Table */}
      <Card className="border border-gray-200">
        <div className="overflow-x-auto">
          <table className="text-sm" style={{ minWidth: '1300px', width: '100%' }}>
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 whitespace-nowrap" style={{ minWidth: '180px' }}>Client Name</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 whitespace-nowrap" style={{ minWidth: '200px' }}>Service Type</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 whitespace-nowrap" style={{ minWidth: '140px' }} title="NPL: Assigned member">NPL</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 whitespace-nowrap" style={{ minWidth: '140px' }} title="TPL: Assigned member">TPL</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 whitespace-nowrap" style={{ minWidth: '140px' }} title="CPL: Assigned member">CPL</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 whitespace-nowrap" style={{ minWidth: '110px' }}>Active Tasks</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 whitespace-nowrap" style={{ minWidth: '220px' }} title="Google Workspace email IDs with access">Google Access ID</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 whitespace-nowrap" style={{ minWidth: '220px' }} title="Email ID with access to the website/CMS">Website Access ID</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 whitespace-nowrap" style={{ minWidth: '200px' }}>Portal</th>
                <th className="px-5 py-3.5" style={{ minWidth: '80px' }}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-10 text-center text-gray-400">
                    {clientList.length === 0 ? 'No clients yet. Add your first client!' : 'No clients match your filters.'}
                  </td>
                </tr>
              ) : filtered.map(client => (
                <tr
                  key={client.id}
                  className={`cursor-pointer transition-colors ${client?.is_churned ? 'bg-red-50/30 hover:bg-red-50/60' : 'hover:bg-gray-50/80'}`}
                  onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                >
                  {/* Client Name */}
                  <td className="px-5 py-4">
                    <div className={`font-semibold whitespace-nowrap ${client?.is_churned ? 'text-red-700' : 'text-gray-900'}`}>{client.name}</div>
                  </td>

                  {/* Service Type */}
                  <td className="px-5 py-4">
                    {client?.is_churned ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Churned</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {(Array.isArray(client.service_type) ? client.service_type : (client.service_type ? [client.service_type] : [])).map(s => (
                          <span key={s} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 whitespace-nowrap">{s}</span>
                        ))}
                        {(!client.service_type || (Array.isArray(client.service_type) && client.service_type.length === 0)) && (
                          <span className="text-sm text-gray-300">—</span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* NPL — member dropdown */}
                  <td className="px-5 py-4">
                    <MemberSelectCell
                      client={client}
                      field="npl_member_id"
                      members={members}
                      onSave={patch => updateClientFields(client.id, patch)}
                    />
                  </td>

                  {/* TPL — member dropdown */}
                  <td className="px-5 py-4">
                    <MemberSelectCell
                      client={client}
                      field="tpl_member_id"
                      members={members}
                      onSave={patch => updateClientFields(client.id, patch)}
                    />
                  </td>

                  {/* CPL — member dropdown */}
                  <td className="px-5 py-4">
                    <MemberSelectCell
                      client={client}
                      field="cpl_member_id"
                      members={members}
                      onSave={patch => updateClientFields(client.id, patch)}
                    />
                  </td>

                  {/* Active Tasks */}
                  <td className="px-5 py-4">
                    <span className={`text-sm font-semibold ${
                      (client.task_count || 0) > 0 ? 'text-gray-800' : 'text-gray-300'
                    }`}>{client.task_count || 0}</span>
                  </td>

                  {/* Google Access ID */}
                  <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                    <EditableEmailCell
                      value={client.email}
                      onSave={v => updateClientFields(client.id, { email: v })}
                    />
                  </td>

                  {/* Website Access ID */}
                  <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                    <EditableEmailCell
                      value={client.website_access_id}
                      onSave={v => updateClientFields(client.id, { website_access_id: v })}
                    />
                  </td>

                  {/* Portal Link */}
                  <td className="px-5 py-4">
                    <a
                      href={`${BASE_URL}/portal/${client.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-xs font-medium whitespace-nowrap hover:underline"
                    >
                      /portal/{client.slug} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </td>

                  {/* View button */}
                  <td className="px-5 py-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-gray-500 hover:text-blue-600 whitespace-nowrap"
                      onClick={e => { e.stopPropagation(); router.push(`/dashboard/clients/${client.id}`) }}
                    >
                      View →
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Client Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label>Client Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Bandolier" />
            </div>
            <div className="space-y-2">
              <Label>Service Type</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background flex items-center gap-1.5 text-left">
                    {form.service_type.length ? form.service_type.join(', ') : <span className="text-gray-400">Select services…</span>}
                    <span className="ml-auto text-gray-400">▾</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel className="text-xs">Select Services</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {SERVICE_TYPES.map(s => (
                    <DropdownMenuCheckboxItem
                      key={s}
                      checked={form.service_type.includes(s)}
                      onCheckedChange={(checked) => {
                        setForm(f => ({ ...f, service_type: checked ? [...f.service_type, s] : f.service_type.filter(x => x !== s) }))
                      }}
                      className="text-xs"
                    >
                      {s}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="space-y-2">
              <Label>Portal Password <span className="text-gray-400 text-xs">(optional)</span></Label>
              <Input value={form.portal_password} onChange={e => setForm(f => ({ ...f, portal_password: e.target.value }))} placeholder="Leave empty for public access" />
            </div>
            <div className="space-y-2">
              <Label>Google Access ID <span className="text-gray-400 text-xs">(optional, comma-separated)</span></Label>
              <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="e.g. john@gmail.com, sara@gmail.com" />
            </div>
            <div className="space-y-2">
              <Label>Website Access ID <span className="text-gray-400 text-xs">(optional — defaults to Google Access ID)</span></Label>
              <Input value={form.website_access_id} onChange={e => setForm(f => ({ ...f, website_access_id: e.target.value }))} placeholder="e.g. john@gmail.com" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Adding...' : 'Add Client'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400">Loading dashboard...</div>}>
      <DashboardPageContent />
    </Suspense>
  )
}
