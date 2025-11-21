import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts';
import SearchBar from '../../components/common/SearchBar';
import { 
  IconMenu, 
  IconSettings,
  IconLogout
} from './LabIcons';
import styles from './Header.module.css';

const Header = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  return (
    <header className={styles.header}>
      {/* Left: Brand */}
      <div className={styles.leftSection}>
        <button 
          className={`icon-button ${styles.menuBtn}`} 
          onClick={onToggleSidebar}
          aria-label="Open Menu"
        >
          <IconMenu />
        </button>
        
        <div className={styles.brand}>
          <div className={styles.logoPlaceholder}>JS</div>
          <span className={styles.brandText}>Lab Portal</span>
        </div>
      </div>

      {/* Center: Search Component */}
      <div className={styles.centerSection}>
        <div className={styles.searchWrapper}>
          <SearchBar placeholder="Search cases, doctors, or invoices..." />
        </div>
      </div>

      {/* Right: Profile */}
      <div className={styles.rightSection}>
        <div className={styles.userMenuWrapper}>
          <button 
            className={`${styles.userBtn} ${isUserMenuOpen ? styles.active : ''}`}
            onClick={() => setIsUserMenuOpen(prev => !prev)}
            onBlur={() => setTimeout(() => setIsUserMenuOpen(false), 200)}
          >
            <div className={styles.userInfo}>
              <span className={styles.userName}>
                {user?.profile?.firstName} {user?.profile?.lastName}
              </span>
              <span className={styles.userRole}>{user?.roleName || 'Staff'}</span>
            </div>
            
            <div className={styles.avatar}>
              {user?.profile?.avatarUrl ? (
                <img src={user.profile.avatarUrl} alt="Profile" />
              ) : (
                <span>{getInitials(user?.profile?.firstName, user?.profile?.lastName)}</span>
              )}
            </div>
          </button>

          {/* Dropdown */}
          <div className={`${styles.dropdown} ${isUserMenuOpen ? styles.show : ''}`}>
            <div className={styles.dropdownHeader}>
              <strong>Signed in as</strong>
              <span className={styles.emailText}>{user?.email}</span>
            </div>
            <ul className={styles.dropdownList}>
              <li>
                <Link to="/settings"><IconSettings /> Account Settings</Link>
              </li>
            </ul>
            <div className={styles.dropdownFooter}>
              <button className={styles.logoutBtn} onClick={logout}>
                <IconLogout /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;