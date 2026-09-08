import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'

import { GuestRoute } from '@/components/auth/GuestRoute'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { RequireRole } from '@/components/auth/RequireRole'
import AdminLayout from '@/components/layout/AdminLayout'
import { Toaster } from '@/components/ui/Toast'
import AppLayout from '@/components/layout/AppLayout'
import DashboardPage from '@/pages/DashboardPage'
import ErrorPage from '@/pages/ErrorPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import LoginPage from '@/pages/LoginPage'
import NewTicketPage from '@/pages/NewTicketPage'
import PlaceholderPage from '@/pages/PlaceholderPage'
import TicketDetailPage from '@/pages/TicketDetailPage'
import TicketsPage from '@/pages/TicketsPage'
import UsersAdminPage from '@/pages/admin/UsersAdminPage'
import CompaniesAdminPage from '@/pages/admin/CompaniesAdminPage'
import GroupsAdminPage from '@/pages/admin/GroupsAdminPage'
import SlaAdminPage from '@/pages/admin/SlaAdminPage'
import RoutingRulesAdminPage from '@/pages/admin/RoutingRulesAdminPage'
import AuditAdminPage from '@/pages/admin/AuditAdminPage'
import ApprovalFlowsAdminPage from '@/pages/admin/ApprovalFlowsAdminPage'

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
      { path: 'tickets', element: <TicketsPage /> },
      { path: 'tickets/new', element: <NewTicketPage /> },
      { path: 'tickets/:id', element: <TicketDetailPage /> },
      { path: 'approvals', element: <PlaceholderPage /> },
      { path: 'changes', element: <PlaceholderPage /> },
      { path: 'problems', element: <PlaceholderPage /> },
      { path: 'knowledge', element: <PlaceholderPage /> },
      { path: 'reports', element: <PlaceholderPage /> },
      {
        path: 'admin',
        element: (
          <RequireRole roles={['ADMIN', 'MANAGER']}>
            <AdminLayout />
          </RequireRole>
        ),
        children: [
          { index: true, element: <Navigate to="/admin/users" replace /> },
          { path: 'users', element: <UsersAdminPage /> },
          { path: 'companies', element: <CompaniesAdminPage /> },
          { path: 'groups', element: <GroupsAdminPage /> },
          { path: 'sla', element: <SlaAdminPage /> },
          { path: 'routing-rules', element: <RoutingRulesAdminPage /> },
          { path: 'audit', element: <AuditAdminPage /> },
          { path: 'approval-flows', element: <ApprovalFlowsAdminPage /> },
        ],
      },
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