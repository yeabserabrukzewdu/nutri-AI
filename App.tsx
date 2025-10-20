"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import CalendarView from "./components/CalendarView"
import MacroTracker from "./components/MacroTracker"
import Insights from "./components/Insights"
import LogFoodModal from "./components/LogFoodModal"
import LogFoodActions from "./components/LogFoodActions"
import BottomNav from "./components/BottomNav"
import AuthPage from "./components/AuthPage"
import SignupModal from "./components/SignupModal"
import Profile from "./components/profile"
import { signOut, onAuthStateChanged } from "firebase/auth"
import type { FoodItem, MacroGoals } from "./types"
import type { LogEntry } from "./services/firestoreService"
import { auth } from "./services/firebase"
import {
  getLogEntries,
  addLogEntry,
  deleteLogEntry,
  subscribeToLogEntries,
  getUserProfile,
  setUserProfile,
  updateUserProfile,
} from "./services/firestoreService"
import { getFormattedDate, isSameDay } from "./utils/dateUtils"
import { XIcon, PlusIcon } from "./components/Icons"

type ModalTab = "camera" | "upload" | "search"

const App: React.FC = () => {
  const [userInitialized, setUserInitialized] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isAnonymousUser, setIsAnonymousUser] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [loggedFoods, setLoggedFoods] = useState<LogEntry[]>([])
  const [goals, setGoals] = useState<MacroGoals>({ calories: 2000, protein: 150, carbs: 250, fat: 65 })
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; initialTab: ModalTab }>({
    isOpen: false,
    initialTab: "camera",
  })
  const [activeSection, setActiveSection] = useState<"main" | "insights" | "calendar" | "profile">("main")
  const [showSignupModal, setShowSignupModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const formattedDate = getFormattedDate(selectedDate)
  const lastMigratedUid = useRef<string | null>(null)
  const unsubRef = useRef<(() => void) | null>(null)

  // Page transition effect
  useEffect(() => {
    setIsTransitioning(true)
    const timeout = setTimeout(() => setIsTransitioning(false), 300)
    return () => clearTimeout(timeout)
  }, [activeSection])

  // Load user profile and goals from Firestore
  useEffect(() => {
    const loadUserProfile = async () => {
      if (currentUserId) {
        try {
          const profile = await getUserProfile(currentUserId)
          if (profile?.macroGoals) {
            setGoals(profile.macroGoals)
          } else {
            const savedGoals = localStorage.getItem("macroGoals")
            if (savedGoals) {
              const parsedGoals = JSON.parse(savedGoals) as MacroGoals
              setGoals(parsedGoals)
              await updateUserProfile(currentUserId, { macroGoals: parsedGoals })
            }
          }
        } catch (e) {
          console.error("Failed to load user profile", e)
          setError("Failed to load user profile. Using local data.")
        }
      } else {
        try {
          const savedGoals = localStorage.getItem("macroGoals")
          if (savedGoals) setGoals(JSON.parse(savedGoals) as MacroGoals)
        } catch (e) {
          console.error("Failed to load local goals", e)
        }
      }
    }

    loadUserProfile()
  }, [currentUserId])

  // Save goals to Firestore when updated
  useEffect(() => {
    const saveGoals = async () => {
      if (currentUserId && !isAnonymousUser) {
        try {
          await updateUserProfile(currentUserId, { macroGoals: goals })
        } catch (e) {
          console.error("Failed to save goals to Firestore", e)
          setError("Failed to save goals. Changes stored locally.")
        }
      }
      try {
        localStorage.setItem("macroGoals", JSON.stringify(goals))
      } catch (e) {
        console.error("Failed to save goals locally", e)
      }
    }

    saveGoals()
  }, [goals, currentUserId, isAnonymousUser])

  // Migrate localStorage logs to Firestore
  const migrateLocalToFirestore = async (uid: string) => {
    if (!uid || lastMigratedUid.current === uid) return
    try {
      const remoteEntries = await getLogEntries(uid).catch(() => [])
      const remoteSet = new Set<string>(remoteEntries.map((e) => `${e.name}::${e.timestamp || ""}`))

      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key?.startsWith("foodLog-")) continue
        try {
          const arr = JSON.parse(localStorage.getItem(key) || "[]") as LogEntry[]
          for (const item of arr) {
            const ts = item.timestamp || Date.now()
            const keyHash = `${item.name}::${ts}`
            if (remoteSet.has(keyHash)) continue
            await addLogEntry(uid, {
              name: item.name,
              calories: item.calories,
              protein: item.protein,
              carbs: item.carbs,
              fat: item.fat,
              portion: item.portion,
              timestamp: ts,
            })
          }
          keysToRemove.push(key)
        } catch (e) {
          console.warn("Skipping invalid local key during migration", key, e)
        }
      }

      for (const k of keysToRemove) {
        try {
          localStorage.removeItem(k)
        } catch {}
      }
      lastMigratedUid.current = uid
    } catch (e) {
      console.error("Local -> Firestore migration failed", e)
      setError("Failed to sync local logs to cloud. Data stored locally.")
    }
  }

  // Migrate anonymous Firestore logs to new user ID
  const migrateAnonFirestoreToUid = async (anonUid: string, newUid: string) => {
    if (!anonUid || !newUid || anonUid === newUid) return
    try {
      const anonEntries = await getLogEntries(anonUid).catch(() => [])
      if (!anonEntries.length) return
      const remoteNew = await getLogEntries(newUid).catch(() => [])
      const remoteSet = new Set(remoteNew.map((e) => `${e.name}::${e.timestamp || ""}`))
      for (const e of anonEntries) {
        const key = `${e.name}::${e.timestamp || ""}`
        if (remoteSet.has(key)) continue
        await addLogEntry(newUid, {
          name: e.name,
          calories: e.calories,
          protein: e.protein,
          carbs: e.carbs,
          fat: e.fat,
          portion: e.portion,
          timestamp: e.timestamp || Date.now(),
        })
      }
      try {
        localStorage.removeItem("pendingAnonUid")
      } catch {}
    } catch (err) {
      console.error("Failed to migrate anon Firestore to new uid", err)
      setError("Failed to migrate anonymous data. Some logs may not be available.")
    }
  }

  // Auth state listener
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setUserInitialized(true)
      const uid = user?.uid || null
      setCurrentUserId(uid)
      setIsAnonymousUser(!!(user && user.isAnonymous))

      if (user && user.isAnonymous) {
        try {
          localStorage.setItem("pendingAnonUid", user.uid)
        } catch {}
      }

      if (uid) {
        try {
          await setUserProfile(uid, { email: user?.email ?? null })
        } catch (e) {
          console.warn("setUserProfile failed", e)
          setError("Failed to initialize user profile.")
        }

        await migrateLocalToFirestore(uid)

        try {
          const pendingAnonUid = localStorage.getItem("pendingAnonUid")
          if (pendingAnonUid && pendingAnonUid !== uid) {
            await migrateAnonFirestoreToUid(pendingAnonUid, uid)
          }
        } catch (e) {
          console.warn("Anon -> uid migration check failed", e)
        }

        if (unsubRef.current) {
          try {
            unsubRef.current()
          } catch {}
          unsubRef.current = null
        }
        unsubRef.current = subscribeToLogEntries(uid, (entries) => {
          setLoggedFoods(entries)
        })
      } else {
        try {
          const savedFoods = localStorage.getItem(`foodLog-${formattedDate}`)
          if (savedFoods) setLoggedFoods(JSON.parse(savedFoods))
          else setLoggedFoods([])
        } catch (e) {
          console.error("Failed to load local logs", e)
          setError("Failed to load local data.")
        }
        if (unsubRef.current) {
          try {
            unsubRef.current()
          } catch {}
          unsubRef.current = null
        }
      }
    })

    return () => {
      try {
        unsubAuth()
      } catch {}
      if (unsubRef.current) {
        try {
          unsubRef.current()
        } catch {}
      }
    }
  }, [formattedDate])

  // UI actions
  const handleOpenModal = (tab: ModalTab) => setModalConfig({ isOpen: true, initialTab: tab })
  const handleCloseModal = () => setModalConfig({ isOpen: false, initialTab: "camera" })

  const handleAddFood = async (foodItems: FoodItem[]) => {
    const timestampedItems = foodItems.map((item) => ({
      ...item,
      timestamp: selectedDate.getTime(),
    }))
    setLoggedFoods((prev) => [...prev, ...timestampedItems] as LogEntry[])

    if (currentUserId && !isAnonymousUser) {
      const newItems: LogEntry[] = []
      for (const item of timestampedItems) {
        try {
          const newEntry = await addLogEntry(currentUserId, {
            name: item.name,
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fat: item.fat,
            portion: item.portion,
            timestamp: item.timestamp,
          })
          newItems.push(newEntry)
        } catch (e) {
          console.error("Failed to persist to Firestore", e)
          setError("Failed to save food log to cloud. Stored locally.")
        }
      }
      setLoggedFoods((prev) => [
        ...prev.filter((p) => !timestampedItems.some((t) => t.name === p.name && t.timestamp === p.timestamp)),
        ...newItems,
      ])
    } else {
      try {
        const updatedFoods = [...loggedFoods, ...timestampedItems]
        localStorage.setItem(`foodLog-${formattedDate}`, JSON.stringify(updatedFoods))
      } catch (e) {
        console.error("Failed to save local logs", e)
        setError("Failed to save food log locally.")
      }
    }
    handleCloseModal()
  }

  const handleRemoveFood = async (foodId: string) => {
    setLoggedFoods((prev) => prev.filter((item) => item.id !== foodId))
    if (currentUserId && !isAnonymousUser) {
      try {
        await deleteLogEntry(currentUserId, foodId)
      } catch (e) {
        console.error("Failed to delete remote entry", e)
        setError("Failed to delete log from cloud.")
      }
    } else {
      try {
        const updated = loggedFoods.filter((item) => item.id !== foodId)
        localStorage.setItem(`foodLog-${formattedDate}`, JSON.stringify(updated))
      } catch (e) {
        console.error("Failed to update localStorage after delete", e)
        setError("Failed to update local data.")
      }
    }
  }

  const handleNavChange = (s: "main" | "insights" | "calendar" | "profile") => {
    if (s === "calendar" && isAnonymousUser) {
      setShowSignupModal(true)
      return
    }
    setActiveSection(s)
  }

  const handleCloseSignupModal = () => {
    setShowSignupModal(false)
    if (activeSection === "calendar") setActiveSection("main")
  }

  const handleGoToAuth = async () => {
    try {
      await signOut(auth)
    } catch (e) {
      console.error("Failed to sign out", e)
      setError("Failed to sign out. Please try again.")
    } finally {
      setShowSignupModal(false)
    }
  }

  // Render
  if (!userInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mb-4" />
          <div className="text-orange-600 animate-pulse">Authenticating...</div>
        </div>
      </div>
    )
  }

  if (!currentUserId) {
    return (
      <AuthPage
        onSignedIn={() => {
          /* auth listener handles state */
        }}
      />
    )
  }

  return (
    <div className="bg-white text-gray-900 min-h-screen font-sans pb-24">
      <div className="container mx-auto p-4 md:p-6 max-w-4xl">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 animate-fade-in">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-4 text-sm underline hover:text-red-900 transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-orange-600">NutriSnap AI</h1>
          <p className="text-gray-500 mt-2 text-sm md:text-base">Your AI-powered nutrition companion</p>
        </header>

        <main
          className={`grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 transition-all duration-300 ease-in-out ${isTransitioning ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"}`}
        >
          {activeSection === "main" && (
            <div className="lg:col-span-2 flex items-center justify-center min-h-[60vh]">
              <LogFoodActions onAction={handleOpenModal} />
            </div>
          )}

          {activeSection === "insights" && (
            <div className="lg:col-span-2">
              <Insights loggedFoods={loggedFoods} goals={goals} />
            </div>
          )}

          {activeSection === "calendar" && (
            <>
              <div className="lg:col-span-2">
                <CalendarView selectedDate={selectedDate} onDateChange={setSelectedDate} />
              </div>

              <div className="lg:col-span-1">
                <MacroTracker
                  loggedFoods={loggedFoods.filter((item) => {
                    const ts = item.timestamp
                    return typeof ts === "number" ? isSameDay(new Date(ts), selectedDate) : true
                  })}
                  goals={goals}
                />

                <div className="bg-gray-50 p-6 rounded-2xl shadow-md border border-gray-200 mt-6 animate-slide-up">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-orange-600">Food Log</h2>
                    <button
                      onClick={() => handleOpenModal("search")}
                      className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-all duration-300"
                    >
                      <PlusIcon className="w-4 h-4 inline-block mr-1" /> Add
                    </button>
                  </div>

                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-orange-300 scrollbar-track-gray-100">
                    {loggedFoods.filter((item) => {
                      const ts = item.timestamp
                      return typeof ts === "number" ? isSameDay(new Date(ts), selectedDate) : true
                    }).length > 0 ? (
                      loggedFoods
                        .filter((item) => {
                          const ts = item.timestamp
                          return typeof ts === "number" ? isSameDay(new Date(ts), selectedDate) : true
                        })
                        .map((item) => (
                          <div
                            key={item.id}
                            className="bg-white p-4 rounded-lg grid grid-cols-3 items-center gap-2 border border-gray-200 hover:border-orange-300 transition-all duration-300"
                          >
                            <div className="col-span-2">
                              <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                              <p className="text-xs text-gray-500">
                                {item.portion} - {item.calories} kcal
                              </p>
                            </div>
                            <div className="text-right text-xs text-gray-600 flex items-center justify-end">
                              P:{item.protein} C:{item.carbs} F:{item.fat}
                              <button
                                onClick={() => handleRemoveFood(item.id)}
                                className="text-gray-400 hover:text-red-600 ml-3 transition-colors flex-shrink-0"
                              >
                                <XIcon className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        ))
                    ) : (
                      <p className="text-gray-400 text-center py-8">No food logged for this day.</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeSection === "profile" && (
            <div className="lg:col-span-2">
              <Profile
                currentUserId={currentUserId}
                isAnonymousUser={isAnonymousUser}
                goals={goals}
                onGoalsChange={setGoals}
              />
            </div>
          )}

          {(activeSection === "main" || activeSection === "insights") && (
            <div className="space-y-6">
              <MacroTracker loggedFoods={loggedFoods} goals={goals} />
            </div>
          )}
        </main>

        {modalConfig.isOpen && (
          <LogFoodModal onClose={handleCloseModal} onAddFood={handleAddFood} initialTab={modalConfig.initialTab} />
        )}

        {!modalConfig.isOpen && (
          <BottomNav active={activeSection} onChange={handleNavChange} onOpenModal={handleOpenModal} />
        )}

        <SignupModal
          open={showSignupModal}
          onClose={handleCloseSignupModal}
          onSignedIn={() => {
            setShowSignupModal(false)
            setActiveSection("calendar")
          }}
        />
      </div>
    </div>
  )
}

export default App
