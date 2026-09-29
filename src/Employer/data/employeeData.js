// Static fallback dataset used by views that still import INITIAL_EMPLOYEES.
// Newer screens load the real workforce from the /api/hr-manager/employees
// endpoint instead; this file exists so those legacy imports always resolve.

const KEMAL = {
  id: 'emp-1789738568855',
  employeeId: 'EMP-001',
  name: 'Kemal Jemal akmel',
  initials: 'KJ',
  department: 'Administration',
  jobTitle: 'Developer',
  employmentStatus: 'Active',
  status: 'Active',
  email: 'kasperzkid@gmail.com',
  phone: '+251 987 654 456',
  avatar: '',
}

export const INITIAL_EMPLOYEES = [KEMAL]