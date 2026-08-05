import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, 'Current password is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
  .refine((data) => data.oldPassword !== data.password, {
    message: 'New password must be different from the current password',
    path: ['password'],
  })

export const supplierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  email: z.string().email('Invalid email').or(z.literal('')).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
})

// Stricter than supplierSchema (email required) — used only when creating a
// new supplier. Kept separate so editing existing suppliers that predate
// this rule doesn't get blocked by a missing email.
export const supplierCreateSchema = supplierSchema.extend({
  email: z.string().min(1, 'Email is required').email('Invalid email'),
})

export const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  dueDate: z.string().min(1, 'Due date is required'),
  assignee: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  status: z.string().min(1, 'Status is required'),
  priority: z.boolean().optional(),
  projectId: z.string().optional(),
})

export function validatePOSupplierForm(data: Record<string, unknown>): {
  isValid: boolean
  errors: Record<string, string>
} {
  const errors: Record<string, string> = {}

  if (!data.contractId) errors.contractId = 'Contract is required'
  if (!data.supplierId) errors.supplierId = 'Supplier is required'
  if (!data.deliveryDate) errors.deliveryDate = 'Delivery date is required'

  return { isValid: Object.keys(errors).length === 0, errors }
}

export function validatePOSubsForm(data: Record<string, unknown>): {
  isValid: boolean
  errors: Record<string, string>
} {
  const errors: Record<string, string> = {}

  if (!data.contractId) errors.contractId = 'Contract is required'
  if (!data.subsId) errors.subsId = 'Subcontractor is required'
  if (!data.startDate) errors.startDate = 'Start date is required'
  if (!data.endDate) errors.endDate = 'End date is required'

  return { isValid: Object.keys(errors).length === 0, errors }
}
