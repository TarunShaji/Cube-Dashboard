import { z } from 'zod'

export const TeamMemberSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    role: z.string().optional().default('SEO'),
    is_active: z.boolean().optional().default(true)
})
