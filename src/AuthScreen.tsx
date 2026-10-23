import { useState, type FormEvent } from 'react'
import './AuthScreen.css'

type AuthUser = { id: number; name: string; email: string }
type StudentSession = { id: number; name: string; grade: number; classroom: { id: number; name: string } }
type AuthMode = 'login' | 'register'

export function AuthScreen({ onAuthenticated, onStudentAuthenticated, rememberedAccounts, connectionError = '', notice = '' }: {
  onAuthenticated: (user: AuthUser) => void
  onStudentAuthenticated: (student: StudentSession) => void
  rememberedAccounts: AuthUser[]
  connectionError?: string
  notice?: string
}) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [studentLogin, setStudentLogin] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [studentName, setStudentName] = useState('')
  const [studentPin, setStudentPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const studentCredentials = { joinCode, name: studentName, pin: studentPin }
      const response = await fetch(studentLogin ? '/api/student/login' : `/api/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentLogin ? studentCredentials : { name, email, password }),
      })
      const result = await response.json() as { user?: AuthUser; student?: Omit<StudentSession, 'classroom'>; classroom?: StudentSession['classroom']; error?: string }
      if (studentLogin && response.ok && result.student && result.classroom) {
        onStudentAuthenticated({ ...result.student, classroom: result.classroom })
        return
      }
      if (!studentLogin && response.ok && result.user) {
        onAuthenticated(result.user)
        return
      }
      if (!response.ok) {
        setError(result.error ?? 'We couldn’t complete that request. Please try again.')
        return
      }
      setError('We couldn’t complete that request. Please try again.')
    } catch {
      setError('We couldn’t connect to the sign-in service. Please check that the app server is running.')
    } finally {
      setBusy(false)
    }
  }

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode)
    setError('')
  }

  const selectAccount = (account: AuthUser) => {
    setMode('login')
    setEmail(account.email)
    setPassword('')
    setError('')
  }

  return (
    <main className="auth-page">
      <section className="auth-showcase" aria-label="AralLink learning">
        <a className="auth-brand" href="/" aria-label="AralLink for Numbers home">
          <span className="auth-brand-mark">∑</span>
          <span>arallink<span>.</span><small>FOR NUMBERS</small></span>
        </a>
        <div className="auth-showcase-copy">
          <span className="auth-kicker">A LITTLE MATH MAGIC</span>
          <h1>Big ideas start<br />with <span>little numbers.</span></h1>
          <p>A happy place to practice, explore, and grow one number at a time.</p>
        </div>
        <div className="auth-math-art" aria-hidden="true">
          <span className="auth-math-spark">✦</span>
          <div className="auth-number number-two">2</div>
          <span className="auth-plus">+</span>
          <div className="auth-number number-three">3</div>
          <span className="auth-equals">=</span>
          <div className="auth-number number-five">5</div>
          <span className="auth-math-star">✳</span>
        </div>
        <div className="auth-showcase-footer"><span>✦</span> Made for curious minds</div>
      </section>

      <section className="auth-form-side">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand">
            <span className="auth-brand-mark">∑</span>
            <span>arallink<span>.</span></span>
          </div>
          <span className="auth-form-kicker">{studentLogin ? 'STUDENT SIGN IN' : mode === 'login' ? 'TEACHER WELCOME' : 'YOUR CLASSROOM STARTS HERE'}</span>
          <h2>{studentLogin ? 'Ready to learn?' : mode === 'login' ? 'Let’s get learning.' : 'Create your teacher account.'}</h2>
          <p className="auth-intro">{studentLogin ? 'Enter your classroom code, name, and teacher-issued PIN.' : mode === 'login' ? 'Sign in to pick up where the fun begins.' : 'Start your classroom, add student profiles, and save every learning step.'}</p>

          {studentLogin ? <button className="auth-account-switch" type="button" onClick={() => { setStudentLogin(false); setError('') }}>Teacher sign in</button> : <>
            <div className="auth-tabs" role="tablist" aria-label="Account access">
              <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'selected' : ''} onClick={() => switchMode('login')}>Teacher sign in</button>
              <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'selected' : ''} onClick={() => switchMode('register')}>Create teacher account</button>
            </div>
            <button className="auth-account-switch" type="button" onClick={() => { setStudentLogin(true); setMode('login'); setError('') }}>Student sign in</button>
          </>}

          {!studentLogin && rememberedAccounts.length > 0 && (
            <section className="remembered-accounts" aria-label="Accounts used on this device">
              <span className="remembered-accounts-title">Accounts on this device</span>
              <div>
                {rememberedAccounts.map((account) => (
                  <button
                    className={`remembered-account ${mode === 'login' && email.toLowerCase() === account.email.toLowerCase() ? 'selected' : ''}`}
                    key={account.id}
                    type="button"
                    onClick={() => selectAccount(account)}
                  >
                    <span className="remembered-account-avatar">
                      {account.name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                    <span className="remembered-account-copy">
                      <b>{account.name}</b>
                      <small>{account.email}</small>
                    </span>
                    {mode === 'login' && email.toLowerCase() === account.email.toLowerCase() && <span className="remembered-account-current">Selected</span>}
                  </button>
                ))}
              </div>
            </section>
          )}

          {notice && <p className="auth-notice" role="status">{notice}</p>}
          {connectionError && <p className="auth-error" role="alert">{connectionError}</p>}
          <form className="auth-form" onSubmit={submit} noValidate>
            {studentLogin ? <>
              <label><span>Classroom code</span><input autoComplete="off" maxLength={8} required value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="8-letter classroom code" /></label>
              <label><span>Student name</span><input autoComplete="username" maxLength={80} required value={studentName} onChange={(event) => setStudentName(event.target.value)} placeholder="Your name" /></label>
              <label><span>PIN</span><input autoComplete="current-password" type="password" inputMode="numeric" minLength={4} maxLength={8} required value={studentPin} onChange={(event) => setStudentPin(event.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="4 to 8 digits" /></label>
            </> : <>
              {mode === 'register' && (
                <label>
                  <span>Your name</span>
                  <input autoComplete="name" maxLength={80} required value={name} onChange={(event) => setName(event.target.value)} placeholder="Jamie James" />
                </label>
              )}
              <label>
                <span>Email address</span>
                <input autoComplete="email" type="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
              </label>
              <label>
                <span>Password</span>
                <input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} type="password" minLength={8} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === 'login' ? 'Enter your password' : 'At least 8 characters'} />
              </label>
            </>}
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="auth-submit" type="submit" disabled={busy}>
              {busy ? 'Please wait…' : studentLogin ? 'Sign in to classroom' : mode === 'login' ? 'Sign in to AralLink' : 'Create my account'}
              {!busy && <span aria-hidden="true">→</span>}
            </button>
          </form>
          <p className="auth-privacy">{studentLogin ? 'Your teacher gives you the classroom code and your PIN.' : 'Teacher accounts are private. Student profiles are managed inside your classroom.'}</p>
        </div>
      </section>
    </main>
  )
}
