import React, { useState, useEffect } from 'react';
import { Package, Plus, Minus, Search, Trash2, Edit, AlertTriangle } from 'lucide-react';
import { getInventory, deleteInventoryItem, updateInventoryItem } from '../services/storageService';
import AddInventoryModal from '../components/AddInventoryModal';

const InventoryPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [quickMove, setQuickMove] = useState({});

  const handleQuickMove = async (item, amount) => {
    if (!amount || isNaN(amount) || amount === 0) return;
    const newQuantity = Math.max(0, item.quantity + amount);
    
    // Set a temporary loading state for this row if needed, but since it's fast, we just await
    await updateInventoryItem(item.id, { quantity: newQuantity });
    
    setQuickMove(prev => ({ ...prev, [item.id]: '' }));
    loadData();
  };

  const loadData = async () => {
    setLoading(true);
    const fetchedItems = await getInventory();
    setItems(fetchedItems || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (itemId) => {
    if (window.confirm('Deseja realmente excluir este insumo?')) {
      await deleteInventoryItem(itemId);
      await loadData();
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
    loadData();
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Carregando estoque...</div>;
  }

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <header className="header-responsive">
        <div>
          <h1 className="text-h1">Controle de Estoque</h1>
          <p className="text-subtitle">Gerencie os insumos da clínica.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Novo Insumo
        </button>
      </header>

      {/* Search */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Search size={20} color="var(--text-secondary)" />
          <input
            type="text"
            placeholder="Buscar insumo ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1, border: 'none', outline: 'none', fontSize: '0.9375rem',
              backgroundColor: 'transparent', color: 'var(--text-primary)',
              fontFamily: 'inherit'
            }}
          />
        </div>
      </div>

      {/* Inventory List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredItems.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <Package size={48} style={{ marginBottom: '1rem', opacity: 0.4 }} />
            <p>Nenhum insumo encontrado.</p>
          </div>
        ) : (
          <div className="card table-responsive" style={{ padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--background)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.8125rem', textTransform: 'uppercase' }}>Insumo</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.8125rem', textTransform: 'uppercase' }}>Categoria</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.8125rem', textTransform: 'uppercase', textAlign: 'center' }}>Quantidade</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.8125rem', textTransform: 'uppercase', textAlign: 'center' }}>Movimentação</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.8125rem', textTransform: 'uppercase' }}>Observações</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.8125rem', textTransform: 'uppercase', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, idx) => {
                  const isLowStock = item.quantity <= item.min_quantity;
                  return (
                    <tr key={item.id} style={{ borderBottom: idx < filteredItems.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--primary-light)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', color: 'var(--primary)'
                          }}>
                            <Package size={16} />
                          </div>
                          {item.name}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                        {item.category || '-'}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          <span style={{ 
                            fontWeight: '600', fontSize: '1rem', 
                            color: isLowStock ? 'var(--danger)' : 'var(--text-primary)' 
                          }}>
                            {item.quantity} {item.unit}
                          </span>
                          {isLowStock && (
                            <AlertTriangle size={16} color="var(--danger)" title="Estoque baixo!" />
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}>
                          <input 
                            type="number" 
                            min="0" 
                            placeholder="Qtd" 
                            style={{ 
                              width: '60px', padding: '0.375rem', 
                              border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                              fontSize: '0.875rem', textAlign: 'center',
                              backgroundColor: 'var(--background)', color: 'var(--text-primary)'
                            }}
                            value={quickMove[item.id] || ''}
                            onChange={(e) => setQuickMove(prev => ({ ...prev, [item.id]: e.target.value }))}
                          />
                          <button 
                            style={{ 
                              padding: '0.375rem', color: 'var(--secondary)', 
                              border: '1px solid var(--secondary)', borderRadius: 'var(--radius-sm)',
                              background: 'transparent', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'var(--transition)'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--secondary)'; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--secondary)'; }}
                            onClick={() => handleQuickMove(item, parseInt(quickMove[item.id] || 0))}
                            title="Adicionar ao Estoque (+)"
                          >
                            <Plus size={14} />
                          </button>
                          <button 
                            style={{ 
                              padding: '0.375rem', color: 'var(--danger)', 
                              border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)',
                              background: 'transparent', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'var(--transition)'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--danger)'; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--danger)'; }}
                            onClick={() => handleQuickMove(item, -parseInt(quickMove[item.id] || 0))}
                            title="Retirar do Estoque (-)"
                          >
                            <Minus size={14} />
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                        {item.observations || '-'}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleEdit(item)}
                            style={{ padding: '0.375rem', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'var(--transition)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--background)'; e.currentTarget.style.color = 'var(--primary)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                            title="Editar Insumo"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            style={{ padding: '0.375rem', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'var(--transition)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; e.currentTarget.style.color = 'var(--danger)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                            title="Excluir Insumo"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <AddInventoryModal 
          onClose={handleCloseModal} 
          item={editingItem} 
        />
      )}
    </div>
  );
};

export default InventoryPage;
