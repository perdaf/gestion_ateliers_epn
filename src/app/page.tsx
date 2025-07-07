'use client';

import React, { useState, useRef } from 'react';
import { CalendarWrapper } from '@/components/calendar/calendar-wrapper';
import { EventForm } from '@/components/forms/event-form';
import EventDetails from '@/components/events/event-details';
import { EventClickArg, DateSelectArg } from '@fullcalendar/core';
import { format } from 'date-fns';
import { Modal } from '@/components/ui/modal';
import { useAppStore } from '@/lib/store';

export default function Home() {
  const [showEventForm, setShowEventForm] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [eventFormData, setEventFormData] = useState<any>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const refreshCalendarRef = useRef<(() => void) | null>(null);
  
  // Use the app store to manage edit mode
  const isEditMode = useAppStore((state) => state.isEditMode);
  const setEditMode = useAppStore((state) => state.setEditMode);
  const setEventFormOpen = useAppStore((state) => state.setEventFormOpen);
  const isEventFormOpen = useAppStore((state) => state.isEventFormOpen);

  // Effect to handle edit mode changes
  React.useEffect(() => {
    if (isEditMode && selectedEventId) {
      // When edit mode is activated from event details
      setShowEventDetails(false);
      setShowEventForm(true);
    }
  }, [isEditMode, selectedEventId]);

  // Effect to handle event form open state changes
  React.useEffect(() => {
    setShowEventForm(isEventFormOpen);
  }, [isEventFormOpen]);

  // Handle event click (show event details)
  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event;
    
    // Debug: Log the event details
    console.log('Event clicked:', {
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      extendedProps: event.extendedProps
    });
    
    // Set editing mode
    setIsEditing(true);
    
    // Check if this is a recurring event by ID format
    const isRecurrentIdFormat = event.id.includes('-') && /\d{4}-\d{2}-\d{2}T/.test(event.id);
    let regleRecurrenceId = event.extendedProps.regleRecurrenceId;
    
    // If it's a recurring event by ID format but no regleRecurrenceId is set, extract it
    if (isRecurrentIdFormat && !regleRecurrenceId) {
      const parts = event.id.split('-');
      regleRecurrenceId = parts[0];
      console.log('Extracted regleRecurrenceId from event ID:', regleRecurrenceId);
    }
    
    // Determine if this is a recurring event
    const isRecurrent = event.extendedProps.isRecurrent ||
                        event.extendedProps._isRecurrentEvent ||
                        isRecurrentIdFormat ||
                        !!regleRecurrenceId;
    
    // Set the selected event ID and show the details
    setSelectedEventId(event.id);
    setShowEventDetails(true);
    
    // Also prepare the form data in case the user wants to edit
    setEventFormData({
      id: event.id,
      titre: event.title,
      date_debut: event.start,
      date_fin: event.end,
      atelierId: event.extendedProps.atelierId,
      porteurProjetId: event.extendedProps.porteurProjetId,
      // Add porteurProjetIds array for validation
      porteurProjetIds: event.extendedProps.porteurProjetId ? [event.extendedProps.porteurProjetId] : [],
      animateursIds: event.extendedProps.animateurs.map((a: any) => a.agentId),
      isRecurrent: isRecurrent,
      _isRecurrentEvent: isRecurrent,
      regleRecurrenceId: regleRecurrenceId
    });
    
    // Debug: Log the event data being prepared
    console.log('Event data prepared for form:', {
      id: event.id,
      isRecurrent: isRecurrent,
      _isRecurrentEvent: isRecurrent,
      regleRecurrenceId: regleRecurrenceId
    });
  };

  // Handle date selection (create event)
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setEventFormData({
      titre: '',
      date_debut: selectInfo.start,
      date_fin: selectInfo.end,
      atelierId: '',
      porteurProjetId: '',
      porteurProjetIds: [], // Add empty porteurProjetIds array for validation
      animateursIds: [],
    });
    setIsEditing(false);
    setShowEventForm(true);
  };

  // Handle form submission
  const handleFormSubmit = async (data: any) => {
    try {
      console.log('Form submission data:', data);
      
      if (data.isRecurrent) {
        // Handle recurring event
        const payload = {
          titre: data.titre,
          heure_debut: data.heure_debut,
          heure_fin: data.heure_fin,
          frequence: data.frequence,
          jours_semaine: data.jours_semaine,
          nth_of_month: data.nth_of_month, // AJOUT DE LA LIGNE MANQUANTE
          date_debut_serie: data.date_debut_serie,
          date_fin_serie: data.date_fin_serie,
          atelierId: data.atelierId,
          porteurProjetId: data.porteurProjetId,
          porteurProjetIds: data.porteurProjetIds || (data.porteurProjetId ? [data.porteurProjetId] : []),
          animateursIds: data.animateursIds,
        };
        
        console.log('Payload for recurring event:', {
          nth_of_month: payload.nth_of_month,
          frequence: payload.frequence
        });

        if (isEditing && data.regleRecurrenceId) {
          // Update recurring event
          await fetch(`/api/recurrence`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: data.regleRecurrenceId, ...payload }),
          });
        } else {
          // Create new recurring event
          await fetch(`/api/recurrence`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }
      } else {
        // Handle one-time event
        const payload = {
          titre: data.titre,
          date_debut: data.date_debut,
          date_fin: data.date_fin,
          atelierId: data.atelierId,
          porteurProjetId: data.porteurProjetId,
          porteurProjetIds: data.porteurProjetIds || (data.porteurProjetId ? [data.porteurProjetId] : []),
          animateursIds: data.animateursIds,
        };

        if (data.convertFromRecurrent && data.regleRecurrenceId) {
          // Converting a recurring event to a unique event
          // First create the unique event
          const createResponse = await fetch(`/api/evenements-uniques`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          
          if (!createResponse.ok) {
            throw new Error('Erreur lors de la création de l\'événement unique');
          }
          
          // Then create an exception for this occurrence in the recurrence rule
          // This is optional and depends on your business logic
          // You might want to add an API endpoint to handle exceptions in recurrence rules
        } else if (isEditing && data.id) {
          console.log('Updating existing event with ID:', data.id);
          
          // Update one-time event
          const updateResponse = await fetch(`/api/evenements-uniques`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: data.id, ...payload }),
          });
          
          if (!updateResponse.ok) {
            throw new Error('Erreur lors de la mise à jour de l\'événement');
          }
          
          console.log('Event updated successfully');
        } else {
          // Create new one-time event
          await fetch(`/api/evenements-uniques`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }
      }

      // Close the form and refresh the calendar
      setShowEventForm(false);
      
      // Explicitly refresh the calendar to show the new event
      if (refreshCalendarRef.current) {
        refreshCalendarRef.current();
      }
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Une erreur est survenue lors de l\'enregistrement de l\'événement');
    }
  };

  // Handle form cancel
  const handleFormCancel = () => {
    setShowEventForm(false);
    
    // Refresh the calendar to ensure it's up to date
    if (refreshCalendarRef.current) {
      refreshCalendarRef.current();
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6">Gestion des Ateliers EPN</h1>
      
      <div className="bg-white p-4 rounded shadow">
        <CalendarWrapper
          onEventClick={handleEventClick}
          onDateSelect={handleDateSelect}
          onRefresh={(refreshFn) => {
            refreshCalendarRef.current = refreshFn;
          }}
        />
      </div>
      
      {/* Event Form Modal */}
      <Modal
        isOpen={showEventForm}
        onClose={() => {
          setShowEventForm(false);
          setEditMode(false);
          setEventFormOpen(false);
          
          // Refresh the calendar when the modal is closed
          if (refreshCalendarRef.current) {
            refreshCalendarRef.current();
          }
        }}
        title={isEditing ? 'Modifier l\'événement' : 'Nouvel événement'}
        size="lg"
      >
        <EventForm
          initialData={eventFormData}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      </Modal>

      {/* Event Details Modal */}
      <Modal
        isOpen={showEventDetails}
        onClose={() => {
          setShowEventDetails(false);
          setSelectedEventId(null);
          
          // Refresh the calendar when the modal is closed
          if (refreshCalendarRef.current) {
            refreshCalendarRef.current();
          }
        }}
        title="Détails de l'événement"
        size="md"
      >
        {selectedEventId && (
          <EventDetails
            eventId={selectedEventId}
            refreshCalendarRef={refreshCalendarRef}
            onClose={() => {
              setShowEventDetails(false);
              setSelectedEventId(null);
              // Refresh the calendar after closing details
              if (refreshCalendarRef.current) {
                refreshCalendarRef.current();
              }
            }}
          />
        )}
      </Modal>
    </main>
  );
}
