import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import { GuestRoute } from '@/components/auth/GuestRoute'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { Toaster } from '@/components/ui/Toast'
import AppLayout from '@/components/layout/AppLayout'
import DashboardPage from '@/pages/DashboardPage'
import ErrorPage from '@/pages/ErrorPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import LoginPage from '@/pages/LoginPage'
import PlaceholderPage from '@/pages/PlaceholderPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <GuestRoute>
        <LoginPage />
      </GuestRoute>
    ),
  },
  {
    path: '/forgot-password',
    element: (
      <GuestRoute>
        <ForgotPasswordPage />
      </GuestRoute>
    ),
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'tickets', element: <PlaceholderPage /> },
      { path: 'approvals', element: <PlaceholderPage /> },
      { path: 'changes', element: <PlaceholderPage /> },
      { path: 'problems', element: <PlaceholderPage /> },
      { path: 'knowledge', element: <PlaceholderPage /> },
      { path: 'reports', element: <PlaceholderPage /> },
      { path: 'admin', element: <PlaceholderPage /> },
    ],
  },
])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  )
}