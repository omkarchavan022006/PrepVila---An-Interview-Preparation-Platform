import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import Input from '../../components/common/Input'
import PasswordInput from '../../components/common/PasswordInput'
import { useAuth } from '../../hooks/useAuth'
import { getAuthErrorMessage, isDuplicateEmailError } from '../../utils/authErrors'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(form) {
  const errors = {}
  if (!form.name.trim()) errors.name = 'Enter your name.'
  const email = form.email.trim()
  if (!email) errors.email = 'Enter your email address.'
  else if (!emailPattern.test(email)) errors.email = 'Enter a valid email address.'
  if (!form.password) errors.password = 'Create a password.'
  else if (form.password.length < 8) errors.password = 'Use at least 8 characters.'
  return errors
}

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [errorMessage, setErrorMessage] = useState('')
  const [duplicateEmail, setDuplicateEmail] = useState(false)
  const [loading, setLoading] = useState(false)
  const nameRef = useRef(null)
  const emailRef = useRef(null)
  const passwordRef = useRef(null)

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
    setErrorMessage('')
    setDuplicateEmail(false)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const fieldErrors = validate(form)
    setErrors(fieldErrors)
    setErrorMessage('')
    setDuplicateEmail(false)
    if (Object.keys(fieldErrors).length) {
      if (fieldErrors.name) nameRef.current?.focus()
      else if (fieldErrors.email) emailRef.current?.focus()
      else passwordRef.current?.focus()
      return
    }

    setLoading(true)
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      })
      toast.success('Your account is ready.')
      navigate('/dashboard', { replace: true })
    } catch (requestError) {
      const message = getAuthErrorMessage(requestError, 'register')
      setErrorMessage(message)
      setDuplicateEmail(isDuplicateEmailError(requestError))
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto grid min-h-[76vh] max-w-md place-items-center px-page py-12">
      <Card className="w-full border-white/80 p-7 shadow-float dark:border-border-soft sm:p-9">
        <div className="mb-7">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600 dark:text-brand-300">Start preparing</p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">Create your account</h1>
          <p className="mt-2 text-sm leading-6 text-ink-muted">Set up your space for interview practice.</p>
        </div>
        {errorMessage && <div className="mb-5 rounded-control border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300" role="alert">{errorMessage}{duplicateEmail && <> <Link className="font-semibold underline underline-offset-4" to="/login">Log in instead</Link>.</>}</div>}
        <form className="grid gap-5" onSubmit={handleSubmit} noValidate aria-busy={loading}>
          <Input
            ref={nameRef}
            label="Name"
            name="name"
            autoComplete="name"
            autoCapitalize="words"
            required
            error={errors.name}
            disabled={loading}
            value={form.name}
            onChange={updateField}
          />
          <Input
            ref={emailRef}
            label="Email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            required
            error={errors.email}
            disabled={loading}
            value={form.email}
            onChange={updateField}
          />
          <PasswordInput
            ref={passwordRef}
            label="Password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            hint="Use at least 8 characters."
            required
            error={errors.password}
            disabled={loading}
            value={form.password}
            onChange={updateField}
          />
          <Button type="submit" loading={loading} disabled={loading} className="mt-1 w-full">Create account</Button>
        </form>
        <p className="mt-6 text-center text-sm text-ink-muted">Already registered? <Link className="font-semibold text-brand-700 underline decoration-brand-300 underline-offset-4 hover:text-brand-600 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:text-brand-300" to="/login">Log in</Link></p>
      </Card>
    </div>
  )
}
