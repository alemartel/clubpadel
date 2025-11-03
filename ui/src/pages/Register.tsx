import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { auth } from "@/lib/firebase"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { useTranslation } from "@/hooks/useTranslation"
import { useNavigate } from "react-router-dom"
import { api } from "@/lib/serverComm"

export function Register() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [validationError, setValidationError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validateForm = (): boolean => {
    setValidationError("")
    
    if (!firstName) {
      setValidationError(t('firstNameRequired'))
      return false
    }
    
    if (!lastName) {
      setValidationError(t('lastNameRequired'))
      return false
    }
    
    if (!email) {
      setValidationError(t('emailRequired'))
      return false
    }
    
    if (!validateEmail(email)) {
      setValidationError(t('invalidEmail'))
      return false
    }
    
    if (!password) {
      setValidationError(t('passwordRequired'))
      return false
    }
    
    if (password.length < 6) {
      setValidationError(t('passwordTooShort'))
      return false
    }
    
    if (password !== confirmPassword) {
      setValidationError(t('passwordsDoNotMatch'))
      return false
    }
    
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setValidationError("")
    setSuccess("")
    
    if (!validateForm()) {
      return
    }
    
    setLoading(true)
    try {
      await createUserWithEmailAndPassword(auth, email, password)
      
      // Update profile with first name and last name
      try {
        await api.updateUserProfile({
          first_name: firstName,
          last_name: lastName,
        })
      } catch (profileErr) {
        console.error('Failed to update profile after registration:', profileErr)
        // Don't fail registration if profile update fails
      }
      
      setSuccess(t('signUpSuccess'))
      // User is automatically signed in after successful registration and redirected by auth context
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError(t('signUpError') + ": " + t('emailAlreadyInUse'))
      } else if (err.code === 'auth/invalid-email') {
        setError(t('invalidEmail'))
      } else if (err.code === 'auth/weak-password') {
        setValidationError(t('passwordTooShort'))
      } else {
        setError(t('signUpError') + ": " + (err.message || 'Unknown error'))
      }
      console.error('Registration error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLoginClick = () => {
    navigate('/')
  }

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>{t('signUpTitle')}</CardTitle>
        <CardDescription>{t('signUpSubtitle')}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Input
                id="firstName"
                placeholder={t('firstName')}
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Input
                id="lastName"
                placeholder={t('lastName')}
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Input
                id="email"
                placeholder={t('email')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Input
                id="password"
                placeholder={t('password')}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <p className="text-xs text-gray-500">{t('passwordTooShort')}</p>
            </div>
            <div className="flex flex-col space-y-1.5">
              <Input
                id="confirmPassword"
                placeholder={t('confirmPassword')}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            {validationError && <p className="text-sm text-red-500">{validationError}</p>}
            {error && <p className="text-sm text-red-500">{error}</p>}
            {success && <p className="text-sm text-green-500">{success}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('creatingAccount') : t('signUpButton')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleLoginClick}
            className="w-full"
          >
            {t('goToLogin')}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

