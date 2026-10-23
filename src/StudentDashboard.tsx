import { useEffect, useState } from 'react'

type StudentIdentity = { id: number; name: string; grade: number; classroom: { id: number; name: string } }
type Lesson = {
  id: string
  title: string
  topic: string
  guide: string
  question: string
  choices: number[]
  progress: number
}
type Progress = { sessions: number; correct: number; questions: number; accuracy: number; lessonsCompleted: number; badges: { id: string; awardedAt: number }[]; stars: number }
type Feedback = { expression: string; selectedAnswer: number; answer: number; correct: boolean; explanation: string }
type StudentPage = 'Classroom' | 'Practice' | 'Progress'

const api = async <T,>(path: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(path, options)
  const result = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(result.error ?? 'Could not load your learning data.')
  return result
}

export function StudentDashboard({ student, onSignOut }: {
  student: StudentIdentity
  onSignOut: () => void
}) {
  const [page, setPage] = useState<StudentPage>('Classroom')
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [progress, setProgress] = useState<Progress | null>(null)
  const [selectedLessonId, setSelectedLessonId] = useState('')
  const [answer, setAnswer] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let active = true
    Promise.all([
      api<{ lessons: Lesson[] }>('/api/student/lessons'),
      api<Progress>('/api/student/progress'),
    ])
      .then(([lessonResult, nextProgress]) => {
        if (!active) return
        setLessons(lessonResult.lessons)
        setProgress(nextProgress)
        setSelectedLessonId((current) => lessonResult.lessons.some(({ id }) => id === current) ? current : lessonResult.lessons[0]?.id ?? '')
        setError('')
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not load your classroom.'))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [refresh])

  const selectedLesson = lessons.find(({ id }) => id === selectedLessonId) ?? null
  const submitAnswer = async () => {
    if (!selectedLesson || answer === null || saving || feedback) return
    setSaving(true)
    setError('')
    try {
      const result = await api<{ explanations: Feedback[] }>('/api/student/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId: selectedLesson.id, answers: [answer] }),
      })
      setFeedback(result.explanations[0])
      setRefresh((version) => version + 1)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Your answer could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const beginLesson = (lesson: Lesson) => {
    setSelectedLessonId(lesson.id)
    setAnswer(null)
    setFeedback(null)
    setPage('Practice')
  }

  return (
    <div className="app-shell learning-dashboard student-dashboard">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><span>∑</span><i /></div><div className="brand-copy"><b>arallink<span>.</span></b><small>for numbers</small></div></div>
        <div className="class-selector"><span className="class-avatar">{student.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span><span className="class-selector-copy"><b>{student.name}</b><small>{student.classroom.name}</small></span></div>
        <nav className="nav-wrap" aria-label="Student navigation">
          {(['Classroom', 'Practice', 'Progress'] as StudentPage[]).map((item) => <button className={`nav-item ${page === item ? 'active' : ''}`} key={item} onClick={() => setPage(item)}><span aria-hidden="true">{item === 'Classroom' ? '▤' : item === 'Practice' ? '✳' : '↗'}</span>{item}</button>)}
        </nav>
        <div className="sidebar-bottom"><div className="sidebar-help"><b>You’re growing every day.</b><p>Keep trying, one number at a time.</p></div><button className="settings-signout-button" onClick={onSignOut}>Sign out</button></div>
      </aside>
      <main className="main-area">
        <header className="topbar"><div className="breadcrumb">{student.classroom.name} <span>/</span> <b>{page}</b></div><div className="topbar-actions"><span className="student-switcher"><span><b>{student.name}</b><small>Grade {student.grade}</small></span></span><button className="account-logout" type="button" onClick={onSignOut} aria-label="Sign out of student account" title="Sign out"><span>Sign out</span></button></div></header>
        <div className="page-content">
          {error && <p className="learning-error" role="alert">{error}</p>}
          {loading ? <div className="journey-loading" role="status">Loading your learning path…</div> : <>
            {page === 'Classroom' && <>
              <section className="page-heading"><div><div className="eyebrow">YOUR CLASSROOM</div><h1>Math guides</h1><p>Choose a guide, then try a question to reveal its explanation.</p></div><button className="primary-button" onClick={() => setPage('Practice')}>Start learning</button></section>
              <section className="student-guide-list">{lessons.map((lesson, index) => {
                const locked = index > 0 && lessons[index - 1].progress < 100
                return <article className={`student-guide ${locked ? 'is-locked' : ''}`} key={lesson.id}><span className="lesson-topic">{lesson.topic}</span><h2>{lesson.title}</h2><p>{lesson.guide}</p><button className="card-action" disabled={locked} onClick={() => beginLesson(lesson)}>{locked ? 'Complete the lesson above first' : lesson.progress ? 'Continue lesson →' : 'Try a question →'}</button></article>
              })}</section>
            </>}
            {page === 'Practice' && selectedLesson && <section className="student-practice"><div className="eyebrow">{selectedLesson.topic} · {student.name.toUpperCase()}</div><h1>{selectedLesson.title}</h1><p className="student-question">{selectedLesson.question} = ?</p><div className="answer-grid" role="group" aria-label="Choose your answer">{selectedLesson.choices.map((choice) => <button type="button" key={choice} className={`answer-choice ${answer === choice ? 'selected' : ''} ${feedback?.answer === choice ? 'correct' : ''}`} onClick={() => !feedback && setAnswer(choice)} aria-pressed={answer === choice}>{choice}</button>)}</div>{feedback && <section className={`student-answer-reveal ${feedback.correct ? 'correct' : 'retry'}`} aria-live="polite"><b>{feedback.correct ? 'That’s right!' : 'Good try. Let’s learn from it.'}</b><p>{feedback.expression} = {feedback.answer}</p><span>{feedback.explanation}</span></section>}<div className="student-practice-actions"><button className="soft-button" onClick={() => setPage('Classroom')}>Back to guides</button><button className="primary-button" disabled={answer === null || saving || Boolean(feedback)} onClick={() => void submitAnswer()}>{saving ? 'Checking…' : feedback ? 'Answer saved' : 'Check my answer'}</button></div></section>}
            {page === 'Practice' && !selectedLesson && <div className="table-empty">No lessons are available yet.</div>}
            {page === 'Progress' && <><section className="page-heading"><div><div className="eyebrow">YOUR LEARNING JOURNEY</div><h1>Your progress</h1><p>Every practice session is saved for your teacher to celebrate.</p></div></section><div className="progress-summary"><article className="progress-highlight"><span className="stat-label">TOTAL STARS</span><strong>{progress?.stars ?? 0}</strong><p>Each correct answer earns a star.</p></article><article className="progress-metric"><span className="stat-label">LESSONS COMPLETED</span><b>{progress?.lessonsCompleted ?? 0} <small>of {lessons.length}</small></b></article><article className="progress-metric"><span className="stat-label">ACCURACY</span><b>{progress?.accuracy ?? 0}%</b></article></div></>}
          </>}
          <footer className="page-footer"><span>Made for curious minds <span>✦</span></span><span>AralLink for Numbers · Grade 1 mathematics</span></footer>
        </div>
      </main>
    </div>
  )
}
