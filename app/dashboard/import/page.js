'use client'
import { useState, useRef, useEffect } from 'react'
import useSWR from 'swr'
import { apiFetch, swrFetcher } from '@/lib/middleware/auth'
import { safeArray } from '@/lib/safe'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, CheckCircle, AlertCircle, Loader2, Key, FileText, ListTodo } from 'lucide-react'
import { rowToContent, getMappedHeaders } from '@/lib/import/content-mapping'
import { rowToTask, rowToClickUpTask, TASK_PREVIEW_COLS } from '@/lib/import/task-mapping'
import { rowToEmailTask, EMAIL_PREVIEW_COLS } from '@/lib/import/email-mapping'
import { rowToPaidTask, PAID_PREVIEW_COLS } from '@/lib/import/paid-mapping'
import { rowToSocialTask, SOCIAL_PREVIEW_COLS } from '@/lib/import/social-mapping'


function parseSpreadsheet(text) {
  if (!text || !text.trim()) return null

  const firstLine = text.split(/\r?\n/)[0] || ''
  const sep = firstLine.includes('\t') ? '\t' : ','

  function splitLines(raw) {
    const lines = []
    let cur = '', inQ = false
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i]
      if (ch === '"') {
        // Handle escaped quotes: if we are in a quote and the next char is also a quote, keep both and stay inQ
        if (inQ && raw[i + 1] === '"') {
          cur += '""'
          i++
          continue
        }
        inQ = !inQ
      }
      if ((ch === '\n' || (ch === '\r' && raw[i + 1] === '\n')) && !inQ) {
        if (ch === '\r') i++
        lines.push(cur)
        cur = ''
      } else {
        cur += ch
      }
    }
    if (cur.trim()) lines.push(cur)
    return lines
  }

  function tokenize(line, s) {
    const cells = []
    let i = 0
    while (i <= line.length) {
      if (line[i] === '"') {
        let cell = ''; i++
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') { cell += '"'; i += 2 }
          else if (line[i] === '"') { i++; break }
          else { cell += line[i++] }
        }
        cells.push(cell.trim())
        if (line[i] === s) i++
      } else {
        const end = line.indexOf(s, i)
        if (end === -1) { cells.push(line.slice(i).trim()); break }
        else { cells.push(line.slice(i, end).trim()); i = end + 1 }
      }
    }
    return cells
  }

  const lines = splitLines(text)
  if (lines.length < 2) return null

  const rawHeaders = tokenize(lines[0], sep)
  const headers = rawHeaders.map(h => h.replace(/^["']|["']$/g, '').trim())
  const validHeaders = headers.filter(h => h)
  if (validHeaders.length === 0) return null

  const rows = lines.slice(1).map(line => {
    const vals = tokenize(line, sep)
    const obj = {}
    headers.forEach((h, i) => {
      if (h) obj[h] = (vals[i] || '').replace(/^["']|["']$/g, '').trim()
    })
    return obj
  }).filter(r => Object.values(r).some(v => v && String(v).trim()))

  return { headers: validHeaders, rows }
}


// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function ImportPage() {
  const { data: clientsData } = useSWR('/api/clients?lite=1', swrFetcher)
  const { data: membersData } = useSWR('/api/team', swrFetcher)

  const clients = Array.isArray(clientsData) ? clientsData : []
  const members = Array.isArray(membersData) ? membersData : []

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Import</h1>
        <p className="text-gray-500 text-sm mt-1">Import tasks or content calendar items from CSV / Google Sheets, or from ClickUp</p>
      </div>
      <Tabs defaultValue="tasks-csv" className="w-full">
        <TabsList className="mb-8 p-1.5 bg-white border-2 border-blue-100 rounded-xl flex flex-wrap h-auto gap-1.5 shadow-lg">
          <TabsTrigger value="tasks-csv" className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm text-gray-500 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all hover:bg-gray-50 hover:text-gray-800">
            <ListTodo className="w-4 h-4" />SEO Tasks
          </TabsTrigger>
          <TabsTrigger value="email-csv" className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm text-gray-500 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all hover:bg-gray-50 hover:text-gray-800">
            <ListTodo className="w-4 h-4" />Email Tasks
          </TabsTrigger>
          <TabsTrigger value="paid-csv" className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm text-gray-500 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all hover:bg-gray-50 hover:text-gray-800">
            <ListTodo className="w-4 h-4" />Paid Ads Tasks
          </TabsTrigger>
          <TabsTrigger value="social-csv" className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm text-gray-500 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all hover:bg-gray-50 hover:text-gray-800">
            <ListTodo className="w-4 h-4" />Social Media Tasks
          </TabsTrigger>
          <TabsTrigger value="content-csv" className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm text-gray-500 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all hover:bg-gray-50 hover:text-gray-800">
            <FileText className="w-4 h-4" />Content Calendar
          </TabsTrigger>
          <TabsTrigger value="clickup-csv" className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm text-gray-500 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all hover:bg-gray-50 hover:text-gray-800">
            <Key className="w-4 h-4" />ClickUp CSV
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks-csv">
          <TaskCSVImport clients={clients} />
        </TabsContent>

        <TabsContent value="email-csv">
          <EmailCSVImport clients={clients} />
        </TabsContent>

        <TabsContent value="paid-csv">
          <PaidCSVImport clients={clients} />
        </TabsContent>

        <TabsContent value="social-csv">
          <SocialCSVImport clients={clients} />
        </TabsContent>

        <TabsContent value="content-csv">
          <ContentCSVImport clients={clients} />
        </TabsContent>

        <TabsContent value="clickup-csv">
          <ClickUpCSVImport clients={clients} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED IMPORT UI SHELL
// ═══════════════════════════════════════════════════════════════════════════════

function ImportShell({
  title, hint, clients, selectedClient, setSelectedClient,
  rawData, setRawData, parsed, parseError,
  onFile, onParse, onImport,
  importing, result, setResult,
  previewCols,
  actionLabel,
  customPreview,
}) {
  const [pasteMode, setPasteMode] = useState(true)
  const [clientSearch, setClientSearch] = useState('')
  const [showClientList, setShowClientList] = useState(false)
  const clientDropRef = useRef(null)

  const filteredClients = safeArray(clients).filter(c =>
    !clientSearch.trim() ||
    c?.name?.toLowerCase().includes(clientSearch.trim().toLowerCase())
  )

  const selectedClientName = safeArray(clients).find(c => c.id === selectedClient)?.name || ''

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (clientDropRef.current && !clientDropRef.current.contains(e.target)) {
        setShowClientList(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: controls */}
      <Card className="border border-gray-200">
        <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {result && (
            <div className={`flex items-start gap-3 p-3 rounded-lg border ${result.error ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              {result.error
                ? <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                : <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />}
              <div className="flex-1 min-w-0">
                {result.error
                  ? <p className="text-sm font-medium text-red-700">{result.error}</p>
                  : <>
                    <p className="text-sm font-medium text-green-800">{result.success} {actionLabel} imported successfully</p>
                    {result.failed > 0 && <p className="text-xs text-red-500 mt-0.5">{result.failed} rows skipped (missing required fields)</p>}
                    {safeArray(result.errors).slice(0, 3).map((e, i) => (
                      <p key={i} className="text-xs text-red-400 mt-0.5 truncate">{String(e.title ?? (e.index != null ? `Row ${e.index + 1}` : 'Error'))}: {String(e.error ?? e)}</p>
                    ))}
                  </>}
              </div>
              <Button size="sm" variant="outline" onClick={() => setResult(null)} className="ml-auto flex-shrink-0 text-xs">Clear</Button>
            </div>
          )}
          {parseError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-700">{parseError}</p>
            </div>
          )}
          <div ref={clientDropRef}>
            <label className="text-sm font-medium">Target Client *</label>
            {/* Searchable combobox */}
            <div className="relative mt-1">
              <Input
                value={showClientList ? clientSearch : selectedClientName}
                onChange={e => { setClientSearch(e.target.value); setShowClientList(true) }}
                onFocus={() => { setClientSearch(''); setShowClientList(true) }}
                placeholder={selectedClientName || 'Search clients...'}
                className="mt-0"
              />
              {showClientList && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                  {filteredClients.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-gray-400">No clients found</div>
                  ) : filteredClients.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedClient(c.id)
                        setClientSearch('')
                        setShowClientList(false)
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors ${selectedClient === c.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                        }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-4">
            <Button
              size="lg"
              variant={!pasteMode ? 'default' : 'outline'}
              onClick={() => setPasteMode(false)}
              className={`flex-1 h-12 text-sm font-semibold transition-all ${!pasteMode ? 'shadow-md ring-2 ring-blue-500 ring-offset-2' : ''}`}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload CSV
            </Button>
            <Button
              size="lg"
              variant={pasteMode ? 'default' : 'outline'}
              onClick={() => setPasteMode(true)}
              className={`flex-1 h-12 text-sm font-semibold transition-all ${pasteMode ? 'shadow-md ring-2 ring-blue-500 ring-offset-2' : ''}`}
            >
              <FileText className="w-4 h-4 mr-2" />
              Paste from Sheets
            </Button>
          </div>
          {parsed?.unsupported && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-[10px] leading-tight">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-500 mt-0.5" />
              <div>
                <p className="font-bold uppercase tracking-wider mb-0.5">Column Mapping Warning</p>
                <p>{parsed.unsupportedMsg || 'Some rows may not map correctly. Check the preview and ensure key columns are present.'}</p>
              </div>
            </div>
          )}
          {hint && !parsed && (
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-700">{hint}</div>
          )}
          {!pasteMode ? (
            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <Upload className="w-7 h-7 text-gray-300 mb-1" />
              <span className="text-sm text-gray-400">Click to upload .csv or .tsv</span>
              <input type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={onFile} />
            </label>
          ) : (
            <div className="space-y-2">
              <textarea
                value={rawData}
                onChange={e => setRawData(e.target.value)}
                onPaste={e => {
                  const html = e.clipboardData.getData('text/html')
                  if (!html || !html.includes('<table')) return

                  e.preventDefault()
                  try {
                    const parser = new DOMParser()
                    const doc = parser.parseFromString(html, 'text/html')
                    const table = doc.querySelector('table')
                    if (!table) return

                    const rows = Array.from(table.querySelectorAll('tr'))
                    const tsv = rows.map(tr => {
                      const cells = Array.from(tr.querySelectorAll('td, th'))
                      return cells.map(td => {
                        let val = (td.innerText || td.textContent || '').trim()
                        const link = td.querySelector('a')
                        if (link && link.href && link.href.startsWith('http')) {
                          val = link.href
                        }
                        // If cell contains a tab or newline, wrap it in quotes and escape internal quotes
                        if (val.includes('\t') || val.includes('\n') || val.includes('"')) {
                          val = `"${val.replace(/"/g, '""')}"`
                        }
                        return val
                      }).join('\t')
                    }).join('\n')

                    setRawData(tsv)
                    setTimeout(() => onParse(tsv), 10)
                  } catch (err) {
                    console.error('Paste intercept failed', err)
                    const text = e.clipboardData.getData('text/plain')
                    setRawData(text)
                  }
                }}
                placeholder="Paste tab-separated data from Google Sheets here..."
                className="w-full h-36 p-3 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 font-mono resize-none"
              />
              <Button size="sm" onClick={() => onParse(rawData)} disabled={!rawData.trim()}>Parse</Button>
            </div>
          )}
          {parsed && (
            <Button
              className="w-full"
              onClick={onImport}
              disabled={importing || selectedClient === '__none__'}
            >
              {importing
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</>
                : `Import ${parsed.validCount ?? parsed.rows.length} ${actionLabel}`}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Right: preview / format guide */}
      {customPreview ? customPreview : parsed ? (
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-base">
              Preview <span className="text-xs font-normal text-gray-400">(first 8 rows · {parsed.rows.length} total)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-80">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    {safeArray(parsed.headers).slice(0, previewCols ?? 8).map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {safeArray(parsed.rows.slice(0, 8)).map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {safeArray(parsed.headers).slice(0, previewCols ?? 8).map(h => (
                        <td key={h} className="px-3 py-1.5 text-gray-700 max-w-[120px] truncate">{row[h]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
              <span className="font-medium">{parsed.validCount ?? parsed.rows.length}</span> valid rows
            </div>
          </CardContent>
        </Card>
      ) : (
        <FormatGuide actionLabel={actionLabel} />
      )}
    </div>
  )
}


function FormatGuide({ actionLabel }) {
  if (actionLabel === 'seo tasks') return (
    <Card className="border border-gray-100 bg-white shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-blue-600">SEO Tasks: Detected Columns</CardTitle></CardHeader>
      <CardContent className="text-xs text-gray-500 space-y-4">
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
          <p className="font-bold text-gray-700 mb-1.5 uppercase tracking-wider text-[10px]">Use these headers only</p>
          <ul className="space-y-1.5">
            <li className="text-gray-700">Task</li>
            <li className="text-gray-700">Category</li>
            <li className="text-gray-700">Status</li>
            <li className="text-gray-700">Priority</li>
            <li className="text-gray-700">ETA End</li>
            <li className="text-gray-700">Assigned</li>
            <li className="text-gray-700">Link</li>
            <li className="text-gray-700">Internal Approval</li>
          </ul>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-blue-700 leading-normal">
          <strong>Note:</strong> Assigned To is not mapped from the sheet — please select the team member in the dashboard after import.
        </div>
      </CardContent>
    </Card>
  )

  if (actionLabel === 'email tasks') return (
    <Card className="border border-gray-100 bg-white shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-purple-600">Email Tasks: Detected Columns</CardTitle></CardHeader>
      <CardContent className="text-xs text-gray-500 space-y-4">
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
          <p className="font-bold text-gray-700 mb-1.5 uppercase tracking-wider text-[10px]">Use these headers only</p>
          <ul className="space-y-1.5">
            <li className="text-gray-700">Task</li>
            <li className="text-gray-700">Status</li>
            <li className="text-gray-700">Assigned</li>
            <li className="text-gray-700">Link</li>
            <li className="text-gray-700">Internal Approval</li>
            <li className="text-gray-700">Campaign Live</li>
            <li className="text-gray-700">Live Data</li>
          </ul>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-blue-700 leading-normal">
          <strong>Note:</strong> Assigned To is not mapped from the sheet — please select the team member in the dashboard after import.
        </div>
      </CardContent>
    </Card>
  )

  if (actionLabel === 'paid tasks') return (
    <Card className="border border-gray-100 bg-white shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-orange-600">Paid Ads: Detected Columns</CardTitle></CardHeader>
      <CardContent className="text-xs text-gray-500 space-y-4">
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
          <p className="font-bold text-gray-700 mb-1.5 uppercase tracking-wider text-[10px]">Use these headers only</p>
          <ul className="space-y-1.5">
            <li className="text-gray-700">Task</li>
            <li className="text-gray-700">Status</li>
            <li className="text-gray-700">Assigned</li>
            <li className="text-gray-700">Link</li>
            <li className="text-gray-700">Internal Approval</li>
          </ul>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-blue-700 leading-normal">
          <strong>Note:</strong> Assigned To is not mapped from the sheet — please select the team member in the dashboard after import.
        </div>
      </CardContent>
    </Card>
  )

  if (actionLabel === 'social tasks') return (
    <Card className="border border-gray-100 bg-white shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-pink-600">Social Media Tasks: Detected Columns</CardTitle></CardHeader>
      <CardContent className="text-xs text-gray-500 space-y-4">
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
          <p className="font-bold text-gray-700 mb-1.5 uppercase tracking-wider text-[10px]">Use these headers only</p>
          <ul className="space-y-1.5">
            <li className="text-gray-700">Task</li>
            <li className="text-gray-700">Status</li>
            <li className="text-gray-700">Assigned</li>
            <li className="text-gray-700">Link</li>
            <li className="text-gray-700">Live Link</li>
            <li className="text-gray-700">Live Date</li>
            <li className="text-gray-700">Internal Approval</li>
          </ul>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-blue-700 leading-normal">
          <strong>Note:</strong> Assigned To is not mapped from the sheet — select the team member in the dashboard after import.
        </div>
      </CardContent>
    </Card>
  )

  if (actionLabel === 'content items') return (
    <Card className="border border-gray-100 bg-white shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-emerald-600">Content Calendar: Detected Columns</CardTitle></CardHeader>
      <CardContent className="text-xs text-gray-500 space-y-4">
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
          <p className="font-bold text-gray-700 mb-1.5 uppercase tracking-wider text-[10px]">Use these headers only</p>
          <ul className="space-y-1.5">
            <li className="text-gray-700">Blog Title</li>
            <li className="text-gray-700">Week</li>
            <li className="text-gray-700">Primary Keyword</li>
            <li className="text-gray-700">Secondary Keyword</li>
            <li className="text-gray-700">Writer</li>
            <li className="text-gray-700">Search Vol.</li>
            <li className="text-gray-700">Outline</li>
            <li className="text-gray-700">Topic Approval</li>
            <li className="text-gray-700">Blog Status</li>
            <li className="text-gray-700">Blog Doc</li>
            <li className="text-gray-700">Internal Approval</li>
            <li className="text-gray-700">Blog Link</li>
            <li className="text-gray-700">Required By</li>
            <li className="text-gray-700">Published</li>
          </ul>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-amber-700 leading-normal font-medium">
          Client Approval and Feedback are NOT imported — they are managed within the dashboard.
        </div>
      </CardContent>
    </Card>
  )

  return (
    <Card className="border border-gray-100 bg-gray-50">
      <CardHeader><CardTitle className="text-sm text-gray-500">Detected Columns</CardTitle></CardHeader>
      <CardContent className="text-xs text-gray-500 space-y-3">
        <p>Ensure your header row contains recognizable column names. Unknown columns are ignored.</p>
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLICKUP CSV IMPORT — One-time, isolated, minimal 4-field mapping
// ═══════════════════════════════════════════════════════════════════════════════

const CLICKUP_PREVIEW_COLS = [
  { field: 'title', label: 'Task Name' },
  { field: 'status', label: 'Status' },
  { field: 'priority', label: 'Priority' },
  { field: 'eta_end', label: 'Date Updated (→ ETA)' },
]

function ClickUpCSVImport({ clients }) {
  const [selectedClient, setSelectedClient] = useState('__none__')
  const [rawData, setRawData] = useState('')
  const [parsed, setParsed] = useState(null)
  const [mappedRows, setMappedRows] = useState([])
  const [parseError, setParseError] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)

  const doParse = (text) => {
    setParseError('')
    try {
      const p = parseSpreadsheet(text)
      if (!p) { setParseError('Could not parse. Make sure there is a header row and at least one data row.'); setParsed(null); setMappedRows([]); return }
      const mapped = p.rows.map(r => rowToClickUpTask(r, p.headers, 'preview')).filter(Boolean)
      if (mapped.length === 0) {
        setParsed({ ...p, validCount: 0, unsupported: true, unsupportedMsg: 'No rows with a recognisable "Task Name" column found.' })
        setMappedRows([])
        return
      }
      setParsed({ ...p, validCount: mapped.length })
      setMappedRows(mapped)
    } catch (e) { setParseError('Parse error: ' + (e?.message || 'Unknown error')); setParsed(null); setMappedRows([]) }
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    try { const text = await file.text(); setRawData(text); doParse(text) }
    catch (e) { setParseError('Could not read file: ' + (e?.message || '')) }
  }

  const handleImport = async () => {
    if (!parsed || selectedClient === '__none__') return
    setImporting(true); setResult(null)
    const tasks = safeArray(parsed.rows).map(r => rowToClickUpTask(r, parsed.headers, selectedClient)).filter(Boolean)
    if (tasks.length === 0) {
      setResult({ success: 0, failed: parsed.rows.length, total: parsed.rows.length, error: 'No valid tasks found — ensure your CSV has a "Task Name" column.' })
      setImporting(false); return
    }
    try {
      const res = await apiFetch('/api/tasks/bulk', { method: 'POST', body: JSON.stringify({ tasks, client_id: selectedClient }) })
      let data = {}; try { data = await res.json() } catch (e) { /* ignore */ }
      if (res.ok) {
        setResult({ success: data.count ?? tasks.length, failed: data.failed ?? 0, total: tasks.length, errors: safeArray(data.errors) })
        setParsed(null); setMappedRows([]); setRawData('')
      } else { setResult({ success: 0, failed: tasks.length, total: tasks.length, error: data.error || `Server error (${res.status})` }) }
    } catch (e) { setResult({ success: 0, failed: 0, total: 0, error: 'Network error: ' + (e?.message || 'Could not reach server') }) }
    finally { setImporting(false) }
  }

  const mappedPreview = mappedRows.length > 0 && (
    <Card className="border border-gray-200">
      <CardHeader>
        <CardTitle className="text-base">
          Preview <span className="text-xs font-normal text-gray-400">(exactly what will be saved · {mappedRows.length} rows)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto max-h-80">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b">
                {CLICKUP_PREVIEW_COLS.map(c => (
                  <th key={c.field} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {mappedRows.slice(0, 8).map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {CLICKUP_PREVIEW_COLS.map(c => (
                    <td key={c.field} className="px-3 py-1.5 text-gray-700 max-w-[200px] truncate" title={row[c.field] || ''}>
                      {row[c.field] || <span className="text-gray-300 italic">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
          <span className="font-medium">{mappedRows.length}</span> rows ready · Priorities mapped from ClickUp (URGENT→P0, HIGH→P1, NORMAL→P2, none→P3)
        </div>
      </CardContent>
    </Card>
  )

  return (
    <ImportShell
      title="Upload ClickUp CSV Export"
      hint={<span>Use these headers only: <b>Task Name, Status, Priority, Date Updated</b>.</span>}
      actionLabel="tasks"
      clients={clients}
      selectedClient={selectedClient}
      setSelectedClient={setSelectedClient}
      rawData={rawData}
      setRawData={setRawData}
      parsed={parsed}
      parseError={parseError}
      onFile={handleFile}
      onParse={(text) => doParse(text || rawData)}
      onImport={handleImport}
      importing={importing}
      result={result}
      setResult={setResult}
      customPreview={mappedPreview}
    />
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK CSV IMPORT
// ═══════════════════════════════════════════════════════════════════════════════

function TaskCSVImport({ clients }) {
  const [selectedClient, setSelectedClient] = useState('__none__')
  const [rawData, setRawData] = useState('')
  const [parsed, setParsed] = useState(null)
  const [mappedRows, setMappedRows] = useState([])
  const [parseError, setParseError] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)

  const doParse = (text) => {
    setParseError('')
    try {
      const p = parseSpreadsheet(text)
      if (!p) { setParseError('Could not parse. Make sure there is a header row and at least one data row.'); setParsed(null); setMappedRows([]); return }

      const mapped = p.rows.map(r => rowToTask(r, p.headers, 'preview')).filter(Boolean)

      if (mapped.length === 0) {
        setParsed({ ...p, validCount: 0, unsupported: true, unsupportedMsg: 'No rows with a recognisable title column found. Rename your column to "Task", "Title", or "Name".' })
        setMappedRows([])
        return
      }

      setParsed({ ...p, validCount: mapped.length })
      setMappedRows(mapped)
    } catch (e) {
      console.error('[task-import] Parse error:', e)
      setParseError('Parse error: ' + (e?.message || 'Unknown error'))
      setParsed(null)
      setMappedRows([])
    }
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    try { const text = await file.text(); setRawData(text); doParse(text) }
    catch (e) { setParseError('Could not read file: ' + (e?.message || '')) }
  }

  const handleImport = async () => {
    if (!parsed || selectedClient === '__none__') return
    setImporting(true); setResult(null)
    const tasks = safeArray(parsed.rows).map(r => rowToTask(r, parsed.headers, selectedClient)).filter(Boolean)
    if (tasks.length === 0) {
      setResult({ success: 0, failed: parsed.rows.length, total: parsed.rows.length, error: 'No valid tasks found — ensure your spreadsheet has a title column.' })
      setImporting(false); return
    }
    try {
      const res = await apiFetch('/api/tasks/bulk', { method: 'POST', body: JSON.stringify({ tasks, client_id: selectedClient }) })
      let data = {}; try { data = await res.json() } catch (e) { /* ignore */ }
      if (res.ok) {
        setResult({ success: data.count ?? tasks.length, failed: data.failed ?? 0, total: tasks.length, errors: safeArray(data.errors) })
        setParsed(null); setMappedRows([]); setRawData('')
      } else { setResult({ success: 0, failed: tasks.length, total: tasks.length, error: data.error || `Server error (${res.status})` }) }
    } catch (e) { setResult({ success: 0, failed: 0, total: 0, error: 'Network error: ' + (e?.message || 'Could not reach server') }) }
    finally { setImporting(false) }
  }

  const mappedPreview = mappedRows.length > 0 && (
    <Card className="border border-gray-200">
      <CardHeader>
        <CardTitle className="text-base">
          Preview <span className="text-xs font-normal text-gray-400">(exactly what will be saved · {mappedRows.length} rows)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto max-h-80">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b">
                {TASK_PREVIEW_COLS.map(c => (
                  <th key={c.field} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {mappedRows.slice(0, 8).map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {TASK_PREVIEW_COLS.map(c => (
                    <td key={c.field} className="px-3 py-1.5 text-gray-700 max-w-[200px] truncate" title={String(row[c.field] || '')}>
                      {String(row[c.field] ?? '') || <span className="text-gray-300 italic">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
          <span className="font-medium">{mappedRows.length}</span> rows ready to import
        </div>
      </CardContent>
    </Card>
  )

  return (
    <ImportShell
      title="Upload SEO Tasks CSV or Paste from Sheets"
      actionLabel="seo tasks"
      clients={clients}
      selectedClient={selectedClient}
      setSelectedClient={setSelectedClient}
      rawData={rawData}
      setRawData={setRawData}
      parsed={parsed}
      parseError={parseError}
      onFile={handleFile}
      onParse={(text) => doParse(text || rawData)}
      onImport={handleImport}
      importing={importing}
      result={result}
      setResult={setResult}
      customPreview={mappedPreview}
    />
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL TASK CSV IMPORT
// ═══════════════════════════════════════════════════════════════════════════════

function EmailCSVImport({ clients }) {
  const [selectedClient, setSelectedClient] = useState('__none__')
  const [rawData, setRawData] = useState('')
  const [parsed, setParsed] = useState(null)
  const [mappedRows, setMappedRows] = useState([])
  const [parseError, setParseError] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)

  const doParse = (text) => {
    setParseError('')
    try {
      const p = parseSpreadsheet(text)
      if (!p) { setParseError('Could not parse. Ensure header row is present.'); setParsed(null); setMappedRows([]); return }
      const mapped = p.rows.map(r => rowToEmailTask(r, p.headers, 'preview')).filter(Boolean)
      if (mapped.length === 0) {
        setParsed({ ...p, validCount: 0, unsupported: true, unsupportedMsg: 'No rows with a recognisable "Email Task" or "Subject" column found.' })
        setMappedRows([])
        return
      }
      setParsed({ ...p, validCount: mapped.length })
      setMappedRows(mapped)
    } catch (e) {
      setParseError('Parse error: ' + (e?.message || 'Unknown error'))
      setParsed(null); setMappedRows([])
    }
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    try { const text = await file.text(); setRawData(text); doParse(text) }
    catch (e) { setParseError('Could not read file: ' + (e?.message || '')) }
  }

  const handleImport = async () => {
    if (!parsed || selectedClient === '__none__') return
    setImporting(true); setResult(null)
    const tasks = safeArray(parsed.rows).map(r => rowToEmailTask(r, parsed.headers, selectedClient)).filter(Boolean)
    try {
      const res = await apiFetch('/api/email-tasks/bulk', { method: 'POST', body: JSON.stringify({ tasks }) })
      let data = {}; try { data = await res.json() } catch (e) { /* ignore */ }
      if (res.ok) {
        setResult({ success: data.count ?? tasks.length, failed: data.failed ?? 0, total: tasks.length, errors: safeArray(data.errors) })
        setParsed(null); setMappedRows([]); setRawData('')
      } else { setResult({ success: 0, failed: tasks.length, total: tasks.length, error: data.error || `Server error (${res.status})` }) }
    } catch (e) { setResult({ success: 0, failed: 0, total: 0, error: 'Network error: ' + (e?.message || 'Could not reach server') }) }
    finally { setImporting(false) }
  }

  const mappedPreview = mappedRows.length > 0 && (
    <Card className="border border-gray-200">
      <CardHeader>
        <CardTitle className="text-base">
          Preview <span className="text-xs font-normal text-gray-400">({mappedRows.length} rows)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto max-h-80">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b">
                {EMAIL_PREVIEW_COLS.map(c => (
                  <th key={c.field} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {mappedRows.slice(0, 8).map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {EMAIL_PREVIEW_COLS.map(c => (
                    <td key={c.field} className="px-3 py-1.5 text-gray-700 max-w-[200px] truncate" title={String(row[c.field] || '')}>
                      {String(row[c.field] ?? '') || <span className="text-gray-300 italic">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <ImportShell
      title="Upload Email Tasks CSV or Paste from Sheets"
      actionLabel="email tasks"
      clients={clients}
      selectedClient={selectedClient}
      setSelectedClient={setSelectedClient}
      rawData={rawData}
      setRawData={setRawData}
      parsed={parsed}
      parseError={parseError}
      onFile={handleFile}
      onParse={(text) => doParse(text || rawData)}
      onImport={handleImport}
      importing={importing}
      result={result}
      setResult={setResult}
      customPreview={mappedPreview}
    />
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAID ADS TASK CSV IMPORT
// ═══════════════════════════════════════════════════════════════════════════════

function PaidCSVImport({ clients }) {
  const [selectedClient, setSelectedClient] = useState('__none__')
  const [rawData, setRawData] = useState('')
  const [parsed, setParsed] = useState(null)
  const [mappedRows, setMappedRows] = useState([])
  const [parseError, setParseError] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)

  const doParse = (text) => {
    setParseError('')
    try {
      const p = parseSpreadsheet(text)
      if (!p) { setParseError('Could not parse. Ensure header row is present.'); setParsed(null); setMappedRows([]); return }
      const mapped = p.rows.map(r => rowToPaidTask(r, p.headers, 'preview')).filter(Boolean)
      if (mapped.length === 0) {
        setParsed({ ...p, validCount: 0, unsupported: true, unsupportedMsg: 'No rows with a recognisable "Paid Ads Task" or "Ad Set" column found.' })
        setMappedRows([])
        return
      }
      setParsed({ ...p, validCount: mapped.length })
      setMappedRows(mapped)
    } catch (e) {
      setParseError('Parse error: ' + (e?.message || 'Unknown error'))
      setParsed(null); setMappedRows([])
    }
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    try { const text = await file.text(); setRawData(text); doParse(text) }
    catch (e) { setParseError('Could not read file: ' + (e?.message || '')) }
  }

  const handleImport = async () => {
    if (!parsed || selectedClient === '__none__') return
    setImporting(true); setResult(null)
    const tasks = safeArray(parsed.rows).map(r => rowToPaidTask(r, parsed.headers, selectedClient)).filter(Boolean)
    try {
      const res = await apiFetch('/api/paid-tasks/bulk', { method: 'POST', body: JSON.stringify({ tasks }) })
      let data = {}; try { data = await res.json() } catch (e) { /* ignore */ }
      if (res.ok) {
        setResult({ success: data.count ?? tasks.length, failed: data.failed ?? 0, total: tasks.length, errors: safeArray(data.errors) })
        setParsed(null); setMappedRows([]); setRawData('')
      } else { setResult({ success: 0, failed: tasks.length, total: tasks.length, error: data.error || `Server error (${res.status})` }) }
    } catch (e) { setResult({ success: 0, failed: 0, total: 0, error: 'Network error: ' + (e?.message || 'Could not reach server') }) }
    finally { setImporting(false) }
  }

  const mappedPreview = mappedRows.length > 0 && (
    <Card className="border border-gray-200">
      <CardHeader>
        <CardTitle className="text-base">
          Preview <span className="text-xs font-normal text-gray-400">({mappedRows.length} rows)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto max-h-80">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b">
                {PAID_PREVIEW_COLS.map(c => (
                  <th key={c.field} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {mappedRows.slice(0, 8).map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {PAID_PREVIEW_COLS.map(c => (
                    <td key={c.field} className="px-3 py-1.5 text-gray-700 max-w-[200px] truncate" title={String(row[c.field] || '')}>
                      {String(row[c.field] ?? '') || <span className="text-gray-300 italic">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <ImportShell
      title="Upload Paid Ads Tasks CSV or Paste from Sheets"
      actionLabel="paid tasks"
      clients={clients}
      selectedClient={selectedClient}
      setSelectedClient={setSelectedClient}
      rawData={rawData}
      setRawData={setRawData}
      parsed={parsed}
      parseError={parseError}
      onFile={handleFile}
      onParse={(text) => doParse(text || rawData)}
      onImport={handleImport}
      importing={importing}
      result={result}
      setResult={setResult}
      customPreview={mappedPreview}
    />
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTENT CALENDAR CSV IMPORT
// ═══════════════════════════════════════════════════════════════════════════════


// Schema field → display label (matches the dashboard UI 1:1)
const CONTENT_PREVIEW_COLS = [
  { field: 'week', label: 'Week' },
  { field: 'blog_title', label: 'Blog Title' },
  { field: 'primary_keyword', label: 'Keyword' },
  { field: 'writer', label: 'Writer' },
  { field: 'blog_doc_link', label: 'Blog Doc' },
  { field: 'blog_link', label: 'Blog Link' },
  { field: 'published_date', label: 'Published' },
  { field: 'topic_approval_status', label: 'Topic Appr.' },
  { field: 'blog_status', label: 'Blog Status' },
  { field: 'blog_internal_approval', label: 'Internal Appr.' },
]

function ContentCSVImport({ clients }) {
  const [selectedClient, setSelectedClient] = useState('__none__')
  const [rawData, setRawData] = useState('')
  const [parsed, setParsed] = useState(null)
  const [mappedRows, setMappedRows] = useState([])
  const [parseError, setParseError] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)

  const doParse = (text) => {
    setParseError('')
    try {
      const p = parseSpreadsheet(text)
      if (!p) { setParseError('Could not parse. Make sure there is a header row and at least one data row.'); setParsed(null); setMappedRows([]); return }

      const mapped = p.rows.map(r => rowToContent(r, p.headers, 'preview')).filter(Boolean)

      if (mapped.length === 0) {
        setParsed({ ...p, validCount: 0, unsupported: true, unsupportedMsg: 'No rows with a recognisable "Blog Title" or "Title" column found.' })
        setMappedRows([])
        return
      }

      setParsed({ ...p, validCount: mapped.length })
      setMappedRows(mapped)
    } catch (e) { setParseError('Parse error: ' + (e?.message || 'Unknown error')); setParsed(null); setMappedRows([]) }
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    try { const text = await file.text(); setRawData(text); doParse(text) }
    catch (e) { setParseError('Could not read file: ' + (e?.message || '')) }
  }

  const handleImport = async () => {
    if (!parsed || selectedClient === '__none__') return
    setImporting(true); setResult(null)
    const items = safeArray(parsed.rows).map(r => rowToContent(r, parsed.headers, selectedClient)).filter(Boolean)
    if (items.length === 0) {
      setResult({ success: 0, failed: parsed.rows.length, total: parsed.rows.length, error: 'No valid content items found — ensure your spreadsheet has a "Blog Title" column.' })
      setImporting(false); return
    }
    try {
      const res = await apiFetch('/api/content/bulk', { method: 'POST', body: JSON.stringify({ items, client_id: selectedClient }) })
      let data = {}; try { data = await res.json() } catch (e) { /* ignore */ }
      if (res.ok) {
        setResult({ success: data.imported ?? items.length, failed: data.failed ?? 0, total: items.length, errors: safeArray(data.errors) })
        setParsed(null); setMappedRows([]); setRawData('')
      } else { setResult({ success: 0, failed: items.length, total: items.length, error: data.error || `Server error (${res.status})` }) }
    } catch (e) { setResult({ success: 0, failed: 0, total: 0, error: 'Network error: ' + (e?.message || 'Could not reach server') }) }
    finally { setImporting(false) }
  }

  const mappedPreview = mappedRows.length > 0 && (
    <Card className="border border-gray-200">
      <CardHeader>
        <CardTitle className="text-base">
          Preview <span className="text-xs font-normal text-gray-400">(exactly what will be saved · {mappedRows.length} rows)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto max-h-80">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b">
                {CONTENT_PREVIEW_COLS.map(c => (
                  <th key={c.field} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {mappedRows.slice(0, 8).map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {CONTENT_PREVIEW_COLS.map(c => (
                    <td key={c.field} className="px-3 py-1.5 text-gray-700 max-w-[200px] truncate" title={row[c.field] || ''}>
                      {row[c.field] || <span className="text-gray-300 italic">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
          <span className="font-medium">{mappedRows.length}</span> rows ready to import
        </div>
      </CardContent>
    </Card>
  )

  return (
    <ImportShell
      title="Upload Content Calendar CSV or Paste from Sheets"
      actionLabel="content items"
      clients={clients}
      selectedClient={selectedClient}
      setSelectedClient={setSelectedClient}
      rawData={rawData}
      setRawData={setRawData}
      parsed={parsed}
      parseError={parseError}
      onFile={handleFile}
      onParse={(text) => doParse(text || rawData)}
      onImport={handleImport}
      importing={importing}
      result={result}
      setResult={setResult}
      customPreview={mappedPreview}
    />
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOCIAL MEDIA TASK CSV IMPORT
// ═══════════════════════════════════════════════════════════════════════════════

function SocialCSVImport({ clients }) {
  const [selectedClient, setSelectedClient] = useState('__none__')
  const [rawData, setRawData] = useState('')
  const [parsed, setParsed] = useState(null)
  const [mappedRows, setMappedRows] = useState([])
  const [parseError, setParseError] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)

  const doParse = (text) => {
    setParseError('')
    try {
      const p = parseSpreadsheet(text)
      if (!p) { setParseError('Could not parse. Ensure header row is present.'); setParsed(null); setMappedRows([]); return }
      const mapped = p.rows.map(r => rowToSocialTask(r, p.headers, 'preview')).filter(Boolean)
      if (mapped.length === 0) {
        setParsed({ ...p, validCount: 0, unsupported: true, unsupportedMsg: 'No rows with a recognisable "Social Media Task" or "Task Name" column found.' })
        setMappedRows([])
        return
      }
      setParsed({ ...p, validCount: mapped.length })
      setMappedRows(mapped)
    } catch (e) {
      setParseError('Parse error: ' + (e?.message || 'Unknown error'))
      setParsed(null); setMappedRows([])
    }
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    try { const text = await file.text(); setRawData(text); doParse(text) }
    catch (e) { setParseError('Could not read file: ' + (e?.message || '')) }
  }

  const handleImport = async () => {
    if (!parsed || selectedClient === '__none__') return
    setImporting(true); setResult(null)
    const tasks = safeArray(parsed.rows).map(r => rowToSocialTask(r, parsed.headers, selectedClient)).filter(Boolean)
    try {
      const res = await apiFetch('/api/social-tasks/bulk', { method: 'POST', body: JSON.stringify({ tasks }) })
      let data = {}; try { data = await res.json() } catch (e) { /* ignore */ }
      if (res.ok) {
        setResult({ success: data.count ?? tasks.length, failed: data.failed ?? 0, total: tasks.length, errors: safeArray(data.errors) })
        setParsed(null); setMappedRows([]); setRawData('')
      } else { setResult({ success: 0, failed: tasks.length, total: tasks.length, error: data.error || `Server error (${res.status})` }) }
    } catch (e) { setResult({ success: 0, failed: 0, total: 0, error: 'Network error: ' + (e?.message || 'Could not reach server') }) }
    finally { setImporting(false) }
  }

  const mappedPreview = mappedRows.length > 0 && (
    <Card className="border border-gray-200">
      <CardHeader>
        <CardTitle className="text-base">
          Preview <span className="text-xs font-normal text-gray-400">({mappedRows.length} rows)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto max-h-80">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b">
                {SOCIAL_PREVIEW_COLS.map(c => (
                  <th key={c.field} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {mappedRows.slice(0, 8).map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {SOCIAL_PREVIEW_COLS.map(c => (
                    <td key={c.field} className="px-3 py-1.5 text-gray-700 max-w-[200px] truncate" title={String(row[c.field] || '')}>
                      {String(row[c.field] ?? '') || <span className="text-gray-300 italic">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <ImportShell
      title="Upload Social Media Tasks CSV or Paste from Sheets"
      actionLabel="social tasks"
      clients={clients}
      selectedClient={selectedClient}
      setSelectedClient={setSelectedClient}
      rawData={rawData}
      setRawData={setRawData}
      parsed={parsed}
      parseError={parseError}
      onFile={handleFile}
      onParse={(text) => doParse(text || rawData)}
      onImport={handleImport}
      importing={importing}
      result={result}
      setResult={setResult}
      customPreview={mappedPreview}
    />
  )
}

