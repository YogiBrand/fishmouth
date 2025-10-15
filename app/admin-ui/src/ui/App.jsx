import React from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import Overview from './pages/Overview.jsx'
import Users from './pages/Users.jsx'
import Usage from './pages/Usage.jsx'
import Costs from './pages/Costs.jsx'
import Health from './pages/Health.jsx'
import Messaging from './pages/Messaging.jsx'
import JobsQueues from './pages/JobsQueues.jsx'
import './App.css'

const Nav = () => (
  <nav className="nav">
    <a className="brand">Admin</a>
    <ul>
      <li><NavLink to="/">Overview</NavLink></li>
      <li><NavLink to="/users">Users</NavLink></li>
      <li><NavLink to="/usage">Usage</NavLink></li>
      <li><NavLink to="/costs">Costs</NavLink></li>
      <li><NavLink to="/health">Health</NavLink></li>
      <li><NavLink to="/messaging">Messaging</NavLink></li>
      <li><NavLink to="/jobs">Jobs</NavLink></li>
    </ul>
  </nav>
)

export default function App(){
  return (
    <div className="layout">
      <Nav />
      <main className="content">
        <Routes>
          <Route path="/" element={<Overview/>} />
          <Route path="/users" element={<Users/>} />
          <Route path="/usage" element={<Usage/>} />
          <Route path="/costs" element={<Costs/>} />
          <Route path="/health" element={<Health/>} />
          <Route path="/messaging" element={<Messaging/>} />
          <Route path="/jobs" element={<JobsQueues/>} />
        </Routes>
      </main>
    </div>
  )
}
