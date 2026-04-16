export const STATUSES = [
    'To Be Started',
    'In Progress',
    'Completed',
    'Implemented',
    'Blocked'
]

// Default display order for tasks across all pages
export const STATUS_ORDER = ['Completed', 'In Progress', 'To Be Started', 'Implemented', 'Blocked', 'None', 'Pending Review', '']

export const CATEGORIES = [
    'SEO & Content',
    'Design',
    'Development',
    'Page Speed',
    'Technical SEO',
    'Link Building',
    'Paid Ads',
    'Email Marketing',
    'LLM SEO',
    'Reporting',
    'Other'
]

export const PRIORITIES = ['P0', 'P1', 'P2', 'P3']

export const CONTENT_PRIORITIES = ['P0', 'P1', 'P2']

export const INTERNAL_APPROVALS = ['Pending', 'Approved']

export const CONTENT_INTERNAL_APPROVALS = ['Pending', 'Approved']

export const APPROVALS = [
    'Pending Review',
    'Approved',
    'Required Changes'
]

export const REPORT_TYPES = [
    'Monthly SEO Report',
    'Weekly Update',
    'Audit Report',
    'Ad Performance',
    'Custom'
]

export const SERVICE_TYPES = [
    'SEO',
    'Email',
    'Paid Ads',
    'Social Media'
]

export const SOCIAL_STATUSES = ['To Be Started', 'In Progress', 'Completed', 'Implemented', 'Blocked', 'Posted']

export const SOCIAL_INTERNAL_APPROVALS = ['Approved', 'Rejected', 'Needs Attention']

export const OUTLINE_STATUSES = ['Pending', 'Submitted', 'Approved', 'Rejected']

export const TOPIC_APPROVALS = ['Pending', 'Approved', 'Rejected']

export const BLOG_APPROVALS = ['Pending Review', 'Approved', 'Changes Required']

export const BLOG_STATUSES = [
    'Draft',
    'In Progress',
    'Sent for Approval',
    'Approved',
    'Published',
    'Rejected'
]

export const INTERN_STATUSES = [
    'Assigned',
    'Making Outlines',
    'Submitted',
    'Rejected',
    'Rework',
]

export const statusColors = {
    'Completed': 'bg-green-100 text-green-700 border-green-200',
    'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
    'Implemented': 'bg-teal-100 text-teal-700 border-teal-200',
    'Pending Review': 'bg-amber-100 text-amber-700 border-amber-200',
    'Blocked': 'bg-red-100 text-red-700 border-red-200',
    'To Be Started': 'bg-gray-100 text-gray-600 border-gray-200',
    'Recurring': 'bg-purple-100 text-purple-700 border-gray-200',
    'Posted': 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

export const socialInternalApprovalColors = {
    'Approved': 'bg-green-100 text-green-700 border-green-200',
    'Rejected': 'bg-red-100 text-red-700 border-red-200',
    'Needs Attention': 'bg-amber-100 text-amber-700 border-amber-200',
}

export const priorityColors = {
    'P0': 'bg-red-100 text-red-700',
    'P1': 'bg-orange-100 text-orange-700',
    'P2': 'bg-yellow-100 text-yellow-700',
    'P3': 'bg-gray-100 text-gray-600',
}

export const approvalColors = {
    'Approved': 'bg-green-100 text-green-700 border-green-200',
    'Required Changes': 'bg-red-100 text-red-700 border-red-200',
    'Pending Review': 'bg-gray-100 text-gray-500 border-gray-200',
}

export const internalApprovalColors = {
    'Approved': 'bg-green-100 text-green-700 border-green-200',
    'Pending': 'bg-gray-100 text-gray-500 border-gray-200',
}

export const topicApprovalColors = {
    'Approved': 'bg-green-100 text-green-700 border-green-200',
    'Rejected': 'bg-red-100 text-red-700 border-red-200',
    'Pending': 'bg-gray-100 text-gray-500 border-gray-200',
}

export const blogStatusColors = {
    'Published': 'bg-green-100 text-green-700 border-green-200',
    'Approved': 'bg-teal-100 text-teal-700 border-teal-200',
    'Sent for Approval': 'bg-amber-100 text-amber-700 border-amber-200',
    'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
    'Draft': 'bg-gray-100 text-gray-600 border-gray-200',
    'Rejected': 'bg-red-100 text-red-700 border-red-200',
}

export const internStatusColors = {
    'Assigned': 'bg-blue-100 text-blue-700 border-blue-200',
    'Making Outlines': 'bg-purple-100 text-purple-700 border-purple-200',
    'Submitted': 'bg-amber-100 text-amber-700 border-amber-200',
    'Rejected': 'bg-red-100 text-red-700 border-red-200',
    'Rework': 'bg-orange-100 text-orange-700 border-orange-200',
}

export const TASK_COLUMN_WIDTHS = {
    serial: '55px',
    selection: '60px',
    client: '140px',
    title: '300px',
    category: '150px',
    status: '150px',
    priority: '110px',
    eta: '120px',
    team_label: '130px',
    started_date: '130px',
    assigned: '150px',
    link: '100px',
    internal_approval: '160px',
    send_link: '110px',
    client_approval: '160px',
    client_feedback: '180px',
    comments: '240px',
    comments_for_client: '240px',
    actions: '50px'
}

export const CONTENT_COLUMN_WIDTHS = {
    serial: '55px',
    selection: '60px',
    client_grip: '40px',
    client: '150px',
    week: '100px',
    title: '360px',
    primary_keyword: '200px',
    secondary_keyword: '210px',
    writer: '145px',
    outline: '145px',
    intern_status: '175px',
    search_volume: '145px',
    required_by: '150px',
    topic_approval: '165px',
    content_priority: '115px',
    blog_status: '165px',
    blog_internal_approval: '185px',
    send_link: '160px',
    date_sent: '165px',
    blog_approval: '185px',
    approved_on: '140px',
    blog_feedback: '210px',
    blog_doc: '135px',
    link: '120px',
    published: '135px',
    comments: '210px',
    actions: '50px'
}

export const EMAIL_COLUMN_WIDTHS = {
    serial: '55px',
    selection: '60px',
    client: '140px',
    title: '300px',
    status: '150px',
    team_label: '130px',
    assigned: '150px',
    started_date: '130px',
    link: '100px',
    internal_approval: '160px',
    send_link: '110px',
    campaign_live: '140px',
    live_data: '155px',
    client_approval: '160px',
    client_feedback: '180px',
    comments: '220px',
    actions: '50px'
}

export const PAID_COLUMN_WIDTHS = {
    serial: '55px',
    selection: '60px',
    client: '140px',
    title: '300px',
    status: '150px',
    team_label: '130px',
    assigned: '150px',
    started_date: '130px',
    link: '100px',
    internal_approval: '160px',
    send_link: '110px',
    client_approval: '160px',
    client_feedback: '180px',
    comments: '220px',
    actions: '50px'
}

export const SOCIAL_COLUMN_WIDTHS = {
    serial: '55px',
    selection: '60px',
    client: '140px',
    format: '130px',
    social_status: '150px',
    team_label: '130px',
    started_date: '130px',
    reference: '220px',
    visual_brief: '220px',
    content: '220px',
    caption: '220px',
    send_idea: '140px',
    content_idea_approval: '170px',
    content_idea_feedback: '190px',
    content_draft: '110px',
    send_draft: '130px',
    content_draft_approval: '170px',
    draft_feedback: '190px',
    live_link: '140px',
    posting_date: '130px',
    social_internal_approval: '170px',
    assigned: '150px',
    comments: '220px',
    actions: '50px'
}

export const SOCIAL_FORMATS = ['Static', 'Reel', 'Text', 'Carousel', 'Story', 'Poll']

export const TEAM_LABELS = ['SEO', 'Paid Ads', 'Design', 'CMS', 'Social', 'Email', 'Content']
