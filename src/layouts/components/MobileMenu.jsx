import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts';
import { 
  IconDashboard, 
  IconCase, 
  IconMicroscope, 
  IconInvoice, 
  IconSettings,
  IconClose,
  IconUser,
  IconChevronRight,
  IconChevronDown
} from './LabIcons';
import styles from './MobileMenu.module.css';

const MobileMenu = ({ isOpen, onClose }) => {
  const { hasPermission } = useAuth();
  const location = useLocation();
  const [expanded, setExpanded] = useState({});

  const navItems = [
    { to: "/", label: "Dashboard", icon: <IconDashboard />, permission: null },
    { to: "/cases", label: "Case Management", icon: <IconCase />, permission: null },
    { to: "/production", label: "Production", icon: <IconMicroscope />, permission: null },
    { to: "/finance", label: "Finance & Billing", icon: <IconInvoice />, permission: "FINANCE_VIEW" },
    
    // Expandable Group: Lab Admin
    { 
      id: "lab-admin",
      label: "Lab Admin", 
      icon: <IconSettings />, 
      permission: "CASE_MANAGE",
      children: [
        { to: "/lab-settings/general", label: "General Info" },
        { to: "/lab-settings/catalog", label: "Product Catalog" },
        { to: "/lab-settings/financials", label: "Financial Config" },
        { to: "/lab-settings/price-lists", label: "Price Lists" },
        { to: "/lab-settings/workflows", label: "Workflows" },
      ]
    },
    
    { to: "/settings", label: "My Profile", icon: <IconUser />, permission: null }
  ];

  // Auto-expand if currently on a sub-route when menu opens
  useEffect(() => {
    if (isOpen) {
      navItems.forEach(item => {
        if (item.children) {
          const isChildActive = item.children.some(child => location.pathname.startsWith(child.to));
          if (isChildActive) {
            setExpanded(prev => ({ ...prev, [item.id]: true }));
          }
        }
      });
    }
  }, [isOpen, location.pathname]);

  const toggleGroup = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

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

              // 1. RENDER EXPANDABLE GROUP
              if (item.children) {
                const isGroupOpen = expanded[item.id];
                const isGroupActive = item.children.some(child => location.pathname.startsWith(child.to));

                return (
                  <li key={item.id}>
                    <button 
                      className={`${styles.menuButton} ${isGroupActive ? styles.groupActive : ''}`} 
                      onClick={() => toggleGroup(item.id)}
                    >
                      <div className={styles.labelGroup}>
                        <span className={styles.iconWrapper}>{item.icon}</span>
                        <span className={styles.labelText}>{item.label}</span>
                      </div>
                      {isGroupOpen ? <IconChevronDown width="14" /> : <IconChevronRight width="14" />}
                    </button>

                    {isGroupOpen && (
                      <ul className={styles.subList}>
                        {item.children.map((child) => (
                          <li key={child.to}>
                            <NavLink
                              to={child.to}
                              onClick={onClose} // Close drawer when navigating
                              className={({ isActive }) => 
                                `${styles.subLink} ${isActive ? styles.subLinkActive : ''}`
                              }
                            >
                              {child.label}
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              }

              // 2. RENDER STANDARD LINK
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={onClose} // Close on click
                    className={({ isActive }) => 
                      // Use startsWith logic only if it's not root, to prevent Dashboard sticking active
                      `${styles.navLink} ${isActive ? styles.active : ''}`
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