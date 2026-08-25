import { api } from './fetcher'

export interface ContractImageUploadResult {
  image_id: string
  file_name: string
  file_type: string
  file_size: number
}

export interface UploadContractImagesResponse {
  success: boolean
  data: {
    uploaded: ContractImageUploadResult[]
    failed: { file_name: string; error: string }[]
    summary: { total: number; succeeded: number; failed: number }
  }
}

export async function uploadContractImages(token: string, contractId: string, files: File[]) {
  const formData = new FormData()
  formData.append('contract_id', contractId)
  files.forEach(file => formData.append('files', file))
  return api.upload<UploadContractImagesResponse>('/functions/v1/contract-images', token, formData)
}

export interface ContractImage {
  image_id: string
  file_name: string
  file_type: string
  file_size: number
  url: string
  expires_in: number
}

export interface GetContractImagesResponse {
  success: boolean
  data: {
    contract_id: string
    images: ContractImage[]
  }
}

export async function getContractImages(token: string, contractId: string) {
  const q = new URLSearchParams({ contract_id: contractId })
  return api.get<GetContractImagesResponse>(`/functions/v1/contract-images?${q}`, token)
}
