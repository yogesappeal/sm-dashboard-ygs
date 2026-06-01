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

export const supplierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').or(z.literal('')),
  phone: z.string().min(1, 'Phone is required'),
  address: z.string().min(1, 'Address is required'),
  type: z.string().min(1, 'Type is required'),
  notes: z.string().optional(),
  company: z.string().optional(),
})

export const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  dueDate: z.string().min(1, 'Due date is required'),
  assignee: z.string().min(1, 'Assignee is required'),
  category: z.string().min(1, 'Category is required'),
  status: z.string().min(1, 'Status is required'),
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
