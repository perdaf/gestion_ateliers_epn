import { z } from 'zod';

// Pour un événement unique
export const evenementUniqueSchema = z.object({
  titre: z.string().min(1, 'Le titre est requis'),
  date_debut: z.date(),
  date_fin: z.date(),
  // Support both single atelier (backward compatibility) and multiple ateliers
  atelierId: z.string().optional(),
  atelierIds: z.array(z.string()).min(1, 'Au moins un atelier est requis').optional(),
  porteurProjetIds: z.array(z.string()).min(1, 'Au moins un porteur de projet requis'),
  animateursIds: z.array(z.string()).min(1, 'Au moins un animateur requis'),
}).refine(data => data.date_fin > data.date_debut, {
  message: 'La date de fin doit être après la date de début',
  path: ['date_fin'],
}).refine(data => {
  // Either atelierId or atelierIds must be provided
  return data.atelierId || (data.atelierIds && data.atelierIds.length > 0);
}, {
  message: 'Au moins un atelier doit être sélectionné',
  path: ['atelierIds'],
});

// Pour un événement récurrent
export const evenementRecurrentSchema = z.object({
  titre: z.string().min(1, 'Le titre est requis'),
  heure_debut: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format HH:mm invalide"),
  heure_fin: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format HH:mm invalide"),
  // Accept string and transform empty string to MENSUELLE if nth_of_month is set
  frequence: z.string()
    .transform(val => {
      // If empty string, default to HEBDOMADAIRE
      if (!val) return 'HEBDOMADAIRE';
      return val;
    })
    .pipe(z.enum(['QUOTIDIENNE', 'HEBDOMADAIRE', 'MENSUELLE'])),
  jours_semaine: z.array(z.number().min(0).max(6)).min(1, 'Sélectionnez au moins un jour'),
  nth_of_month: z.union([
    z.number().min(-1).max(5),
    z.string().transform(val => {
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    })
  ]).optional(),
  date_debut_serie: z.date(),
  date_fin_serie: z.date(),
  // Support both single atelier (backward compatibility) and multiple ateliers
  atelierId: z.string().optional(),
  atelierIds: z.array(z.string()).min(1, 'Au moins un atelier est requis').optional(),
  porteurProjetIds: z.array(z.string()).min(1, 'Au moins un porteur de projet requis'),
  animateursIds: z.array(z.string()).min(1, 'Au moins un animateur requis'),
}).refine(data => data.date_fin_serie > data.date_debut_serie, {
  message: 'La date de fin doit être après la date de début de série',
  path: ['date_fin_serie'],
}).refine(data => {
  // Si la fréquence est MENSUELLE et qu'on a sélectionné un jour, nth_of_month est requis
  if (data.frequence === 'MENSUELLE' && data.jours_semaine.length > 0) {
    // If nth_of_month is missing, set a default value of 1 (first occurrence)
    if (data.nth_of_month === undefined || data.nth_of_month === null) {
      data.nth_of_month = 1;
    }
    return true;
  }
  return true;
}, {
  message: 'Pour une récurrence mensuelle, veuillez spécifier quelle occurrence du jour dans le mois',
  path: ['nth_of_month'],
}).refine(data => {
  // Either atelierId or atelierIds must be provided
  return data.atelierId || (data.atelierIds && data.atelierIds.length > 0);
}, {
  message: 'Au moins un atelier doit être sélectionné',
  path: ['atelierIds'],
}).superRefine((data, ctx) => {
  // If nth_of_month is set, ensure frequency is MENSUELLE
  if (data.nth_of_month !== undefined && data.nth_of_month !== null && data.frequence !== 'MENSUELLE') {
    // Auto-correct the frequency to MENSUELLE
    data.frequence = 'MENSUELLE';
  }
  
  // Ensure nth_of_month is a number if it's defined
  if (data.nth_of_month !== undefined && data.nth_of_month !== null) {
    if (typeof data.nth_of_month === 'string') {
      data.nth_of_month = Number(data.nth_of_month);
    }
  }
  
  return true;
});

// Helper function to convert string of comma-separated values to array of numbers
export const parseJoursSemaine = (joursString: string): number[] => {
  if (!joursString) return [];
  return joursString.split(',')
    .map(jour => parseInt(jour.trim(), 10))
    .filter(jour => !isNaN(jour) && jour >= 0 && jour <= 6); // Filter out invalid days
};

// Helper function to convert array of numbers to comma-separated string
export const stringifyJoursSemaine = (jours: number[]): string => {
  return jours.join(',');
};