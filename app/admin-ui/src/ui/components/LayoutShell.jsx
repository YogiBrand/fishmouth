import React from 'react'
import { NavLink } from 'react-router-dom'
import { useTheme } from '../theme/ThemeProvider.jsx'
import { Moon, Sun, ServerCog } from 'lucide-react'

export default function LayoutShell({ navigation, children }) {
  const { theme, toggleTheme } = useTheme()

  const initials = 'FM'

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <h1>Fishmouth Admin</h1>
          <p className="sidebar__descriptor">Operational command for messaging, telemetry, and billing.</p>
        </div>
        <nav className="sidebar__nav">
          {navigation.map((section) => (
            <div key={section.label} className="nav-section">
              <div className="nav-section__label">{section.label}</div>
              <ul className="nav-section__list">
                {section.items.map((item) => (
                  <li key={item.to} className="nav-item">
                    <NavLink
                      to={item.to}
                      className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                      end={item.exact}
                    >
                      {item.icon && <item.icon size={16} />}
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="nav-footer">
          <div>
            <strong>Connected Stack</strong>
            <div>Docker services synced</div>
          </div>
          <div className="surface-muted">
            <ServerCog size={14} />
            &nbsp;Monitor Postgres, Redis, telemetry, billing gateways
          </div>
        </div>
      </aside>
      <section className="content">
        <header className="topbar">
          <div className="topbar__title">Control Surface</div>
          <div className="topbar__actions">
            <span className="environment-badge">Local</span>
            <button type="button" className="theme-toggle" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
            <div className="user-chip">
              <div className="user-chip__avatar">{initials}</div>
              <span>Ops Engineer</span>
            </div>
          </div>
        </header>
        <main className="content__inner">{children}</main>
      </section>
    </div>
  )
}
