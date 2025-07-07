'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { showToast } from '@/components/ui/toast-provider';
import { generateRandomColor } from '@/lib/utils';

// Define the form schema using Zod
const atelierSchema = z.object({
  titre: z.string().min(1, 'Le titre est requis'),
  duree_minutes: z.coerce.number().min(15, 'La durée minimum est de 15 minutes'),
  couleur: z.string().nullable().optional(),
});

type AtelierFormData = z.infer<typeof atelierSchema>;

interface AtelierFormProps {
  atelier?: Partial<AtelierFormData> & { id?: string };
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AtelierForm({ atelier, onSuccess, onCancel }: AtelierFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!atelier?.id;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<AtelierFormData>({
    resolver: zodResolver(atelierSchema),
    defaultValues: {
      titre: atelier?.titre || '',
      duree_minutes: atelier?.duree_minutes || 60,
      couleur: atelier?.couleur || generateRandomColor(),
    },
  });

  const onSubmit = async (data: AtelierFormData) => {
    setIsSubmitting(true);
    try {
      const url = isEditMode
        ? `/api/ateliers/${atelier.id}`
        : '/api/ateliers';
      
      const method = isEditMode ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'enregistrement de l\'atelier');
      }

      showToast.success(
        isEditMode
          ? 'Atelier modifié avec succès'
          : 'Atelier créé avec succès'
      );
      
      onSuccess();
    } catch (error) {
      console.error('Error saving atelier:', error);
      showToast.error('Erreur', 'Impossible d\'enregistrer l\'atelier');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateNewColor = () => {
    const newColor = generateRandomColor();
    setValue('couleur', newColor);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label htmlFor="titre" className="form-label">
            Titre
          </label>
          <input
            id="titre"
            type="text"
            className="form-input"
            {...register('titre')}
          />
          {errors.titre && (
            <p className="error-message">{errors.titre.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="duree_minutes" className="form-label">
            Durée (minutes)
          </label>
          <input
            id="duree_minutes"
            type="number"
            min={15}
            step={15}
            className="form-input"
            {...register('duree_minutes')}
          />
          {errors.duree_minutes && (
            <p className="error-message">{errors.duree_minutes.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="couleur" className="form-label">
            Couleur
          </label>
          <div className="flex space-x-2">
            <input
              id="couleur"
              type="color"
              className="h-10 w-10 rounded border border-gray-300"
              {...register('couleur')}
            />
            <button
              type="button"
              className="text-sm text-blue-600 hover:text-blue-800"
              onClick={generateNewColor}
            >
              Générer une couleur aléatoire
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          isLoading={isSubmitting}
          loadingText="Enregistrement..."
        >
          {isEditMode ? 'Modifier' : 'Créer'}
        </Button>
      </div>
    </form>
  );
}