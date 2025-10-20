"use client"

import type React from "react"
import { CameraIcon, UploadIcon } from "./Icons"

interface LogFoodActionsProps {
  onAction: (action: "camera" | "upload") => void
}

const LogFoodActions: React.FC<LogFoodActionsProps> = ({ onAction }) => {
  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-4xl bg-white border border-gray-200 p-8 rounded-3xl shadow-lg">
        <div className="mb-4 text-center">
          <h3 className="text-2xl font-bold text-gray-900">Log a meal</h3>
          <p className="text-sm text-gray-600">Use a photo to quickly analyze and add foods to your log.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => onAction("camera")}
            aria-label="Take a picture"
            className="flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transform hover:-translate-y-1 transition-all text-white font-semibold rounded-xl p-6 min-h-[140px] shadow-lg"
          >
            <CameraIcon className="w-10 h-10" />
            <span className="text-lg">Take a Picture</span>
            <span className="text-xs text-blue-100">Open the camera to capture a meal</span>
          </button>

          <button
            onClick={() => onAction("upload")}
            aria-label="Upload a photo"
            className="flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 transform hover:-translate-y-1 transition-all text-white font-semibold rounded-xl p-6 min-h-[140px] shadow-lg"
          >
            <UploadIcon className="w-10 h-10" />
            <span className="text-lg">Upload a Photo</span>
            <span className="text-xs text-green-100">Choose an existing image from your device</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default LogFoodActions
