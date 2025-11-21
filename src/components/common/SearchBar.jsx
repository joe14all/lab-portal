import React from 'react';
import { IconSearch } from '../../layouts/components/LabIcons';
import styles from './SearchBar.module.css';

const SearchBar = ({ 
  value, 
  onChange, 
  placeholder = "Search...", 
  className = '' 
}) => {
  return (
    <div className={`${styles.wrapper} ${className}`}>
      {/* Icon positioned absolutely; pointer-events-none ensures clicks go through to input */}
      <IconSearch className={styles.icon} aria-hidden="true" />
      
      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={styles.input}
        autoComplete="off"
      />
    </div>
  );
};

export default SearchBar;