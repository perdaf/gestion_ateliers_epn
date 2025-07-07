'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ExportOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
  currentDate: Date;
  currentView: string;
  currentQuarter: number | null;
}

export interface ExportOptions {
  type: 'quarter' | 'custom';
  quarter?: number;
  year?: number;
  startDate?: Date;
  endDate?: Date;
}

export function ExportOptionsModal({
  isOpen,
  onClose,
  onExport,
  currentDate,
  currentView,
  currentQuarter,
}: ExportOptionsModalProps) {
  const currentYear = currentDate.getFullYear();
  
  // Default to current quarter if in quarterly view, otherwise default to custom date range
  const [exportType, setExportType] = useState<'quarter' | 'custom'>(
    currentView === 'multiMonth3' ? 'quarter' : 'custom'
  );
  
  // Default quarter selection to current quarter or Q1
  const [selectedQuarter, setSelectedQuarter] = useState<number>(currentQuarter || 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  
  // For custom date range, default to current month
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  const [startDate, setStartDate] = useState<string>(format(firstDayOfMonth, 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(lastDayOfMonth, 'yyyy-MM-dd'));
  
  const handleExport = () => {
    const options: ExportOptions = {
      type: exportType,
    };
    
    if (exportType === 'quarter') {
      options.quarter = selectedQuarter;
      options.year = selectedYear;
    } else {
      options.startDate = new Date(startDate);
      options.endDate = new Date(endDate);
      // Set time to end of day for the end date to include the full day
      options.endDate.setHours(23, 59, 59, 999);
    }
    
    onExport(options);
    onClose();
  };
  
  // Generate year options (current year, previous year, next year)
  const yearOptions = [
    currentYear - 1,
    currentYear,
    currentYear + 1,
  ];
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Options d'exportation PDF" size="md">
      <div className="space-y-4">
        <div className="flex flex-col space-y-2">
          <label className="font-medium">Format d'exportation</label>
          <div className="flex space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="exportType"
                value="quarter"
                checked={exportType === 'quarter'}
                onChange={() => setExportType('quarter')}
                className="h-4 w-4 text-blue-600"
              />
              <span>Trimestre spécifique</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="exportType"
                value="custom"
                checked={exportType === 'custom'}
                onChange={() => setExportType('custom')}
                className="h-4 w-4 text-blue-600"
              />
              <span>Période personnalisée</span>
            </label>
          </div>
        </div>
        
        {exportType === 'quarter' && (
          <div className="space-y-4">
            <div>
              <label className="block font-medium mb-1">Trimestre</label>
              <select
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value={1}>1er Trimestre (Janvier - Mars)</option>
                <option value={2}>2ème Trimestre (Avril - Juin)</option>
                <option value={3}>3ème Trimestre (Juillet - Septembre)</option>
                <option value={4}>4ème Trimestre (Octobre - Décembre)</option>
              </select>
            </div>
            
            <div>
              <label className="block font-medium mb-1">Année</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        
        {exportType === 'custom' && (
          <div className="space-y-4">
            <div>
              <label className="block font-medium mb-1">Date de début</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            
            <div>
              <label className="block font-medium mb-1">Date de fin</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>
        )}
        
        <div className="flex justify-end space-x-2 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Exporter
          </button>
        </div>
      </div>
    </Modal>
  );
}