export type CanvasContext =
  | { view: 'activity' }
  | { view: 'create-po'; poType: 'supplier' | 'subcontractor'; buildingName?: string; tradeName?: string }
  | { view: 'po-detail'; poId: string }

export type CanvasAction =
  | { type: 'SHOW_ACTIVITY' }
  | { type: 'SHOW_CREATE_PO'; poType: 'supplier' | 'subcontractor'; buildingName?: string; tradeName?: string }
  | { type: 'SHOW_PO_DETAIL'; poId: string }

export const initialCanvas: CanvasContext = { view: 'activity' }

export function canvasReducer(_state: CanvasContext, action: CanvasAction): CanvasContext {
  switch (action.type) {
    case 'SHOW_ACTIVITY':
      return { view: 'activity' }
    case 'SHOW_CREATE_PO':
      return { view: 'create-po', poType: action.poType, buildingName: action.buildingName, tradeName: action.tradeName }
    case 'SHOW_PO_DETAIL':
      return { view: 'po-detail', poId: action.poId }
  }
}
