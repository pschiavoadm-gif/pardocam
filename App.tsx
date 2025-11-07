import React, { useState, useCallback } from 'react';
import CameraView from './components/CameraView';
import InfoPanel from './components/InfoPanel';
import AdminDashboard from './components/AdminDashboard';
import { CameraIcon, ChartBarIcon } from './components/icons';

type View = 'camera' | 'dashboard';

function App() {
  const [entradas, setEntradas] = useState(123);
  const [salidas, setSalidas] = useState(78);
  const [cameraName, setCameraName] = useState("Entrada Principal - Sucursal 1");
  const [currentView, setCurrentView] = useState<View>('camera');

  const handleEntry = useCallback(() => {
    setEntradas(prev => prev + 1);
  }, []);

  const handleExit = useCallback(() => {
    setSalidas(prev => prev + 1);
  }, []);

  const dentro = entradas - salidas;

  const CameraApp = () => (
    <div className="w-full max-w-5xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col lg:flex-row">
      <div className="w-full lg:w-2/3">
        <CameraView onEntry={handleEntry} onExit={handleExit} />
      </div>
      <div className="w-full lg:w-1/3 bg-[#F6F7F8]">
        <InfoPanel 
          entradas={entradas} 
          salidas={salidas} 
          dentro={dentro} 
          cameraName={cameraName}
          onCameraNameChange={setCameraName}
        />
      </div>
    </div>
  );

  return (
    <main className="bg-[#ECEFF1] min-h-screen w-full flex flex-col items-center justify-center p-4 lg:p-8">
      <div className="w-full max-w-5xl mx-auto mb-4 flex justify-end">
        <button 
          onClick={() => setCurrentView(currentView === 'camera' ? 'dashboard' : 'camera')}
          className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 font-semibold rounded-lg shadow hover:bg-slate-50 transition-colors"
        >
          {currentView === 'camera' ? <ChartBarIcon className="w-5 h-5" /> : <CameraIcon className="w-5 h-5" />}
          <span>{currentView === 'camera' ? 'Ver Dashboard' : 'Ver Cámara'}</span>
        </button>
      </div>
      
      {currentView === 'camera' ? <CameraApp /> : <AdminDashboard />}

    </main>
  );
}

export default App;
