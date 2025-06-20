
import { toast } from '@/hooks/use-toast';

export const showSuccessToast = (title: string, description?: string) => {
  toast({
    title,
    description,
    variant: 'default',
  });
};

export const showErrorToast = (title: string, description?: string) => {
  toast({
    title,
    description: description || 'Please try again or contact support if the problem persists.',
    variant: 'destructive',
  });
};

export const showWarningToast = (title: string, description?: string) => {
  toast({
    title,
    description,
    variant: 'default',
  });
};

export const showInfoToast = (title: string, description?: string) => {
  toast({
    title,
    description,
    variant: 'default',
  });
};

// Common toast messages
export const commonToasts = {
  success: {
    saved: () => showSuccessToast('Saved', 'Your changes have been saved successfully.'),
    created: (item: string) => showSuccessToast('Created', `${item} has been created successfully.`),
    updated: (item: string) => showSuccessToast('Updated', `${item} has been updated successfully.`),
    deleted: (item: string) => showSuccessToast('Deleted', `${item} has been deleted successfully.`),
    copied: () => showSuccessToast('Copied', 'Copied to clipboard successfully.'),
  },
  error: {
    generic: () => showErrorToast('Error', 'Something went wrong. Please try again.'),
    network: () => showErrorToast('Network Error', 'Please check your internet connection and try again.'),
    unauthorized: () => showErrorToast('Unauthorized', 'You do not have permission to perform this action.'),
    notFound: (item: string) => showErrorToast('Not Found', `${item} could not be found.`),
    validation: (message: string) => showErrorToast('Validation Error', message),
    timeout: () => showErrorToast('Timeout', 'The request took too long. Please try again.'),
  },
  loading: {
    saving: () => showInfoToast('Saving', 'Please wait while we save your changes...'),
    loading: (item: string) => showInfoToast('Loading', `Loading ${item}...`),
  }
};
