'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { evenementUniqueSchema, evenementRecurrentSchema } from '@/lib/validations';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CustomSelect } from '@/components/ui/custom-select';

interface Agent {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
}

interface Atelier {
  id: string;
  titre: string;
  duree_minutes: number;
  couleur?: string;
}

interface EventFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export const EventForm: React.FC<EventFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
}) => {
  const [isRecurrent, setIsRecurrent] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [ateliers, setAteliers] = useState<Atelier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConvertingToUnique, setIsConvertingToUnique] = useState(false);
  const [currentFrequence, setCurrentFrequence] = useState<'QUOTIDIENNE' | 'HEBDOMADAIRE' | 'MENSUELLE'>(
    initialData?.frequence || 'HEBDOMADAIRE'
  );

  // Initialize form for one-time event
  const {
    register: registerUnique,
    handleSubmit: handleSubmitUnique,
    control: controlUnique,
    formState: { errors: errorsUnique },
    reset: resetUnique,
  } = useForm({
    resolver: zodResolver(evenementUniqueSchema),
    defaultValues: initialData || {
      titre: '',
      date_debut: new Date(),
      date_fin: new Date(new Date().getTime() + 60 * 60 * 1000), // 1 hour later
      atelierId: '',
      porteurProjetId: '',
      animateursIds: [],
    },
  });

  // Initialize form for recurring event
  const {
    register: registerRecurrent,
    handleSubmit: handleSubmitRecurrent,
    control: controlRecurrent,
    formState: { errors: errorsRecurrent },
    reset: resetRecurrent,
    setValue: setValueRecurrent,
    getValues: getValuesRecurrent,
    trigger: triggerRecurrent,
  } = useForm({
    resolver: zodResolver(evenementRecurrentSchema),
    defaultValues: initialData || {
      titre: '',
      heure_debut: '09:00',
      heure_fin: '10:00',
      frequence: 'HEBDOMADAIRE',
      jours_semaine: [1], // Monday
      nth_of_month: undefined, // Pas de valeur par défaut
      date_debut_serie: new Date(),
      date_fin_serie: new Date(new Date().setMonth(new Date().getMonth() + 1)), // 1 month later
      atelierId: '',
      porteurProjetId: '',
      animateursIds: [],
    },
  });

  // Add useEffect to ensure nth_of_month is set when frequency is MENSUELLE
  useEffect(() => {
    if (currentFrequence === 'MENSUELLE') {
      // If nth_of_month is not set, set it to a default value (2 for "second")
      try {
        const formValues = getValuesRecurrent();
        console.log('Current form values:', formValues);
        
        if (!formValues.nth_of_month) {
          console.log('Setting default nth_of_month value for MENSUELLE frequency');
          setValueRecurrent('nth_of_month', 2);
          // Trigger validation after setting the value
          setTimeout(() => {
            triggerRecurrent('nth_of_month');
          }, 100);
        }
      } catch (error) {
        console.error('Error getting form values:', error);
      }
    }
  }, [currentFrequence, setValueRecurrent, getValuesRecurrent, triggerRecurrent]);

  // Initialize isRecurrent state based on initialData
  useEffect(() => {
    // Check multiple ways to determine if this is a recurrent event
    if (initialData?.isRecurrent || initialData?._isRecurrentEvent || initialData?.regleRecurrenceId) {
      console.log('Setting isRecurrent to true based on initialData flags:', {
        isRecurrent: initialData?.isRecurrent,
        _isRecurrentEvent: initialData?._isRecurrentEvent,
        regleRecurrenceId: initialData?.regleRecurrenceId
      });
      setIsRecurrent(true);
    } else if (initialData?.id && initialData.id.includes('-')) {
      // Check if the ID format suggests it's a recurring event (regleId-dateString)
      // More specifically, check for a pattern that looks like an ISO date string
      const isRecurrentIdFormat = /\d{4}-\d{2}-\d{2}T/.test(initialData.id);
      
      if (isRecurrentIdFormat) {
        try {
          const parts = initialData.id.split('-');
          const datePart = parts.slice(1).join('-');
          const testDate = new Date(datePart);
          
          if (!isNaN(testDate.getTime())) {
            console.log('Setting isRecurrent to true based on ID format:', initialData.id);
            setIsRecurrent(true);
            
            // If we don't have a regleRecurrenceId yet, extract it from the ID
            if (!initialData.regleRecurrenceId) {
              const regleId = parts[0];
              console.log('Extracted regleRecurrenceId from ID:', regleId);
              
              // Update initialData with the extracted regleRecurrenceId
              initialData.regleRecurrenceId = regleId;
            }
          }
        } catch (e) {
          console.log('ID contains hyphen but not a valid recurrent event ID format:', e);
        }
      } else {
        console.log('ID contains hyphen but does not match recurrent event pattern');
      }
    }
  }, [initialData]);

  // Fetch agents, ateliers, and recurrence rule if editing a recurring event
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch agents
        const agentsResponse = await fetch('/api/agents');
        const agentsData = await agentsResponse.json();
        
        // Fetch ateliers
        const ateliersResponse = await fetch('/api/ateliers');
        const ateliersData = await ateliersResponse.json();
        
        if (agentsData.success && ateliersData.success) {
          setAgents(agentsData.data);
          setAteliers(ateliersData.data);
        }

        // If editing a recurring event, fetch the recurrence rule data
        if (initialData?.isRecurrent || initialData?._isRecurrentEvent || initialData?.regleRecurrenceId) {
          // Try to get the recurrence rule ID from the initialData
          let regleId = initialData.regleRecurrenceId;
          
          // If no regleRecurrenceId is provided but the event is marked as recurrent,
          // try to extract the rule ID from the event ID (format: regleId-dateString)
          if (!regleId && initialData.id && initialData.id.includes('-')) {
            // Check if the ID matches the pattern for a recurring event
            const isRecurrentIdFormat = /\d{4}-\d{2}-\d{2}T/.test(initialData.id);
            
            if (isRecurrentIdFormat) {
              const parts = initialData.id.split('-');
              regleId = parts[0];
              console.log('Extracted regleId from event ID:', regleId);
            }
          }
          
          if (regleId) {
            console.log('Fetching recurrence rule data for ID:', regleId);
            
            try {
              const regleResponse = await fetch(`/api/recurrence?id=${regleId}`);
              
              if (regleResponse.ok) {
                const regleData = await regleResponse.json();
                
                if (regleData.success && regleData.data) {
                  const regle = regleData.data;
                  console.log('Recurrence rule data fetched successfully:', regle);
                  
                  // Extract animateursIds from the recurrence rule data
                  let animateursIds: string[] = [];
                  
                  if (regle.animateurs && Array.isArray(regle.animateurs)) {
                    animateursIds = regle.animateurs.map((a: any) => {
                      if (a.agentId) return a.agentId;
                      if (a.agent?.id) return a.agent.id;
                      return null;
                    }).filter(Boolean);
                  }
                  
                  console.log('Extracted animateursIds from recurrence rule:', animateursIds);
                  
                  // Reset the recurrent form with the rule data
                  const frequence = regle.frequence;
                  setCurrentFrequence(frequence);
                  
                  resetRecurrent({
                    titre: regle.titre,
                    heure_debut: regle.heure_debut,
                    heure_fin: regle.heure_fin,
                    frequence: frequence,
                    jours_semaine: regle.jours_semaine.split(',').map(Number),
                    nth_of_month: regle.nth_of_month || undefined,
                    date_debut_serie: new Date(regle.date_debut_serie),
                    date_fin_serie: new Date(regle.date_fin_serie),
                    atelierId: regle.atelierId,
                    porteurProjetId: regle.porteurProjetId,
                    animateursIds: animateursIds,
                  });
                  
                  // Store the regleRecurrenceId in initialData if it wasn't there
                  if (!initialData.regleRecurrenceId) {
                    initialData.regleRecurrenceId = regleId;
                  }
                  
                  // Ensure isRecurrent is set to true
                  setIsRecurrent(true);
                } else {
                  console.error('Recurrence rule data not found in response:', regleData);
                }
              } else {
                console.error('Failed to fetch recurrence rule data:', regleResponse.statusText);
              }
            } catch (error) {
              console.error('Error fetching recurrence rule data:', error);
            }
          } else {
            console.error('No recurrence rule ID found for recurring event');
          }
        }
      } catch (error) {
        console.error('Error fetching form data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [initialData, resetRecurrent]);

  // Handle form submission
  const handleFormSubmit = async (data: any) => {
    try {
      // Create a copy of the data to avoid modifying the original
      const submissionData = { ...data };
      
      console.log('Form data before submission:', submissionData);
      
      // Ensure frequency is set for recurring events
      if (isRecurrent) {
        // If frequency is empty or undefined, use the current frequency
        if (!submissionData.frequence || submissionData.frequence === '') {
          submissionData.frequence = currentFrequence;
          console.log('Setting frequency from currentFrequence:', currentFrequence);
        }
        
        // If this is a monthly recurrence with nth_of_month set, ensure frequency is MENSUELLE
        if (submissionData.nth_of_month !== undefined && submissionData.nth_of_month !== null) {
          submissionData.frequence = 'MENSUELLE';
          console.log('Setting frequency to MENSUELLE because nth_of_month is set:', submissionData.nth_of_month);
        }
        
        // For MENSUELLE frequency, ensure nth_of_month is set
        if (submissionData.frequence === 'MENSUELLE' &&
            (submissionData.nth_of_month === undefined || submissionData.nth_of_month === null)) {
          // Set a default value of 2 (second occurrence)
          submissionData.nth_of_month = 2;
          console.log('Setting default nth_of_month for MENSUELLE frequency:', submissionData.nth_of_month);
        }
      }
      
      console.log('Form data after adjustments:', submissionData);
      
      // If converting from recurring to non-recurring, pass the original recurrence rule ID
      if (isConvertingToUnique && initialData?.regleRecurrenceId) {
        onSubmit({
          ...submissionData,
          isRecurrent: false,
          _isRecurrentEvent: false,
          convertFromRecurrent: true,
          regleRecurrenceId: initialData.regleRecurrenceId,
          originalEventId: initialData.id
        });
      } else {
        onSubmit({
          ...submissionData,
          id: initialData?.id, // Make sure to pass the ID for updates
          isRecurrent,
          _isRecurrentEvent: isRecurrent,
          regleRecurrenceId: initialData?.regleRecurrenceId
        });
      }
    } catch (error) {
      console.error('Error in form submission:', error);
    }
  };

  // Toggle between one-time and recurring event
  const handleRecurrenceToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIsRecurrent = e.target.checked;
    console.log('Toggling recurrence to:', newIsRecurrent);
    setIsRecurrent(newIsRecurrent);
    
    // If converting from recurring to non-recurring, set the flag
    if (!newIsRecurrent && initialData?.isRecurrent) {
      console.log('Converting from recurring to unique event');
      setIsConvertingToUnique(true);
      
      // Pre-fill the unique event form with data from the recurring event
      if (initialData) {
        // Extract animateursIds from different possible data structures
        let animateursIds: string[] = [];
        
        if (initialData.animateursIds && Array.isArray(initialData.animateursIds)) {
          animateursIds = initialData.animateursIds;
        } else if (initialData.animateurs) {
          // Handle different animateurs data structures
          if (Array.isArray(initialData.animateurs)) {
            animateursIds = initialData.animateurs.map((a: any) => {
              // Handle different formats
              if (a.agentId) return a.agentId;
              if (a.agent?.id) return a.agent.id;
              if (typeof a === 'string') return a;
              return null;
            }).filter(Boolean);
          }
        }
        
        console.log('Pre-filling unique event form with animateursIds:', animateursIds);
        
        resetUnique({
          titre: initialData.titre,
          date_debut: initialData.date_debut,
          date_fin: initialData.date_fin,
          atelierId: initialData.atelierId,
          porteurProjetId: initialData.porteurProjetId,
          animateursIds: animateursIds,
        });
      }
    } else {
      setIsConvertingToUnique(false);
    }
  };

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="event-form">
      <div className="mb-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={isRecurrent}
            onChange={handleRecurrenceToggle}
            className="form-checkbox mr-2"
          />
          <span>Répéter cet événement</span>
        </label>
        {initialData?.isRecurrent && !isRecurrent && (
          <p className="text-orange-500 text-sm mt-1">
            Attention: Cet événement sera converti en événement unique et détaché de la série récurrente.
          </p>
        )}
      </div>

      {isRecurrent ? (
        <form onSubmit={handleSubmitRecurrent((data) => {
          try {
            // Pre-submission check to ensure frequency is set correctly
            if (currentFrequence === 'MENSUELLE' || data.nth_of_month) {
              // Force set the frequency to MENSUELLE before submission
              setValueRecurrent('frequence', 'MENSUELLE');
              // Update the data object directly
              data.frequence = 'MENSUELLE';
              console.log('Pre-submission: Force set frequency to MENSUELLE');
              
              // Ensure nth_of_month is set for MENSUELLE frequency
              if (data.nth_of_month === undefined || data.nth_of_month === null) {
                // Set a default value of 2 (second occurrence)
                setValueRecurrent('nth_of_month', 2);
                data.nth_of_month = 2;
                console.log('Pre-submission: Set default nth_of_month to 2');
              }
            }
            
            // Ensure dates are valid Date objects
            if (data.date_debut_serie && !(data.date_debut_serie instanceof Date)) {
              data.date_debut_serie = new Date(data.date_debut_serie);
              console.log('Converted date_debut_serie to Date object:', data.date_debut_serie);
            }
            
            if (data.date_fin_serie && !(data.date_fin_serie instanceof Date)) {
              data.date_fin_serie = new Date(data.date_fin_serie);
              console.log('Converted date_fin_serie to Date object:', data.date_fin_serie);
            }
            
            // Log the data before submission
            console.log('Form data before submission:', data);
            
            // Proceed with form submission
            handleFormSubmit(data);
          } catch (error) {
            console.error('Error in form submission preparation:', error);
            alert('Une erreur est survenue lors de la préparation du formulaire. Veuillez réessayer.');
          }
        })}>
          <div className="mb-4">
            <label className="form-label">Titre</label>
            <input
              type="text"
              {...registerRecurrent('titre')}
              className="form-input"
            />
            {errorsRecurrent.titre && (
              <p className="text-red-500 text-sm">{String(errorsRecurrent.titre.message)}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="form-label">Heure de début</label>
              <input
                type="time"
                {...registerRecurrent('heure_debut')}
                className="form-input"
              />
              {errorsRecurrent.heure_debut && (
                <p className="text-red-500 text-sm">{String(errorsRecurrent.heure_debut.message)}</p>
              )}
            </div>
            <div>
              <label className="form-label">Heure de fin</label>
              <input
                type="time"
                {...registerRecurrent('heure_fin')}
                className="form-input"
              />
              {errorsRecurrent.heure_fin && (
                <p className="text-red-500 text-sm">{String(errorsRecurrent.heure_fin.message)}</p>
              )}
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label">Fréquence</label>
            <Controller
              control={controlRecurrent}
              name="frequence"
              render={({ field }) => (
                <select
                  value={field.value}
                  onChange={(e) => {
                    console.log('Frequency changed to:', e.target.value);
                    field.onChange(e.target.value);
                    setCurrentFrequence(e.target.value as 'QUOTIDIENNE' | 'HEBDOMADAIRE' | 'MENSUELLE');
                    
                    // If changing to MENSUELLE, set a default nth_of_month value
                    if (e.target.value === 'MENSUELLE') {
                      try {
                        const formValues = getValuesRecurrent();
                        if (!formValues.nth_of_month) {
                          setValueRecurrent('nth_of_month', 2); // Default to "second"
                          console.log('Set default nth_of_month to 2 (second)');
                          // Trigger validation
                          setTimeout(() => {
                            triggerRecurrent('nth_of_month');
                          }, 100);
                        }
                      } catch (error) {
                        console.error('Error getting form values:', error);
                        // Set default value anyway
                        setValueRecurrent('nth_of_month', 2);
                      }
                    } else {
                      // If changing away from MENSUELLE, clear the nth_of_month value
                      setValueRecurrent('nth_of_month', undefined);
                    }
                    
                    // Log the current form values after the change
                    try {
                      const formValues = getValuesRecurrent();
                      console.log('Current form values after frequency change:', formValues);
                    } catch (error) {
                      console.error('Error getting form values:', error);
                    }
                  }}
                  className="form-select"
                >
                  <option value="QUOTIDIENNE">Quotidienne</option>
                  <option value="HEBDOMADAIRE">Hebdomadaire</option>
                  <option value="MENSUELLE">Mensuelle</option>
                </select>
              )}
            />
            {errorsRecurrent.frequence && (
              <p className="text-red-500 text-sm">{String(errorsRecurrent.frequence.message)}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="form-label">Jours de la semaine</label>
            <div className="flex flex-wrap gap-2">
              <Controller
                control={controlRecurrent}
                name="jours_semaine"
                render={({ field }) => (
                  <>
                    {[
                      { value: 1, label: 'Lun' },
                      { value: 2, label: 'Mar' },
                      { value: 3, label: 'Mer' },
                      { value: 4, label: 'Jeu' },
                      { value: 5, label: 'Ven' },
                      { value: 6, label: 'Sam' },
                      { value: 0, label: 'Dim' },
                    ].map((day) => (
                      <label key={day.value} className="flex items-center">
                        <input
                          type="checkbox"
                          value={day.value}
                          checked={Array.isArray(field.value) && field.value.includes(day.value)}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            const newValue = e.target.checked
                              ? [...(Array.isArray(field.value) ? field.value : []), value]
                              : Array.isArray(field.value) ? field.value.filter((v: number) => v !== value) : [];
                            field.onChange(newValue);
                          }}
                          className="form-checkbox mr-1"
                        />
                        <span>{day.label}</span>
                      </label>
                    ))}
                  </>
                )}
              />
            </div>
            {errorsRecurrent.jours_semaine && (
              <p className="text-red-500 text-sm">{String(errorsRecurrent.jours_semaine.message)}</p>
            )}
          </div>

          {/* Option pour "le Nième jour de la semaine du mois" - toujours visible mais conditionnellement requis */}
          <div className={`mb-4 ${currentFrequence !== 'MENSUELLE' ? 'opacity-50' : ''}`}>
            <label className="form-label">
              Occurrence dans le mois
              {currentFrequence === 'MENSUELLE' && <span className="text-red-500">*</span>}
            </label>
            <div className="mb-4">
              <label className="form-label">Occurrence dans le mois <span className="text-red-500">*</span></label>
              <Controller
                control={controlRecurrent}
                name="nth_of_month"
                render={({ field }) => (
                  <select
                    value={field.value === undefined ? '2' : String(field.value)}
                    onChange={(e) => {
                      console.log('nth_of_month changed to:', e.target.value);
                      
                      // First set the frequency to MENSUELLE before updating nth_of_month
                      if (e.target.value !== '') {
                        setValueRecurrent('frequence', 'MENSUELLE');
                        setCurrentFrequence('MENSUELLE');
                        console.log('Set frequency to MENSUELLE');
                      }
                      
                      // Then update the nth_of_month field value
                      const numValue = Number(e.target.value);
                      field.onChange(numValue);
                      console.log(`Set nth_of_month to ${numValue} (${typeof numValue})`);
                      
                      // Trigger validation
                      setTimeout(() => {
                        triggerRecurrent('nth_of_month');
                        // Also trigger frequency validation to ensure it's set to MENSUELLE
                        triggerRecurrent('frequence');
                      }, 100);
                      
                      // Log the current form values after the change
                      try {
                        const formValues = getValuesRecurrent();
                        console.log('Current form values after nth_of_month change:', formValues);
                      } catch (error) {
                        console.error('Error getting form values:', error);
                      }
                    }}
                    className="form-select"
                    required
                  >
                    <option value="" disabled>Sélectionnez une occurrence</option>
                    <option value="1">Premier</option>
                    <option value="2">Deuxième</option>
                    <option value="3">Troisième</option>
                    <option value="4">Quatrième</option>
                    <option value="5">Cinquième (si présent)</option>
                    <option value="-1">Dernier</option>
                  </select>
                )}
              />
              {errorsRecurrent.nth_of_month && (
                <p className="text-red-500 text-sm">{String(errorsRecurrent.nth_of_month.message)}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="form-label">Date de début de série</label>
              <Controller
                control={controlRecurrent}
                name="date_debut_serie"
                render={({ field }) => (
                  <input
                    type="date"
                    value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''}
                    onChange={(e) => field.onChange(new Date(e.target.value))}
                    className="form-input"
                  />
                )}
              />
              {errorsRecurrent.date_debut_serie && (
                <p className="text-red-500 text-sm">{String(errorsRecurrent.date_debut_serie.message)}</p>
              )}
            </div>
            <div>
              <label className="form-label">Date de fin de série</label>
              <Controller
                control={controlRecurrent}
                name="date_fin_serie"
                render={({ field }) => (
                  <input
                    type="date"
                    value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                      try {
                        // Parse the date string from the input
                        const dateStr = e.target.value;
                        console.log('Raw date string:', dateStr);
                        
                        // Create a new date object
                        const newDate = new Date(dateStr);
                        console.log('Date de fin changed to:', newDate);
                        
                        // Ensure it's a valid date
                        if (isNaN(newDate.getTime())) {
                          console.error('Invalid date:', dateStr);
                          return;
                        }
                        
                        // Update the form field
                        field.onChange(newDate);
                        
                        // Trigger validation after changing the date
                        setTimeout(() => {
                          triggerRecurrent('date_fin_serie');
                        }, 100);
                      } catch (error) {
                        console.error('Error processing date:', error);
                      }
                    }}
                    className="form-input"
                  />
                )}
              />
              {errorsRecurrent.date_fin_serie && (
                <p className="text-red-500 text-sm">{String(errorsRecurrent.date_fin_serie.message)}</p>
              )}
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label">Atelier</label>
            <Controller
              control={controlRecurrent}
              name="atelierId"
              render={({ field }) => (
                <CustomSelect
                  options={ateliers.map(atelier => ({
                    value: atelier.id,
                    label: atelier.titre
                  }))}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Sélectionner un atelier"
                />
              )}
            />
            {errorsRecurrent.atelierId && (
              <p className="text-red-500 text-sm">{String(errorsRecurrent.atelierId.message)}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="form-label">Porteur de projet</label>
            <Controller
              control={controlRecurrent}
              name="porteurProjetId"
              render={({ field }) => (
                <CustomSelect
                  options={agents
                    .filter((agent) => agent.role === 'PORTEUR_PROJET' || agent.role === 'ADMIN')
                    .map(agent => ({
                      value: agent.id,
                      label: `${agent.prenom} ${agent.nom}`
                    }))}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Sélectionner un porteur de projet"
                />
              )}
            />
            {errorsRecurrent.porteurProjetId && (
              <p className="text-red-500 text-sm">{String(errorsRecurrent.porteurProjetId.message)}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="form-label">Animateurs</label>
            <Controller
              control={controlRecurrent}
              name="animateursIds"
              render={({ field }) => (
                <div className="max-h-40 overflow-y-auto border rounded p-2">
                  {agents
                    .filter((agent) => agent.role === 'ANIMATEUR' || agent.role === 'ADMIN')
                    .map((agent) => (
                      <label key={agent.id} className="flex items-center mb-1">
                        <input
                          type="checkbox"
                          value={agent.id}
                          checked={Array.isArray(field.value) && field.value.includes(agent.id)}
                          onChange={(e) => {
                            const value = e.target.value;
                            const newValue = e.target.checked
                              ? [...(Array.isArray(field.value) ? field.value : []), value]
                              : Array.isArray(field.value) ? field.value.filter((v: string) => v !== value) : [];
                            field.onChange(newValue);
                          }}
                          className="form-checkbox mr-2"
                        />
                        <span>
                          {agent.prenom} {agent.nom}
                        </span>
                      </label>
                    ))}
                </div>
              )}
            />
            {errorsRecurrent.animateursIds && (
              <p className="text-red-500 text-sm">{String(errorsRecurrent.animateursIds.message)}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              Enregistrer
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSubmitUnique(handleFormSubmit)}>
          <div className="mb-4">
            <label className="form-label">Titre</label>
            <input
              type="text"
              {...registerUnique('titre')}
              className="form-input"
            />
            {errorsUnique.titre && (
              <p className="text-red-500 text-sm">{String(errorsUnique.titre.message)}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="form-label">Date et heure de début</label>
              <Controller
                control={controlUnique}
                name="date_debut"
                render={({ field }) => (
                  <input
                    type="datetime-local"
                    value={field.value ? format(new Date(field.value), "yyyy-MM-dd'T'HH:mm") : ''}
                    onChange={(e) => field.onChange(new Date(e.target.value))}
                    className="form-input"
                  />
                )}
              />
              {errorsUnique.date_debut && (
                <p className="text-red-500 text-sm">{String(errorsUnique.date_debut.message)}</p>
              )}
            </div>
            <div>
              <label className="form-label">Date et heure de fin</label>
              <Controller
                control={controlUnique}
                name="date_fin"
                render={({ field }) => (
                  <input
                    type="datetime-local"
                    value={field.value ? format(new Date(field.value), "yyyy-MM-dd'T'HH:mm") : ''}
                    onChange={(e) => field.onChange(new Date(e.target.value))}
                    className="form-input"
                  />
                )}
              />
              {errorsUnique.date_fin && (
                <p className="text-red-500 text-sm">{String(errorsUnique.date_fin.message)}</p>
              )}
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label">Atelier</label>
            <Controller
              control={controlUnique}
              name="atelierId"
              render={({ field }) => (
                <CustomSelect
                  options={ateliers.map(atelier => ({
                    value: atelier.id,
                    label: atelier.titre
                  }))}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Sélectionner un atelier"
                />
              )}
            />
            {errorsUnique.atelierId && (
              <p className="text-red-500 text-sm">{String(errorsUnique.atelierId.message)}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="form-label">Porteur de projet</label>
            <Controller
              control={controlUnique}
              name="porteurProjetId"
              render={({ field }) => (
                <CustomSelect
                  options={agents
                    .filter((agent) => agent.role === 'PORTEUR_PROJET' || agent.role === 'ADMIN')
                    .map(agent => ({
                      value: agent.id,
                      label: `${agent.prenom} ${agent.nom}`
                    }))}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Sélectionner un porteur de projet"
                />
              )}
            />
            {errorsUnique.porteurProjetId && (
              <p className="text-red-500 text-sm">{String(errorsUnique.porteurProjetId.message)}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="form-label">Animateurs</label>
            <Controller
              control={controlUnique}
              name="animateursIds"
              render={({ field }) => (
                <div className="max-h-40 overflow-y-auto border rounded p-2">
                  {agents
                    .filter((agent) => agent.role === 'ANIMATEUR' || agent.role === 'ADMIN')
                    .map((agent) => (
                      <label key={agent.id} className="flex items-center mb-1">
                        <input
                          type="checkbox"
                          value={agent.id}
                          checked={Array.isArray(field.value) && field.value.includes(agent.id)}
                          onChange={(e) => {
                            const value = e.target.value;
                            const newValue = e.target.checked
                              ? [...(Array.isArray(field.value) ? field.value : []), value]
                              : Array.isArray(field.value) ? field.value.filter((v: string) => v !== value) : [];
                            field.onChange(newValue);
                          }}
                          className="form-checkbox mr-2"
                        />
                        <span>
                          {agent.prenom} {agent.nom}
                        </span>
                      </label>
                    ))}
                </div>
              )}
            />
            {errorsUnique.animateursIds && (
              <p className="text-red-500 text-sm">{String(errorsUnique.animateursIds.message)}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              Enregistrer
            </button>
          </div>
        </form>
      )}
    </div>
  );
};