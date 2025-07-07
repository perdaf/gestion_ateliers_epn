'use client';

import { useState, useEffect } from 'react';
import { Atelier } from '@prisma/client';
import { Plus, Edit, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { showToast } from '@/components/ui/toast-provider';
import AtelierForm from '@/components/forms/atelier-form';
import { Loading } from '@/components/ui/spinner';

export default function AteliersPage() {
  const [ateliers, setAteliers] = useState<Atelier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAtelier, setSelectedAtelier] = useState<Atelier | null>(null);

  const fetchAteliers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ateliers');
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des ateliers');
      }
      const result = await response.json();
      setAteliers(result.success && Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setAteliers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAteliers();
  }, []);

  const handleAddClick = () => {
    setSelectedAtelier(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (atelier: Atelier) => {
    setSelectedAtelier(atelier);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (atelier: Atelier) => {
    setSelectedAtelier(atelier);
    setIsDeleteDialogOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    fetchAteliers();
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAtelier) return;

    try {
      const response = await fetch(`/api/ateliers/${selectedAtelier.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression de l\'atelier');
      }

      showToast.success('Atelier supprimé avec succès');
      fetchAteliers();
    } catch (error) {
      console.error('Error deleting atelier:', error);
      showToast.error('Erreur', 'Impossible de supprimer l\'atelier');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestion des Ateliers</h1>
        <Button
          onClick={handleAddClick}
          leftIcon={<Plus size={16} />}
        >
          Ajouter un atelier
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <Loading text="Chargement des ateliers..." />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      ) : ateliers.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Aucun atelier trouvé</p>
          <p className="mt-2">Commencez par ajouter un atelier</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.isArray(ateliers) && ateliers.map((atelier) => (
            <div
              key={atelier.id}
              className="bg-white rounded-lg shadow-md overflow-hidden"
              style={{ borderLeft: `4px solid ${atelier.couleur || '#3b82f6'}` }}
            >
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-2">{atelier.titre}</h3>
                <div className="flex items-center text-sm text-gray-600 mb-4">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{atelier.duree_minutes} minutes</span>
                </div>
                <div className="flex justify-end space-x-2 mt-4">
                  <button 
                    className="text-blue-600 hover:text-blue-900"
                    onClick={() => handleEditClick(atelier)}
                  >
                    <Edit size={16} className="inline mr-1" />
                    Modifier
                  </button>
                  <button 
                    className="text-red-600 hover:text-red-900"
                    onClick={() => handleDeleteClick(atelier)}
                  >
                    <Trash2 size={16} className="inline mr-1" />
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Atelier Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={handleFormCancel}
        title={selectedAtelier ? 'Modifier un atelier' : 'Ajouter un atelier'}
        size="md"
      >
        <AtelierForm
          atelier={selectedAtelier || undefined}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Supprimer l'atelier"
        message={`Êtes-vous sûr de vouloir supprimer l'atelier "${selectedAtelier?.titre}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="danger"
      />
    </div>
  );
}