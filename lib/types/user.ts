// Backend enum — distinct from job_title (display-only). Drives app access,
// see mapBackendRoleToRole in components/shared/auth-provider.tsx.
export type BackendUserRole = 'admin' | 'site_manager' | 'ops'

export interface UserDetails {
  reference_id: string
  first_name: string
  last_name: string
  full_name: string
  email: string
  mobile_phone: string
  image_url: string
  job_title: string
  role: BackendUserRole
}

export interface SmToolboxModel {
  id: string
  name: string
  iconUrl: string
  url: string
  isActive: boolean
}
