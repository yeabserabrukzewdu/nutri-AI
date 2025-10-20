"use client"

import { useState, useEffect, useCallback } from "react"
import type { FoodItem, MacroGoals } from "../types"
import { getPersonalizedInsights } from "../services/geminiService"
import Loader from "./Loader"

interface InsightsProps {
  loggedFoods: FoodItem[]
  goals: MacroGoals
}

const Insights = ({ loggedFoods, goals }: InsightsProps) => {
  const [insights, setInsights] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchInsights = useCallback(async () => {
    if (loggedFoods.length === 0) {
      setInsights("Log some food to get your personalized insights for the day!")
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const result = await getPersonalizedInsights(loggedFoods, goals)
      setInsights(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch insights.")
    } finally {
      setIsLoading(false)
    }
  }, [loggedFoods, goals])

  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
      <h2 className="text-xl font-bold mb-4 text-gray-900">AI Insights</h2>
      {isLoading ? (
        <Loader message="Generating your insights..." />
      ) : error ? (
        <div className="text-red-600 bg-red-50 p-4 rounded-lg">{error}</div>
      ) : (
        <div
          className="prose prose-sm text-gray-700 max-w-none"
          dangerouslySetInnerHTML={{ __html: insights.replace(/\n/g, "<br />") }}
        />
      )}
      <button
        onClick={fetchInsights}
        disabled={isLoading}
        className="mt-4 w-full bg-orange-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-700 disabled:bg-gray-400 transition-colors"
      >
        {isLoading ? "Refreshing..." : "Get Fresh Insights"}
      </button>
    </div>
  )
}

export default Insights
