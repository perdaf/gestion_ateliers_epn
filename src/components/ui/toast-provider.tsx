'use client';

import { Toaster, toast } from 'sonner';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: 'white',
          color: 'black',
          border: '1px solid #e2e8f0',
        },
        className: 'my-toast-class',
      }}
    />
  );
}

// Helper functions for showing different types of toasts
export const showToast = {
  success: (message: string, description?: string) => {
    toast.success(message, {
      description,
      style: { borderLeft: '4px solid #10b981' },
    });
  },
  error: (message: string, description?: string) => {
    toast.error(message, {
      description,
      style: { borderLeft: '4px solid #ef4444' },
    });
  },
  warning: (message: string, description?: string) => {
    toast.warning(message, {
      description,
      style: { borderLeft: '4px solid #f59e0b' },
    });
  },
  info: (message: string, description?: string) => {
    toast.info(message, {
      description,
      style: { borderLeft: '4px solid #3b82f6' },
    });
  },
  promise: <T,>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
    }: {
      loading: string;
      success: (data: T) => string;
      error: (error: Error) => string;
    }
  ) => {
    return toast.promise(promise, {
      loading,
      success,
      error,
    });
  },
};