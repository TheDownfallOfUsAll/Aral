import { useEffect, useRef, useState, type FormEvent } from 'react'
import { PhilippinesClock } from './PhilippinesClock'
import './ManagementDashboard.css'

type Teacher = { id: number; name: string; email: string; createdAt: number }
type TeacherAccount = Pick<Teacher, 'id' | 'name' | 'email'>
type Classroom = {
  id: number
  name: string
  grade: number
  createdAt: number
  owner: { id: number; name: string; email: string }
}
type LoginClassroom = { id: number; name: string; grade: number; joinCode: string }
type Student = {
  id: number
  name: string
  grade: number
  sessions: number
  activitiesThisWeek: number
  accuracy: number
  stars: number
  lessonsCompleted: number
  classroom: Pick<LoginClassroom, 'id' | 'name'>
}
type EntityType = 'teacher' | 'classroom' | 'student'
type View = 'overview' | EntityType
type ActiveForm = { type: EntityType; id?: number } | null
type FormValues = {
  name: string
  email: string
  password: string
  pin: string
  grade: string
  ownerUserId: string
  classroomId: string
}

const emptyForm: FormValues = {
  name: '',
  email: '',
  password: '',
  pin: '',
  grade: '1',
  ownerUserId: '',
  classroomId: '',
}

async function requestJson<T>(url: string, init?: RequestInit, service: 'Spring Boot' | 'AralLink' = 'Spring Boot'): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new Error(`Cannot reach ${service}. Start the server and try again.`)
  }

  if (response.status === 204) return undefined as T
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = body !== null && typeof body === 'object'
      ? 'message' in body && typeof body.message === 'string'
        ? body.message
        : 'error' in body && typeof body.error === 'string'
          ? body.error
          : `Request failed with status ${response.status}.`
      : `Request failed with status ${response.status}.`
    throw new Error(message)
  }
  return body as T
}

const springApiRequest = <T,>(path: string, init?: RequestInit) =>
  requestJson<T>(`/spring-api${path}`, init)

const appApiRequest = <T,>(path: string, init?: RequestInit) =>
  requestJson<T>(path, init, 'AralLink')

async function fetchManagementData() {
  const { user } = await appApiRequest<{ user: TeacherAccount | null }>('/api/me')
  if (!user) return { currentTeacher: null, loginClassroom: null, teachers: [], classrooms: [], students: [] }

  const [teachers, classrooms, classroomData] = await Promise.all([
    springApiRequest<Teacher[]>('/teachers'),
    springApiRequest<Classroom[]>('/classrooms'),
    appApiRequest<{ classroom: LoginClassroom; students: Omit<Student, 'classroom'>[] }>('/api/learning/classroom'),
  ])
  return {
    currentTeacher: user,
    loginClassroom: classroomData.classroom,
    teachers,
    classrooms,
    students: classroomData.students.map((student) => ({
      ...student,
      classroom: { id: classroomData.classroom.id, name: classroomData.classroom.name },
    })),
  }
}

function getPhilippinesDateTime(date: Date) {
  const dateText = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    dateStyle: 'full',
  }).format(date)
  const timeText = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    timeStyle: 'medium',
  }).format(date)
  return { dateText, timeText }
}

export function ManagementDashboard() {
  const [view, setView] = useState<View>('overview')
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [currentTeacher, setCurrentTeacher] = useState<TeacherAccount | null>(null)
  const [loginClassroom, setLoginClassroom] = useState<LoginClassroom | null>(null)
  const [activeForm, setActiveForm] = useState<ActiveForm>(null)
  const [formValues, setFormValues] = useState<FormValues>(emptyForm)
  const [now, setNow] = useState(() => new Date())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const dialogRef = useRef<HTMLDialogElement>(null)

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchManagementData()
      setCurrentTeacher(data.currentTeacher)
      setLoginClassroom(data.loginClassroom)
      setTeachers(data.teachers)
      setClassrooms(data.classrooms)
      setStudents(data.students)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchManagementData()
      .then((data) => {
        setCurrentTeacher(data.currentTeacher)
        setLoginClassroom(data.loginClassroom)
        setTeachers(data.teachers)
        setClassrooms(data.classrooms)
        setStudents(data.students)
      })
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : 'Could not load records.')
      })
      .finally(() => setLoading(false))
    const clock = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(clock)
  }, [])

  useEffect(() => {
    if (activeForm && dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal()
    }
  }, [activeForm])

  const openForm = (type: EntityType, record?: Teacher | Classroom | Student) => {
    setError('')
    setNotice('')
    setActiveForm({ type, id: record?.id })
    if (!record) {
      setFormValues({
        ...emptyForm,
        ownerUserId: type === 'classroom' ? String(teachers[0]?.id ?? '') : '',
      })
      return
    }
    if (type === 'teacher') {
      const teacher = record as Teacher
      setFormValues({ ...emptyForm, name: teacher.name, email: teacher.email })
    } else if (type === 'classroom') {
      const classroom = record as Classroom
      setFormValues({
        ...emptyForm,
        name: classroom.name,
        grade: String(classroom.grade),
        ownerUserId: String(classroom.owner.id),
      })
    } else {
      const student = record as Student
      setFormValues({
        ...emptyForm,
        name: student.name,
      })
    }
  }

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!activeForm) return
    setSaving(true)
    setError('')
    setNotice('')
    const { type, id } = activeForm
    const path = `/${type === 'teacher' ? 'teachers' : `${type}s`}${id ? `/${id}` : ''}`
    let body: Record<string, string | number>

    if (type === 'teacher') {
      body = { name: formValues.name.trim(), email: formValues.email.trim() }
      if (formValues.password) body.password = formValues.password
      if (!id || formValues.password) {
        if (formValues.password.length < 8) {
          setError('Password must be at least 8 characters.')
          setSaving(false)
          return
        }
      }
    } else if (type === 'classroom') {
      body = {
        name: formValues.name.trim(),
        grade: Number(formValues.grade),
        ownerUserId: Number(formValues.ownerUserId),
      }
    } else {
      if ((!id && !/^\d{4,8}$/.test(formValues.pin)) || (id && formValues.pin && !/^\d{4,8}$/.test(formValues.pin))) {
        setError('Student PIN must contain 4 to 8 digits.')
        setSaving(false)
        return
      }
      body = { name: formValues.name.trim() }
    }

    try {
      if (type === 'student') {
        if (!id) {
          await appApiRequest('/api/learning/students', {
            method: 'POST',
            body: JSON.stringify({ ...body, pin: formValues.pin }),
          })
        } else {
          await appApiRequest(`/api/learning/students/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
          })
          if (formValues.pin) {
            try {
              await appApiRequest(`/api/learning/students/${id}/pin`, {
                method: 'PUT',
                body: JSON.stringify({ pin: formValues.pin }),
              })
            } catch (pinError) {
              throw new Error(`Student name was saved, but the PIN could not be reset: ${pinError instanceof Error ? pinError.message : 'Please try again.'}`)
            }
          }
        }
      } else {
        await springApiRequest(path, {
          method: id ? 'PUT' : 'POST',
          body: JSON.stringify(body),
        })
      }
      setActiveForm(null)
      if (type === 'student' && !id && loginClassroom) {
        setNotice(`Student login created. Sign in with classroom code ${loginClassroom.joinCode}, name ${formValues.name.trim()}, and PIN ${formValues.pin}. Save these details; the PIN cannot be viewed again.`)
      } else if (type === 'student' && id && formValues.pin && loginClassroom) {
        setNotice(`Student updated. Sign in with classroom code ${loginClassroom.joinCode}, name ${formValues.name.trim()}, and the new PIN. Save the new PIN; it cannot be viewed again.`)
      } else {
        setNotice(`${type[0].toUpperCase()}${type.slice(1)} ${id ? 'updated' : 'created'} successfully.`)
      }
      setFormValues(emptyForm)
      await loadData()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save this record.')
    } finally {
      setSaving(false)
    }
  }

  const deleteRecord = async (type: EntityType, id: number, label: string) => {
    const warning = type === 'teacher' || type === 'classroom'
      ? `Delete ${label}? Its classroom and students may also be deleted. This cannot be undone.`
      : `Delete ${label}? This cannot be undone.`
    if (!window.confirm(warning)) return
    setError('')
    setNotice('')
    try {
      const path = `/${type === 'teacher' ? 'teachers' : `${type}s`}/${id}`
      if (type === 'student') {
        await appApiRequest(`/api/learning/students/${id}`, { method: 'DELETE' })
      } else {
        await springApiRequest(path, { method: 'DELETE' })
      }
      setNotice(`${type[0].toUpperCase()}${type.slice(1)} deleted.`)
      await loadData()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete this record.')
    }
  }

  const currentDateTime = getPhilippinesDateTime(now)
  const formTitle = activeForm
    ? `${activeForm.id ? 'Edit' : 'Add'} ${activeForm.type}`
    : ''

  if (!loading && !currentTeacher) {
    return (
      <main className="management-app">
        <section className="management-access-gate">
          <span className="management-brand-mark" aria-hidden="true">∑</span>
          <span className="management-eyebrow">TEACHER ACCESS</span>
          <h1>Sign in to manage your students.</h1>
          <p>Student accounts belong to a teacher’s classroom. Sign in as a teacher first so new students can use their classroom code and PIN to log in.</p>
          {error && <div className="management-alert error" role="alert">{error}</div>}
          <a className="management-primary" href="/">Go to teacher sign in <span aria-hidden="true">→</span></a>
        </section>
      </main>
    )
  }

  return (
    <main className="management-app">
      <aside className="management-sidebar">
        <a className="management-brand" href="/" aria-label="AralLink home">
          <span className="management-brand-mark" aria-hidden="true">∑</span>
          <span><b>arallink<span>.</span></b><small>CLASSROOM MANAGER</small></span>
        </a>
        <p className="management-nav-label">WORKSPACE</p>
        <nav className="management-nav" aria-label="Management sections">
          {([
            ['overview', 'Overview', '⌂'],
            ['teacher', 'Teachers', '♙'],
            ['classroom', 'Classrooms', '▤'],
            ['student', 'Students', '♧'],
          ] as const).map(([section, label, icon]) => (
            <button
              className={view === section ? 'management-nav-item active' : 'management-nav-item'}
              key={section}
              onClick={() => { setView(section); setActiveForm(null); setError(''); setNotice('') }}
              type="button"
              aria-current={view === section ? 'page' : undefined}
            >
              <span aria-hidden="true">{icon}</span>{label}
              {section === 'teacher' && <small>{teachers.length}</small>}
              {section === 'classroom' && <small>{classrooms.length}</small>}
              {section === 'student' && <small>{students.length}</small>}
            </button>
          ))}
        </nav>
        <div className="management-sidebar-note">
          <span aria-hidden="true">✦</span>
          <b>Little steps, big growth.</b>
          <p>Keep your classroom community organized in one happy place.</p>
        </div>
        <a className="management-back-link" href="/">← Back to AralLink</a>
      </aside>

      <section className="management-main">
        <header className="management-topbar">
          <div><span>AralLink</span><b aria-hidden="true">/</b><strong>{view === 'overview' ? 'Overview' : `${view[0].toUpperCase()}${view.slice(1)}s`}</strong></div>
          <PhilippinesClock now={now} compact className="management-clock-widget" />
        </header>

        <div className="management-content">
          <section className="management-welcome">
            <div>
              <span className="management-eyebrow">INCREMENT 1 · CLASSROOM ADMIN</span>
              <h1>{view === 'overview' ? 'A brighter classroom starts here.' : `Manage ${view}s.`}</h1>
              <p>{view === 'overview' ? 'A clear view of your teachers, classrooms, and learners.' : `Create, update, and organize your ${view} records.`}</p>
            </div>
            <div className="management-date-card">
              <span className="management-date-icon" aria-hidden="true">☼</span>
              <span><b>{currentDateTime.dateText}</b><small>Current date in the Philippines</small></span>
            </div>
          </section>

          {error && <div className="management-alert error" role="alert">{error}</div>}
          {notice && <div className="management-alert success" role="status">{notice}</div>}

          {view === 'overview' ? (
            <>
              <section className="management-overview-banner">
                <div>
                  <span className="management-banner-kicker">YOUR CLASSROOM AT A GLANCE</span>
                  <h2>Every little learner<br />has room to <em>shine.</em></h2>
                  <p>Manage your community and keep the learning journey moving.</p>
                  <button type="button" className="management-primary" onClick={() => { setView('student'); openForm('student') }}>
                    Add a student <span aria-hidden="true">→</span>
                  </button>
                </div>
                <div className="management-banner-art" aria-hidden="true">
                  <span className="management-art-spark">✦</span>
                  <span className="management-art-number">1</span>
                  <span className="management-art-plus">+</span>
                  <span className="management-art-number second">2</span>
                  <span className="management-art-star">✳</span>
                </div>
              </section>

              {loginClassroom && <ClassroomAccessCard classroom={loginClassroom} />}

              <section className="management-stat-grid" aria-label="Classroom totals">
                <article className="management-stat-card teacher-stat"><span className="management-stat-icon">♙</span><small>TEACHERS</small><strong>{loading ? '—' : teachers.length}</strong><p>Classroom guides</p></article>
                <article className="management-stat-card classroom-stat"><span className="management-stat-icon">▤</span><small>CLASSROOMS</small><strong>{loading ? '—' : classrooms.length}</strong><p>Learning spaces</p></article>
                <article className="management-stat-card student-stat"><span className="management-stat-icon">♧</span><small>STUDENTS</small><strong>{loading ? '—' : students.length}</strong><p>Curious learners</p></article>
              </section>

              <section className="management-panel">
                <div className="management-panel-heading">
                  <div><span className="management-eyebrow">QUICK LOOK</span><h2>Recently added students</h2></div>
                  <button className="management-text-button" type="button" onClick={() => setView('student')}>View all students <span aria-hidden="true">→</span></button>
                </div>
                <StudentTable students={students.slice(0, 5)} loading={loading} onEdit={(student) => openForm('student', student)} onDelete={(student) => void deleteRecord('student', student.id, student.name)} />
              </section>
            </>
          ) : (
            <section className="management-panel entity-panel">
              <div className="management-panel-heading">
                <div><span className="management-eyebrow">RECORDS</span><h2>{view === 'teacher' ? 'Teacher directory' : view === 'classroom' ? 'Classroom directory' : 'Student roster'}</h2></div>
                <button className="management-primary" type="button" onClick={() => openForm(view)}>＋ Add {view}</button>
              </div>
              {view === 'teacher' && <TeacherTable teachers={teachers} loading={loading} onEdit={(teacher) => openForm('teacher', teacher)} onDelete={(teacher) => void deleteRecord('teacher', teacher.id, teacher.name)} />}
              {view === 'classroom' && <ClassroomTable classrooms={classrooms} loading={loading} onEdit={(classroom) => openForm('classroom', classroom)} onDelete={(classroom) => void deleteRecord('classroom', classroom.id, classroom.name)} />}
              {view === 'student' && loginClassroom && <ClassroomAccessCard classroom={loginClassroom} />}
              {view === 'student' && <StudentTable students={students} loading={loading} onEdit={(student) => openForm('student', student)} onDelete={(student) => void deleteRecord('student', student.id, student.name)} />}
            </section>
          )}

          {loading && <p className="management-loading" role="status">Loading your records…</p>}
          {!loading && !error && <button className="management-refresh" type="button" onClick={() => void loadData()}>Refresh records</button>}
        </div>
      </section>

      {activeForm && (
        <dialog
          className="management-form-dialog"
          ref={dialogRef}
          aria-labelledby="management-form-title"
          onCancel={(event) => { event.preventDefault(); setActiveForm(null) }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              dialogRef.current?.close()
            }
          }}
          onClose={() => setActiveForm(null)}
          onMouseDown={(event) => { if (event.target === event.currentTarget) dialogRef.current?.close() }}
        >
            <div className="management-dialog-heading">
              <div><span className="management-eyebrow">CLASSROOM RECORD</span><h2 id="management-form-title">{formTitle}</h2></div>
              <button type="button" className="management-close" aria-label="Close form" onClick={() => dialogRef.current?.close()}>×</button>
            </div>
            <form className="management-form" onSubmit={(event) => void submitForm(event)}>
              <label>
                <span>{activeForm.type === 'classroom' ? 'Classroom name' : activeForm.type === 'student' ? 'Student name' : 'Teacher name'}</span>
                <input autoFocus required maxLength={80} value={formValues.name} onChange={(event) => setFormValues({ ...formValues, name: event.target.value })} placeholder={activeForm.type === 'classroom' ? 'Grade 1 - A' : 'Enter a name'} />
              </label>
              {activeForm.type === 'teacher' && <>
                <label><span>Email address</span><input type="email" autoComplete="email" required maxLength={254} value={formValues.email} onChange={(event) => setFormValues({ ...formValues, email: event.target.value })} placeholder="teacher@example.com" /></label>
                <label><span>Password {activeForm.id ? '(leave blank to keep current)' : ''}</span><input type="password" autoComplete={activeForm.id ? 'new-password' : 'new-password'} minLength={8} required={!activeForm.id} value={formValues.password} onChange={(event) => setFormValues({ ...formValues, password: event.target.value })} placeholder="At least 8 characters" /></label>
              </>}
              {activeForm.type === 'student' && loginClassroom && <>
                <label><span>Student sign-in PIN {activeForm.id ? '(leave blank to keep current)' : '(4 to 8 digits)'}</span><input type="password" autoComplete="new-password" inputMode="numeric" minLength={activeForm.id && !formValues.pin ? undefined : 4} maxLength={8} required={!activeForm.id} value={formValues.pin} onChange={(event) => setFormValues({ ...formValues, pin: event.target.value.replace(/\D/g, '').slice(0, 8) })} placeholder={activeForm.id ? 'Optional PIN reset' : 'Create a 4 to 8 digit PIN'} /></label>
                <div className="management-classroom-note">This student will sign in to <b>{loginClassroom.name}</b> with classroom code <b>{loginClassroom.joinCode}</b>.</div>
              </>}
              {activeForm.type === 'classroom' && <>
                <label><span>Grade</span><select required value={formValues.grade} onChange={(event) => setFormValues({ ...formValues, grade: event.target.value })}><option value="1">Grade 1</option><option value="2">Grade 2</option><option value="3">Grade 3</option><option value="4">Grade 4</option><option value="5">Grade 5</option><option value="6">Grade 6</option></select></label>
                {(
                  <label><span>Teacher</span><select required value={formValues.ownerUserId} onChange={(event) => setFormValues({ ...formValues, ownerUserId: event.target.value })}><option value="">Select a teacher</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name} · {teacher.email}</option>)}</select>{teachers.length === 0 && <small className="management-field-hint">Add a teacher first, then assign them to a classroom.</small>}</label>
                )}
              </>}
              {error && <p className="management-alert error" role="alert">{error}</p>}
              <div className="management-form-actions">
                <button className="management-secondary" type="button" onClick={() => dialogRef.current?.close()}>Cancel</button>
                <button className="management-primary" type="submit" disabled={saving || (activeForm.type === 'classroom' && teachers.length === 0) || (activeForm.type === 'student' && !loginClassroom)}>{saving ? 'Saving…' : activeForm.id ? 'Save changes' : `Create ${activeForm.type}`}</button>
              </div>
            </form>
        </dialog>
      )}
    </main>
  )
}

function ClassroomAccessCard({ classroom }: { classroom: LoginClassroom }) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState('')

  const copyJoinCode = async () => {
    setCopyError('')
    try {
      await navigator.clipboard.writeText(classroom.joinCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopyError('Could not copy the code. You can select and copy it manually.')
    }
  }

  return (
    <section className="management-classroom-access" aria-label="Student login details">
      <span className="management-classroom-access-icon" aria-hidden="true">⌂</span>
      <div>
        <span className="management-eyebrow">STUDENT SIGN-IN CLASSROOM</span>
        <strong>{classroom.name} · Grade {classroom.grade}</strong>
        <small>Students use this code, their name, and teacher-issued PIN to sign in.</small>
      </div>
      <div className="management-join-code">
        <span>CLASSROOM CODE</span>
        <b>{classroom.joinCode}</b>
      </div>
      <button className="management-secondary" type="button" onClick={() => void copyJoinCode}>{copied ? 'Copied' : 'Copy code'}</button>
      {copyError && <small className="management-copy-error" role="status">{copyError}</small>}
    </section>
  )
}

function EmptyTable({ label, loading }: { label: string; loading: boolean }) {
  if (loading) return null
  return <div className="management-empty"><span aria-hidden="true">✦</span><b>No {label} yet</b><p>Add a record to see it here.</p></div>
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return <div className="management-row-actions"><button type="button" onClick={onEdit} aria-label="Edit record">Edit</button><button type="button" className="delete" onClick={onDelete} aria-label="Delete record">Delete</button></div>
}

function TeacherTable({ teachers, loading, onEdit, onDelete }: {
  teachers: Teacher[]
  loading: boolean
  onEdit: (teacher: Teacher) => void
  onDelete: (teacher: Teacher) => void
}) {
  if (!teachers.length) return <EmptyTable label="teachers" loading={loading} />
  return <div className="management-table-wrap"><table className="management-table"><thead><tr><th>TEACHER</th><th>EMAIL</th><th>ADDED</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
    {teachers.map((teacher) => <tr key={teacher.id}><td><span className="management-person"><span className="management-person-avatar teacher-avatar">{initials(teacher.name)}</span><b>{teacher.name}</b></span></td><td>{teacher.email}</td><td>{formatCreatedAt(teacher.createdAt)}</td><td><RowActions onEdit={() => onEdit(teacher)} onDelete={() => onDelete(teacher)} /></td></tr>)}
  </tbody></table></div>
}

function ClassroomTable({ classrooms, loading, onEdit, onDelete }: {
  classrooms: Classroom[]
  loading: boolean
  onEdit: (classroom: Classroom) => void
  onDelete: (classroom: Classroom) => void
}) {
  if (!classrooms.length) return <EmptyTable label="classrooms" loading={loading} />
  return <div className="management-table-wrap"><table className="management-table"><thead><tr><th>CLASSROOM</th><th>GRADE</th><th>TEACHER</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
    {classrooms.map((classroom) => <tr key={classroom.id}><td><span className="management-person"><span className="management-person-avatar classroom-avatar">▤</span><b>{classroom.name}</b></span></td><td>Grade {classroom.grade}</td><td>{classroom.owner?.name ?? '—'}</td><td><RowActions onEdit={() => onEdit(classroom)} onDelete={() => onDelete(classroom)} /></td></tr>)}
  </tbody></table></div>
}

function StudentTable({ students, loading, onEdit, onDelete }: {
  students: Student[]
  loading: boolean
  onEdit: (student: Student) => void
  onDelete: (student: Student) => void
}) {
  if (!students.length) return <EmptyTable label="students" loading={loading} />
  return <div className="management-table-wrap"><table className="management-table"><thead><tr><th>STUDENT</th><th>GRADE</th><th>CLASSROOM</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
    {students.map((student) => <tr key={student.id}><td><span className="management-person"><span className="management-person-avatar student-avatar">{initials(student.name)}</span><b>{student.name}</b></span></td><td>Grade {student.grade}</td><td>{student.classroom?.name ?? '—'}</td><td><RowActions onEdit={() => onEdit(student)} onDelete={() => onDelete(student)} /></td></tr>)}
  </tbody></table></div>
}

function initials(name: string) {
  return name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}

function formatCreatedAt(timestamp: number) {
  if (!timestamp) return '—'
  return new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeZone: 'Asia/Manila' }).format(timestamp)
}
