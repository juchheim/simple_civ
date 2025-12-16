console.log("=== MAIN.TSX EXECUTING ===");

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { TutorialProvider } from './contexts/TutorialContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <TutorialProvider>
            <App />
        </TutorialProvider>
    </React.StrictMode>,
)

