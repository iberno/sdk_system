import { Suspense } from 'react'
import { createRoot } from 'react-dom/client'

import App from '@/App'
import '@/i18n'
import LoadingPage from '@/pages/LoadingPage'
import '@/index.css'

createRoot(document.getElementById('root')!).render(
  <Suspense fallback={<LoadingPage />}>
    <App />
  </Suspense>,
)