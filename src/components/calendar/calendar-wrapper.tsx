'use client';

import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import rrulePlugin from '@fullcalendar/rrule';
import multiMonthPlugin from '@fullcalendar/multimonth';
import { EventClickArg, DateSelectArg, EventInput } from '@fullcalendar/core';
import { fr } from 'date-fns/locale';
import { format } from 'date-fns';
import { ExportOptionsModal, ExportOptions } from './export-options-modal';

interface CalendarWrapperProps {
  onEventClick?: (event: EventClickArg) => void;
  onDateSelect?: (selectInfo: DateSelectArg) => void;
  onRefresh?: (refreshFn: () => void) => void;
}

export const CalendarWrapper: React.FC<CalendarWrapperProps> = ({
  onEventClick,
  onDateSelect,
  onRefresh,
}) => {
  const [events, setEvents] = useState<EventInput[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [currentView, setCurrentView] = useState<string>('timeGridWeek');
  const [currentQuarter, setCurrentQuarter] = useState<number | null>(null);
  const calendarRef = useRef<FullCalendar>(null);
  const [showExportModal, setShowExportModal] = useState(false);

  // Fetch events from the API
  const fetchEvents = async (start: Date, end: Date) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/evenements?start=${start.toISOString()}&end=${end.toISOString()}`
      );
      const data = await response.json();

      if (data.success) {
        // Transform the events to the format expected by FullCalendar
        const formattedEvents = data.data.map((event: any) => ({
          id: event.id,
          title: event.titre,
          start: event.date_debut,
          end: event.date_fin,
          backgroundColor: event.atelier.couleur || '#3788d8',
          borderColor: event.atelier.couleur || '#3788d8',
          textColor: '#ffffff',
          extendedProps: {
            atelierId: event.atelier.id,
            porteurProjetId: event.porteurProjet.id,
            animateurs: event.animateurs,
            isRecurrent: event.isRecurrent || false,
            _isRecurrentEvent: event._isRecurrentEvent || false,
            regleRecurrenceId: event.regleRecurrenceId || null,
          },
        }));

        setEvents(formattedEvents);
      } else {
        console.error('Failed to fetch events:', data.error);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to manually refresh the calendar
  const refreshEvents = () => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      const start = calendarApi.view.activeStart;
      const end = calendarApi.view.activeEnd;
      fetchEvents(start, end);
    }
  };

  // Expose the refresh function to the parent component
  useEffect(() => {
    if (onRefresh) {
      onRefresh(refreshEvents);
    }
  }, [onRefresh]);

  // Debug function to log calendar state
  const debugCalendarState = (action: string) => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      console.log('------ DEBUG CALENDAR STATE ------');
      console.log('Action:', action);
      console.log('Current view:', currentView);
      console.log('Current date:', calendarApi.getDate());
      console.log('Current quarter:', currentQuarter);
      console.log('View start:', calendarApi.view.activeStart);
      console.log('View end:', calendarApi.view.activeEnd);
      console.log('--------------------------------');
    }
  };

  // Handle date range change
  const handleDatesSet = (dateInfo: any) => {
    const { start, end } = dateInfo;
    fetchEvents(start, end);
    setCurrentDate(start);
  };

  // Handle view change
  const handleViewChange = (viewName: string) => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.changeView(viewName);
      setCurrentView(viewName);
      
      // Reset currentQuarter when changing to a view other than multiMonth3
      if (viewName !== 'multiMonth3') {
        setCurrentQuarter(null);
      }
    }
  };

  // Get formatted title based on current view and date
  const getFormattedTitle = () => {
    console.log('getFormattedTitle called');
    console.log('currentView:', currentView);
    console.log('currentDate:', currentDate);
    console.log('currentQuarter:', currentQuarter);
    
    if (currentView === 'multiMonthYear') {
      return format(currentDate, 'yyyy', { locale: fr });
    } else if (currentView === 'multiMonth3') {
      // For quarterly view, show the quarter (e.g., "1er Trimestre 2025")
      // Quarter 1: Jan-Mar, Quarter 2: Apr-Jun, Quarter 3: Jul-Sep, Quarter 4: Oct-Dec
      
      // Use the currentQuarter state if available, otherwise calculate it from the month
      let quarter = currentQuarter;
      console.log('Initial quarter value:', quarter);
      
      if (quarter === null) {
        const month = currentDate.getMonth();
        console.log('Calculating quarter from month:', month);
        
        if (month >= 0 && month <= 2) {
          quarter = 1; // Jan-Mar
        } else if (month >= 3 && month <= 5) {
          quarter = 2; // Apr-Jun
        } else if (month >= 6 && month <= 8) {
          quarter = 3; // Jul-Sep
        } else {
          quarter = 4; // Oct-Dec
        }
        console.log('Calculated quarter:', quarter);
      }
      
      const title = `${quarter}${quarter === 1 ? 'er' : 'ème'} Trimestre ${format(currentDate, 'yyyy', { locale: fr })}`;
      console.log('Returning title:', title);
      return title;
    } else {
      return format(currentDate, 'MMMM yyyy', { locale: fr });
    }
  };

  // Handle event click
  const handleEventClick = (clickInfo: EventClickArg) => {
    if (onEventClick) {
      onEventClick(clickInfo);
    }
  };

  // Handle date selection
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    if (onDateSelect) {
      onDateSelect(selectInfo);
    }
  };

  // Show export options modal
  const exportToPDF = () => {
    setShowExportModal(true);
  };

  // Handle export with selected options
  const handleExportWithOptions = async (options: ExportOptions) => {
    if (!calendarRef.current) return;

    let start: Date;
    let end: Date;

    if (options.type === 'quarter') {
      // Calculate start and end dates for the selected quarter
      const quarterStartMonth = (options.quarter! - 1) * 3; // 0, 3, 6, or 9
      start = new Date(options.year!, quarterStartMonth, 1);
      
      // End date is the last day of the last month in the quarter
      const endMonth = quarterStartMonth + 3;
      end = new Date(options.year!, endMonth, 0);
      // Set time to end of day
      end.setHours(23, 59, 59, 999);
    } else {
      // Use custom date range
      start = options.startDate!;
      end = options.endDate!;
    }

    try {
      const response = await fetch(
        `/api/export?format=pdf&start=${start.toISOString()}&end=${end.toISOString()}`,
        {
          method: 'GET',
        }
      );

      if (response.ok) {
        // Create a blob from the PDF stream
        const blob = await response.blob();
        // Create a link to download the blob
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Format filename based on export type
        let filename;
        if (options.type === 'quarter') {
          filename = `planning-T${options.quarter}-${options.year}.pdf`;
        } else {
          filename = `planning-${format(start, 'yyyy-MM-dd')}-to-${format(end, 'yyyy-MM-dd')}.pdf`;
        }
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        console.error('Failed to export PDF');
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
    }
  };

  // Export calendar to ICS
  const exportToICS = async () => {
    if (!calendarRef.current) return;

    const calendarApi = calendarRef.current.getApi();
    const start = calendarApi.view.activeStart;
    const end = calendarApi.view.activeEnd;

    try {
      const response = await fetch(
        `/api/export?format=ics&start=${start.toISOString()}&end=${end.toISOString()}`,
        {
          method: 'GET',
        }
      );

      if (response.ok) {
        // Create a blob from the ICS stream
        const blob = await response.blob();
        // Create a link to download the blob
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `planning-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.ics`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        console.error('Failed to export ICS');
      }
    } catch (error) {
      console.error('Error exporting ICS:', error);
    }
  };

  return (
    <div className="calendar-wrapper">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold">
          {getFormattedTitle()}
        </h2>
      </div>
      <div className="calendar-actions mb-4 flex justify-between">
        <div>
          <button
            onClick={() => calendarRef.current?.getApi().today()}
            className="btn-primary mr-2 px-3 py-1 border-2 border-blue-500 hover:bg-blue-100"
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => {
              if (calendarRef.current) {
                console.log('Prev button clicked');
                debugCalendarState('BEFORE PREV');
                
                calendarRef.current.getApi().prev();
                
                // Update current date after navigation
                const newDate = calendarRef.current.getApi().getDate();
                setCurrentDate(newDate);
                
                // Update current quarter if in quarterly view
                if (currentView === 'multiMonth3') {
                  const month = newDate.getMonth();
                  let quarter;
                  if (month >= 0 && month <= 2) {
                    quarter = 1; // Jan-Mar
                  } else if (month >= 3 && month <= 5) {
                    quarter = 2; // Apr-Jun
                  } else if (month >= 6 && month <= 8) {
                    quarter = 3; // Jul-Sep
                  } else {
                    quarter = 4; // Oct-Dec
                  }
                  console.log('Setting quarter to:', quarter);
                  setCurrentQuarter(quarter);
                }
                
                debugCalendarState('AFTER PREV');
              }
            }}
            className="btn-secondary mr-2 px-3 py-1 border-2 border-gray-500 hover:bg-gray-100 text-lg font-bold"
            id="prev-button"
          >
            &lt;
          </button>
          <button
            onClick={() => {
              if (calendarRef.current) {
                console.log('Next button clicked');
                debugCalendarState('BEFORE NEXT');
                
                calendarRef.current.getApi().next();
                
                // Update current date after navigation
                const newDate = calendarRef.current.getApi().getDate();
                setCurrentDate(newDate);
                
                // Update current quarter if in quarterly view
                if (currentView === 'multiMonth3') {
                  const month = newDate.getMonth();
                  let quarter;
                  if (month >= 0 && month <= 2) {
                    quarter = 1; // Jan-Mar
                  } else if (month >= 3 && month <= 5) {
                    quarter = 2; // Apr-Jun
                  } else if (month >= 6 && month <= 8) {
                    quarter = 3; // Jul-Sep
                  } else {
                    quarter = 4; // Oct-Dec
                  }
                  console.log('Setting quarter to:', quarter);
                  setCurrentQuarter(quarter);
                }
                
                debugCalendarState('AFTER NEXT');
              }
            }}
            className="btn-secondary px-3 py-1 border-2 border-gray-500 hover:bg-gray-100 text-lg font-bold"
            id="next-button"
          >
            &gt;
          </button>
        </div>
        <div>
          <button
            onClick={() => handleViewChange('timeGridWeek')}
            className={`btn-secondary mr-2 ${
              currentView === 'timeGridWeek'
                ? 'border-2 border-blue-600 font-bold text-blue-600'
                : 'border border-gray-300'
            }`}
          >
            Semaine
          </button>
          <button
            onClick={() => handleViewChange('dayGridMonth')}
            className={`btn-secondary mr-2 ${
              currentView === 'dayGridMonth'
                ? 'border-2 border-blue-600 font-bold text-blue-600'
                : 'border border-gray-300'
            }`}
          >
            Mois
          </button>
          <button
            onClick={() => {
              // When clicking on trimester view, ensure we're showing the correct quarter
              if (calendarRef.current) {
                console.log('Trimestre button clicked');
                debugCalendarState('BEFORE TRIMESTRE');
                
                const calendarApi = calendarRef.current.getApi();
                const currentDate = calendarApi.getDate();
                const currentMonth = currentDate.getMonth();
                
                console.log('Current date before setting quarter:', currentDate);
                console.log('Current month:', currentMonth);
                
                // Determine which quarter we're in and the corresponding start month
                // Quarter 1: Jan(0)-Mar(2) → start month = 0 (Jan)
                // Quarter 2: Apr(3)-Jun(5) → start month = 3 (Apr)
                // Quarter 3: Jul(6)-Sep(8) → start month = 6 (Jul)
                // Quarter 4: Oct(9)-Dec(11) → start month = 9 (Oct)
                let quarterStartMonth;
                let quarter;
                
                if (currentMonth >= 0 && currentMonth <= 2) {
                  quarterStartMonth = 0; // Q1: Jan-Mar
                  quarter = 1;
                } else if (currentMonth >= 3 && currentMonth <= 5) {
                  quarterStartMonth = 3; // Q2: Apr-Jun
                  quarter = 2;
                } else if (currentMonth >= 6 && currentMonth <= 8) {
                  quarterStartMonth = 6; // Q3: Jul-Sep
                  quarter = 3;
                } else {
                  quarterStartMonth = 9; // Q4: Oct-Dec
                  quarter = 4;
                }
                
                console.log('Determined quarter:', quarter);
                console.log('Quarter start month:', quarterStartMonth);
                
                // Create a new date at the start of the quarter
                const quarterStart = new Date(currentDate.getFullYear(), quarterStartMonth, 1);
                console.log('Quarter start date:', quarterStart);
                
                calendarApi.gotoDate(quarterStart);
                setCurrentDate(quarterStart);
                setCurrentQuarter(quarter);
                
                console.log('Current date after setting quarter:', quarterStart);
                console.log('Current month after setting:', quarterStart.getMonth());
                console.log('Setting current quarter to:', quarter);
                
                handleViewChange('multiMonth3');
                
                debugCalendarState('AFTER TRIMESTRE');
              }
            }}
            className={`btn-secondary mr-2 ${
              currentView === 'multiMonth3'
                ? 'border-2 border-blue-600 font-bold text-blue-600'
                : 'border border-gray-300'
            }`}
          >
            Trimestre
          </button>
          <button
            onClick={() => {
              // When clicking on year view, ensure we're showing the full year starting from January
              if (calendarRef.current) {
                console.log('Année button clicked');
                debugCalendarState('BEFORE ANNÉE');
                
                const calendarApi = calendarRef.current.getApi();
                const currentDate = calendarApi.getDate();
                
                console.log('Current date before setting year:', currentDate);
                
                // Create a new date at January 1st of the current year
                const yearStart = new Date(currentDate.getFullYear(), 0, 1); // Month 0 = January
                console.log('Year start date:', yearStart);
                
                calendarApi.gotoDate(yearStart);
                setCurrentDate(yearStart);
                
                console.log('Current date after setting year:', yearStart);
                
                handleViewChange('multiMonthYear');
                
                debugCalendarState('AFTER ANNÉE');
              }
            }}
            className={`btn-secondary ${
              currentView === 'multiMonthYear'
                ? 'border-2 border-blue-600 font-bold text-blue-600'
                : 'border border-gray-300'
            }`}
          >
            Année
          </button>
        </div>
        <div>
          <button
            onClick={exportToPDF}
            className="btn-danger mr-2"
          >
            Exporter PDF
          </button>
          <button
            onClick={exportToICS}
            className="btn-primary"
          >
            Exporter ICS
          </button>
        </div>
      </div>

      <div className={`calendar-container ${isLoading ? 'opacity-50' : ''}`}>
        <style jsx global>{`
          .fc .fc-day-sun, .fc .fc-day-mon {
            background-color: #f5f5f5;
          }
        `}</style>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, rrulePlugin, multiMonthPlugin]}
          initialView="timeGridWeek"
          views={{
            multiMonth3: {
              type: 'multiMonth',
              duration: { months: 3 },
              titleFormat: { month: 'long' }
            },
            multiMonthYear: {
              type: 'multiMonth',
              duration: { months: 12 },
              titleFormat: { month: 'long' }
            }
          }}
          headerToolbar={false}
          locale="fr"
          monthStartFormat={{ month: 'long', year: 'numeric' }}
          firstDay={1} // Monday
          allDaySlot={false}
          slotMinTime="08:00:00"
          slotMaxTime="20:00:00"
          slotDuration="00:30:00"
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          events={events}
          datesSet={handleDatesSet}
          eventClick={handleEventClick}
          select={handleDateSelect}
          height="auto"
        />
      </div>
      
      {/* Export Options Modal */}
      <ExportOptionsModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportWithOptions}
        currentDate={currentDate}
        currentView={currentView}
        currentQuarter={currentQuarter}
      />
    </div>
  );
};