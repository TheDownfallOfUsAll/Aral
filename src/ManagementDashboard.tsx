import { useEffect, useRef, useState, type FormEvent } from 'react'
import './ManagementDashboard.css'

type Teacher = { id: number; name: string; email: string; createdAt: number }
type Classroom = {
  id: number
  name: string
  grade: number
  createdAt: number
  owner: { id: number; name: string; email: string }
}
type Student = {
  id: number
  name: string
  grade: number
  createdAt: number
  classroom: Classroom
}
type EntityType = 'teacher' | 'classroom' | 'student'
type View = 'overview' | EntityType
type ActiveForm = { type: EntityType; id?: number } | null
type FormValues = {
  name: string
  email: string
  password: string
  grade: string
  ownerUserId: string
  classroomId: string
}

const emptyForm: FormValues = {
  name: '',
  email: '',
  password: '',
  grade: '1',
  ownerUserId: '',
  classroomId: '',
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/spring-api${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new Error('Cannot reach Spring Boot. Start the backend and try again.')
  }

  if (response.status === 204) return undefined as T
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = body !== null && typeof body === 'object' && 'message' in body &&
      typeof body.message === 'string'
      ? body.message
      : `Request failed with status ${response.status}.`
    throw new Error(message)
  }
  return body as T
}

async function fetchManagementData() {
  const [teachers, classrooms, students] = await Promise.all([
    apiRequest<Teacher[]>('/teachers'),
    apiRequest<Classroom[]>('/classrooms'),
    apiRequest<Student[]>('/students'),
  ])
  return { teachers, classrooms, students }
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
        classroomId: type === 'student' ? String(classrooms[0]?.id ?? '') : '',
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
        grade: String(student.grade),
        classroomId: String(student.classroom.id),
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
      body = {
        name: formValues.name.trim(),
        grade: Number(formValues.grade),
        classroomId: Number(formValues.classroomId),
      }
    }

    try {
      await apiRequest(path, {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(body),
      })
      setActiveForm(null)
      setNotice(`${type[0].toUpperCase()}${type.slice(1)} ${id ? 'updated' : 'created'} successfully.`)
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
      await apiRequest(`/${type === 'teacher' ? 'teachers' : `${type}s`}/${id}`, { method: 'DELETE' })
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
          <div className="management-top-clock" aria-label={`Philippines time: ${currentDateTime.dateText}, ${currentDateTime.timeText}`}>
            <span aria-hidden="true">◷</span>
            <span><b>{currentDateTime.timeText}</b><small>Philippines time · PHT</small></span>
          </div>
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
              {activeForm.type !== 'teacher' && <>
                <label><span>Grade</span><select required value={formValues.grade} onChange={(event) => setFormValues({ ...formValues, grade: event.target.value })}><option value="1">Grade 1</option><option value="2">Grade 2</option><option value="3">Grade 3</option><option value="4">Grade 4</option><option value="5">Grade 5</option><option value="6">Grade 6</option></select></label>
                {activeForm.type === 'classroom' ? (
                  <label><span>Teacher</span><select required value={formValues.ownerUserId} onChange={(event) => setFormValues({ ...formValues, ownerUserId: event.target.value })}><option value="">Select a teacher</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name} · {teacher.email}</option>)}</select>{teachers.length === 0 && <small className="management-field-hint">Add a teacher first, then assign them to a classroom.</small>}</label>
                ) : (
                  <label><span>Classroom</span><select required value={formValues.classroomId} onChange={(event) => setFormValues({ ...formValues, classroomId: event.target.value })}><option value="">Select a classroom</option>{classrooms.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name} · Grade {classroom.grade}</option>)}</select>{classrooms.length === 0 && <small className="management-field-hint">Create a classroom first, then add a student.</small>}</label>
                )}
              </>}
              {error && <p className="management-alert error" role="alert">{error}</p>}
              <div className="management-form-actions">
                <button className="management-secondary" type="button" onClick={() => dialogRef.current?.close()}>Cancel</button>
                <button className="management-primary" type="submit" disabled={saving || (activeForm.type === 'classroom' ? teachers.length === 0 : activeForm.type === 'student' ? classrooms.length === 0 : false)}>{saving ? 'Saving…' : activeForm.id ? 'Save changes' : `Create ${activeForm.type}`}</button>
              </div>
            </form>
        </dialog>
      )}
    </main>
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
