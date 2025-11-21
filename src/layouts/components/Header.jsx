import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, useTheme } from '../../contexts';
import { 
  IconMenu, 
  IconSearch, 
  IconUser, 
  IconLogout, 
  IconSettings,
  IconMoon,
  IconSun
} from './LabIcons';
import styles from './Header.module.css';

const Header = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Helper to get initials if no avatar is present
  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <header className={styles.header}>
      {/* --- Left: Toggle & Brand --- */}
      <div className={styles.leftSection}>
        <button 
          className={`icon-button ${styles.menuBtn}`} 
          onClick={onToggleSidebar}
          aria-label="Toggle Sidebar"
        >
          <IconMenu />
        </button>
        
        <div className={styles.brand}>
          <span className={styles.brandText}>JS Lab Portal</span>
        </div>
      </div>

      {/* --- Center: Search Bar (Hidden on Mobile) --- */}
      <div className={styles.centerSection}>
        <div className={styles.searchWrapper}>
          <IconSearch className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search cases, doctors, or invoices..." 
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* --- Right: User & Actions --- */}
      <div className={styles.rightSection}>
        
        {/* Theme Toggle */}
        <button 
          className="icon-button" 
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <IconMoon /> : <IconSun />}
        </button>

        {/* User Dropdown */}
        <div className={styles.userMenuWrapper}>
          <button 
            className={styles.userBtn}
            onClick={() => setIsUserMenuOpen(prev => !prev)}
            // Delay blur to allow clicking links inside dropdown
            onBlur={() => setTimeout(() => setIsUserMenuOpen(false), 200)}
          >
            <div className={styles.avatar}>
              {user?.profile?.avatarUrl ? (
                <img src={user.profile.avatarUrl} alt="User Avatar" />
              ) : (
                <span>{getInitials(user?.profile?.firstName, user?.profile?.lastName)}</span>
              )}
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>
                {user?.profile?.firstName} {user?.profile?.lastName}
              </span>
              <span className={styles.userRole}>{user?.roleName || 'Staff'}</span>
            </div>
          </button>

          {/* Dropdown Content */}
          {isUserMenuOpen && (
            <div className={`card ${styles.dropdown}`}>
              <div className={styles.dropdownHeader}>
                <strong>Signed in as</strong>
                <span>{user?.email}</span>
              </div>
              
              <ul className={styles.dropdownList}>
                <li>
                  <Link to="/settings">
                    <IconSettings /> Settings
                  </Link>
                </li>
              </ul>

              <div className={styles.dropdownFooter}>
                <button 
                  className={styles.logoutBtn}
                  onClick={handleLogout}
                >
                  <IconLogout /> Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;