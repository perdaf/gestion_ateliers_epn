import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines multiple class names using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date using date-fns with French locale
 */
export function formatDate(date: Date | string, formatStr: string = 'PPP'): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj)) return 'Date invalide';
  
  return format(dateObj, formatStr, { locale: fr });
}

/**
 * Formats a time string (HH:mm) to a more readable format
 */
export function formatTime(timeStr: string): string {
  if (!timeStr || !timeStr.includes(':')) return timeStr;
  
  const [hours, minutes] = timeStr.split(':');
  return `${hours}h${minutes !== '00' ? minutes : ''}`;
}

/**
 * Converts a date to a time string (HH:mm)
 */
export function dateToTimeString(date: Date): string {
  if (!date || !isValid(date)) return '';
  
  return format(date, 'HH:mm');
}

/**
 * Truncates a string to a specified length and adds ellipsis if needed
 */
export function truncateString(str: string, maxLength: number = 50): string {
  if (!str || str.length <= maxLength) return str;
  
  return `${str.substring(0, maxLength)}...`;
}

/**
 * Generates a random color in hex format
 */
export function generateRandomColor(): string {
  const letters = '0123456789ABCDEF';
  let color = '#';
  
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  
  return color;
}

/**
 * Converts a frequency string to a human-readable format
 */
export function formatFrequency(frequency: string): string {
  const frequencyMap: Record<string, string> = {
    'QUOTIDIENNE': 'Quotidienne',
    'HEBDOMADAIRE': 'Hebdomadaire',
    'MENSUELLE': 'Mensuelle'
  };
  
  return frequencyMap[frequency] || frequency;
}

/**
 * Converts a status string to a human-readable format
 */
export function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'BROUILLON': 'Brouillon',
    'CONFIRME': 'Confirmé',
    'ANNULE': 'Annulé'
  };
  
  return statusMap[status] || status;
}

/**
 * Converts a role string to a human-readable format
 */
export function formatRole(role: string): string {
  const roleMap: Record<string, string> = {
    'PORTEUR_PROJET': 'Porteur de projet',
    'ANIMATEUR': 'Animateur',
    'ADMIN': 'Administrateur'
  };
  
  return roleMap[role] || role;
}