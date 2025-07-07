'use client';

import { useState, useEffect } from 'react';
import { Agent, RoleAgent } from '@prisma/client';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { showToast } from '@/components/ui/toast-provider';
import { formatRole } from '@/lib/utils';
import AgentForm from '@/components/forms/agent-form';
import { Loading } from '@/components/ui/spinner';

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/agents');
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des agents');
      }
      const result = await response.json();
      setAgents(result.success && Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleAddClick = () => {
    setSelectedAgent(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (agent: Agent) => {
    setSelectedAgent(agent);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (agent: Agent) => {
    setSelectedAgent(agent);
    setIsDeleteDialogOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    fetchAgents();
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAgent) return;

    try {
      const response = await fetch(`/api/agents/${selectedAgent.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression de l\'agent');
      }

      showToast.success('Agent supprimé avec succès');
      fetchAgents();
    } catch (error) {
      console.error('Error deleting agent:', error);
      showToast.error('Erreur', 'Impossible de supprimer l\'agent');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestion des Agents</h1>
        <Button
          onClick={handleAddClick}
          leftIcon={<Plus size={16} />}
        >
          Ajouter un agent
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <Loading text="Chargement des agents..." />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Aucun agent trouvé</p>
          <p className="mt-2">Commencez par ajouter un agent</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nom
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prénom
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.isArray(agents) && agents.map((agent) => (
                <tr key={agent.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{agent.nom}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{agent.prenom}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{agent.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span 
                      className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                      style={{ 
                        backgroundColor: `${agent.couleur || '#3b82f6'}20`,
                        color: agent.couleur || '#3b82f6'
                      }}
                    >
                      {formatRole(agent.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      className="text-blue-600 hover:text-blue-900 mr-3"
                      onClick={() => handleEditClick(agent)}
                    >
                      <Edit size={16} className="inline mr-1" />
                      Modifier
                    </button>
                    <button 
                      className="text-red-600 hover:text-red-900"
                      onClick={() => handleDeleteClick(agent)}
                    >
                      <Trash2 size={16} className="inline mr-1" />
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Agent Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={handleFormCancel}
        title={selectedAgent ? 'Modifier un agent' : 'Ajouter un agent'}
        size="lg"
      >
        <AgentForm
          agent={selectedAgent || undefined}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Supprimer l'agent"
        message={`Êtes-vous sûr de vouloir supprimer l'agent ${selectedAgent?.prenom} ${selectedAgent?.nom} ? Cette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="danger"
      />
    </div>
  );
}