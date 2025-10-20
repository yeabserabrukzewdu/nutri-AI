import React, { useEffect, useState, useRef } from 'react';
import AuthPage from './AuthPage';

const ANIM_MS = 300;

  const SignupModal: React.FC<{ open: boolean; onClose: () => void; onSignedIn?: () => void }> = ({
  open,
  onClose,
  onSignedIn,
}) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4">
        <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-200">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-orange-600">Sign up to view Calendar</h3>
            <p className="text-gray-600 text-sm mt-1">
              Calendar access is limited to signed-in users. Create an account or sign in to sync and view your logs by
              date.
            </p>
          </div>

          <AuthPage
            compact
            onSignedIn={() => {
              onSignedIn?.()
              onClose()
            }}
          />

          <div className="mt-4 text-right">
            <button onClick={onClose} className="text-gray-600 hover:text-gray-900 font-semibold transition">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignupModal