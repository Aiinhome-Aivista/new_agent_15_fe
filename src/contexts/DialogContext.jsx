import React, { createContext, useContext, useState, useCallback } from 'react';
import { CustomDialog } from '../components/CustomDialog';

const DialogContext = createContext();

export function useDialog() {
  return useContext(DialogContext);
}

export function DialogProvider({ children }) {
  const [dialogState, setDialogState] = useState({
    open: false,
    type: 'alert',
    message: '',
    defaultValue: '',
    resolve: null
  });

  const showAlert = useCallback((message) => {
    return new Promise((resolve) => {
      setDialogState({
        open: true,
        type: 'alert',
        message,
        resolve
      });
    });
  }, []);

  const showConfirm = useCallback((message) => {
    return new Promise((resolve) => {
      setDialogState({
        open: true,
        type: 'confirm',
        message,
        resolve
      });
    });
  }, []);

  const showPrompt = useCallback((message, defaultValue = '') => {
    return new Promise((resolve) => {
      setDialogState({
        open: true,
        type: 'prompt',
        message,
        defaultValue,
        resolve
      });
    });
  }, []);

  const handleClose = (value) => {
    setDialogState((prev) => {
      if (prev.resolve) prev.resolve(value);
      return { ...prev, open: false };
    });
  };

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
      {children}
      <CustomDialog
        open={dialogState.open}
        type={dialogState.type}
        message={dialogState.message}
        defaultValue={dialogState.defaultValue}
        onClose={handleClose}
      />
    </DialogContext.Provider>
  );
}
