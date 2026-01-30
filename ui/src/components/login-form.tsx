import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { auth } from "@/lib/firebase"
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth"
import { useTranslation } from "@/hooks/useTranslation"
import { useNavigate } from "react-router-dom"

export function LoginForm() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [errorType, setErrorType] = useState<"user-not-found" | "wrong-password" | "other" | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setErrorType(null)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate('/inplay', { replace: true })
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setErrorType('user-not-found')
        setError(t('userNotFoundMessage'))
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setErrorType('wrong-password')
        setError(t('wrongPasswordMessage'))
      } else {
        setErrorType('other')
        setError(t('loginError'))
        console.error(err)
      }
    }
  }

  const handlePasswordReset = async () => {
    setError("")
    setSuccess("")
    try {
      await sendPasswordResetEmail(auth, email)
      setSuccess(t('passwordResetSent'))
      setErrorType(null)
    } catch (err: any) {
      setError(t('passwordResetError'))
      console.error('Password reset error:', err)
    }
  }

  const handleRegisterClick = () => {
    navigate('/register')
  }

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>{t('login')}</CardTitle>
        <CardDescription>{t('loginSubtitle')}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <div className="grid w-full items-center gap-4">
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
              />
            </div>
            {error && (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-red-500">{error}</p>
                {errorType === 'user-not-found' && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRegisterClick}
                    className="w-full"
                  >
                    {t('createAccountButton')}
                  </Button>
                )}
                {errorType === 'wrong-password' && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePasswordReset}
                    className="w-full"
                  >
                    {t('requestPasswordResetButton')}
                  </Button>
                )}
              </div>
            )}
            {success && <p className="text-sm text-green-500">{success}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button type="submit" className="w-full">{t('loginButton')}</Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleRegisterClick}
            className="w-full"
          >
            {t('registerButton')}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
} 