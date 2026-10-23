import { useEffect, useRef, useState, type FormEvent } from 'react'

type AuthUser = { id: number; name: string; email: string }
type Student = {
  id: number
  name: string
  grade: number
  activitiesThisWeek: number
  accuracy: number
  stars: number
  lessonsCompleted: number
}
type Lesson = {
  id: string
  title: string
  topic: string
  progress: number
}
type Progress = {
  sessions: number
  correct: number
  questions: number
  accuracy: number
  weeklySessions: number
  weeklyCorrect: number
  weeklyQuestions: number
  weeklyAccuracy: number
  durationSeconds: number
  lessonsCompleted: number
  badges: { id: string; awardedAt: number }[]
  stars: number
}
type PracticeQuestion = { expression: string; choices: number[] }
type PracticeExplanation = { expression: string; selectedAnswer: number; answer: number; correct: boolean; explanation: string }
type Notification = {
  id: number
  student_id: number | null
  type: string
  title: string
  body: string
  created_at: number
  read_at: number | null
}
type Page = 'Overview' | 'Classroom' | 'Lessons' | 'Practice' | 'Progress' | 'My students' | 'Notifications' | 'Settings'

const lessons = [
  { id: 'adding-within-10', title: 'Adding within 10', topic: 'ADDITION', description: 'Put numbers together and count on to find the total.' },
  { id: 'subtracting-within-10', title: 'Taking away within 10', topic: 'SUBTRACTION', description: 'Take away, cross out, and discover what remains.' },
  { id: 'make-10', title: 'Make 10', topic: 'NUMBER SENSE', description: 'Find number pairs that make ten in a flash.' },
]
const nav: { label: Page; icon: string }[] = [
  { label: 'Overview', icon: '⌂' },
  { label: 'Classroom', icon: '▦' },
  { label: 'Lessons', icon: '▤' },
  { label: 'Practice', icon: '✳' },
  { label: 'Progress', icon: '↗' },
  { label: 'My students', icon: '♧' },
  { label: 'Notifications', icon: '♧' },
]

const api = async <T,>(path: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(path, options)
  const result = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(result.error ?? 'The request could not be completed.')
  return result
}

const jsonOptions = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

const friendlyDate = (timestamp: number) => new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
}).format(timestamp)
const currentTimestamp = () => Date.now()

export function LearningDashboard({ user, onUserUpdated, onSwitchAccount, onSignOut }: {
  user: AuthUser
  onUserUpdated: (user: AuthUser) => void
  onSwitchAccount: () => void
  onSignOut: () => void
}) {
  const [page, setPage] = useState<Page>('Overview')
  const [classroomName, setClassroomName] = useState('My classroom')
  const [classroomJoinCode, setClassroomJoinCode] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [lessonProgress, setLessonProgress] = useState<Record<string, number>>({})
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [studentName, setStudentName] = useState('')
  const [studentPin, setStudentPin] = useState('')
  const [classroomGuides, setClassroomGuides] = useState<{ id: string; title: string; topic: string; guide: string; workedExample: string; answer: number }[]>([])
  const [addedStudentMessage, setAddedStudentMessage] = useState('')
  const studentNameInput = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState('')
  const [savingStudent, setSavingStudent] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([])
  const [practiceQuestions, setPracticeQuestions] = useState<PracticeQuestion[]>([])
  const [practiceExplanations, setPracticeExplanations] = useState<PracticeExplanation[]>([])
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [activityId, setActivityId] = useState('quick-practice')
  const [startedAt, setStartedAt] = useState(0)
  const [savingPractice, setSavingPractice] = useState(false)
  const [practiceComplete, setPracticeComplete] = useState(false)
  const [profileName, setProfileName] = useState(user.name)
  const [savingProfile, setSavingProfile] = useState(false)

  useEffect(() => {
    let active = true
    api<{ classroom: { name: string; joinCode: string }; students: Student[] }>('/api/learning/classroom')
      .then(({ classroom, students: loadedStudents }) => {
        if (!active) return
        setClassroomName(classroom.name)
        setClassroomJoinCode(classroom.joinCode)
        setStudents(loadedStudents)
        setSelectedStudentId((current) =>
          loadedStudents.some(({ id }) => id === current) ? current : loadedStudents[0]?.id ?? null,
        )
        setError('')
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not load your classroom.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [user.id, refresh])

  useEffect(() => {
    let active = true
    const progressRequest = selectedStudentId
      ? api<Progress>(`/api/learning/progress?studentId=${selectedStudentId}`)
      : Promise.resolve(null)
    const lessonRequest = selectedStudentId
      ? api<{ lessons: Lesson[] }>(`/api/learning/lessons?studentId=${selectedStudentId}`)
      : Promise.resolve({ lessons: [] as Lesson[] })
    Promise.all([
      progressRequest,
      lessonRequest,
      api<{ notifications: Notification[] }>('/api/learning/notifications'),
    ])
      .then(([nextProgress, lessonResult, notificationResult]) => {
        if (!active) return
        setProgress(nextProgress)
        setLessonProgress(Object.fromEntries(lessonResult.lessons.map(({ id, progress }) => [id, progress])))
        setNotifications(notificationResult.notifications)
        setError('')
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not load saved learning data.')
      })
    return () => { active = false }
  }, [selectedStudentId, refresh])

  useEffect(() => {
    if (page !== 'Classroom') return
    let active = true
    api<{ lessons: typeof classroomGuides }>('/api/learning/classroom/guides')
      .then(({ lessons: loadedGuides }) => { if (active) setClassroomGuides(loadedGuides) })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load classroom guides.') })
    return () => { active = false }
  }, [page])

  useEffect(() => {
    if (page === 'My students' && !savingStudent && addedStudentMessage) {
      studentNameInput.current?.focus()
    }
  }, [page, savingStudent, addedStudentMessage])

  const selectedStudent = students.find(({ id }) => id === selectedStudentId) ?? null
  const activeQuestion = practiceQuestions[questionIndex]
  const unreadCount = notifications.filter(({ read_at }) => read_at === null).length

  const addStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSavingStudent(true)
    setError('')
    try {
      const result = await api<{ student: { id: number; name: string; grade: number } }>('/api/learning/students', jsonOptions('POST', { name: studentName, pin: studentPin }))
      const createdStudent: Student = { ...result.student, activitiesThisWeek: 0, accuracy: 0, stars: 0, lessonsCompleted: 0 }
      setStudents((current) => [...current, createdStudent])
      setSelectedStudentId(createdStudent.id)
      setStudentName('')
      setStudentPin('')
      setAddedStudentMessage(`${createdStudent.name} was added. Student sign-in: code ${classroomJoinCode}, name ${createdStudent.name}, PIN ${studentPin}. Share these details privately; the PIN can’t be retrieved later.`)
      setPage('My students')
      setRefresh((value) => value + 1)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The student profile could not be saved.')
    } finally {
      setSavingStudent(false)
    }
  }

  const startPractice = async (nextActivityId = 'quick-practice') => {
    if (!selectedStudent) {
      setPage('My students')
      setError('Add a student profile to begin the learning journey.')
      return
    }
    setSavingPractice(true)
    setError('')
    try {
      const result = await api<{ questions: PracticeQuestion[] }>(`/api/learning/practice-questions?studentId=${selectedStudent.id}&activityId=${nextActivityId}`)
      setPracticeQuestions(result.questions)
      setPracticeExplanations([])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Practice questions could not be loaded.')
      setSavingPractice(false)
      return
    }
    setActivityId(nextActivityId)
    setStartedAt(Date.now())
    setQuestionIndex(0)
    setSelectedAnswer(null)
    setSelectedAnswers([])
    setAnswered(false)
    setScore(0)
    setPracticeComplete(false)
    setPage('Practice')
    setSavingPractice(false)
  }

  const advancePractice = async () => {
    const answers = selectedAnswer === null
      ? selectedAnswers
      : [...selectedAnswers.slice(0, questionIndex), selectedAnswer]
    if (questionIndex < practiceQuestions.length - 1) {
      setSelectedAnswers(answers)
      setQuestionIndex((value) => value + 1)
      setSelectedAnswer(null)
      setAnswered(false)
      return
    }
    if (!selectedStudent || savingPractice) return
    setSavingPractice(true)
    setError('')
    try {
      const result = await api<{ correctCount: number; explanations: PracticeExplanation[] }>('/api/learning/practice-sessions', jsonOptions('POST', {
        studentId: selectedStudent.id,
        activityId,
        answers,
        durationSeconds: Math.max(0, Math.floor((currentTimestamp() - startedAt) / 1000)),
      }))
      setSelectedAnswers(answers)
      setScore(result.correctCount)
      setPracticeExplanations(result.explanations)
      setRefresh((value) => value + 1)
      setPracticeComplete(true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Your result could not be saved. Please retry.')
    } finally {
      setSavingPractice(false)
    }
  }

  const markAllRead = async () => {
    try {
      await api('/api/learning/notifications/read', { method: 'PATCH' })
      const readAt = currentTimestamp()
      setNotifications((current) => current.map((item) => ({ ...item, read_at: readAt })))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Notifications could not be updated.')
    }
  }

  const chooseAnswer = (choice: number) => {
    if (answered) return
    setSelectedAnswer(choice)
    setSelectedAnswers((current) => [...current.slice(0, questionIndex), choice])
    setAnswered(true)
  }

  const deleteStudent = async (student: Student) => {
    if (!window.confirm(`Remove ${student.name} and their saved learning records?`)) return
    try {
      await api(`/api/learning/students/${student.id}`, { method: 'DELETE' })
      setStudents((current) => current.filter(({ id }) => id !== student.id))
      setSelectedStudentId((current) => current === student.id ? null : current)
      setRefresh((value) => value + 1)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The student could not be removed.')
    }
  }

  const resetStudentPin = async (student: Student) => {
    const pin = window.prompt(`Set a new 4–8 digit PIN for ${student.name}.`)
    if (pin === null) return
    if (!/^\d{4,8}$/.test(pin)) {
      setError('Student PINs must contain 4 to 8 digits.')
      return
    }
    try {
      await api(`/api/learning/students/${student.id}/pin`, jsonOptions('PUT', { pin }))
      setAddedStudentMessage(`${student.name}’s PIN was reset. Share the new PIN privately.`)
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The student PIN could not be reset.')
    }
  }

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSavingProfile(true)
    setError('')
    try {
      const result = await api<{ user: AuthUser }>('/api/me', jsonOptions('PATCH', { name: profileName }))
      onUserUpdated(result.user)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Your profile could not be saved.')
    } finally {
      setSavingProfile(false)
    }
  }

  const renderJourneyStart = () => (
    <section className="journey-start">
      <div className="journey-start-copy">
        <span className="eyebrow">A FRESH CLASSROOM</span>
        <h1>Your students’ journey starts here.</h1>
        <p>Add your first student profile. Their lessons, practice, and progress will be saved to this classroom.</p>
      </div>
      <form className="journey-add-form" onSubmit={addStudent}>
        <label htmlFor="first-student-name">Student name</label>
        <div>
          <input ref={studentNameInput} id="first-student-name" autoComplete="off" maxLength={80} minLength={1} required value={studentName} onChange={(event) => setStudentName(event.target.value)} placeholder="Enter a student's name" />
          <input aria-label="Set student PIN" inputMode="numeric" minLength={4} maxLength={8} required value={studentPin} onChange={(event) => setStudentPin(event.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="Set 4–8 digit PIN" />
          <button className="primary-button" type="submit" disabled={savingStudent}>{savingStudent ? 'Adding…' : 'Add student'}</button>
        </div>
        {addedStudentMessage && <p className="teacher-success" role="status">{addedStudentMessage}</p>}
      </form>
    </section>
  )

  const renderOverview = () => selectedStudent ? (
    <>
      <section className="welcome-row">
        <div>
          <div className="eyebrow">TEACHER OVERVIEW · {classroomName.toUpperCase()}</div>
          <h1>{selectedStudent.name.split(' ')[0]}’s learning journey</h1>
          <p className="welcome-sub">A fresh start, with every step saved as they learn.</p>
        </div>
        <button className="soft-button" onClick={() => setPage('My students')}>Change student</button>
      </section>
      <section className="hero-banner">
        <div className="hero-copy">
          <span className="hero-kicker">GRADE {selectedStudent.grade} · YOUR LEARNING JOURNEY</span>
          <h2>Little steps.<br /><span>Big number smarts.</span></h2>
          <p>{selectedStudent.activitiesThisWeek} practice sessions completed this week.</p>
          <button className="hero-button" onClick={() => startPractice()}>Continue learning <span aria-hidden="true">→</span></button>
        </div>
        <div className="hero-illustration" aria-hidden="true"><div className="hero-number one">2</div><div className="hero-number two">+</div><div className="hero-number three">3</div><div className="hero-equals">=</div><div className="hero-number four">5</div></div>
      </section>
      <section className="stats-grid">
        <article className="stat-card"><div className="stat-icon stat-green">✳</div><div><span className="stat-label">THIS WEEK</span><div className="stat-value">{progress?.weeklySessions ?? 0}<small> practice sessions</small></div></div></article>
        <article className="stat-card"><div className="stat-icon stat-yellow">★</div><div><span className="stat-label">TOTAL STARS</span><div className="stat-value">{progress?.stars ?? 0}<small> earned</small></div></div></article>
        <article className="stat-card"><div className="stat-icon stat-purple">✓</div><div><span className="stat-label">ACCURACY</span><div className="stat-value">{progress?.accuracy ?? 0}<small>% overall</small></div></div></article>
      </section>
      <section className="journey-lessons">
        <div className="section-heading"><div><div className="eyebrow">START AT THE BEGINNING</div><h2>Learning path</h2></div><button className="link-button" onClick={() => setPage('Lessons')}>All lessons →</button></div>
        <div className="lesson-cards">
          {lessons.map((lesson, index) => {
            const lessonPercent = lessonProgress[lesson.id] ?? 0
            const locked = index > 0 && (lessonProgress[lessons[index - 1].id] ?? 0) < 100
            return <article className={`lesson-card ${locked ? 'is-locked' : ''}`} key={lesson.id}>
              <div className={`lesson-card-art ${index === 1 ? 'lavender' : index === 2 ? 'yellow' : 'mint'}`}><span>{index === 0 ? '＋' : index === 1 ? '−' : '10'}</span></div>
              <div className="lesson-card-body"><span className="lesson-topic">{lesson.topic} · LESSON 0{index + 1}</span><h3>{lesson.title}</h3><p>{lesson.description}</p><div className="lesson-meter"><div className="progress-track"><span style={{ width: `${lessonPercent}%` }} /></div><span>{lessonPercent ? `${lessonPercent}%` : 'Not started'}</span></div><button className="card-action" disabled={locked} onClick={() => startPractice(lesson.id)}>{locked ? 'Complete the lesson above first' : lessonPercent ? 'Continue lesson →' : 'Start lesson →'}</button></div>
            </article>
          })}
        </div>
      </section>
    </>
  ) : renderJourneyStart()

  const renderStudents = () => (
    <>
      <section className="page-heading"><div><div className="eyebrow">YOUR LEARNING CREW</div><h1>My students</h1><p>Student profiles belong to your classroom and start with no progress.</p></div></section>
      <form className="journey-add-form" onSubmit={addStudent}>
        <label htmlFor="student-name">Add a student</label>
        <div><input ref={studentNameInput} id="student-name" autoComplete="off" maxLength={80} minLength={1} required value={studentName} onChange={(event) => { setStudentName(event.target.value); setAddedStudentMessage('') }} placeholder="Enter a student's name" /><input aria-label="Set student PIN" inputMode="numeric" minLength={4} maxLength={8} required value={studentPin} onChange={(event) => setStudentPin(event.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="Set 4–8 digit PIN" /><button className="primary-button" type="submit" disabled={savingStudent}>{savingStudent ? 'Adding…' : 'Add student'}</button><button className="text-button" type="button" disabled={savingStudent} onClick={() => { setStudentName(''); setStudentPin(''); setAddedStudentMessage(''); setError(''); setPage('Classroom') }}>Cancel</button></div>
        {addedStudentMessage && <p className="teacher-success" role="status">{addedStudentMessage}</p>}
      </form>
      <section className="student-table panel">
        <div className="table-toolbar"><h2>Student overview <span>{students.length}</span></h2><div className="table-search"><input aria-label="Search students" placeholder="Find a student" value={search} onChange={(event) => setSearch(event.target.value)} /></div></div>
        <div className="table-head"><span>STUDENT</span><span>THIS WEEK</span><span>ACCURACY</span><span>STARS</span><span>LESSONS</span><span /></div>
        {students.filter(({ name }) => name.toLowerCase().includes(search.toLowerCase())).map((child) => <div className="student-row" key={child.id}>
          <div className="student-name"><div className="student-avatar lilac">{child.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</div><div><b>{child.name}</b><small>Grade {child.grade}</small></div></div>
          <div className="table-progress"><span>{child.activitiesThisWeek} sessions</span><div className="progress-track"><span style={{ width: `${Math.min(100, child.activitiesThisWeek / 12 * 100)}%` }} /></div></div>
          <strong className="accuracy-cell">{child.accuracy}%</strong><strong className="stars-cell">★ {child.stars}</strong><span className="streak-cell">{child.lessonsCompleted} complete</span>
          <span className="student-row-actions"><button className="row-menu" aria-label={`View ${child.name}`} onClick={() => { setSelectedStudentId(child.id); setPage('Overview') }}>→</button><button className="row-menu" aria-label={`Reset ${child.name}'s PIN`} title="Reset student PIN" onClick={() => void resetStudentPin(child)}>⌑</button><button className="row-menu" aria-label={`Remove ${child.name}`} onClick={() => void deleteStudent(child)}>×</button></span>
        </div>)}
        {students.length === 0 && <div className="table-empty">Your new classroom is ready for its first student.</div>}
      </section>
    </>
  )

  const renderClassroom = () => (
    <>
      <section className="page-heading"><div><div className="eyebrow">TEACHER RESOURCES</div><h1>Classroom math guides</h1><p>Share strategies with students; answer keys stay in this teacher view.</p></div></section>
      <section className="classroom-code-panel"><div><span className="eyebrow">STUDENT SIGN-IN CODE</span><strong>{classroomJoinCode || 'Loading code…'}</strong><p>Students sign in with this code, their classroom name, and their teacher-set PIN.</p></div><button className="soft-button" type="button" onClick={() => { void navigator.clipboard?.writeText(classroomJoinCode) }}>Copy code</button></section>
      <section className="teacher-guide-list">{classroomGuides.map((guide) => <article className="teacher-guide" key={guide.id}><div><span className="lesson-topic">{guide.topic}</span><h2>{guide.title}</h2><p>{guide.guide}</p><div className="student-guide-example"><b>Worked method</b><span>{guide.workedExample}</span></div></div><div className="teacher-answer-key"><span>TEACHER ANSWER</span><strong>{guide.answer}</strong></div></article>)}</section>
    </>
  )

  const renderLessons = () => selectedStudent ? (
    <>
      <section className="page-heading"><div><div className="eyebrow">{selectedStudent.name.toUpperCase()}’S LEARNING PATH</div><h1>Lessons</h1><p>Lessons unlock in order so every learner starts at the beginning.</p></div><button className="soft-button" onClick={() => startPractice()}>Quick practice</button></section>
      <section className="lesson-cards">
        {lessons.map((lesson, index) => {
          const lessonPercent = lessonProgress[lesson.id] ?? 0
          const locked = index > 0 && (lessonProgress[lessons[index - 1].id] ?? 0) < 100
          return <article className={`lesson-card ${locked ? 'is-locked' : ''}`} key={lesson.id}><div className={`lesson-card-art ${index === 1 ? 'lavender' : index === 2 ? 'yellow' : 'mint'}`}><span>{index === 0 ? '＋' : index === 1 ? '−' : '10'}</span></div><div className="lesson-card-body"><span className="lesson-topic">{lesson.topic} · LESSON 0{index + 1}</span><h3>{lesson.title}</h3><p>{lesson.description}</p><div className="lesson-meter"><div className="progress-track"><span style={{ width: `${lessonPercent}%` }} /></div><span>{lessonPercent ? `${lessonPercent}%` : 'Not started'}</span></div><button className="card-action" disabled={locked} onClick={() => startPractice(lesson.id)}>{locked ? 'Complete the lesson above first' : lessonPercent ? 'Continue lesson →' : 'Start lesson →'}</button></div></article>
        })}
      </section>
    </>
  ) : renderJourneyStart()

  const renderProgress = () => selectedStudent ? (
    <>
      <section className="page-heading"><div><div className="eyebrow">SAVED LEARNING RECORD</div><h1>{selectedStudent.name}’s progress</h1><p>Progress updates are saved to this teacher-owned classroom.</p></div></section>
      <div className="progress-summary"><article className="progress-highlight"><span className="stat-label">TOTAL STARS</span><strong>{progress?.stars ?? 0}</strong><p>Stars from correctly answered questions.</p><div className="highlight-stars">{progress?.badges.map(() => '✦ ').join('') || 'Your first star is waiting'}</div></article><article className="progress-metric"><span className="stat-label">LESSONS COMPLETED</span><b>{progress?.lessonsCompleted ?? 0} <small>of {lessons.length}</small></b><div className="progress-track"><span style={{ width: `${Math.min(100, (progress?.lessonsCompleted ?? 0) / lessons.length * 100)}%` }} /></div></article><article className="progress-metric"><span className="stat-label">ACCURACY</span><b>{progress?.accuracy ?? 0}%</b><div className="metric-trend">This week: {progress?.weeklyAccuracy ?? 0}%</div></article></div>
      <section className="achievement-list">{progress?.badges.map(({ id }) => <article key={id}><b>{id === 'number-explorer' ? 'Number Explorer' : id}</b><p>Earned {friendlyDate(progress.badges.find((badge) => badge.id === id)?.awardedAt ?? Date.now())}</p></article>)}</section>
    </>
  ) : renderJourneyStart()

  const renderNotifications = () => (
    <>
      <section className="page-heading"><div><div className="eyebrow">CLASSROOM UPDATES</div><h1>Notifications</h1><p>Saved learning milestones and practice results.</p></div><button className="soft-button" disabled={unreadCount === 0} onClick={() => void markAllRead()}>Mark all as read</button></section>
      <div className="notification-list panel">{notifications.map((item) => <article className={`notification-item ${item.read_at === null ? 'unread' : ''}`} key={item.id}><span className="notification-icon green">{item.type === 'badge-earned' ? '★' : item.type === 'lesson-complete' ? '✓' : '✳'}</span><div className="notification-copy"><div><b>{item.title}</b>{item.read_at === null && <i className="unread-dot" />}</div><p>{item.body}</p><small>{friendlyDate(item.created_at)}</small></div></article>)}{notifications.length === 0 && <div className="table-empty">Updates will appear here as students learn.</div>}</div>
    </>
  )

  const renderPractice = () => (
    <div className="practice-wrap">
      <div className="practice-top"><button className="back-button" onClick={() => setPage(activityId === 'quick-practice' ? 'Overview' : 'Lessons')}>← Back</button><span className="session-label">{activityId === 'quick-practice' ? 'Quick practice' : lessons.find(({ id }) => id === activityId)?.title}</span></div>
      {practiceComplete ? (
        <section className="completion-card">
          <div className="completion-art">✦</div><div className="eyebrow">RESULT SAVED</div>
          <h2>Nice work, {selectedStudent?.name.split(' ')[0]}!</h2>
          <p>{score} out of {practiceQuestions.length} correct. Your teacher can see this saved result.</p>
          <div className="student-explanations">{practiceExplanations.map((item, index) => <article key={`${item.expression}-${index}`}><b>{item.expression} = {item.answer}</b><p>{item.correct ? 'That’s right!' : 'Good try. Here is how to solve it:'} {item.explanation}</p></article>)}</div>
          <button className="primary-button" onClick={() => { setPage('Overview'); setRefresh((value) => value + 1) }}>Back to journey</button>
        </section>
      ) : (
        <section className="practice-card">
          <div className="practice-progress"><span>QUESTION {questionIndex + 1} OF {practiceQuestions.length}</span><div className="progress-track"><span style={{ width: `${(questionIndex + 1) / practiceQuestions.length * 100}%` }} /></div><span className="practice-stars">★</span></div>
          {activeQuestion ? <><div className="math-prompt"><span className="prompt-label">Choose the answer</span><div className="equation">{activeQuestion.expression} <span>=</span> <b>?</b></div></div><div className="answer-grid" role="group" aria-label="Choose your answer">{activeQuestion.choices.map((choice) => <button key={choice} className={`answer-choice ${selectedAnswer === choice ? 'selected' : ''}`} onClick={() => chooseAnswer(choice)} aria-pressed={selectedAnswer === choice}>{choice}</button>)}</div>{answered && <p className="answer-feedback" role="status">Answer recorded. You’ll see the explanation after you finish.</p>}<div className="practice-actions"><button className="primary-button" disabled={!answered || savingPractice} onClick={() => void advancePractice()}>{savingPractice ? 'Saving…' : questionIndex === practiceQuestions.length - 1 ? 'Finish and check' : 'Next question →'}</button></div></> : <div className="journey-loading" role="status">Loading practice questions…</div>}
        </section>
      )}
    </div>
  )

  const renderSettings = () => (
    <section className="settings-page">
      <section className="page-heading">
        <div><div className="eyebrow">TEACHER ACCOUNT</div><h1>Account settings</h1><p>Manage the profile connected to {classroomName}.</p></div>
      </section>
      <section className="settings-card">
        <div className="settings-card-heading">
          <div className="settings-avatar">{user.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</div>
          <div><h2>Teacher profile</h2><p>Your account owns this classroom and its student records.</p></div>
        </div>
        <form className="settings-form" onSubmit={saveProfile}>
          <label><span>Your name</span><input autoComplete="name" maxLength={80} required value={profileName} onChange={(event) => setProfileName(event.target.value)} /></label>
          <label><span>Email address</span><input autoComplete="email" value={user.email} disabled /><small>Email address is used for sign-in and can’t be changed here.</small></label>
          <button className="primary-button" type="submit" disabled={savingProfile || profileName.trim() === user.name}>{savingProfile ? 'Saving…' : 'Save profile'}</button>
        </form>
      </section>
      <section className="settings-signout">
        <div><h2>Switch account</h2><p>Sign in with a different teacher account.</p></div>
        <button className="settings-switch-button" onClick={onSwitchAccount}>Switch account</button>
      </section>
      <section className="settings-signout">
        <div><h2>Sign out</h2><p>End this teacher session on this device.</p></div>
        <button className="settings-signout-button" onClick={onSignOut}>Sign out</button>
      </section>
    </section>
  )

  const renderPage = () => {
    if (page === 'Classroom') return renderClassroom()
    if (page === 'Practice') return renderPractice()
    if (page === 'Overview') return renderOverview()
    if (page === 'Lessons') return renderLessons()
    if (page === 'Progress') return renderProgress()
    if (page === 'My students') return renderStudents()
    if (page === 'Notifications') return renderNotifications()
    return renderSettings()
  }

  return (
    <div className="app-shell learning-dashboard">
      <aside className="sidebar"><div className="brand"><div className="brand-mark"><span>∑</span><i /></div><div className="brand-copy"><b>arallink<span>.</span></b><small>for numbers</small></div></div>
        <div className="class-selector"><span className="class-avatar">{user.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span><span className="class-selector-copy"><b>{user.name}’s class</b><small>Grade 1 · {classroomName}</small></span></div>
        <nav className="nav-wrap" aria-label="Main navigation">{nav.map(({ label, icon }) => <button className={`nav-item ${page === label ? 'active' : ''}`} key={label} onClick={() => setPage(label)}><span aria-hidden="true">{icon}</span>{label}{label === 'Notifications' && unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}</button>)}</nav>
        <div className="sidebar-bottom"><div className="sidebar-help"><b>Every learner starts somewhere.</b><p>Small steps make strong number thinkers.</p></div><button className={`settings-link ${page === 'Settings' ? 'active' : ''}`} onClick={() => setPage('Settings')}>Settings</button><div className="sidebar-profile"><div className="guardian-avatar">{user.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</div><span><b>{user.name}</b><small>{user.email}</small></span></div></div>
      </aside>
      <main className="main-area"><header className="topbar"><div className="breadcrumb">Classroom <span>/</span> <b>{page}</b></div><div className="topbar-actions"><span className="student-switcher"><span><b>{selectedStudent?.name ?? 'No student selected'}</b><small>{selectedStudent ? `Grade ${selectedStudent.grade}` : 'Add your first profile'}</small></span></span><button className="account-logout" type="button" onClick={onSignOut} aria-label="Sign out of teacher account" title="Sign out"><svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></svg><span>Sign out</span></button></div></header>
        <div className="page-content">{loading ? <div className="journey-loading" role="status">Loading your saved classroom…</div> : <>{error && <p className="learning-error" role="alert">{error}</p>}{students.length === 0 && page !== 'Classroom' ? renderJourneyStart() : renderPage()}</>}<footer className="page-footer"><span>Made for curious minds <span>✦</span></span><span>AralLink for Numbers · Grade 1 mathematics</span></footer></div>
      </main>
    </div>
  )
}
