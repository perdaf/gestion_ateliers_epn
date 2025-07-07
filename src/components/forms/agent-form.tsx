'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { RoleAgent } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { showToast } from '@/components/ui/toast-provider';
import { generateRandomColor } from '@/lib/utils';

// Define the form schema using Zod
const agentSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  prenom: z.string().min(1, 'Le prénom est requis'),
  email: z.string().email('Email invalide'),
  role: z.nativeEnum(RoleAgent, {
    errorMap: () => ({ message: 'Rôle invalide' }),
  }),
  couleur: z.string().nullable().optional(),
});

type AgentFormData = z.infer<typeof agentSchema>;

interface AgentFormProps {
  agent?: Partial<AgentFormData> & { id?: string };
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AgentForm({ agent, onSuccess, onCancel }: AgentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!agent?.id;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<AgentFormData>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      nom: agent?.nom || '',
      prenom: agent?.prenom || '',
      email: agent?.email || '',
      role: agent?.role || RoleAgent.ANIMATEUR,
      couleur: agent?.couleur || generateRandomColor(),
    },
  });

  const onSubmit = async (data: AgentFormData) => {
    setIsSubmitting(true);
    try {
      const url = isEditMode
        ? `/api/agents/${agent.id}`
        : '/api/agents';
      
      const method = isEditMode ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'enregistrement de l\'agent');
      }

      showToast.success(
        isEditMode
          ? 'Agent modifié avec succès'
          : 'Agent créé avec succès'
      );
      
      onSuccess();
    } catch (error) {
      console.error('Error saving agent:', error);
      showToast.error('Erreur', 'Impossible d\'enregistrer l\'agent');
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="nom" className="form-label">
            Nom
          </label>
          <input
            id="nom"
            type="text"
            className="form-input"
            {...register('nom')}
          />
          {errors.nom && (
            <p className="error-message">{errors.nom.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="prenom" className="form-label">
            Prénom
          </label>
          <input
            id="prenom"
            type="text"
            className="form-input"
            {...register('prenom')}
          />
          {errors.prenom && (
            <p className="error-message">{errors.prenom.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="form-label">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="form-input"
            {...register('email')}
          />
          {errors.email && (
            <p className="error-message">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="role" className="form-label">
            Rôle
          </label>
          <select
            id="role"
            className="form-select"
            {...register('role')}
          >
            <option value={RoleAgent.ANIMATEUR}>Animateur</option>
            <option value={RoleAgent.PORTEUR_PROJET}>Porteur de projet</option>
            <option value={RoleAgent.ADMIN}>Administrateur</option>
          </select>
          {errors.role && (
            <p className="error-message">{errors.role.message}</p>
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