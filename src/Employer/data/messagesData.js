// ─────────────────────────────────────────────────────────────
// MESSAGES — seeded conversations between the logged-in Employer
// (Dawit Bekele / EMP-0001) and company contacts (Support, HR).
// Structure mirrors a typical inbox: contacts each have a thread.
// ─────────────────────────────────────────────────────────────

export const CURRENT_USER = {
  id: 'EMP-0001',
  name: 'Dawit Bekele',
  employeeId: 'EMP-0001',
  initials: 'DB',
}

export const CONTACTS = [
  {
    id: 'support',
    name: 'Support Team',
    role: 'IT & System Support',
    color: 'bg-sky-500',
    initials: 'ST',
    online: true,
  },
  {
    id: 'meron-hr',
    name: 'Meron Alemu',
    role: 'HR Manager',
    color: 'bg-violet-500',
    initials: 'MA',
    online: true,
  },
  {
    id: 'payroll-team',
    name: 'Payroll Team',
    role: 'Finance & Accounting',
    color: 'bg-emerald-500',
    initials: 'PT',
    online: false,
  },
]

// Initial conversation threads — each message: { id, from: 'me'|'them', text, time }
export const INITIAL_THREADS = {
  support: [
    { id: 's1', from: 'them', text: 'Hi Dawit 👋', time: 'Yesterday, 14:20' },
    { id: 's2', from: 'them', text: 'Quick question — the attendance export is ready for March on the payroll tab.', time: 'Yesterday, 14:21' },
    { id: 's3', from: 'me', text: 'Thanks! I’ll take a look before the run tomorrow.', time: 'Yesterday, 14:25' },
    { id: 's4', from: 'them', text: 'Perfect. Yell if anything looks off.', time: 'Today, 09:02' },
  ],
  'meron-hr': [
    { id: 'm1', from: 'them', text: 'Good morning Dawit, your annual leave balance shows 10 days — all synced from the leave sheet.', time: 'Yesterday, 09:10' },
    { id: 'm2', from: 'me', text: 'Good morning Meron, noted. I’m planning my remaining leave in September.', time: 'Yesterday, 09:15' },
    { id: 'm3', from: 'them', text: 'Sure — just submit the request at least a week before and we’re good.', time: 'Yesterday, 09:18' },
  ],
  'payroll-team': [
    { id: 'p1', from: 'them', text: 'Hi Dawit, net salary & pension figures for current run are finalised.', time: 'Mon, 10:30' },
    { id: 'p2', from: 'me', text: 'Great, thanks Payroll team.', time: 'Mon, 10:45' },
  ],
}

export const INITIAL_NOTIFICATIONS = [
  {
    id: 'n1',
    title: 'Leave request approved',
    message: 'Your annual leave request (Mar 16 – Mar 20) was approved by Meron Alemu.',
    time: '2h ago',
    unread: true,
    type: 'leave',
  },
  {
    id: 'n2',
    title: 'Payroll run ready',
    message: 'The March payroll run was finalised — view your payslip from the Payslips page.',
    time: '5h ago',
    unread: true,
    type: 'payroll',
  },
  {
    id: 'n3',
    title: 'New message from Support Team',
    message: 'Tigist from IT Support replied in your conversation.',
    time: '8h ago',
    unread: false,
    type: 'message',
  },
]

// Auto-reply pool so the chat feels interactive
export const AUTO_REPLIES = {
  support: [
    'Got it — I’m on it. I’ll share an update shortly.',
    'Could you try again after refreshing? Let me know if the issue persists.',
    'Thanks for the details. I’ve logged this with the office team.',
  ],
  'meron-hr': [
    'Thanks for letting me know — I’ll review it and get back to you.',
    'Noted. I’ll keep you posted on approvals.',
    'That works. Remember to submit leave at least a week ahead.',
  ],
  'payroll-team': [
    'Understood. We’ll adjust it in the next run.',
    'Thanks for confirming — the figures are locked in.',
  ],
}

export function getAutoReply(contactId, index) {
  const pool = AUTO_REPLIES[contactId] || AUTO_REPLIES.support
  return pool[index % pool.length]
}