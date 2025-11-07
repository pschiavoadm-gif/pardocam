import React from 'react';
import CounterDisplay from './CounterDisplay';
import { WifiIcon, UsersIcon, PencilIcon } from './icons';

interface InfoPanelProps {
  entradas: number;
  salidas: number;
  dentro: number;
  cameraName: string;
  onCameraNameChange: (name: string) => void;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ entradas, salidas, dentro, cameraName, onCameraNameChange }) => {
  return (
    <div className="p-6 h-full flex flex-col justify-between">
      <div>
        <div className="mb-6">
            <label htmlFor="cameraName" className="text-xs text-slate-500">Nombre de la Cámara</label>
            <div className="relative">
                <input
                    id="cameraName"
                    type="text"
                    value={cameraName}
                    onChange={(e) => onCameraNameChange(e.target.value)}
                    className="w-full bg-transparent text-lg font-bold text-slate-800 border-none p-0 focus:ring-0"
                />
            </div>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          <CounterDisplay label="Entradas" value={entradas} color="text-green-500" />
          <CounterDisplay label="Salidas" value={salidas} color="text-red-500" />
          <CounterDisplay label="Dentro" value={dentro} color="text-[#1178C0]" isLarge={true} />
        </div>
      </div>
      <div className="mt-8 border-t border-gray-200 pt-4 flex flex-col space-y-3 text-sm text-gray-500">
        <div className="flex items-center">
            <WifiIcon className="w-5 h-5 text-green-500 mr-2" />
            <span>Estado: <span className="font-semibold text-green-600">Online</span></span>
        </div>
        <div className="flex items-center">
            <UsersIcon className="w-5 h-5 text-gray-400 mr-2" />
            <span>Cola: <span className="font-semibold text-gray-700">0</span></span>
        </div>
        <div className="text-xs text-slate-400 pt-2">
            Nota: La detección de personas es una simulación con fines de demostración.
        </div>
      </div>
    </div>
  );
};

export default InfoPanel;
