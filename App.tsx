import React, { useState, useCallback } from 'react';
import CameraView from './components/CameraView';
import InfoPanel from './components/InfoPanel';

function App() {
  const [entradas, setEntradas] = useState(123);
  const [salidas, setSalidas] = useState(78);

  const handleEntry = useCallback(() => {
    setEntradas(prev => prev + 1);
  }, []);

  const handleExit = useCallback(() => {
    setSalidas(prev => prev + 1);
  }, []);

  const dentro = entradas - salidas;

  return (
    <main className="bg-[#ECEFF1] min-h-screen w-full flex items-center justify-center p-4 lg:p-8">
      <div className="w-full max-w-5xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col lg:flex-row">
        <div className="w-full lg:w-2/3">
          <CameraView onEntry={handleEntry} onExit={handleExit} />
        </div>
        <div className="w-full lg:w-1/3 bg-[#F6F7F8]">
          <InfoPanel entradas={entradas} salidas={salidas} dentro={dentro} />
        </div>
      </div>
    </main>
  );
}

export default App;