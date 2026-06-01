export type NotifType = 'contract' | 'task' | 'po' | 'alert'

export interface Notification {
  id: string
  type: NotifType
  title: string
  body: string
  time: string
  date: string
  read: boolean
}

export const NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'contract',
    title: 'New contract signed',
    body: 'Greg Miller — RA6495Q has been marked as Active.',
    time: '2m ago',
    date: 'Today',
    read: false,
  },
  {
    id: '2',
    type: 'task',
    title: 'Task overdue',
    body: 'Site inspection at Parkwood is past its due date.',
    time: '1h ago',
    date: 'Today',
    read: false,
  },
  {
    id: '3',
    type: 'po',
    title: 'Purchase order approved',
    body: 'PO #10234 from Boral has been approved and is ready for processing.',
    time: '3h ago',
    date: 'Today',
    read: true,
  },
  {
    id: '4',
    type: 'alert',
    title: 'Scope update required',
    body: 'Scope item #SC-882 is missing trade assignment. Please review.',
    time: '5h ago',
    date: 'Today',
    read: true,
  },
  {
    id: '5',
    type: 'contract',
    title: 'Contract value updated',
    body: 'Project at 12 Rosewood Dr has been updated to $340,000.',
    time: 'Yesterday',
    date: 'Yesterday',
    read: true,
  },
  {
    id: '6',
    type: 'task',
    title: 'New task assigned',
    body: 'You have been assigned to complete the framing inspection at 8 Oak Ave.',
    time: 'Yesterday',
    date: 'Yesterday',
    read: true,
  },
  {
    id: '7',
    type: 'po',
    title: 'Purchase order pending',
    body: 'PO #10198 from CSR is awaiting your approval.',
    time: '2 days ago',
    date: '2 days ago',
    read: true,
  },
  {
    id: '8',
    type: 'alert',
    title: 'Document expiring soon',
    body: 'Insurance certificate for Acme Roofing expires in 7 days.',
    time: '3 days ago',
    date: '3 days ago',
    read: true,
  },
  {
    id: '9',
    type: 'contract',
    title: 'New project created',
    body: 'Project "Sunnybank Residential" has been created and is awaiting deposit.',
    time: '3 days ago',
    date: '3 days ago',
    read: true,
  },
  {
    id: '10',
    type: 'task',
    title: 'Task completed',
    body: 'Electrical rough-in inspection at 22 Pine St marked as complete.',
    time: '4 days ago',
    date: '4 days ago',
    read: true,
  },
]

export const NOTIF_UNREAD_COUNT = NOTIFICATIONS.filter((n) => !n.read).length
