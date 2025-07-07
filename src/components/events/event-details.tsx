'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Edit, Trash2, Calendar, Clock, MapPin, User, X, Repeat } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { showToast } from '@/components/ui/toast-provider';
import { useAppStore } from '@/lib/store';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface EventDetailsProps {
  eventId: string;
  onClose: () => void;
  refreshCalendarRef?: React.MutableRefObject<(() => void) | null>;
}

export default function EventDetails({ eventId, onClose, refreshCalendarRef }: EventDetailsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [event, setEvent] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRecurrentDeleteDialogOpen, setIsRecurrentDeleteDialogOpen] = useState(false);
  const [isRecurrentEditDialogOpen, setIsRecurrentEditDialogOpen] = useState(false);
  const setEditMode = useAppStore((state) => state.setEditMode);
  const setEventFormOpen = useAppStore((state) => state.setEventFormOpen);
  const setSelectedEventId = useAppStore((state) => state.setSelectedEventId);

  // Fetch event details when component mounts
  useEffect(() => {
    const fetchEventDetails = async () => {
      setIsLoading(true);
      try {
        // Check if this is a recurrent event by looking at the ID format
        // Recurrent event IDs are in the format `${regleId}-${date.toISOString()}`
        // We need to check if the ID contains a valid ISO date string
        // The format is: regleId-YYYY-MM-DDThh:mm:ss.sssZ
        
        // Debug: Log the event ID to help diagnose issues
        console.log('Fetching event details for ID:', eventId);
        
        let eventData;
        let isRecurrentEvent = false;
        let regleRecurrenceId = null;
        
        // Check if the ID format suggests it's a recurring event (contains a hyphen followed by a date)
        const isRecurrentIdFormat = eventId.includes('-') && /\d{4}-\d{2}-\d{2}T/.test(eventId);
        
        if (isRecurrentIdFormat) {
          console.log('Event ID matches recurring event format pattern');
          const parts = eventId.split('-');
          const idPart = parts[0];
          const datePart = parts.slice(1).join('-'); // Rejoin in case there are hyphens in the date
          
          isRecurrentEvent = true;
          regleRecurrenceId = idPart;
          
          console.log('Detected recurrent event from ID format with rule ID:', regleRecurrenceId);
        }
        
        // First, try to fetch the event from the calendar API to check if it's a recurring event
        try {
          const calendarResponse = await fetch(`/api/evenements?id=${eventId}`);
          if (calendarResponse.ok) {
            const calendarData = await calendarResponse.json();
            if (calendarData.success && calendarData.data) {
              // Check if the event has the _isRecurrentEvent flag
              if (calendarData.data._isRecurrentEvent || calendarData.data.isRecurrent) {
                isRecurrentEvent = true;
                regleRecurrenceId = calendarData.data.regleRecurrenceId;
                
                console.log('Detected recurring event from calendar API with rule ID:', regleRecurrenceId);
                
                eventData = {
                  ...calendarData.data,
                  isRecurrent: true,
                  _isRecurrentEvent: true,
                  regleRecurrenceId
                };
                console.log('Found as recurrent event in calendar API');
              } else {
                eventData = calendarData.data;
              }
            }
          }
        } catch (error) {
          console.error('Error fetching from calendar API:', error);
        }
        
        // If not found in calendar API but ID format suggests it's a recurring event, try to fetch the recurrence rule directly
        if (!eventData && isRecurrentEvent) {
          try {
            console.log('Not found in calendar API, checking recurrence rules directly');
            
            // Try to fetch the recurrence rule directly
            const regleResponse = await fetch(`/api/recurrence?id=${regleRecurrenceId}`);
            if (regleResponse.ok) {
              const regleData = await regleResponse.json();
              if (regleData.success && regleData.data) {
                // We found the recurrence rule, now we need to create an event instance for this date
                const dateParts = eventId.split('-').slice(1).join('-').split('T')[0].split('-');
                const timeParts = regleData.data.heure_debut.split(':');
                
                const date_debut = new Date(
                  parseInt(dateParts[0]),
                  parseInt(dateParts[1]) - 1,
                  parseInt(dateParts[2]),
                  parseInt(timeParts[0]),
                  parseInt(timeParts[1])
                );
                
                const endTimeParts = regleData.data.heure_fin.split(':');
                const date_fin = new Date(
                  parseInt(dateParts[0]),
                  parseInt(dateParts[1]) - 1,
                  parseInt(dateParts[2]),
                  parseInt(endTimeParts[0]),
                  parseInt(endTimeParts[1])
                );
                
                eventData = {
                  id: eventId,
                  titre: regleData.data.titre,
                  date_debut,
                  date_fin,
                  atelier: regleData.data.atelier,
                  porteurProjet: regleData.data.porteurProjet,
                  animateurs: regleData.data.animateurs,
                  isRecurrent: true,
                  _isRecurrentEvent: true,
                  regleRecurrenceId
                };
                console.log('Created event instance from recurrence rule');
              }
            }
          } catch (error) {
            console.error('Error fetching recurrent event details:', error);
          }
        }
        
        // If not found as a recurrent event, try as a unique event
        if (!eventData || !eventData.titre) { // Only fetch unique event if we don't have complete data
          try {
            const uniqueResponse = await fetch(`/api/evenements-uniques?id=${eventId}`);
            if (uniqueResponse.ok) {
              const uniqueData = await uniqueResponse.json();
              if (uniqueData.success && uniqueData.data) {
                // If we already determined this is a recurrent event but couldn't fetch the data,
                // merge the unique event data with the recurrence flags
                if (isRecurrentEvent) {
                  eventData = {
                    ...uniqueData.data,
                    isRecurrent: true,
                    _isRecurrentEvent: true,
                    regleRecurrenceId: regleRecurrenceId
                  };
                  console.log('Merged unique event data with recurrence flags');
                } else {
                  eventData = {
                    ...uniqueData.data,
                    isRecurrent: false,
                    _isRecurrentEvent: false
                  };
                  isRecurrentEvent = false;
                  console.log('Found as unique event');
                }
              }
            }
          } catch (error) {
            console.error('Error fetching unique event details:', error);
          }
        }
        
        // Make sure isRecurrent is set correctly in the event data
        if (eventData && isRecurrentEvent && !eventData.isRecurrent) {
          eventData.isRecurrent = true;
          eventData._isRecurrentEvent = true;
          eventData.regleRecurrenceId = regleRecurrenceId;
          console.log('Corrected isRecurrent flag in event data');
        }
        
        console.log('Final determination - Is recurrent event?', isRecurrentEvent, 'Event data:', eventData);
        
        // If we couldn't find the event data, throw an error
        if (!eventData) {
          throw new Error('Événement non trouvé');
        }
        
        setEvent(eventData);
      } catch (error) {
        console.error('Error fetching event details:', error);
        showToast.error('Erreur', 'Impossible de charger les détails de l\'événement');
      } finally {
        setIsLoading(false);
      }
    };

    if (eventId) {
      fetchEventDetails();
    }
  }, [eventId]);

  const handleEdit = () => {
    if (event?.isRecurrent) {
      setIsRecurrentEditDialogOpen(true);
    } else {
      proceedWithEdit();
    }
  };

  const proceedWithEdit = () => {
    setEditMode(true);
    setEventFormOpen(true);
    // The selected event ID is already set
    // Close the details modal to allow the form to be shown
    onClose();
  };

  const handleDelete = () => {
    if (event?.isRecurrent) {
      setIsRecurrentDeleteDialogOpen(true);
    } else {
      setIsDeleteDialogOpen(true);
    }
  };

  const deleteEvent = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/evenements-uniques?id=${eventId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression de l\'événement');
      }

      showToast.success('Événement supprimé avec succès');
      setSelectedEventId(null);
      onClose();
      // Explicitly refresh the calendar
      if (refreshCalendarRef && refreshCalendarRef.current) {
        refreshCalendarRef.current();
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      showToast.error('Erreur', 'Impossible de supprimer l\'événement');
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteRecurrentEvent = async () => {
    setIsDeleting(true);
    try {
      // Delete the recurrence rule which will delete all occurrences
      // For recurrent events, we've extracted the regleRecurrenceId from the event ID
      const response = await fetch(`/api/recurrence?id=${event.regleRecurrenceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression des événements récurrents');
      }

      showToast.success('Tous les événements récurrents ont été supprimés avec succès');
      setSelectedEventId(null);
      onClose();
      // Explicitly refresh the calendar
      if (refreshCalendarRef && refreshCalendarRef.current) {
        refreshCalendarRef.current();
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error('Error deleting recurrent events:', error);
      showToast.error('Erreur', 'Impossible de supprimer les événements récurrents');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Détails de l&apos;événement</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-gray-600">Événement non trouvé</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <h3 className="text-lg font-semibold">{event.titre}</h3>
          {event.isRecurrent && (
            <Repeat className="ml-2 w-5 h-5 text-blue-500" aria-label="Événement récurrent" />
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <X size={20} />
        </button>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex items-start">
          <Calendar className="w-5 h-5 text-gray-500 mr-2 mt-0.5" />
          <div>
            <p className="text-gray-700">
              {formatDate(event.date_debut, 'EEEE d MMMM yyyy')}
            </p>
          </div>
        </div>

        <div className="flex items-start">
          <Clock className="w-5 h-5 text-gray-500 mr-2 mt-0.5" />
          <div>
            <p className="text-gray-700">
              {formatTime(formatDate(event.date_debut, 'HH:mm'))} - {formatTime(formatDate(event.date_fin, 'HH:mm'))}
            </p>
          </div>
        </div>

        {event.lieu && (
          <div className="flex items-start">
            <MapPin className="w-5 h-5 text-gray-500 mr-2 mt-0.5" />
            <p className="text-gray-700">{event.lieu}</p>
          </div>
        )}

        <div className="flex items-start">
          <User className="w-5 h-5 text-gray-500 mr-2 mt-0.5" />
          <div>
            <p className="text-gray-700">
              Porteur de projet: {event.porteurProjet?.prenom} {event.porteurProjet?.nom}
            </p>
            {event.animateurs && event.animateurs.length > 0 && (
              <p className="text-gray-700 mt-1">
                Animateurs: {event.animateurs.map((a: any) => `${a.agent.prenom} ${a.agent.nom}`).join(', ')}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button
          variant="outline"
          leftIcon={<Edit size={16} />}
          onClick={handleEdit}
        >
          Modifier
        </Button>
        <Button
          variant="danger"
          leftIcon={<Trash2 size={16} />}
          onClick={handleDelete}
          isLoading={isDeleting}
          loadingText="Suppression..."
        >
          Supprimer
        </Button>
      </div>

      {/* Confirmation dialog for deleting a single event */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={deleteEvent}
        title="Supprimer l'événement"
        message="Êtes-vous sûr de vouloir supprimer cet événement ?"
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="danger"
      />

      {/* Confirmation dialog for deleting a recurrent event */}
      <ConfirmDialog
        isOpen={isRecurrentDeleteDialogOpen}
        onClose={() => setIsRecurrentDeleteDialogOpen(false)}
        onConfirm={deleteRecurrentEvent}
        title="Supprimer les événements récurrents"
        message="Cet événement fait partie d'une série récurrente. Voulez-vous supprimer tous les événements de cette série ?"
        confirmText="Supprimer tous"
        cancelText="Annuler"
        variant="danger"
      />

      {/* Confirmation dialog for editing a recurrent event */}
      <ConfirmDialog
        isOpen={isRecurrentEditDialogOpen}
        onClose={() => setIsRecurrentEditDialogOpen(false)}
        onConfirm={proceedWithEdit}
        title="Modifier les événements récurrents"
        message="Cet événement fait partie d'une série récurrente. Les modifications seront appliquées à tous les événements de cette série."
        confirmText="Continuer"
        cancelText="Annuler"
        variant="warning"
      />
    </div>
  );
}