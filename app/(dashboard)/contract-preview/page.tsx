import { ContractLayout } from './_components/contract-layout'
import type { DummyContract, DummyCrew, DummyPod, DummyScope, DummyPO } from './_components/types'

const CONTRACT: DummyContract = {
  raNumber: 'SC-2026-00001-3E3',
  clientFullName: "Lisa D'Hondt",
  streetAddress: '25 Lake Point Way',
  suburb: 'Lake Point Way',
  state: 'NSW',
  builder: 'Owner Occupied',
  contractValue: 59790,
  status: 'Active',
  pif: 'PIF-2026-001',
  notes: 'Roof repair and electrical work required. Plumbing urgent.',
  googleDriveUrl: 'https://drive.google.com/drive/folders/1a2B3c4D5e6F7g8H9i0J',
}

const CREW: DummyCrew[] = [
  { name: 'Daniel', role: 'Site Lead' },
  { name: 'Galang', role: 'Roofing' },
  { name: 'Galang', role: 'Groundie' },
  { name: 'Galang', role: 'Labourer' },
]

const POD: DummyPod = {
  sm: 'Teddy',
  pa: 'Courtney',
  pm: 'Joshua',
  am: 'Dan',
}

const SCOPES: DummyScope[] = [
  {
    scope_id: 'sc-1',
    scope_number: 'SC-2026-00001-3E3',
    scope_name: "All Scope Lisa's Building",
    order_status: 'In Progress',
    scope_details: [
      {
        building_id: 'b1',
        building_name: 'House',
        status: 'In Progress',
        trades: [
          { trade_id: 't1', trade_name: 'Roofing', status: 'In Progress' },
          { trade_id: 't2', trade_name: 'Electrical', status: 'In Progress' },
          { trade_id: 't3', trade_name: 'Plumbing', status: 'Urgent' },
        ],
      },
      {
        building_id: 'b2',
        building_name: 'Garage',
        status: 'In Progress',
        trades: [
          { trade_id: 't4', trade_name: 'Roofing', status: 'In Progress' },
        ],
      },
    ],
  },
]

const POS: DummyPO[] = [
  { id: 'po-1', po_number: 'PO-2026-001', type: 'supplier', status: 'PO Draft', supplier_name: 'Roofing Co.', amount: 12500 },
  { id: 'po-2', po_number: 'PO-2026-002', type: 'subcontractor', status: 'PO Submitted', supplier_name: 'Elec Sub Pty Ltd', amount: 8200 },
  { id: 'po-3', po_number: 'PO-2026-003', type: 'subcontractor', status: 'PO Completed', supplier_name: 'Plumbing Mate', amount: 3200 },
]

export default function ContractPreviewPage() {
  return (
    <div className="flex -m-4 md:-m-6 h-[calc(100svh-64px)] overflow-hidden">
      <ContractLayout contract={CONTRACT} crew={CREW} pod={POD} scopes={SCOPES} pos={POS} />
    </div>
  )
}
