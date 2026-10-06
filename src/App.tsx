import { useEffect, useState } from 'react'
import './App.css'
import './AppEnhancements.css'
import { AuthScreen } from './AuthScreen'

type Page = 'Overview' | 'Lessons' | 'Practice' | 'Progress' | 'My students' | 'Notifications' | 'Settings'
type IconName = 'grid' | 'book' | 'spark' | 'chart' | 'users' | 'bell' | 'settings' | 'search' | 'chevron' | 'arrow' | 'clock' | 'check' | 'plus' | 'close' | 'star'

const navItems: { label: Page; icon: IconName; group: string }[] = [
  { label: 'Overview', icon: 'grid', group: 'LEARN' }, { label: 'Lessons', icon: 'book', group: 'LEARN' }, { label: 'Practice', icon: 'spark', group: 'LEARN' },
  { label: 'Progress', icon: 'chart', group: 'MANAGE' }, { label: 'My students', icon: 'users', group: 'MANAGE' }, { label: 'Notifications', icon: 'bell', group: 'MANAGE' },
]

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z"/><path d="M4 5.5v13A2.5 2.5 0 0 1 6.5 16H20"/><path d="M8 7h8"/></>,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2z"/><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/></>,
    chart: <><path d="M4 19V5"/><path d="M4 19h17"/><path d="m7 15 4-4 3 2 5-6"/><path d="M16 7h3v3"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.6-1.4-2.4L7.3 15a8 8 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.6 1.4 2.4-1.4 1.1a8 8 0 0 1 0 2Z"/></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></>, chevron: <path d="m7 10 5 5 5-5"/>,
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>, clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    check: <path d="m5 12 4 4L19 6"/>, plus: <><path d="M12 5v14"/><path d="M5 12h14"/></>, close: <><path d="m18 6-12 12"/><path d="m6 6 12 12"/></>, star: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>,
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

const students = [
  { name: 'Mia Chen', grade: 'Grade 1 · Room 104', initials: 'MC', color: 'lilac', streak: 5, xp: 240, done: 8, total: 12, accuracy: 86 },
  { name: 'Leo Chen', grade: 'Grade 1 · Room 104', initials: 'LC', color: 'peach', streak: 3, xp: 180, done: 6, total: 12, accuracy: 79 },
]
const lessonData = [
  { title: 'Adding within 10', topic: 'ADDITION', description: 'Put numbers together and count on to find the total.', icon: '＋', color: 'mint', progress: 72, time: '8 min', unit: 'Lesson 03', locked: false },
  { title: 'Taking away within 10', topic: 'SUBTRACTION', description: 'Take away, cross out, and discover what remains.', icon: '−', color: 'lavender', progress: 38, time: '10 min', unit: 'Lesson 05', locked: false },
  { title: 'Make 10', topic: 'NUMBER SENSE', description: 'Find number pairs that make ten in a flash.', icon: '10', color: 'yellow', progress: 0, time: '7 min', unit: 'Lesson 06', locked: true },
]
const questions = [
  { expression: '4 + 3', answer: 7, choices: [6, 7, 8] }, { expression: '9 − 5', answer: 4, choices: [3, 4, 5] }, { expression: '6 + 2', answer: 8, choices: [7, 8, 9] }, { expression: '10 − 6', answer: 4, choices: [4, 5, 6] },
]

type AuthUser = { id: number; name: string; email: string }

const getInitials = (name: string) =>
  name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()

const rememberedAccountsKey = 'arallink.rememberedAccounts'

const readRememberedAccounts = (): AuthUser[] => {
  try {
    const saved = localStorage.getItem(rememberedAccountsKey)
    if (!saved) return []
    const parsed: unknown = JSON.parse(saved)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((account): account is AuthUser =>
      account !== null &&
      typeof account === 'object' &&
      'id' in account && typeof account.id === 'number' &&
      'name' in account && typeof account.name === 'string' &&
      'email' in account && typeof account.email === 'string',
    )
  } catch (error) {
    console.error('Could not read remembered AralLink accounts.', error)
    return []
  }
}

const addRememberedAccount = (accounts: AuthUser[], account: AuthUser) => [
  account,
  ...accounts.filter((saved) => saved.email.toLowerCase() !== account.email.toLowerCase()),
]

function SettingsPage({ user, onUserUpdated, onSwitchAccount, onSignOut }: {
  user: AuthUser
  onUserUpdated: (user: AuthUser) => void
  onSwitchAccount: () => void
  onSignOut: () => void
}) {
  const [name, setName] = useState(user.name)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const result = await response.json() as { user?: AuthUser; error?: string }
      if (!response.ok || !result.user) {
        setError(result.error ?? 'We couldn’t save your profile. Please try again.')
        return
      }
      onUserUpdated(result.user)
      setName(result.user.name)
      setMessage('Your name has been updated.')
    } catch {
      setError('We couldn’t connect to the account service. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="settings-page">
      <section className="page-heading">
        <div>
          <div className="eyebrow">YOUR ACCOUNT</div>
          <h1>Settings</h1>
          <p>Manage {user.name}’s AralLink profile and sign-in details.</p>
        </div>
      </section>
      <section className="settings-card">
        <div className="settings-card-heading">
          <div className="settings-avatar">{getInitials(user.name)}</div>
          <div><h2>Profile details</h2><p>Your name appears on your learning dashboard.</p></div>
        </div>
        <form className="settings-form" onSubmit={saveProfile}>
          <label>
            <span>Your name</span>
            <input autoComplete="name" maxLength={80} minLength={1} required value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            <span>Email address</span>
            <input autoComplete="email" type="email" value={user.email} disabled />
            <small>Email address can’t be changed here.</small>
          </label>
          {error && <p className="settings-error" role="alert">{error}</p>}
          {message && <p className="settings-success" role="status">{message}</p>}
          <button className="primary-button" type="submit" disabled={saving || name.trim() === user.name}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </section>
      <section className="settings-signout">
        <div><h2>Switch account</h2><p>Sign in with a different AralLink account.</p></div>
        <button className="settings-switch-button" type="button" onClick={onSwitchAccount}>Switch account</button>
      </section>
      <section className="settings-signout">
        <div><h2>Sign out</h2><p>Sign out of your AralLink account on this device.</p></div>
        <button className="settings-signout-button" type="button" onClick={onSignOut}>Sign out</button>
      </section>
    </div>
  )
}

function Dashboard({ user, onUserUpdated, onSwitchAccount, onSignOut }: {
  user: AuthUser
  onUserUpdated: (user: AuthUser) => void
  onSwitchAccount: () => void
  onSignOut: () => void
}) {
  const [page, setPage] = useState<Page>('Overview')
  const [studentIndex, setStudentIndex] = useState(0)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [sessionScore, setSessionScore] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [readNotifications, setReadNotifications] = useState(false)
  const student = studentIndex === 0
    ? { ...students[0], name: user.name, initials: getInitials(user.name) }
    : students[studentIndex]
  const question = questions[questionIndex]

  const startPractice = () => { setPage('Practice'); setQuestionIndex(0); setSelectedAnswer(null); setAnswered(false); setCompleted(false); setSessionScore(0) }
  const answerQuestion = () => { if (selectedAnswer === null || answered) return; setAnswered(true); if (selectedAnswer === question.answer) setSessionScore((score) => score + 1) }
  const nextQuestion = () => { if (questionIndex + 1 >= questions.length) { setCompleted(true); return }; setQuestionIndex((current) => current + 1); setSelectedAnswer(null); setAnswered(false) }
  const changePage = (next: Page) => { setPage(next); if (next === 'Practice') startPractice() }

  const renderPractice = () => completed ? (
    <div className="practice-wrap"><section className="completion-card"><div className="completion-art">🎉</div><div className="eyebrow">PRACTICE COMPLETE</div><h2>Look at you go, {student.name.split(' ')[0]}!</h2><p>You got <strong>{sessionScore} out of {questions.length}</strong> questions right. Every try helps your brain grow.</p><div className="earned-stars">{Array.from({ length: 3 }, (_, i) => <span key={i} className={i < Math.max(1, Math.ceil(sessionScore / 2)) ? 'earned' : ''}>★</span>)}</div><button className="primary-button" onClick={startPractice}>Practice again <Icon name="arrow" size={16}/></button><button className="text-button" onClick={() => setPage('Overview')}>Back to overview</button></section></div>
  ) : <div className="practice-wrap"><div className="practice-top"><button className="back-button" onClick={() => setPage('Lessons')}>← <span>Back to lessons</span></button><span className="session-label"><span className="live-dot"/> Quick practice</span><button className="icon-button" aria-label="Close practice" onClick={() => setPage('Overview')}><Icon name="close"/></button></div><section className="practice-card"><div className="practice-progress"><span>QUESTION {questionIndex + 1} <i>OF {questions.length}</i></span><div className="progress-track"><span style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }}/></div><span className="practice-stars">★ {sessionScore}</span></div><div className="math-prompt"><span className="prompt-label">Solve this one</span><div className="equation">{question.expression} <span>=</span> <b>?</b></div><div className="counter-dots" aria-label={`${questionIndex + 1} of ${questions.length}`}>{questions.map((_, index) => <span key={index} className={index < questionIndex ? 'done' : index === questionIndex ? 'current' : ''}/>)}</div></div><div className="answer-grid" role="group" aria-label="Choose your answer">{question.choices.map((choice) => <button key={choice} className={`answer-choice ${selectedAnswer === choice ? 'selected' : ''} ${answered && choice === question.answer ? 'correct' : ''} ${answered && selectedAnswer === choice && choice !== question.answer ? 'incorrect' : ''}`} onClick={() => !answered && setSelectedAnswer(choice)} aria-pressed={selectedAnswer === choice}>{choice}</button>)}</div>{answered && <div className={`answer-feedback ${selectedAnswer === question.answer ? 'good' : 'try-again'}`}><span>{selectedAnswer === question.answer ? '✨' : '💡'}</span>{selectedAnswer === question.answer ? 'That’s right! You’re a number star.' : `Good try! ${question.expression} equals ${question.answer}.`}</div>}<div className="practice-actions">{answered ? <button className="primary-button" onClick={nextQuestion}>{questionIndex + 1 === questions.length ? 'See my stars' : 'Next question'} <Icon name="arrow" size={16}/></button> : <button className="primary-button" disabled={selectedAnswer === null} onClick={answerQuestion}>Check answer <Icon name="check" size={16}/></button>}</div></section><p className="practice-footnote"><Icon name="spark" size={15}/> Take your time — you’re learning something new!</p></div>

  const renderOverview = () => <><section className="welcome-row"><div><div className="eyebrow">TUESDAY, SEPTEMBER 29, 2026</div><h1>Good morning, {student.name.split(' ')[0]} <span className="wave">✦</span></h1><p className="welcome-sub">Ready to make some number magic today?</p></div><div className="date-pill"><span className="date-icon">☼</span><span><b>Day {student.streak} streak</b><small>You’re on a roll!</small></span></div></section><section className="hero-banner"><div className="hero-copy"><span className="hero-kicker"><Icon name="spark" size={14}/> YOUR LEARNING JOURNEY</span><h2>Little steps.<br/><span>Big number smarts.</span></h2><p>You’ve completed {student.done} of {student.total} activities this week. Keep it up!</p><button className="hero-button" onClick={startPractice}>Continue learning <Icon name="arrow" size={16}/></button></div><div className="hero-illustration" aria-hidden="true"><div className="sun-shape"/><div className="hero-number one">2</div><div className="hero-number two">+</div><div className="hero-number three">3</div><div className="hero-equals">=</div><div className="hero-number four">5</div><div className="hero-spark spark-a">✦</div><div className="hero-spark spark-b">✳</div><div className="hero-cloud"/></div><div className="hero-page-dots"><span className="active"/><span/><span/></div></section><section className="stats-grid"><article className="stat-card"><div className="stat-icon stat-purple"><Icon name="chart"/></div><div><span className="stat-label">WEEKLY PROGRESS</span><div className="stat-value">{student.done}<small> / {student.total} activities</small></div></div><div className="mini-ring" style={{ '--progress': `${(student.done / student.total) * 100}%` } as React.CSSProperties}><span>{Math.round((student.done / student.total) * 100)}%</span></div></article><article className="stat-card"><div className="stat-icon stat-yellow"><Icon name="star"/></div><div><span className="stat-label">STARS EARNED</span><div className="stat-value">{student.xp}<small> total stars</small></div></div><div className="star-sprinkle">✦</div></article><article className="stat-card"><div className="stat-icon stat-green"><Icon name="check"/></div><div><span className="stat-label">ANSWER ACCURACY</span><div className="stat-value">{student.accuracy}<small>% this week</small></div></div><div className="accuracy-bars"><i/><i/><i/><i/><i/></div></article></section><div className="content-columns"><section className="main-column"><div className="section-heading"><div><div className="eyebrow">PICK UP WHERE YOU LEFT OFF</div><h2>Your lessons</h2></div><button className="link-button" onClick={() => setPage('Lessons')}>See all lessons <Icon name="arrow" size={15}/></button></div><div className="lesson-list">{lessonData.slice(0, 2).map((lesson) => <article className="lesson-row" key={lesson.title}><div className={`lesson-symbol ${lesson.color}`}>{lesson.icon}</div><div className="lesson-info"><span className="lesson-topic">{lesson.topic} <span>·</span> {lesson.unit}</span><h3>{lesson.title}</h3><p>{lesson.description}</p><div className="lesson-meter"><div className="progress-track"><span style={{ width: `${lesson.progress}%` }}/></div><span>{lesson.progress}%</span></div></div><div className="lesson-side"><span><Icon name="clock" size={14}/>{lesson.time}</span><button className="round-arrow" aria-label={`Continue ${lesson.title}`} onClick={startPractice}><Icon name="arrow" size={17}/></button></div></article>)}</div><div className="section-heading badges-heading"><div><div className="eyebrow">A LITTLE RECOGNITION</div><h2>Your badges</h2></div><button className="link-button" onClick={() => setPage('Progress')}>View progress <Icon name="arrow" size={15}/></button></div><div className="badge-row"><div className="badge-item"><div className="badge-art badge-sun">☀</div><div><b>Bright Start</b><small>First lesson finished</small></div><span className="badge-check">✓</span></div><div className="badge-item"><div className="badge-art badge-rainbow">⌒</div><div><b>Number Explorer</b><small>5 activities complete</small></div><span className="badge-check">✓</span></div><div className="badge-item locked-badge"><div className="badge-art badge-lock">✦</div><div><b>Ten-frame whiz</b><small>Complete 3 more lessons</small></div><span className="lock-mark">⌑</span></div></div></section><aside className="right-column"><div className="side-section-title"><h2>Today’s plan</h2><span className="plan-count">2 of 3</span></div><div className="plan-card"><div className="plan-item completed-plan"><span className="plan-status"><Icon name="check" size={13}/></span><div><b>Warm-up counting</b><small>Counting to 20 · 5 min</small></div></div><div className="plan-line"/><div className="plan-item current-plan"><span className="plan-status">2</span><div><b>Adding within 10</b><small>Lesson 03 · 8 min</small></div><span className="plan-now">NOW</span></div><div className="plan-line"/><div className="plan-item upcoming-plan"><span className="plan-status">3</span><div><b>Quick number quiz</b><small>Practice · 5 min</small></div></div><button className="plan-cta" onClick={startPractice}>Start today’s plan <Icon name="arrow" size={15}/></button></div><div className="teacher-note"><div className="note-head"><div className="teacher-avatar">JM</div><span><b>A note from Ms. James</b><small>Today, 8:42 AM</small></span></div><p>“I loved how you used your fingers to solve the big addition problem yesterday. Keep being curious!”</p><span className="note-heart">♡</span></div><div className="weekly-card"><div><span className="eyebrow">THIS WEEK</span><b>4 day streak!</b><small>You’re building a brilliant habit.</small></div><div className="week-dots"><span className="complete">M</span><span className="complete">T</span><span className="complete">W</span><span className="today">T</span><span>F</span></div></div></aside></div></>

  const renderLessons = () => <><section className="page-heading"><div><div className="eyebrow">YOUR MATH ADVENTURE</div><h1>Lessons</h1><p>Every lesson is one more step toward number confidence.</p></div><button className="soft-button" onClick={startPractice}><Icon name="spark" size={16}/> Quick practice</button></section><div className="lesson-filter"><button className="filter-chip active">All lessons <span>6</span></button><button className="filter-chip">Addition <span>3</span></button><button className="filter-chip">Subtraction <span>3</span></button><span className="filter-note">Grade 1 · Addition & subtraction</span></div><section className="lesson-cards">{lessonData.map((lesson, index) => <article className={`lesson-card ${lesson.locked ? 'is-locked' : ''}`} key={lesson.title}><div className={`lesson-card-art ${lesson.color}`}><span>{lesson.icon}</span><i>{lesson.topic === 'ADDITION' ? '● + ●' : lesson.topic === 'SUBTRACTION' ? '● − ●' : '5 + 5'}</i></div><div className="lesson-card-body"><span className="lesson-topic">{lesson.topic} <span>·</span> {lesson.unit}</span><h3>{lesson.title}</h3><p>{lesson.description}</p><div className="card-meta"><span><Icon name="clock" size={14}/>{lesson.time}</span><span>Grade 1</span></div><div className="lesson-meter"><div className="progress-track"><span style={{ width: `${lesson.progress}%` }}/></div><span>{lesson.progress ? `${lesson.progress}%` : 'Not started'}</span></div><button className={lesson.locked ? 'locked-button' : 'card-action'} disabled={lesson.locked} onClick={startPractice}>{lesson.locked ? 'Complete earlier lessons first' : lesson.progress ? 'Continue lesson' : 'Start lesson'}{!lesson.locked && <Icon name="arrow" size={15}/>}</button></div><span className="lesson-number">0{index + 1}</span></article>)}</section><div className="coming-strip"><span>✧</span><div><b>More number adventures are on the way</b><small>Keep practising to unlock new lessons and earn special badges.</small></div></div></>

  const renderProgress = () => <><section className="page-heading"><div><div className="eyebrow">LOOK HOW FAR YOU’VE COME</div><h1>Progress</h1><p>Small steps add up to amazing things.</p></div><button className="soft-button">This week <Icon name="chevron" size={15}/></button></section><div className="progress-summary"><article className="progress-highlight"><span className="stat-label">TOTAL STARS</span><strong>{student.xp + sessionScore}</strong><p>Each star is a moment you kept learning.</p><div className="highlight-stars">✦ ✦ ✦ ✦ ✦ ✦ ✦</div></article><article className="progress-metric"><div className="stat-icon stat-purple"><Icon name="book"/></div><span className="stat-label">LESSONS COMPLETED</span><b>4 <small>of 12</small></b><div className="progress-track"><span style={{ width: '34%' }}/></div></article><article className="progress-metric"><div className="stat-icon stat-green"><Icon name="chart"/></div><span className="stat-label">ACCURACY</span><b>{student.accuracy}%</b><div className="metric-trend">↑ 8% from last week</div></article></div><div className="progress-columns"><section className="panel chart-panel"><div className="section-heading"><div><div className="eyebrow">A WEEK OF LEARNING</div><h2>Activities completed</h2></div><span className="chart-legend"><i/>Activities</span></div><div className="chart"><div className="chart-y"><span>5</span><span>4</span><span>3</span><span>2</span><span>1</span><span>0</span></div><div className="chart-area"><div className="chart-gridlines"><i/><i/><i/><i/><i/><i/></div><div className="bars">{[['M', 55], ['T', 76], ['W', 44], ['T', 92], ['F', 34], ['S', 14], ['S', 8]].map(([day, height], i) => <div className="bar-column" key={`${day}-${i}`}><span className={`bar ${i === 3 ? 'today-bar' : ''}`} style={{ height: `${height}%` }}/><small>{day}</small></div>)}</div></div></div></section><section className="panel skills-panel"><div className="eyebrow">SKILLS YOU’RE GROWING</div><h2>Number sense</h2><div className="skill-line"><span className="skill-dot mint-dot"/><div><b>Addition within 10</b><small>Getting confident</small></div><strong>72%</strong></div><div className="progress-track"><span style={{ width: '72%' }}/></div><div className="skill-line"><span className="skill-dot purple-dot"/><div><b>Subtraction within 10</b><small>Keep practising</small></div><strong>38%</strong></div><div className="progress-track purple-track"><span style={{ width: '38%' }}/></div><div className="skill-tip">✨ <span><b>You're doing great!</b><small>Try a subtraction lesson next.</small></span></div></section></div><section className="panel achievements-panel"><div className="section-heading"><div><div className="eyebrow">COLLECT THEM ALL</div><h2>Achievements</h2></div><span className="achievement-count">2 earned · 1 to go</span></div><div className="achievement-list"><div><span className="achievement-icon yellow">☀</span><b>Bright Start</b><small>Finished your very first lesson</small><span className="earned-label">EARNED</span></div><div><span className="achievement-icon pink">⌒</span><b>Number Explorer</b><small>Completed 5 learning activities</small><span className="earned-label">EARNED</span></div><div className="locked-achievement"><span className="achievement-icon muted">✦</span><b>Ten-frame whiz</b><small>Complete 3 more lessons</small><span className="earned-label locked-label">IN PROGRESS</span></div></div></section></>

  const renderStudents = () => <><section className="page-heading"><div><div className="eyebrow">YOUR LEARNING CREW</div><h1>My students</h1><p>Keep track of the young number thinkers in your class.</p></div><button className="primary-button"><Icon name="plus" size={16}/> Add student</button></section><div className="class-overview"><div className="class-icon">✿</div><div><span className="eyebrow">YOUR CLASS</span><h2>Room 104 · Grade 1</h2><p>12 students · Addition & subtraction</p></div><button className="outline-button">Manage class <Icon name="arrow" size={15}/></button></div><section className="student-table panel"><div className="table-toolbar"><h2>Student overview <span>12</span></h2><div className="table-search"><Icon name="search" size={16}/><input aria-label="Search students" placeholder="Find a student"/></div></div><div className="table-head"><span>STUDENT</span><span>THIS WEEK</span><span>ACCURACY</span><span>STARS</span><span>STREAK</span><span/></div>{students.map((child, i) => <div className="student-row" key={child.name}><div className="student-name"><div className={`student-avatar ${child.color}`}>{child.initials}</div><div><b>{child.name}</b><small>Last active today</small></div></div><div className="table-progress"><span>{child.done} / {child.total} activities</span><div className="progress-track"><span style={{ width: `${(child.done / child.total) * 100}%` }}/></div></div><strong className="accuracy-cell">{child.accuracy}%</strong><strong className="stars-cell">✦ {child.xp}</strong><span className="streak-cell">🔥 {child.streak} days</span><button className="row-menu" aria-label={`View ${child.name}`} onClick={() => { setStudentIndex(i); setPage('Overview') }}>→</button></div>)}<div className="table-empty">+ 10 more students in Room 104</div></section><div className="teacher-insight"><span>💡</span><div><b>A little teacher insight</b><p>Mia is flying through addition. Leo may enjoy a little extra practice with subtraction within 10 this week.</p></div><button onClick={() => setPage('Progress')}>View class progress <Icon name="arrow" size={15}/></button></div></>

  const renderNotifications = () => <><section className="page-heading"><div><div className="eyebrow">A LITTLE UPDATE FOR YOU</div><h1>Notifications</h1><p>Learning updates for {user.name}.</p></div><button className="soft-button" onClick={() => setReadNotifications(true)}><Icon name="check" size={15}/> Mark all as read</button></section><div className="notification-list panel">{[{ icon: '✦', tone: 'yellow', title: `${student.name} earned a new badge!`, copy: `${student.name} earned the “Number Explorer” badge after completing 5 activities.`, time: 'Today · 9:14 AM', fresh: !readNotifications }, { icon: '↗', tone: 'green', title: 'A weekly learning summary is ready', copy: `${student.name} completed 8 activities this week with ${student.accuracy}% accuracy. Addition is a growing strength.`, time: 'Today · 8:30 AM', fresh: !readNotifications }, { icon: '♡', tone: 'pink', title: 'A note from Ms. James', copy: `“${student.name} showed wonderful persistence on their number bonds today!”`, time: 'Yesterday · 3:42 PM', fresh: false }, { icon: '◷', tone: 'purple', title: 'Leo is on a 3-day learning streak', copy: 'A little practice each day is making a big difference. Keep the streak going!', time: 'Yesterday · 10:18 AM', fresh: false }].map((item) => <article className={`notification-item ${item.fresh ? 'unread' : ''}`} key={item.title}><span className={`notification-icon ${item.tone}`}>{item.icon}</span><div className="notification-copy"><div><b>{item.title}</b>{item.fresh && <i className="unread-dot"/>}</div><p>{item.copy}</p><small>{item.time}</small></div><button className="notification-more" aria-label="More notification options">···</button></article>)}</div><div className="notification-preferences"><span className="preference-icon"><Icon name="bell"/></span><div><b>Want fewer or different updates?</b><small>Choose what learning updates you receive.</small></div><button className="link-button" onClick={() => setPage('Settings')}>Notification settings <Icon name="arrow" size={15}/></button></div></>

  const renderPage = () => { if (page === 'Practice') return renderPractice(); if (page === 'Overview') return renderOverview(); if (page === 'Lessons') return renderLessons(); if (page === 'Progress') return renderProgress(); if (page === 'My students') return renderStudents(); if (page === 'Settings') return <SettingsPage user={user} onUserUpdated={onUserUpdated} onSwitchAccount={onSwitchAccount} onSignOut={onSignOut}/>; return renderNotifications() }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><span>∑</span><i /></div>
          <div className="brand-copy"><b>arallink<span>.</span></b><small>for numbers</small></div>
        </div>
        <button className="class-selector">
          <span className="class-avatar">JM</span>
          <span className="class-selector-copy"><b>Ms. James’ class</b><small>Grade 1 · Room 104</small></span>
          <Icon name="chevron" size={15} />
        </button>
        <div className="nav-wrap">
          {['LEARN', 'MANAGE'].map((group) => (
            <div className="nav-group" key={group}>
              <span className="nav-heading">{group}</span>
              {navItems.filter((item) => item.group === group).map((item) => (
                <button className={`nav-item ${page === item.label ? 'active' : ''}`} key={item.label} onClick={() => changePage(item.label)}>
                  <Icon name={item.icon} />{item.label}
                  {item.label === 'Notifications' && <span className="nav-badge">2</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <div className="help-decoration">✿</div>
            <b>Learning is better<br />together.</b>
            <p>Little wins deserve a celebration.</p>
          </div>
          <button className={`settings-link ${page === 'Settings' ? 'active' : ''}`} onClick={() => setPage('Settings')}>
            <Icon name="settings" size={17} /> Settings
          </button>
          <div className="sidebar-profile">
            <div className="guardian-avatar">{getInitials(user.name)}</div>
            <span><b>{user.name}</b><small>{user.email}</small></span>
            <button aria-label="Sign out" title="Sign out" onClick={onSignOut}><Icon name="close" size={15} /></button>
          </div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">Classroom <span>/</span> <b>{page === 'Overview' ? 'Overview' : page}</b></div>
          <div className="topbar-actions">
            <label className="top-search"><Icon name="search" size={17} /><input placeholder="Search anything..." aria-label="Search" /><kbd>⌘ K</kbd></label>
            <button className="top-notification" aria-label="Notifications" onClick={() => setPage('Notifications')}><Icon name="bell" /><i /></button>
            <div className="top-divider" />
            <button className="student-switcher" onClick={() => setPage('Settings')} aria-label={`Account settings for ${user.name}`}>
              <span className={`student-avatar small-avatar ${student.color}`}>{getInitials(user.name)}</span>
              <span><b>{user.name}</b><small>{user.email}</small></span>
              <Icon name="chevron" size={15} />
            </button>
          </div>
        </header>
        <div className={`page-content ${page === 'Practice' ? 'practice-page' : ''}`}>
          {renderPage()}
          <footer className="page-footer"><span>Made for curious minds <span>✦</span></span><span>AralLink for Numbers · Grade 1 mathematics</span></footer>
        </div>
      </main>
    </div>
  )
}

function App() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [connectionError, setConnectionError] = useState('')
  const [authNotice, setAuthNotice] = useState('')
  const [rememberedAccounts, setRememberedAccounts] = useState<AuthUser[]>(readRememberedAccounts)

  useEffect(() => {
    try {
      localStorage.setItem(rememberedAccountsKey, JSON.stringify(rememberedAccounts))
    } catch (error) {
      console.error('Could not save remembered AralLink accounts.', error)
    }
  }, [rememberedAccounts])

  useEffect(() => {
    let active = true
    fetch('/api/me')
      .then(async (response) => {
        if (response.ok) {
          const result = await response.json() as { user: AuthUser | null }
          const authenticatedUser = result.user
          if (active && authenticatedUser) {
            setUser(authenticatedUser)
            setRememberedAccounts((accounts) => addRememberedAccount(accounts, authenticatedUser))
          }
        } else if (!response.ok) {
          throw new Error('The sign-in service could not be reached.')
        }
      })
      .catch(() => {
        if (active) setConnectionError('The sign-in service could not be reached. Please restart the app with npm run dev.')
      })
      .finally(() => {
        if (active) setCheckingSession(false)
      })
    return () => { active = false }
  }, [])

  const signOut = async () => {
    try {
      const response = await fetch('/api/logout', { method: 'POST' })
      if (!response.ok) throw new Error('Sign out failed.')
      setAuthNotice('')
      setUser(null)
    } catch {
      window.alert('Unable to sign out right now. Please check that the app server is running.')
    }
  }

  const switchAccount = async () => {
    try {
      const response = await fetch('/api/logout', { method: 'POST' })
      if (!response.ok) throw new Error('Account switch failed.')
      setAuthNotice('You’re signed out. Sign in with another account or create a new one.')
      setUser(null)
    } catch {
      window.alert('Unable to switch accounts right now. Please check that the app server is running.')
    }
  }

  const authenticate = (authenticatedUser: AuthUser) => {
    setAuthNotice('')
    setRememberedAccounts((accounts) => addRememberedAccount(accounts, authenticatedUser))
    setUser(authenticatedUser)
  }

  const updateUser = (updatedUser: AuthUser) => {
    setRememberedAccounts((accounts) => addRememberedAccount(accounts, updatedUser))
    setUser(updatedUser)
  }

  if (checkingSession) {
    return <main className="auth-loading" aria-label="Loading your account"><span /></main>
  }
  if (user) return <Dashboard user={user} onUserUpdated={updateUser} onSwitchAccount={switchAccount} onSignOut={signOut} />
  return <AuthScreen onAuthenticated={authenticate} rememberedAccounts={rememberedAccounts} connectionError={connectionError} notice={authNotice} />
}

export default App
