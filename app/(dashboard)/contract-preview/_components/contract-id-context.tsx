'use client'

import { createContext, useContext } from 'react'

const ContractIdContext = createContext<string | null>(null)

export function ContractIdProvider({ contractId, children }: { contractId: string; children: React.ReactNode }) {
  return <ContractIdContext.Provider value={contractId}>{children}</ContractIdContext.Provider>
}

export function useContractId(): string {
  const contractId = useContext(ContractIdContext)
  if (!contractId) throw new Error('useContractId must be used within a ContractIdProvider')
  return contractId
}
