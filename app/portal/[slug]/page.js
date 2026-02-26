'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ExternalLink, BarChart3, CheckCircle2, Loader2, Lock, ChevronDown, ChevronRight, Link2, FileText } from 'lucide-react'

const statusColors = {
  'Completed':      'bg-green-100 text-green-700 border-green-200',
  'In Progress':    'bg-blue-100 text-blue-700 border-blue-200',
  'To Be Approved': 'bg-amber-100 text-amber-700 border-amber-200',
  'Blocked':        'bg-red-100 text-red-700 border-red-200',
  'To Be Started':  'bg-gray-100 text-gray-600 border-gray-200',
  'Recurring':      'bg-purple-100 text-purple-700 border-purple-200',
}
const approvalColors = {
  'Approved':         'bg-green-500 text-white hover:bg-green-600',
  'Required Changes': 'bg-red-500 text-white hover:bg-red-600',
  'Pending Review':   'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200',
}
const approvalBadge = {
  'Approved':         'bg-green-100 text-green-700 border-green-200',
  'Required Changes': 'bg-red-100 text-red-700 border-red-200',
  'Pending Review':   'bg-gray-100 text-gray-500 border-gray-200',
}
const topicApprovalColors = {
  'Approved':  'bg-green-500 text-white hover:bg-green-600',
  'Rejected':  'bg-red-500 text-white hover:bg-red-600',
  'Pending':   'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200',
}
const blogStatusColors = {
  'Published':         'bg-green-100 text-green-700 border-green-200',
  'Sent for Approval': 'bg-amber-100 text-amber-700 border-amber-200',
  'In Progress':       'bg-blue-100 text-blue-700 border-blue-200',
  'Draft':             'bg-gray-100 text-gray-600 border-gray-200',
  'Rejected':          'bg-red-100 text-red-700 border-red-200',
}
const typeColors = {
  'Monthly SEO Report': 'bg-blue-50 text-blue-700',
  'Weekly Update':      'bg-green-50 text-green-700',
  'Audit Report':       'bg-purple-50 text-purple-700',
  'Ad Performance':     'bg-orange-50 text-orange-700',
  'Custom':             'bg-gray-50 text-gray-600',
}

const APPROVAL_OPTIONS = ['Pending Review', 'Approved', 'Required Changes']
const TOPIC_APPROVAL_OPTIONS = ['Pending', 'Approved', 'Rejected']
const BLOG_APPROVAL_OPTIONS = ['Pending Review', 'Approved', 'Changes Required']

function ApprovalButton({ taskId, current, slug, onUpdate }) {
  const [loading, setLoading]   = useState(false)
  const [open, setOpen]         = useState(false)
  const val = current || 'Pending Review'

  const set = async (choice) => {
    setOpen(false)
    if (choice === val) return
    setLoading(true)
    try {
      const res = await fetch(`/api/portal/${slug}/tasks/${taskId}/approval`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_approval: choice }),
      })
      if (res.ok) onUpdate(taskId, choice)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${approvalColors[val]}`}
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
        {val}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden min-w-[160px]">
            {APPROVAL_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => set(opt)}
                className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 flex items-center gap-2 transition-colors ${val === opt ? 'bg-gray-50' : ''}`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  opt === 'Approved' ? 'bg-green-500' :
                  opt === 'Required Changes' ? 'bg-red-500' : 'bg-gray-300'
                }`} />
                {opt}
                {val === opt && <span className="ml-auto text-gray-400">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Topic approval button for content calendar
function TopicApprovalButton({ contentId, current, slug, onUpdate }) {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const val = current || 'Pending'

  const set = async (choice) => {
    setOpen(false)
    if (choice === val) return
    setLoading(true)
    try {
      const res = await fetch(`/api/portal/${slug}/content/${contentId}/approval`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_approval_status: choice }),
      })
      if (res.ok) onUpdate(contentId, 'topic_approval_status', choice)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${topicApprovalColors[val]}`}
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
        {val}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden min-w-[140px]">
            {TOPIC_APPROVAL_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => set(opt)}
                className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 flex items-center gap-2 transition-colors ${val === opt ? 'bg-gray-50' : ''}`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  opt === 'Approved' ? 'bg-green-500' :
                  opt === 'Rejected' ? 'bg-red-500' : 'bg-gray-300'
                }`} />
                {opt}
                {val === opt && <span className="ml-auto text-gray-400">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Blog approval button for content calendar
function BlogApprovalButton({ contentId, current, slug, onUpdate }) {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const val = current || 'Pending Review'

  const set = async (choice) => {
    setOpen(false)
    if (choice === val) return
    setLoading(true)
    try {
      const res = await fetch(`/api/portal/${slug}/content/${contentId}/approval`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blog_approval_status: choice }),
      })
      if (res.ok) onUpdate(contentId, 'blog_approval_status', choice)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${approvalColors[val]}`}
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
        {val}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden min-w-[160px]">
            {BLOG_APPROVAL_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => set(opt)}
                className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 flex items-center gap-2 transition-colors ${val === opt ? 'bg-gray-50' : ''}`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  opt === 'Approved' ? 'bg-green-500' :
                  opt === 'Changes Required' ? 'bg-red-500' : 'bg-gray-300'
                }`} />
                {opt}
                {val === opt && <span className="ml-auto text-gray-400">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function ClientPortalPage() {
  const { slug } = useParams()
  const [data, setData]                       = useState(null)
  const [loading, setLoading]                 = useState(true)
  const [error, setError]                     = useState(null)
  const [needsPassword, setNeedsPassword]     = useState(false)
  const [password, setPassword]               = useState('')
  const [passwordError, setPasswordError]     = useState('')
  const [clientName, setClientName]           = useState('')
  const [collapsed, setCollapsed]             = useState({})
  const [tasks, setTasks]                     = useState([])
  const [content, setContent]                 = useState([])
  const [portalPassword, setPortalPassword]   = useState(null)

  const fetchPortal = async (pwd = null) => {
    const headers = { 'Content-Type': 'application/json' }
    if (pwd) headers['X-Portal-Password'] = pwd
    const res  = await fetch(`/api/portal/${slug}`, { headers })
    const json = await res.json()
    if (res.status === 401 && json.has_password) {
      setNeedsPassword(true); setClientName(json.client_name || ''); setLoading(false); return
    }
    if (!res.ok) { setError(json.error || 'Failed to load portal'); setLoading(false); return }
    setData(json)
    setTasks(json.tasks || [])
    setContent(json.content || [])
    setNeedsPassword(false)
    setLoading(false)
    if (pwd) setPortalPassword(pwd)
  }

  useEffect(() => { if (slug) fetchPortal() }, [slug])

  const handlePasswordSubmit = async (e) => {
    e.preventDefault(); setPasswordError(''); setLoading(true)
    await fetchPortal(password)
    setLoading(false)
    if (needsPassword) setPasswordError('Incorrect password')
  }

  const handleApprovalUpdate = (taskId, newApproval) => {
    setTasks(ts => ts.map(t => t.id === taskId ? { ...t, client_approval: newApproval } : t))
  }

  const handleContentApprovalUpdate = (contentId, field, value) => {
    setContent(cs => cs.map(c => c.id === contentId ? { ...c, [field]: value } : c))
  }

  const toggleCategory = (cat) => setCollapsed(c => ({ ...c, [cat]: !c[cat] }))

  // ── Password gate ──────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
    </div>
  )

  if (needsPassword) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">{clientName || 'Client Portal'}</h1>
          <p className="text-slate-400 mt-1">This portal is password protected</p>
        </div>
        <Card className="border-0 shadow-2xl">
          <CardContent className="p-6">
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Password</label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Enter portal password" required className="mt-1" autoFocus />
              </div>
              {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
              <Button type="submit" className="w-full">Access Portal</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center"><div className="text-gray-300 text-6xl mb-4">404</div><p className="text-gray-500">{error}</p></div>
    </div>
  )
  if (!data) return null

  const { client, reports } = data
  const completed  = tasks.filter(t => t.status === 'Completed').length
  const progress   = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0
  const approved   = tasks.filter(t => t.client_approval === 'Approved').length
  const changes    = tasks.filter(t => t.client_approval === 'Required Changes').length
  const pending    = tasks.filter(t => !t.client_approval || t.client_approval === 'Pending Review').length

  const byCategory = tasks.reduce((acc, task) => {
    const cat = task.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(task)
    return acc
  }, {})

  const lastUpdated = tasks.length > 0
    ? new Date(Math.max(...tasks.map(t => new Date(t.updated_at || t.created_at)))).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">{client.name.charAt(0)}</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-900">{client.name}</h1>
              <p className="text-xs text-gray-400">{client.service_type} · CubeHQ</p>
            </div>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">{client.service_type}</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Progress + stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="md:col-span-3 bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Overall Progress</h2>
              <span className="text-sm text-gray-500">{completed}/{tasks.length} completed</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div className="h-3 rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#3b82f6,#1d4ed8)' }} />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs text-gray-400">{progress}% complete</span>
              {lastUpdated && <span className="text-xs text-gray-400">Updated {lastUpdated}</span>}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-2 justify-center">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Approved</span>
              <span className="font-bold text-green-600">{approved}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Changes Req.</span>
              <span className="font-bold text-red-500">{changes}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Pending Review</span>
              <span className="font-bold text-gray-400">{pending}</span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="progress">
          <TabsList className="mb-6">
            <TabsTrigger value="progress" className="gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Project Progress
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-1.5">
              <BarChart3 className="w-4 h-4" /> Reports {reports.length > 0 && `(${reports.length})`}
            </TabsTrigger>
          </TabsList>

          {/* ── Progress Tab ────────────────────────────────────────────── */}
          <TabsContent value="progress">
            {/* Legend */}
            <div className="flex items-center gap-4 mb-4 px-1">
              <p className="text-xs text-gray-500 mr-2">Your approval:</p>
              {[['Approved','bg-green-500'],['Required Changes','bg-red-500'],['Pending Review','bg-gray-300']].map(([l,c]) => (
                <span key={l} className="flex items-center gap-1 text-xs text-gray-500">
                  <span className={`w-2 h-2 rounded-full ${c}`} />{l}
                </span>
              ))}
            </div>

            {Object.keys(byCategory).length === 0 ? (
              <div className="text-center py-16 text-gray-400">No tasks yet.</div>
            ) : (
              <div className="space-y-3">
                {Object.entries(byCategory).map(([category, catTasks]) => (
                  <div key={category} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <button className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors" onClick={() => toggleCategory(category)}>
                      <div className="flex items-center gap-2.5">
                        {collapsed[category] ? <ChevronRight className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        <span className="font-semibold text-gray-800 text-sm">{category}</span>
                        <span className="text-xs text-gray-400">({catTasks.length})</span>
                      </div>
                      <span className="text-xs text-gray-400">{catTasks.filter(t => t.status === 'Completed').length}/{catTasks.length} done</span>
                    </button>

                    {!collapsed[category] && (
                      <table className="w-full text-sm border-t border-gray-100">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="text-left px-5 py-2 text-xs font-semibold text-gray-500">Task</th>
                            <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Status</th>
                            <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">ETA</th>
                            <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Notes</th>
                            <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Link</th>
                            <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Your Approval</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {catTasks.map(task => (
                            <tr key={task.id} className="hover:bg-gray-50">
                              <td className="px-5 py-2.5 font-medium text-gray-800 text-sm">{task.title}</td>
                              <td className="px-4 py-2.5">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[task.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                  {task.status}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-xs text-gray-500">{task.eta_end || '—'}</td>
                              <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[160px]">{task.remarks || '—'}</td>
                              <td className="px-4 py-2.5">
                                {task.link_url ? (
                                  <a href={task.link_url} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium transition-colors">
                                    <Link2 className="w-3 h-3" /> Open
                                  </a>
                                ) : <span className="text-gray-300 text-xs">—</span>}
                              </td>
                              <td className="px-4 py-2.5">
                                <ApprovalButton
                                  taskId={task.id}
                                  current={task.client_approval}
                                  slug={slug}
                                  onUpdate={handleApprovalUpdate}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Reports Tab ─────────────────────────────────────────────── */}
          <TabsContent value="reports">
            {reports.length === 0 ? (
              <div className="text-center py-16">
                <BarChart3 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400">No reports yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reports.map(report => (
                  <Card key={report.id} className="border border-gray-200 hover:shadow-md transition-all">
                    <CardContent className="p-5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mb-3 ${typeColors[report.report_type] || 'bg-gray-50 text-gray-600'}`}>
                        {report.report_type}
                      </span>
                      <h3 className="font-semibold text-gray-900">{report.title}</h3>
                      <p className="text-sm text-gray-400 mt-0.5">{report.report_date}</p>
                      {report.notes && <p className="text-sm text-gray-500 mt-2">{report.notes}</p>}
                      <a href={report.report_url} target="_blank" rel="noopener noreferrer"
                         className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                        View Report <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-8 text-center text-xs text-gray-300">Powered by CubeHQ</div>
      </div>
    </div>
  )
}
