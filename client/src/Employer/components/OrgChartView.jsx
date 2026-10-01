import { useEffect, useMemo, useRef, useState } from 'react'
import { Briefcase, Building2, Mail, MapPin, Network, Phone, Users } from 'lucide-react'

/* ── Level definitions — ordered top-down ─────────────────────────────────── */
const LEVELS = [
  {
    key: 'executive',
    label: 'Executive',
    levels: ['CEO', 'FOUNDER', 'PRESIDENT'],
    featured: true,
  },
  {
    key: 'leadership',
    label: 'Leadership',
    levels: ['COO', 'CTO', 'CFO', 'CMO', 'CPO', 'CHRO', 'VP', 'PARTNER', 'EXECUTIVE', 'DIRECTOR'],
  },
  {
    key: 'directors',
    label: 'Directors & Managers',
    levels: ['MANAGER', 'LEAD', 'ADVISOR', 'SUPERVISOR', 'COORDINATOR'],
  },
  {
    key: 'team',
    label: 'Team Members & Specialists',
    levels: ['SENIOR', 'EMPLOYEE', 'ASSOCIATE', 'INTERN', 'CONSULTANT', 'DEVELOPER', 'OFFICER', 'ANALYST', 'TECHNICIAN'],
  },
]

const fallbackAvatar = (name, size = 200) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=${size}&background=0f86a1&color=fff&bold=true&length=2`

const STATUS_DOT = {
  Active: 'bg-emerald-500',
  'On Leave': 'bg-amber-500',
}

function statusDot(status) {
  return STATUS_DOT[status] || 'bg-rose-500'
}

/* ── Tree Connector — SVG lines that draw in when scrolled into view ──────── */
function TreeConnector({ above, below }) {
  const W = 1000
  const H = 80
  const railY = 36

  const parentCenters = useMemo(
    () => Array.from({ length: above }, (_, i) => ((i + 0.5) / above) * W),
    [above],
  )
  const childCenters = useMemo(
    () => Array.from({ length: below }, (_, i) => ((i + 0.5) / below) * W),
    [below],
  )

  const busLeft = Math.min(parentCenters[0] ?? W / 2, childCenters[0] ?? W / 2)
  const busRight = Math.max(parentCenters.at(-1) ?? W / 2, childCenters.at(-1) ?? W / 2)

  return (
    <div className="org-connector" data-reveal aria-hidden="true">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {/* parent stubs: top → rail */}
        {parentCenters.map((x, i) => (
          <line
            key={`p${i}`}
            x1={x} y1={0} x2={x} y2={railY}
            pathLength="1"
            className="org-connector-stub"
            style={{ transitionDelay: `${i * 0.04}s` }}
          />
        ))}
        {/* horizontal rail */}
        <line
          x1={busLeft} y1={railY} x2={busRight} y2={railY}
          pathLength="1"
          className="org-connector-rail"
          style={{ transitionDelay: '0.15s' }}
        />
        {/* child stubs: rail → bottom */}
        {childCenters.map((x, i) => (
          <line
            key={`c${i}`}
            x1={x} y1={railY} x2={x} y2={H}
            pathLength="1"
            className="org-connector-stub is-child"
            style={{ transitionDelay: `${0.3 + i * 0.04}s` }}
          />
        ))}
      </svg>
    </div>
  )
}

/* ── Member Card with inline profile (revealed on scroll) ─────────────────── */
function OrgMemberCard({ member, featured, index, onSelect }) {
  const [failed, setFailed] = useState(false)
  const img = member.avatar && !failed ? member.avatar : fallbackAvatar(member.name)
  const status = member.employmentStatus || member.status || 'Active'

  return (
    <div
      data-reveal
      style={{ '--reveal-delay': `${Math.min(index * 0.06, 0.5)}s` }}
    >
      <button
        type="button"
        className={`org-card group cursor-pointer text-left${featured ? ' is-featured' : ''}`}
        tabIndex={0}
        aria-label={`${member.name}, ${member.jobTitle || 'Team Member'}`}
        onClick={() => onSelect?.(member)}
      >
        <div className="org-card-photo">
          <img
            src={img}
            alt={member.name}
            className="org-card-img"
            loading="lazy"
            onError={() => setFailed(true)}
          />
          <span
            className={`absolute bottom-1.5 right-1.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-[#15181d] ${statusDot(status)}`}
            title={status}
          />
          {member.employmentType && (
            <span className="org-card-type">{member.employmentType}</span>
          )}
        </div>

        <div className="org-card-meta">
          <h3 className="org-card-name">{member.name}</h3>
          <p className="org-card-position">{member.jobTitle || 'Team Member'}</p>

          {/* Inline profile rows */}
          <div className="org-card-profile">
            <p className="org-card-contact">
              <Mail size={11} className="shrink-0" />
              <span className="truncate">{member.email}</span>
            </p>
            {member.phone && (
              <p className="org-card-contact">
                <Phone size={11} className="shrink-0" />
                <span>{member.phone}</span>
              </p>
            )}
            {member.location && (
              <p className="org-card-contact">
                <MapPin size={11} className="shrink-0" />
                <span className="truncate">{member.location}</span>
              </p>
            )}
          </div>
        </div>
      </button>
    </div>
  )
}

/* ── One department section: its own mini pyramid ─────────────────────────── */
function DepartmentSection({ dept, employees, featured, onSelect, indexBase }) {
  const grouped = useMemo(() => {
    const map = {}
    LEVELS.forEach((l) => (map[l.key] = []))
    employees.forEach((emp) => {
      const title = (emp.jobTitle || '').toUpperCase()
      const match = LEVELS.slice(0, 3).find((l) => l.levels.some((lvl) => title.includes(lvl)))
      const key = match ? match.key : 'team'
      map[key].push(emp)
    })
    return map
  }, [employees])

  const rows = LEVELS.map((l) => ({ ...l, members: grouped[l.key] || [] })).filter(
    (r) => r.members.length > 0,
  )

  // Running index so card stagger cascades across the whole pyramid, not per row.
  const offsets = []
  {
    let acc = indexBase
    rows.forEach((r) => {
      offsets.push(acc)
      acc += r.members.length
    })
  }

  return (
    <section className="org-dept">
      <header className="org-dept-header" data-reveal>
        <span className="org-dept-icon">
          <Building2 size={14} />
        </span>
        <h2 className="org-dept-name">{dept}</h2>
        <span className="org-dept-count">
          <Users size={11} />
          {employees.length}
        </span>
        <span className="org-dept-line" aria-hidden="true" />
      </header>

      <div className="flex flex-col items-center w-full">
        {rows.map((row, idx) => {
          const nextRowMembers = rows[idx + 1]?.members || []
          return (
            <div key={row.key} className="w-full flex flex-col items-center">
              <p className="org-level-label">{row.label}</p>
              <div className="org-row flex flex-wrap justify-center items-stretch gap-[22px] w-full">
                {row.members.map((m, i) => (
                  <OrgMemberCard
                    key={m.id}
                    member={m}
                    featured={featured && row.key === 'executive' && i === 0}
                    index={offsets[idx] + i}
                    onSelect={onSelect}
                  />
                ))}
              </div>
              {nextRowMembers.length > 0 && (
                <TreeConnector above={row.members.length} below={nextRowMembers.length} />
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* ── Main Org Chart ───────────────────────────────────────────────────────── */
export default function OrgChartView({ employees, onSelectEmployee }) {
  const chartRef = useRef(null)

  /* Separate employees into departments */
  const departments = useMemo(() => {
    const map = new Map()
    employees.forEach((emp) => {
      const dept = emp.department || 'Unassigned'
      if (!map.has(dept)) map.set(dept, [])
      map.get(dept).push(emp)
    })
    // Bigger departments first for a nicer reading order
    return [...map.entries()]
      .map(([name, emps]) => ({ name, employees: emps }))
      .sort((a, b) => b.employees.length - a.employees.length)
  }, [employees])

  /* Section layout — running card index (immutable prefix sum) so the reveal
     stagger cascades across department boundaries. */
  const sections = useMemo(
    () =>
      departments.reduce(
        (out, dept) => [
          ...out,
          { ...dept, indexBase: out.reduce((sum, d) => sum + d.employees.length, 0) },
        ],
        [],
      ),
    [departments],
  )

  /* Scroll reveal — flip [data-reveal] elements to .is-visible as they enter view */
  useEffect(() => {
    const root = chartRef.current
    if (!root) return

    const els = root.querySelectorAll('[data-reveal]')
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [employees])

  if (employees.length === 0) {
    return (
      <div className="bg-white dark:bg-[#15181d] rounded-2xl p-10 border border-gray-200/90 dark:border-[#262b31] shadow-2xs flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
          <Network size={22} />
        </div>
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">No employees to display</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
          Add employees or clear your search to see the hierarchical view here.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-[#15181d] rounded-2xl p-6 md:p-8 border border-gray-200/90 dark:border-[#262b31] shadow-2xs">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-gray-100 dark:border-[#262b31] mb-8">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base flex items-center gap-2">
            <Network size={18} className="text-indigo-600 dark:text-indigo-400" />
            Organizational Hierarchy
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 ml-6">
            {departments.length} departments · click any profile for details
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 dark:bg-[#1c2026] border border-gray-200/70 dark:border-[#262b31] px-3 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
          <Users size={13} className="text-emerald-500" />
          {employees.length} Total Staff
        </span>
      </div>

      {/* ── Department sections — each with its own pyramid ── */}
      <div ref={chartRef} className="org-chart">
        {sections.map((dept, di) => (
          <DepartmentSection
            key={dept.name}
            dept={dept.name}
            employees={dept.employees}
            featured={di === 0}
            indexBase={dept.indexBase}
            onSelect={onSelectEmployee}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 pt-5 mt-8 border-t border-gray-100 dark:border-[#262b31] text-[11px] font-medium text-gray-500 dark:text-gray-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Active
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> On Leave
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Inactive
        </span>
        <span className="ml-auto hidden sm:inline flex items-center gap-1.5">
          <Briefcase size={11} /> Leadership → Managers → Team, per department
        </span>
      </div>
    </div>
  )
}
