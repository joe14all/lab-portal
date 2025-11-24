import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts';
import { 
  IconDashboard, 
  IconCase, 
  IconMicroscope, 
  IconInvoice, 
  IconSettings,
  IconUser // Import User Icon
} from './LabIcons';
import styles from './Sidebar.module.css';

const Sidebar = () => {
  const { hasPermission } = useAuth();

  const navItems = [
    { to: "/", label: "Dashboard", icon: <IconDashboard />, permission: null },
    { to: "/cases", label: "Case Management", icon: <IconCase />, permission: null },
    { to: "/production", label: "Production", icon: <IconMicroscope />, permission: null },
    { to: "/finance", label: "Finance", icon: <IconInvoice />, permission: "FINANCE_VIEW" },
    
    // NEW: Lab Admin Link
    { to: "/lab-settings", label: "Lab Admin", icon: <IconSettings />, permission: "CASE_MANAGE" },
    
    // NEW: User Profile Link
    { to: "/settings", label: "My Profile", icon: <IconUser />, permission: null } 
  ];

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav}>
        <ul className={styles.navList}>
          {navItems.map((item) => {
            if (item.permission && !hasPermission(item.permission)) return null;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) => 
                    // Use "startsWith" check for lab settings to keep active state on sub-pages
                    `${styles.navLink} ${isActive || (item.to !== '/' && window.location.pathname.startsWith(item.to)) ? styles.active : ''}`
                  }
                  end={item.to === "/"}
                >
                  <span className={styles.iconWrapper}>{item.icon}</span>
                  <span className={styles.labelText}>{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={styles.footer}>
        <p>© 2025 JS Lab</p>
      </div>
    </aside>
  );
};

export default Sidebar;