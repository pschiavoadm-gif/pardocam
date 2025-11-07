import React from 'react';

// --- Mock Data Generation ---
const generateBranchData = () => {
  const branches = [];
  for (let i = 1; i <= 100; i++) {
    const entradas = Math.floor(Math.random() * 500) + 50;
    const salidas = Math.floor(Math.random() * entradas);
    branches.push({
      id: i,
      name: `Sucursal ${i}`,
      location: `Ciudad ${String.fromCharCode(65 + (i % 26))}`,
      entradas,
      salidas,
      dentro: entradas - salidas,
      status: Math.random() > 0.1 ? 'Online' : 'Offline',
    });
  }
  return branches;
};

const mockBranches = generateBranchData();
const totalStats = mockBranches.reduce(
  (acc, branch) => {
    acc.entradas += branch.entradas;
    acc.salidas += branch.salidas;
    acc.dentro += branch.dentro;
    if (branch.status === 'Online') acc.online++;
    return acc;
  },
  { entradas: 0, salidas: 0, dentro: 0, online: 0 }
);
// --- End Mock Data ---


const StatCard = ({ label, value, color = 'text-slate-800' }: { label: string; value: string | number; color?: string }) => (
    <div className="bg-white p-6 rounded-xl shadow">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className={`text-4xl font-bold tracking-tight ${color}`}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
    </div>
);

const AdminDashboard: React.FC = () => {
  return (
    <div className="w-full max-w-5xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden p-6 lg:p-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Dashboard de Sucursales</h1>
      <p className="text-slate-500 mb-8">Resumen en tiempo real de todas las cámaras activas.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard label="Total Dentro" value={totalStats.dentro} color="text-[#1178C0]" />
        <StatCard label="Total Entradas (Hoy)" value={totalStats.entradas} color="text-green-500" />
        <StatCard label="Total Salidas (Hoy)" value={totalStats.salidas} color="text-red-500" />
        <StatCard label="Cámaras Online" value={`${totalStats.online} / 100`} color="text-slate-800" />
      </div>

      <div className="bg-slate-50 rounded-xl">
        <h2 className="text-xl font-bold text-slate-800 p-4 border-b border-slate-200">Detalle por Sucursal</h2>
        <div className="overflow-x-auto max-h-[400px]">
          <table className="min-w-full text-sm text-left text-slate-500">
            <thead className="text-xs text-slate-700 uppercase bg-slate-100 sticky top-0">
              <tr>
                <th scope="col" className="px-6 py-3">Sucursal</th>
                <th scope="col" className="px-6 py-3">Estado</th>
                <th scope="col" className="px-6 py-3 text-right">Dentro</th>
                <th scope="col" className="px-6 py-3 text-right">Entradas</th>
                <th scope="col" className="px-6 py-3 text-right">Salidas</th>
              </tr>
            </thead>
            <tbody>
              {mockBranches.map((branch) => (
                <tr key={branch.id} className="bg-white border-b hover:bg-slate-50">
                  <th scope="row" className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">
                    {branch.name} <span className="font-normal text-slate-400">({branch.location})</span>
                  </th>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${branch.status === 'Online' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {branch.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-[#1178C0]">{branch.dentro.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-green-600">{branch.entradas.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-red-600">{branch.salidas.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
