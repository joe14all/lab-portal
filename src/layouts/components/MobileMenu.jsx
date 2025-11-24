import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts';
import { 
  IconDashboard, 
  IconCase, 
  IconMicroscope, 
  IconInvoice, 
  IconSettings,
  IconClose,
  IconUser // Import User Icon
} from './LabIcons';
import styles from './MobileMenu.module.css';

const MobileMenu = ({ isOpen, onClose }) => {
  const { hasPermission } = useAuth();

  const navItems = [
    { to: "/", label: "Dashboard", icon: <IconDashboard />, permission: null },
    { to: "/cases", label: "Case Management", icon: <IconCase />, permission: null },
    { to: "/production", label: "Production", icon: <IconMicroscope />, permission: null },
    { to: "/finance", label: "Finance & Billing", icon: <IconInvoice />, permission: "FINANCE_VIEW" },
    
    // NEW: Lab Admin Link (Restricted to Managers/Admins)
    { to: "/lab-settings", label: "Lab Admin", icon: <IconSettings />, permission: "CASE_MANAGE" },
    
    // NEW: User Profile Link (Accessible to everyone)
    { to: "/settings", label: "My Profile", icon: <IconUser />, permission: null }
  ];

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`${styles.backdrop} ${isOpen ? styles.open : ''}`} 
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside className={`${styles.drawer} ${isOpen ? styles.open : ''}`}>
        <div className={styles.header}>
          <span className={styles.brand}>Menu</span>
          <button className="icon-button" onClick={onClose}>
            <IconClose />
          </button>
        </div>

        <nav className={styles.nav}>
          <ul className={styles.navList}>
            {navItems.map((item) => {
              if (item.permission && !hasPermission(item.permission)) return null;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={onClose} // Close on click
                    className={({ isActive }) => 
                      // Logic: Keep active even if in sub-routes (e.g. /lab-settings/general)
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
          <p>JS Lab Portal v1.0</p>
        </div>
      </aside>
    </>
  );
};

export default MobileMenu;