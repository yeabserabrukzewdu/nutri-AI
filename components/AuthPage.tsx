"use client"

import type React from "react"
import { useState } from "react"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  linkWithPopup,
  signInAnonymously,
  signOut,
} from "firebase/auth"
import { auth } from "../services/firebase"
import { ToastContainer, useToast } from "./toast"

type Mode = "login" | "register"

const AuthPage: React.FC<{ onSignedIn?: () => void; compact?: boolean }> = ({ onSignedIn, compact = false }) => {
  const [mode, setMode] = useState<Mode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guest, setGuest] = useState(false)
  const { toasts, showToast, removeToast } = useToast()

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePassword = (password: string): string | null => {
    if (password.length < 6) {
      return "Password must be at least 6 characters long"
    }
    return null
  }

  const parseFirebaseError = (error: any): string => {
    const message = error.message || ""
    if (message.includes("email-already-in-use")) {
      return "This email is already registered. Please sign in or use a different email."
    }
    if (message.includes("invalid-email")) {
      return "Please enter a valid email address"
    }
    if (message.includes("weak-password")) {
      return "Password is too weak. Use at least 6 characters with a mix of letters and numbers."
    }
    if (message.includes("user-not-found")) {
      return "No account found with this email. Please sign up first."
    }
    if (message.includes("wrong-password")) {
      return "Incorrect password. Please try again."
    }
    return message || "An error occurred. Please try again."
  }

  const handleRegister = async () => {
    setError(null)

    if (!email.trim()) {
      showToast("Please enter an email address", "warning")
      return
    }

    if (!validateEmail(email)) {
      showToast("Please enter a valid email address (e.g., user@example.com)", "error")
      return
    }

    if (!password) {
      showToast("Please enter a password", "warning")
      return
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      showToast(passwordError, "error")
      return
    }

    setLoading(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() })
      }
      showToast("Account created successfully!", "success")
      onSignedIn?.()
    } catch (e: any) {
      const errorMessage = parseFirebaseError(e)
      setError(errorMessage)
      showToast(errorMessage, "error")
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    setError(null)

    if (!email.trim()) {
      showToast("Please enter an email address", "warning")
      return
    }

    if (!password) {
      showToast("Please enter a password", "warning")
      return
    }

    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      showToast("Signed in successfully!", "success")
      onSignedIn?.()
    } catch (e: any) {
      const errorMessage = parseFirebaseError(e)
      setError(errorMessage)
      showToast(errorMessage, "error")
    } finally {
      setLoading(false)
    }
  }

  const handleGuestToggle = async (checked: boolean) => {
    setError(null)
    setGuest(checked)
    setLoading(true)
    try {
      if (checked) {
        await signInAnonymously(auth)
        showToast("Continuing as guest", "info")
        onSignedIn?.()
      } else {
        await signOut(auth)
      }
    } catch (e: any) {
      const errorMessage = parseFirebaseError(e)
      setError(errorMessage)
      showToast(errorMessage, "error")
      setGuest(!checked)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    setLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      if (auth.currentUser && auth.currentUser.isAnonymous) {
        await linkWithPopup(auth.currentUser, provider)
      } else {
        await signInWithPopup(auth, provider)
      }
      showToast("Signed in with Google!", "success")
      onSignedIn?.()
    } catch (e: any) {
      const errorMessage = parseFirebaseError(e)
      setError(errorMessage)
      showToast(errorMessage, "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={compact ? "font-sans" : "bg-white text-gray-900 min-h-screen font-sans"}>
      <div
        className={
          compact
            ? "p-4 flex items-center justify-center"
            : "container mx-auto p-4 md:p-8 flex items-center justify-center min-h-screen"
        }
      >
        <div
          className={
            compact
              ? "w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
              : "w-full max-w-5xl bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden grid grid-cols-1 md:grid-cols-2"
          }
        >
          {!compact && (
            <div className="p-8 bg-gradient-to-br from-orange-50 to-blue-50 flex flex-col justify-center border-r border-gray-200">
              <h1 className="text-4xl font-extrabold text-orange-600">NutriSnap AI</h1>
              <p className="text-gray-600 mt-3">AI-powered food logging that follows you across devices.</p>

              <ul className="mt-6 space-y-3 text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="text-orange-500 font-bold">✓</span> Fast photo-based logging
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-orange-500 font-bold">✓</span> Sync across devices
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-orange-500 font-bold">✓</span> Private & secure
                </li>
              </ul>

              <div className="mt-8 text-xs text-gray-500">
                By signing in you agree to sync your logs to your account.
              </div>
            </div>
          )}

          <div className={compact ? "p-6" : "p-8"}>
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
                  <p className="text-gray-600 text-sm mt-1">Create an account or sign in to sync your food logs.</p>
                </div>
                <div className="text-sm text-gray-500">Secure · Fast · Private</div>
              </div>

              {mode === "register" && (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="w-full p-3 rounded-lg bg-gray-50 text-gray-900 border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition"
                />
              )}

              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full p-3 rounded-lg bg-gray-50 text-gray-900 border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition"
              />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                type="password"
                className="w-full p-3 rounded-lg bg-gray-50 text-gray-900 border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition"
              />

              {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}

              <div className="flex gap-3">
                {mode === "login" ? (
                  <button
                    onClick={handleLogin}
                    disabled={loading}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg transition transform hover:scale-105 disabled:opacity-50"
                  >
                    Sign in
                  </button>
                ) : (
                  <button
                    onClick={handleRegister}
                    disabled={loading}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg transition transform hover:scale-105 disabled:opacity-50"
                  >
                    Create account
                  </button>
                )}

                <button
                  onClick={() => setMode(mode === "login" ? "register" : "login")}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-3 rounded-lg transition"
                >
                  {mode === "login" ? "Create account" : "Back to sign in"}
                </button>
              </div>

              <div className="text-center text-gray-500">or</div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    aria-label="Continue as guest"
                    role="switch"
                    type="checkbox"
                    checked={guest}
                    onChange={(e) => handleGuestToggle(e.target.checked)}
                    disabled={loading}
                    className="sr-only"
                  />
                  <span
                    className={`w-11 h-6 rounded-full p-1 transition-colors ${guest ? "bg-orange-500" : "bg-gray-300"}`}
                  >
                    <span
                      className={`block w-4 h-4 bg-white rounded-full transform transition-transform ${guest ? "translate-x-5" : ""}`}
                    />
                  </span>
                  <span className="text-gray-700">Continue as guest</span>
                </label>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 py-3 rounded-lg shadow border border-gray-300 hover:bg-gray-50 transition"
                >
                  <svg className="w-5 h-5" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M533.5 278.4c0-17.4-1.6-34.1-4.6-50.4H272v95.2h147.4c-6.4 34.4-25.4 63.5-54.2 83v68h87.4c51.2-47.1 81.9-116.7 81.9-195.8z"
                      fill="#4285f4"
                    />
                    <path
                      d="M272 544.3c73.6 0 135.4-24.6 180.6-66.8l-87.4-68c-24.3 16.3-55.4 26-93.2 26-71.6 0-132.4-48.3-154.2-113.2H25.7v71.1C70.9 493.2 164.5 544.3 272 544.3z"
                      fill="#34a853"
                    />
                    <path
                      d="M117.8 323.6c-11.9-35.1-11.9-72.8 0-107.9V144.6H25.7c-39.3 76.7-39.3 169.3 0 246l92.1-66.9z"
                      fill="#fbbc04"
                    />
                    <path
                      d="M272 107.7c39.9-.6 78.1 14.5 106.9 41.8l80.1-80.1C407.3 24.2 344.9 0 272 0 164.5 0 70.9 51.1 25.7 144.6l92.1 71.1C139.7 156 200.4 107.7 272 107.7z"
                      fill="#ea4335"
                    />
                  </svg>
                  <span className="text-sm font-semibold">Continue with Google</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}

export default AuthPage
