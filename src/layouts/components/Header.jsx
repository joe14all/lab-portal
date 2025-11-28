import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts';
import SearchBar from '../../components/common/SearchBar';
import { 
  IconMenu, 
  IconSettings,
  IconLogout,
  IconChevronDown
} from './LabIcons';
import styles from './Header.module.css';

const Header = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const getInitials = () => {
    const first = user?.profile?.firstName?.[0] || '';
    const last = user?.profile?.lastName?.[0] || '';
    return (first + last).toUpperCase();
  };

  const hasAvatar = user?.profile?.avatarUrl && !imgError;

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
        
        <Link to="/" className={styles.brand}>
          <div className={styles.logoPlaceholder}>JS</div>
          <span className={styles.brandText}>Lab Portal</span>
        </Link>
      </div>

      {/* Center: Search Component */}
      <div className={styles.centerSection}>
        <div className={styles.searchWrapper}>
          <SearchBar placeholder="Search cases, doctors, or invoices..." />
        </div>
      </div>

      {/* Right: Profile */}
      <div className={styles.rightSection}>
        <div 
          className={styles.userMenuWrapper}
          onBlur={(e) => {
            // Check if the new focus target is still inside the wrapper
            if (!e.currentTarget.contains(e.relatedTarget)) {
              setIsUserMenuOpen(false);
            }
          }}
        >
          <button 
            className={`${styles.userBtn} ${isUserMenuOpen ? styles.active : ''}`}
            onClick={() => setIsUserMenuOpen(prev => !prev)}
            aria-expanded={isUserMenuOpen}
            aria-haspopup="true"
          >
            <div className={styles.userInfo}>
              <span className={styles.userName}>
                {user?.profile?.firstName} {user?.profile?.lastName}
              </span>
              <span className={styles.userRole}>{user?.roleName || 'Staff'}</span>
            </div>
            
            <div className={styles.avatar}>
              {hasAvatar ? (
                <img 
                  src={user.profile.avatarUrl} 
                  alt="Profile" 
                  onError={() => setImgError(true)}
                />
              ) : (
                <span className={styles.initials}>{getInitials()}</span>
              )}
            </div>

            <IconChevronDown 
              width="16" 
              className={`${styles.chevron} ${isUserMenuOpen ? styles.chevronRotate : ''}`} 
            />
          </button>

          {/* Dropdown */}
          <div className={`${styles.dropdown} ${isUserMenuOpen ? styles.show : ''}`}>
            <div className={styles.dropdownHeader}>
              <strong>Signed in as</strong>
              <span className={styles.emailText}>{user?.email}</span>
            </div>
            
            <ul className={styles.dropdownList}>
              <li>
                <Link 
                  to="/settings/profile" 
                  className={styles.menuLink}
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <IconSettings width="16" /> Account Settings
                </Link>
              </li>
            </ul>
            
            <div className={styles.dropdownFooter}>
              <button className={styles.logoutBtn} onClick={logout}>
                <IconLogout width="16" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;