// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { authAPI, tokenService } from '../services/api'

function extractUser(payload) {
  // payload can be: user object | {user} | {data} | {data:{user}} | ...
  const maybe = payload?.user ?? payload?.data ?? payload
  // Some APIs wrap again like {data:{data:{...}}}
  const deep = maybe?.user ?? maybe?.data ?? maybe
  return deep
}

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      try {
        if (tokenService.get()) {
          const res = await authAPI.me()
          const u = extractUser(res)
          setUser(u)
        }
      } catch {
        tokenService.clear()
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const login = async (email, password) => {
    const resLogin = await authAPI.login({ email, password }) // { user, token } or similar
    const token = resLogin?.data?.token ?? resLogin?.token
    if (token) tokenService.set(token)

    const resMe = await authAPI.me()
    const u = extractUser(resMe)
    setUser(u)
    return u
  }

  const register = async ({ name, email, password, password_confirmation }) => {
    const resReg = await authAPI.register({ name, email, password, password_confirmation })
    const token = resReg?.data?.token ?? resReg?.token
    if (token) tokenService.set(token)

    const resMe = await authAPI.me()
    const u = extractUser(resMe)
    setUser(u)
    return u
  }

  const logout = async () => {
    try { await authAPI.logout() } catch {}
    tokenService.clear()
    setUser(null)
  }

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
