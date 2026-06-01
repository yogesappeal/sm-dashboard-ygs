export interface UserDetails {
  referenceId: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  mobilePhone: string
  imageUrl: string
  jobTitle: string
}

export interface SmToolboxModel {
  id: string
  name: string
  iconUrl: string
  url: string
  isActive: boolean
}
