import { z } from 'zod'

export const PortalTaskApprovalSchema = z.object({
    client_approval: z.enum(['Pending Review', 'Approved', 'Required Changes']),
    client_feedback_note: z.string().optional().nullable(),
    updated_at: z.string().or(z.date()).optional()
})

export const PortalContentApprovalSchema = z.object({
    topic_approval_status: z.enum(['Pending', 'Approved', 'Rejected']).optional(),
    blog_approval_status: z.enum(['Pending Review', 'Approved', 'Changes Required']).optional(),
    blog_client_feedback_note: z.string().optional().nullable(),
    blog_link: z.string().url().optional().nullable(),
    updated_at: z.string().or(z.date()).optional()
})
