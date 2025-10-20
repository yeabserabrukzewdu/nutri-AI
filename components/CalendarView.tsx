"use client"

import React from "react"
import { getDaysInMonth, getMonthYear, getDayOfWeek, isSameDay } from "../utils/dateUtils"
import type { LogEntry } from "../services/firestoreService"

interface CalendarViewProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
  loggedFoods?: LogEntry[]
}

const CalendarView = ({ selectedDate, onDateChange, loggedFoods = [] }: CalendarViewProps) => {
  const [currentMonth, setCurrentMonth] = React.useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  )

  const daysInMonth = getDaysInMonth(currentMonth)
  const firstDayOfMonth = getDayOfWeek(daysInMonth[0])
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const hasFoodLogs = (day: Date) => {
    return loggedFoods.some((log) => {
      const logDate = typeof log.timestamp === "number" ? new Date(log.timestamp) : null
      return logDate && isSameDay(logDate, day)
    })
  }

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <button onClick={handlePrevMonth} className="text-gray-600 hover:text-orange-600 font-bold text-lg transition">
          &lt;
        </button>
        <h2 className="text-lg font-bold text-gray-900">{getMonthYear(currentMonth)}</h2>
        <button onClick={handleNextMonth} className="text-gray-600 hover:text-orange-600 font-bold text-lg transition">
          &gt;
        </button>
      </div>
      <div className="grid grid-cols-7 gap-2 text-center text-sm text-gray-600 font-semibold mb-2">
        {weekdays.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: firstDayOfMonth }).map((_, index) => (
          <div key={`empty-${index}`}></div>
        ))}
        {daysInMonth.map((day) => {
          const isSelected = isSameDay(day, selectedDate)
          const isToday = isSameDay(day, new Date())
          const hasLogs = hasFoodLogs(day)
          return (
            <button
              key={day.toString()}
              onClick={() => onDateChange(day)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all font-semibold relative
                ${isSelected ? "bg-orange-600 text-white shadow-lg" : ""}
                ${!isSelected && isToday ? "border-2 border-orange-500 text-orange-600" : ""}
                ${!isSelected && !isToday ? "hover:bg-gray-100 text-gray-700" : ""}
              `}
            >
              {day.getDate()}
              {hasLogs && !isSelected && (
                <div className="absolute bottom-1 w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              )}
              {hasLogs && isSelected && <div className="absolute bottom-1 w-1.5 h-1.5 bg-white rounded-full"></div>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default CalendarView
