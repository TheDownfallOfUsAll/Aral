import { useEffect, useState } from 'react'
import './App.css'
import './AppEnhancements.css'
import { AuthScreen } from './AuthScreen'
import { LearningDashboard } from './LearningDashboard'
import { StudentDashboard } from './StudentDashboard'

type AuthUser = { id: number; name: string; email: string }
type StudentSession = { id: number; name: string; grade: number; classroom: { id: number; name: string } }
const rememberedAccountsKey = 'arallink.rememberedAccounts'

const readRememberedAccounts = (): AuthUser[] => {
  try {
    const saved = localStorage.getItem(rememberedAccountsKey)
    if (!saved) return []
    const parsed: unknown = JSON.parse(saved)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((account): account is AuthUser =>
      account !== null && typeof account === 'object' &&
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

function App() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [student, setStudent] = useState<StudentSession | null>(null)
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
    Promise.all([fetch('/api/me'), fetch('/api/student/me')])
      .then(async ([teacherResponse, studentResponse]) => {
        if (studentResponse.ok) {
          const result = await studentResponse.json() as { student: Omit<StudentSession, 'classroom'>; classroom: StudentSession['classroom'] }
          if (active) setStudent({ ...result.student, classroom: result.classroom })
          return
        }
        const result = await teacherResponse.json() as { user?: AuthUser | null; error?: string }
        if (!teacherResponse.ok) throw new Error(result.error ?? 'The sign-in service could not be reached.')
        if (active && result.user) {
          setUser(result.user)
          setRememberedAccounts((accounts) => addRememberedAccount(accounts, result.user!))
        }
      })
      .catch((error: unknown) => {
        if (active) setConnectionError(error instanceof Error ? error.message : 'The sign-in service could not be reached.')
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

  const signOutStudent = async () => {
    try {
      const response = await fetch('/api/student/logout', { method: 'POST' })
      if (!response.ok) throw new Error('Student sign out failed.')
      setStudent(null)
    } catch {
      window.alert('Unable to sign out right now. Please check that the app server is running.')
    }
  }

  const switchAccount = async () => {
    try {
      const response = await fetch('/api/logout', { method: 'POST' })
      if (!response.ok) throw new Error('Account switch failed.')
      setAuthNotice('You’re signed out. Sign in with another teacher account or create a new one.')
      setUser(null)
    } catch {
      window.alert('Unable to switch accounts right now. Please check that the app server is running.')
    }
  }

  const authenticate = (authenticatedUser: AuthUser) => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    void fetch('/api/student/logout', { method: 'POST' })
    setAuthNotice('')
    setRememberedAccounts((accounts) => addRememberedAccount(accounts, authenticatedUser))
    setUser(authenticatedUser)
  }

  const authenticateStudent = (authenticatedStudent: StudentSession) => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    void fetch('/api/logout', { method: 'POST' })
    setStudent(authenticatedStudent)
  }

  const updateUser = (updatedUser: AuthUser) => {
    setRememberedAccounts((accounts) => addRememberedAccount(accounts, updatedUser))
    setUser(updatedUser)
  }

  if (checkingSession) return <main className="auth-loading" aria-label="Loading your account"><span /></main>
  if (student) return <StudentDashboard student={student} onSignOut={signOutStudent} />
  if (user) return <LearningDashboard user={user} onUserUpdated={updateUser} onSwitchAccount={switchAccount} onSignOut={signOut} />
  return <AuthScreen onAuthenticated={authenticate} onStudentAuthenticated={authenticateStudent} rememberedAccounts={rememberedAccounts} connectionError={connectionError} notice={authNotice} />
}

export default App