import React, { useState, useEffect, useMemo } from 'react';
import { 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Trash2, 
  PieChart, 
  Wallet,
  Settings,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

// --- Componentes UI ---

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${className}`}>
    {children}
  </div>
);

const StatCard = ({ title, value, subtext, trend, icon: Icon, colorClass = "text-slate-600" }) => (
  <Card className="p-6 flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
      {subtext && (
        <p className={`text-xs mt-2 font-medium flex items-center ${trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-600' : 'text-slate-500'}`}>
          {trend === 'up' ? <TrendingUp size={14} className="mr-1" /> : trend === 'down' ? <TrendingDown size={14} className="mr-1" /> : null}
          {subtext}
        </p>
      )}
    </div>
    <div className={`p-3 rounded-lg bg-opacity-10 ${colorClass.replace('text-', 'bg-')}`}>
      <Icon size={24} className={colorClass} />
    </div>
  </Card>
);

const Button = ({ children, onClick, variant = 'primary', className = '', ...props }) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-900",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-200",
    danger: "bg-rose-50 text-rose-600 hover:bg-rose-100 focus:ring-rose-200",
    gold: "bg-amber-400 text-amber-950 hover:bg-amber-500 focus:ring-amber-400"
  };
  
  return (
    <button 
      onClick={onClick} 
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Utilidades ---

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
};

// --- App Principal ---

export default function App() {
  // --- Estados ---
  
  // Precios Spot
  const [spotPrices, setSpotPrices] = useState(() => {
    const saved = localStorage.getItem('spotPrices');
    return saved ? JSON.parse(saved) : { gold: 2300.00, silver: 27.50, lastUpdated: null };
  });

  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [priceError, setPriceError] = useState(null);

  // Colección de Monedas
  const [portfolio, setPortfolio] = useState(() => {
    const saved = localStorage.getItem('portfolio');
    return saved ? JSON.parse(saved) : [];
  });

  // UI States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  
  // Formulario Nuevo Item
  const [newItem, setNewItem] = useState({
    name: '',
    metal: 'gold', // 'gold' | 'silver'
    weight: '',
    unit: 'oz', // 'oz' | 'g'
    purchasePrice: '',
    purchaseDate: new Date().toISOString().split('T')[0]
  });

  // --- Efectos ---

  useEffect(() => {
    localStorage.setItem('spotPrices', JSON.stringify(spotPrices));
  }, [spotPrices]);

  useEffect(() => {
    localStorage.setItem('portfolio', JSON.stringify(portfolio));
  }, [portfolio]);

  // Efecto para cargar precios al inicio
  useEffect(() => {
    fetchLivePrices();
  }, []);

  // --- Lógica de API ---

  const fetchLivePrices = async () => {
    setIsLoadingPrices(true);
    setPriceError(null);
    try {
      // Usamos CoinGecko API v3 (Gratuita, sin key)
      // pax-gold = Token respaldado por oro (aprox 1 oz)
      // kinesis-silver = Token respaldado por plata (aprox 1 oz)
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=pax-gold,kinesis-silver&vs_currencies=eur'
      );
      
      if (!response.ok) throw new Error('Error de conexión');
      
      const data = await response.json();
      
      // Verificamos que lleguen los datos
      if (data['pax-gold'] && data['kinesis-silver']) {
        setSpotPrices({
          gold: data['pax-gold'].eur,
          silver: data['kinesis-silver'].eur,
          lastUpdated: new Date().toISOString()
        });
      } else {
        throw new Error('Datos incompletos');
      }
    } catch (err) {
      console.error("Fallo al actualizar precios:", err);
      setPriceError("No se pudieron obtener precios en vivo. Usando últimos guardados.");
    } finally {
      setIsLoadingPrices(false);
    }
  };

  // --- Cálculos Financieros ---

  const stats = useMemo(() => {
    let totalInvested = 0;
    let currentValue = 0;
    let goldValue = 0;
    let silverValue = 0;

    portfolio.forEach(item => {
      const weightInOz = item.unit === 'g' ? item.weight * 0.0321507 : item.weight;
      const spotPrice = item.metal === 'gold' ? spotPrices.gold : spotPrices.silver;
      const itemCurrentValue = weightInOz * spotPrice;

      totalInvested += parseFloat(item.purchasePrice);
      currentValue += itemCurrentValue;

      if (item.metal === 'gold') goldValue += itemCurrentValue;
      else silverValue += itemCurrentValue;
    });

    const profitLoss = currentValue - totalInvested;
    const roi = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

    return {
      totalInvested,
      currentValue,
      profitLoss,
      roi,
      goldValue,
      silverValue
    };
  }, [portfolio, spotPrices]);

  // --- Manejadores ---

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItem.name || !newItem.weight || !newItem.purchasePrice) return;

    const item = {
      id: crypto.randomUUID(),
      ...newItem,
      weight: parseFloat(newItem.weight),
      purchasePrice: parseFloat(newItem.purchasePrice)
    };

    setPortfolio([item, ...portfolio]);
    setNewItem({
      name: '',
      metal: 'gold',
      weight: '',
      unit: 'oz',
      purchasePrice: '',
      purchaseDate: new Date().toISOString().split('T')[0]
    });
    setIsAddModalOpen(false);
  };

  const handleDeleteItem = (id) => {
    if (confirm('¿Estás seguro de eliminar esta moneda de tu colección?')) {
      setPortfolio(portfolio.filter(item => item.id !== id));
    }
  };

  const handleUpdatePrices = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    setSpotPrices({
      gold: parseFloat(formData.get('goldPrice')),
      silver: parseFloat(formData.get('silverPrice')),
      lastUpdated: new Date().toISOString()
    });
    setIsPriceModalOpen(false);
  };

  // --- Renderizado ---

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      
      {/* Header */}
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-300 to-amber-600 rounded-full flex items-center justify-center text-amber-900 font-bold text-lg">
              $
            </div>
            <h1 className="text-xl font-bold tracking-tight hidden sm:block">Aurum<span className="text-slate-400">&</span>Argentum</h1>
            <h1 className="text-xl font-bold tracking-tight sm:hidden">A<span className="text-slate-400">&</span>A</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <div 
              onClick={() => setIsPriceModalOpen(true)}
              className="flex items-center space-x-3 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-full text-sm transition-colors border border-slate-700 cursor-pointer select-none"
            >
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span className="text-amber-400 font-medium hidden sm:inline">Oro:</span>
                <span className="text-white font-mono">{formatCurrency(spotPrices.gold)}</span>
              </div>
              <span className="text-slate-600">|</span>
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                <span className="text-slate-300 font-medium hidden sm:inline">Plata:</span>
                <span className="text-white font-mono">{formatCurrency(spotPrices.silver)}</span>
              </div>
            </div>

            <button 
              onClick={fetchLivePrices}
              disabled={isLoadingPrices}
              className={`p-2 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-all ${isLoadingPrices ? 'animate-spin text-amber-500' : ''}`}
              title="Sincronizar precios ahora"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Timestamp Info */}
        <div className="flex justify-between items-center text-xs text-slate-500 px-1">
          <span>
             {spotPrices.lastUpdated ? 
               `Precios de mercado: ${new Date(spotPrices.lastUpdated).toLocaleTimeString()} - ${new Date(spotPrices.lastUpdated).toLocaleDateString()}` : 
               'Precios estimados (manuales)'
             }
          </span>
          {priceError && (
            <span className="text-rose-500 flex items-center">
              <AlertCircle size={12} className="mr-1"/> {priceError}
            </span>
          )}
        </div>

        {/* KPI Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Valor Total Cartera" 
            value={formatCurrency(stats.currentValue)}
            icon={Wallet}
            colorClass="text-blue-600"
          />
          <StatCard 
            title="Ganancia/Pérdida Total" 
            value={formatCurrency(stats.profitLoss)}
            subtext={`${stats.roi.toFixed(2)}% ROI Global`}
            trend={stats.profitLoss >= 0 ? 'up' : 'down'}
            icon={TrendingUp}
            colorClass={stats.profitLoss >= 0 ? "text-emerald-600" : "text-rose-600"}
          />
          <StatCard 
            title="Valor en Oro" 
            value={formatCurrency(stats.goldValue)}
            subtext={`${stats.currentValue > 0 ? ((stats.goldValue / stats.currentValue) * 100).toFixed(0) : 0}% de la cartera`}
            icon={Coins}
            colorClass="text-amber-500"
          />
          <StatCard 
            title="Valor en Plata" 
            value={formatCurrency(stats.silverValue)}
            subtext={`${stats.currentValue > 0 ? ((stats.silverValue / stats.currentValue) * 100).toFixed(0) : 0}% de la cartera`}
            icon={Coins}
            colorClass="text-slate-400"
          />
        </div>

        {/* Action Bar */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center">
            <PieChart className="mr-2 text-slate-400" size={24}/>
            Mi Colección
          </h2>
          <Button onClick={() => setIsAddModalOpen(true)} variant="primary">
            <Plus size={18} className="mr-2" />
            Añadir Moneda
          </Button>
        </div>

        {/* Listado de Monedas */}
        <Card className="overflow-hidden">
          {portfolio.length === 0 ? (
            <div className="text-center py-20 px-4">
              <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Coins size={40} className="text-slate-300" />
              </div>
              <h3 className="text-lg font-medium text-slate-900">Tu colección está vacía</h3>
              <p className="text-slate-500 max-w-sm mx-auto mt-2 mb-6">Empieza añadiendo tu primera moneda de oro o plata para realizar el seguimiento de tu inversión.</p>
              <Button onClick={() => setIsAddModalOpen(true)} variant="secondary">
                Añadir primera moneda
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 tracking-wider">
                    <th className="px-6 py-4 font-semibold">Metal / Nombre</th>
                    <th className="px-6 py-4 font-semibold">Peso</th>
                    <th className="px-6 py-4 font-semibold">Fecha Compra</th>
                    <th className="px-6 py-4 font-semibold text-right">Coste Base</th>
                    <th className="px-6 py-4 font-semibold text-right">Valor Hoy</th>
                    <th className="px-6 py-4 font-semibold text-right">P/G</th>
                    <th className="px-6 py-4 font-semibold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {portfolio.map((item) => {
                    const weightInOz = item.unit === 'g' ? item.weight * 0.0321507 : item.weight;
                    const spotPrice = item.metal === 'gold' ? spotPrices.gold : spotPrices.silver;
                    const currentVal = weightInOz * spotPrice;
                    const profit = currentVal - item.purchasePrice;
                    const percent = item.purchasePrice > 0 ? ((profit / item.purchasePrice) * 100).toFixed(1) : '0.0';

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${item.metal === 'gold' ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-600'}`}>
                              {item.metal === 'gold' ? 'Au' : 'Ag'}
                            </div>
                            <div>
                              <div className="font-medium text-slate-900">{item.name}</div>
                              <div className="text-xs text-slate-500 uppercase">{item.metal === 'gold' ? 'Oro' : 'Plata'} Puro</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-medium">
                          {item.weight} <span className="text-slate-400 text-sm">{item.unit}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 text-sm">
                          {formatDate(item.purchaseDate)}
                        </td>
                        <td className="px-6 py-4 text-right text-slate-600">
                          {formatCurrency(item.purchasePrice)}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-slate-900">
                          {formatCurrency(currentVal)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${profit >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                            {profit >= 0 ? '+' : ''}{formatCurrency(profit)} ({profit >= 0 ? '+' : ''}{percent}%)
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>

      {/* Modal: Añadir Moneda */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Añadir Nueva Pieza">
        <form onSubmit={handleAddItem} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre / Descripción</label>
            <input 
              required
              type="text" 
              placeholder="Ej. Krugerrand 1oz, Filarmónica..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
              value={newItem.name}
              onChange={e => setNewItem({...newItem, name: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Metal</label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setNewItem({...newItem, metal: 'gold'})}
                  className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${newItem.metal === 'gold' ? 'bg-amber-100 border-amber-400 text-amber-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  Oro
                </button>
                <button
                  type="button"
                  onClick={() => setNewItem({...newItem, metal: 'silver'})}
                  className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${newItem.metal === 'silver' ? 'bg-slate-200 border-slate-400 text-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  Plata
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Compra</label>
              <input 
                required
                type="date" 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                value={newItem.purchaseDate}
                onChange={e => setNewItem({...newItem, purchaseDate: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Peso</label>
              <div className="flex">
                <input 
                  required
                  type="number" 
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-l-lg focus:ring-2 focus:ring-slate-900 outline-none"
                  value={newItem.weight}
                  onChange={e => setNewItem({...newItem, weight: e.target.value})}
                />
                <select 
                  className="bg-slate-100 border border-l-0 border-slate-300 rounded-r-lg px-2 text-sm text-slate-700 outline-none"
                  value={newItem.unit}
                  onChange={e => setNewItem({...newItem, unit: e.target.value})}
                >
                  <option value="oz">oz</option>
                  <option value="g">g</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Coste Total (€)</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400">€</span>
                <input 
                  required
                  type="number" 
                  step="0.01"
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                  value={newItem.purchasePrice}
                  onChange={e => setNewItem({...newItem, purchasePrice: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button type="submit" className="w-full">
              Guardar en Colección
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Configurar Precio Spot */}
      <Modal isOpen={isPriceModalOpen} onClose={() => setIsPriceModalOpen(false)} title="Actualizar Precio Spot (Por Onza)">
        <form onSubmit={handleUpdatePrices} className="space-y-4">
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 mb-4">
            <h4 className="text-amber-800 font-medium mb-2 flex items-center">
              <TrendingUp size={16} className="mr-2"/> Ajuste Manual
            </h4>
            <p className="text-sm text-amber-700">Puedes sobrescribir manualmente los precios detectados automáticamente si lo prefieres.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Precio Onza Oro (€)</label>
            <input 
              name="goldPrice"
              type="number" 
              step="0.01"
              defaultValue={spotPrices.gold}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none text-lg font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Precio Onza Plata (€)</label>
            <input 
              name="silverPrice"
              type="number" 
              step="0.01"
              defaultValue={spotPrices.silver}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 outline-none text-lg font-mono"
            />
          </div>

          <div className="pt-2">
            <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800">
              Guardar Precios Manuales
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}