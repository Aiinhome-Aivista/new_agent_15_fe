import React from 'react';
import styles from './Card.module.css';

export const Card = ({ children, className = '' }) => (
  <div className={`${styles.card} ${className}`}>
    {children}
  </div>
);

Card.Header = ({ children, className = '' }) => (
  <div className={`${styles.header} ${className}`}>
    {children}
  </div>
);

Card.Title = ({ children, className = '' }) => (
  <h3 className={`${styles.title} ${className}`}>
    {children}
  </h3>
);

Card.Description = ({ children, className = '' }) => (
  <p className={`${styles.description} ${className}`}>
    {children}
  </p>
);

Card.Content = ({ children, className = '' }) => (
  <div className={`${styles.content} ${className}`}>
    {children}
  </div>
);

Card.Footer = ({ children, className = '' }) => (
  <div className={`${styles.footer} ${className}`}>
    {children}
  </div>
);
