import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts';
import { 
  IconDashboard, 
  IconCase, 
  IconMill, 
  IconInvoice, 
  IconSettings,
  IconUser,
  IconChevronRight,
  IconChevronDown,
  IconTruck
} from './LabIcons';
import styles from './Sidebar.module.css';

const Sidebar = () => {
  const { hasPermission } = useAuth();
  const location = useLocation();
  const [expanded, setExpanded] = useState({});

  const navItems = [
    { to: "/", label: "Dashboard", icon: <IconDashboard />, permission: null },
    { to: "/cases", label: "Case Management", icon: <IconCase />, permission: null },
    
    {
      id: "production-suite",
      label: "Production",
      icon: <IconMill />,
      permission: null,
      children: [
        { to: "/production/queue", label: "Floor Queue" },
        { to: "/production/procurement", label: "Procurement" }
      ]
    },

    { 
      id: "logistics",
      label: "Logistics", 
      icon: <IconTruck />, 
      permission: "LOGISTICS_VIEW",
      children: [
        { to: "/logistics/planner", label: "Route Planning" },
        { to: "/logistics/scheduler", label: "Delivery Scheduler" },
        { to: "/logistics/driver", label: "Driver View" }
      ]
    },
    
    { 
      id: "finance",
      label: "Finance", 
      icon: <IconInvoice />, 
      permission: "FINANCE_VIEW",
      children: [
        { to: "/finance/invoices", label: "Invoices & Billing" },
        { to: "/finance/payments", label: "Payment History" }
      ]
    },
    
    { 
      id: "lab-admin",
      label: "Lab Admin", 
      icon: <IconSettings />, 
      permission: "CASE_MANAGE",
      children: [
        { to: "/lab-settings/general", label: "General Info" },
        { to: "/lab-settings/practices", label: "Practices" }, // Added Practices
        { to: "/lab-settings/catalog", label: "Product Catalog" },
        { to: "/lab-settings/financials", label: "Financial Config" },
        { to: "/lab-settings/price-lists", label: "Price Lists" },
        { to: "/lab-settings/workflows", label: "Workflows" },
      ]
    },
    
    { 
      id: "user-settings", 
      label: "Account", 
      icon: <IconUser />, 
      permission: null,
      children: [
        { to: "/settings/profile", label: "My Profile" },
        { to: "/settings/preferences", label: "Preferences" }
      ]
    } 
  ];

  useEffect(() => {
    navItems.forEach(item => {
      if (item.children) {
        const isChildActive = item.children.some(child => location.pathname.startsWith(child.to));
        if (isChildActive) {
          setExpanded(prev => ({ ...prev, [item.id]: true }));
        }
      }
    });
  }, [location.pathname]); 

  const toggleGroup = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav}>
        <ul className={styles.navList}>
          {navItems.map((item) => {
            if (item.permission && !hasPermission(item.permission)) return null;

            if (item.children) {
              const isOpen = expanded[item.id];
              const isGroupActive = item.children.some(child => location.pathname.startsWith(child.to));

              return (
                <li key={item.id}>
                  <button 
                    className={`${styles.menuButton} ${isGroupActive ? styles.groupActive : ''}`} 
                    onClick={() => toggleGroup(item.id)}
                    aria-expanded={isOpen}
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