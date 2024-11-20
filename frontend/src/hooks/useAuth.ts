import { atom, useAtom } from 'jotai'
import { TOKEN_KEY, USER_KEY } from '@/config/constants'

interface User {
  id: number
  email: string
  username: string
}

interface AuthState {
  token: string | null
  user: User | null
}

const authAtom = atom<AuthState>({
  token: typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null,
  user: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem(USER_KEY) || 'null') : null,
})

export function useAuth() {
  const [auth, setAuth] = useAtom(authAtom)

  const setToken = (token: string) => {
    localStorage.setItem(TOKEN_KEY, token)
    setAuth({ ...auth, token })
  }

  const setUser = (user: User) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    setAuth({ ...auth, user })
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setAuth({ token: null, user: null })
  }

  return {
    token: auth.token,
    user: auth.user,
    setToken,
    setUser,
    logout,
  }
}
