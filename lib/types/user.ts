export interface UserDetails {
  reference_id: string
  first_name: string
  last_name: string
  full_name: string
  email: string
  mobile_phone: string
  image_url: string
  job_title: string
}

export interface SmToolboxModel {
  id: string
  name: string
  iconUrl: string
  url: string
  isActive: boolean
}
