'use client';

import { useState } from 'react';

export default function ParametresPage() {
  const [exportFormat, setExportFormat] = useState('pdf');
  const [calendarView, setCalendarView] = useState('month');
  const [defaultDuration, setDefaultDuration] = useState(60);
  const [workingHours, setWorkingHours] = useState({
    start: '09:00',
    end: '18:00',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real application, we would save these settings to a database or local storage
    alert('Paramètres enregistrés avec succès !');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Paramètres</h1>

      <div className="bg-white shadow-md rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h2 className="text-lg font-medium mb-4">Préférences générales</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="exportFormat" className="form-label">
                  Format d&apos;export par défaut
                </label>
                <select
                  id="exportFormat"
                  className="form-select"
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                >
                  <option value="pdf">PDF</option>
                  <option value="ics">ICS (Calendrier)</option>
                </select>
              </div>

              <div>
                <label htmlFor="calendarView" className="form-label">
                  Vue du calendrier par défaut
                </label>
                <select
                  id="calendarView"
                  className="form-select"
                  value={calendarView}
                  onChange={(e) => setCalendarView(e.target.value)}
                >
                  <option value="day">Jour</option>
                  <option value="week">Semaine</option>
                  <option value="month">Mois</option>
                </select>
              </div>

              <div>
                <label htmlFor="defaultDuration" className="form-label">
                  Durée par défaut des événements (minutes)
                </label>
                <input
                  type="number"
                  id="defaultDuration"
                  className="form-input"
                  value={defaultDuration}
                  onChange={(e) => setDefaultDuration(Number(e.target.value))}
                  min={15}
                  step={15}
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-medium mb-4">Heures de travail</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="workingHoursStart" className="form-label">
                  Heure de début
                </label>
                <input
                  type="time"
                  id="workingHoursStart"
                  className="form-input"
                  value={workingHours.start}
                  onChange={(e) =>
                    setWorkingHours({ ...workingHours, start: e.target.value })
                  }
                />
              </div>

              <div>
                <label htmlFor="workingHoursEnd" className="form-label">
                  Heure de fin
                </label>
                <input
                  type="time"
                  id="workingHoursEnd"
                  className="form-input"
                  value={workingHours.end}
                  onChange={(e) =>
                    setWorkingHours({ ...workingHours, end: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn-primary">
              Enregistrer les paramètres
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">Exportation des données</h2>
        <div className="space-y-4">
          <p className="text-gray-600">
            Exportez toutes les données de l&apos;application pour sauvegarde ou migration.
          </p>
          <div className="flex space-x-4">
            <button className="btn-secondary">Exporter les données</button>
            <button className="btn-secondary">Importer des données</button>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-lg font-medium text-red-600 mb-4">Zone de danger</h2>
        <div className="space-y-4">
          <p className="text-gray-600">
            Attention : les actions suivantes sont irréversibles.
          </p>
          <div className="flex space-x-4">
            <button className="btn-danger">Réinitialiser les paramètres</button>
            <button className="btn-danger">Effacer toutes les données</button>
          </div>
        </div>
      </div>
    </div>
  );
}