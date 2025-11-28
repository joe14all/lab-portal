import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts';
import { 
  IconDashboard, 
  IconCase, 
  IconMicroscope, 
  IconInvoice, 
  IconSettings,
  IconUser,
  IconChevronRight,
  IconChevronDown,
  IconDrill, // For Product Catalog if desired
  IconLayers // For Workflows/Addons if desired
} from './LabIcons';
import styles from './Sidebar.module.css';

const Sidebar = () => {
  const { hasPermission } = useAuth();
  const location = useLocation();
  const [expanded, setExpanded] = useState({});

  // Navigation Structure
  const navItems = [
    { to: "/", label: "Dashboard", icon: <IconDashboard />, permission: null },
    { to: "/cases", label: "Case Management", icon: <IconCase />, permission: null },
    { to: "/production", label: "Production", icon: <IconMicroscope />, permission: null },
    { to: "/finance", label: "Finance", icon: <IconInvoice />, permission: "FINANCE_VIEW" },
    
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

  // Auto-expand menu if we are currently on a sub-route (e.g., on page refresh)
  useEffect(() => {
    navItems.forEach(item => {
      if (item.children) {
        const isChildActive = item.children.some(child => location.pathname.startsWith(child.to));
        if (isChildActive) {
          setExpanded(prev => ({ ...prev, [item.id]: true }));
        }
      }
    });
  }, []); 

  const toggleGroup = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav}>
        <ul className={styles.navList}>
          {navItems.map((item) => {
            if (item.permission && !hasPermission(item.permission)) return null;

            // 1. RENDER EXPANDABLE GROUP
            if (item.children) {
              const isOpen = expanded[item.id];
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
                    {isOpen ? <IconChevronDown width="14" /> : <IconChevronRight width="14" />}
                  </button>

                  {isOpen && (
                    <ul className={styles.subList}>
                      {item.children.map((child) => (
                        <li key={child.to}>
                          <NavLink
                            to={child.to}
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

            // 2. RENDER STANDARD ITEM
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) => 
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
        <p>© 2025 JS Lab</p>
      </div>
    </aside>
  );
};

export default Sidebar;