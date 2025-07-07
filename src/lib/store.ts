import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CalendarView = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';

interface AppState {
  // Calendar state
  calendarView: CalendarView;
  setCalendarView: (view: CalendarView) => void;
  
  // Selected event state
  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;
  
  // Form state
  isEventFormOpen: boolean;
  setEventFormOpen: (isOpen: boolean) => void;
  isEditMode: boolean;
  setEditMode: (isEdit: boolean) => void;
  
  // UI preferences
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  
  // Reset state
  resetState: () => void;
}

// Initial state
const initialState = {
  calendarView: 'dayGridMonth' as CalendarView,
  selectedEventId: null,
  isEventFormOpen: false,
  isEditMode: false,
  isDarkMode: false,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,
      
      // Calendar actions
      setCalendarView: (view) => set({ calendarView: view }),
      
      // Selected event actions
      setSelectedEventId: (id) => set({ selectedEventId: id }),
      
      // Form actions
      setEventFormOpen: (isOpen) => set({ isEventFormOpen: isOpen }),
      setEditMode: (isEdit) => set({ isEditMode: isEdit }),
      
      // UI preference actions
      isDarkMode: false,
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      
      // Reset state
      resetState: () => set(initialState),
    }),
    {
      name: 'epn-app-storage',
      partialize: (state) => ({
        calendarView: state.calendarView,
        isDarkMode: state.isDarkMode,
      }),
    }
  )
);

// Selector hooks for specific parts of state
export const useCalendarView = () => useAppStore((state) => state.calendarView);
export const useSelectedEventId = () => useAppStore((state) => state.selectedEventId);
export const useEventFormState = () => 
  useAppStore((state) => ({
    isOpen: state.isEventFormOpen,
    isEditMode: state.isEditMode,
    setOpen: state.setEventFormOpen,
    setEditMode: state.setEditMode,
  }));