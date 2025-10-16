import React from 'react'
import { Routes, Route } from 'react-router-dom'
import {
  LayoutDashboard,
  Users as UsersIcon,
  Activity,
  Coins,
  HeartPulse,
  MessageSquare,
  ServerCog,
} from 'lucide-react'
import Overview from './pages/Overview.jsx'
import Users from './pages/Users.jsx'
import Usage from './pages/Usage.jsx'
import Costs from './pages/Costs.jsx'
import Health from './pages/Health.jsx'
import Messaging from './pages/Messaging.jsx'
import JobsQueues from './pages/JobsQueues.jsx'
import Leads from './pages/Leads.jsx'
import Permits from './pages/Permits.jsx'
import LayoutShell from './components/LayoutShell.jsx'
import { ThemeProvider } from './theme/ThemeProvider.jsx'
import { ToastProvider } from './components/ToastProvider.jsx'
import './App.css'

const NAVIGATION = [
  {
    label: 'Mission',
    items: [
      { label: 'Overview', icon: LayoutDashboard, to: '/', exact: true },
      { label: 'Messaging', icon: MessageSquare, to: '/messaging' },
      { label: 'Leads', icon: LayoutDashboard, to: '/leads' },
      { label: 'Permits', icon: ServerCog, to: '/permits' },
      { label: 'Jobs & Queues', icon: ServerCog, to: '/jobs' },
    ],
  },
  {
    label: 'People',
    items: [{ label: 'Users', icon: UsersIcon, to: '/users' }],
  },
  {
    label: 'Insights',
    items: [
      { label: 'Usage', icon: Activity, to: '/usage' },
      { label: 'Costs', icon: Coins, to: '/costs' },
      { label: 'Health', icon: HeartPulse, to: '/health' },
    ],
  },
]

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <LayoutShell navigation={NAVIGATION}>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/users" element={<Users />} />
            <Route path="/usage" element={<Usage />} />
            <Route path="/costs" element={<Costs />} />
            <Route path="/health" element={<Health />} />
            <Route path="/messaging" element={<Messaging />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/permits" element={<Permits />} />
            <Route path="/jobs" element={<JobsQueues />} />
          </Routes>
        </LayoutShell>
      </ToastProvider>
    </ThemeProvider>
  )
}
