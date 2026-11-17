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
type QuizTopic = { id: string; title: string; topic: string; description: string; questionCount: number }
type QuizQuestion = { prompt: string; expression: string; choices: number[] }
type QuizResult = { correctCount: number; questionCount: number; explanations: Feedback[] }
type StudentPage = 'Classroom' | 'Practice' | 'Quiz' | 'Progress'

const currentTimestamp = () => Date.now()

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
  const [quizTopics, setQuizTopics] = useState<QuizTopic[]>([])
  const [selectedQuizId, setSelectedQuizId] = useState('')
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState<number[]>([])
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null)
  const [quizLoading, setQuizLoading] = useState(false)
  const [quizSaving, setQuizSaving] = useState(false)
  const [quizStartedAt, setQuizStartedAt] = useState(0)

  useEffect(() => {
    let active = true
    Promise.all([
      api<{ lessons: Lesson[] }>('/api/student/lessons'),
      api<Progress>('/api/student/progress'),
      api<{ topics: QuizTopic[] }>('/api/student/quizzes'),
    ])
      .then(([lessonResult, nextProgress, quizResult]) => {
        if (!active) return
        setLessons(lessonResult.lessons)
        setProgress(nextProgress)
        setQuizTopics(quizResult.topics)
        setSelectedLessonId((current) => lessonResult.lessons.some(({ id }) => id === current) ? current : lessonResult.lessons[0]?.id ?? '')
        setError('')
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not load your classroom.'))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [refresh])

  const selectedLesson = lessons.find(({ id }) => id === selectedLessonId) ?? null
  const selectedQuizTopic = quizTopics.find(({ id }) => id === selectedQuizId) ?? null
  const activeQuizQuestion = quizQuestions[quizIndex]
  const selectedQuizAnswer = quizAnswers[quizIndex] ?? null

  const beginQuiz = async (topic: QuizTopic) => {
    setQuizLoading(true)
    setError('')
    try {
      const { quiz } = await api<{ quiz: { id: string; title: string; questions: QuizQuestion[] } }>(`/api/student/quizzes/${encodeURIComponent(topic.id)}`)
      setSelectedQuizId(quiz.id)
      setQuizQuestions(quiz.questions)
      setQuizIndex(0)
      setQuizAnswers([])
      setQuizResult(null)
      setQuizStartedAt(currentTimestamp())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'This quiz could not be opened.')
    } finally {
      setQuizLoading(false)
    }
  }

  const chooseQuizAnswer = (choice: number) => {
    setQuizAnswers((current) => {
      const next = current.slice(0, quizIndex)
      next[quizIndex] = choice
      return next
    })
  }

  const submitQuiz = async () => {
    if (!selectedQuizId || quizSaving || quizAnswers.length !== quizQuestions.length ||
      quizAnswers.some((quizAnswer) => !Number.isInteger(quizAnswer))) {
      setError('Choose an answer for each question before submitting.')
      return
    }
    setQuizSaving(true)
    setError('')
    try {
      const result = await api<QuizResult>('/api/student/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityId: `quiz:${selectedQuizId}`,
          answers: quizAnswers,
          durationSeconds: Math.min(86_400, Math.floor((currentTimestamp() - quizStartedAt) / 1000)),
        }),
      })
      setQuizResult(result)
      setRefresh((version) => version + 1)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Your quiz result could not be saved.')
    } finally {
      setQuizSaving(false)
    }
  }

  const resetQuiz = () => {
    setSelectedQuizId('')
    setQuizQuestions([])
    setQuizIndex(0)
    setQuizAnswers([])
    setQuizResult(null)
    setError('')
  }

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
          {(['Classroom', 'Practice', 'Quiz', 'Progress'] as StudentPage[]).map((item) => <button className={`nav-item ${page === item ? 'active' : ''}`} key={item} onClick={() => setPage(item)}><span aria-hidden="true">{item === 'Classroom' ? '▤' : item === 'Practice' ? '✳' : item === 'Quiz' ? '✦' : '↗'}</span>{item}</button>)}
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
            {page === 'Quiz' && <>
              <section className="page-heading"><div><div className="eyebrow">READY, SET, THINK!</div><h1>{selectedQuizTopic?.title ?? 'Math quiz time'}</h1><p>{selectedQuizTopic ? 'Take your time and choose the answer that feels right.' : 'Pick a topic and try five quick questions. Your result is saved for your teacher.'}</p></div>{selectedQuizTopic && <button className="soft-button" onClick={resetQuiz}>← All quiz topics</button>}</section>
              {quizLoading && <div className="journey-loading" role="status">Getting your quiz ready…</div>}
              {quizResult && selectedQuizTopic ? <section className="quiz-results">
                <article className="quiz-score-card"><div className="eyebrow">QUIZ COMPLETE</div><h2>{quizResult.correctCount}<span> / {quizResult.questionCount}</span></h2><p>{quizResult.correctCount === quizResult.questionCount ? 'Perfect work! You got every question right.' : 'Nice effort! Review each answer and keep practicing.'}</p><button className="primary-button" onClick={resetQuiz}>Choose another quiz</button></article>
                <div className="quiz-review"><h2>Let’s look at your answers</h2>{quizResult.explanations.map((item, index) => <article className={`quiz-review-item ${item.correct ? 'correct' : 'retry'}`} key={`${item.expression}-${index}`}><div className="quiz-review-heading"><b>Question {index + 1}: {item.expression}</b><span>{item.correct ? `Correct — ${item.answer}` : `You chose ${item.selectedAnswer}; answer: ${item.answer}`}</span></div><p>{item.explanation}</p></article>)}</div>
              </section> : selectedQuizTopic && activeQuizQuestion ? <section className="quiz-question-card">
                <div className="quiz-question-meta"><span>QUESTION {quizIndex + 1} OF {quizQuestions.length}</span><span>{selectedQuizTopic.topic}</span></div>
                <div className="quiz-step-progress" role="progressbar" aria-label="Quiz progress" aria-valuemin={0} aria-valuemax={quizQuestions.length} aria-valuenow={quizIndex + 1}><span style={{ width: `${((quizIndex + 1) / quizQuestions.length) * 100}%` }} /></div>
                <h2>{activeQuizQuestion.prompt}</h2><p className="quiz-expression">{activeQuizQuestion.expression}</p>
                <div className="answer-grid" role="group" aria-label={`Choose the answer to ${activeQuizQuestion.expression}`}>{activeQuizQuestion.choices.map((choice) => <button type="button" key={choice} className={`answer-choice ${selectedQuizAnswer === choice ? 'selected' : ''}`} onClick={() => chooseQuizAnswer(choice)} aria-pressed={selectedQuizAnswer === choice}>{choice}</button>)}</div>
                <div className="student-practice-actions"><span className="quiz-encouragement" aria-live="polite">{selectedQuizAnswer === null ? 'Choose one answer to continue.' : 'Answer picked! You can change it before moving on.'}</span><button className="primary-button" disabled={selectedQuizAnswer === null || quizSaving} onClick={() => {
                  setError('')
                  if (quizIndex < quizQuestions.length - 1) setQuizIndex((current) => current + 1)
                  else void submitQuiz()
                }}>{quizSaving ? 'Saving your result…' : quizIndex < quizQuestions.length - 1 ? 'Next question →' : 'Finish quiz'}</button></div>
              </section> : !selectedQuizTopic && <section className="quiz-topic-grid" aria-label="Quiz topics">
                {quizTopics.map((topic, index) => <article className="quiz-topic-card" key={topic.id}><span className={`quiz-topic-icon quiz-icon-${index}`} aria-hidden="true">{['＋', '−', '×', '÷', '10'][index]}</span><div className="quiz-topic-copy"><span className="lesson-topic">{topic.topic}</span><h2>{topic.title}</h2><p>{topic.description}</p><span className="quiz-question-count">{topic.questionCount} questions</span></div><button className="card-action" disabled={quizLoading} onClick={() => void beginQuiz(topic)}>Start quiz →</button></article>)}
                {!quizTopics.length && <div className="table-empty">No quizzes are available right now.</div>}
              </section>}
            </>}
            {page === 'Progress' && <><section className="page-heading"><div><div className="eyebrow">YOUR LEARNING JOURNEY</div><h1>Your progress</h1><p>Every practice session is saved for your teacher to celebrate.</p></div></section><div className="progress-summary"><article className="progress-highlight"><span className="stat-label">TOTAL STARS</span><strong>{progress?.stars ?? 0}</strong><p>Each correct answer earns a star.</p></article><article className="progress-metric"><span className="stat-label">LESSONS COMPLETED</span><b>{progress?.lessonsCompleted ?? 0} <small>of {lessons.length}</small></b></article><article className="progress-metric"><span className="stat-label">ACCURACY</span><b>{progress?.accuracy ?? 0}%</b></article></div></>}
          </>}
          <footer className="page-footer"><span>Made for curious minds <span>✦</span></span><span>AralLink for Numbers · Grade 1 mathematics</span></footer>
        </div>
      </main>
    </div>
  )
}
