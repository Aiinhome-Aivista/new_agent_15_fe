import React, { forwardRef } from 'react';
import styles from './Input.module.css';

export const Input = forwardRef(({
  label,
  error,
  id,
  className = '',
  wrapperClassName = '',
  ...props
}, ref) => {
  const inputId = id || Math.random().toString(36).substring(7);
  
  return (
    <div className={`${styles.inputWrapper} ${error ? styles.error : ''} ${wrapperClassName}`}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`${styles.input} ${className}`}
        {...props}
      />
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  );
});

Input.displayName = 'Input';
