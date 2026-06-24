import React, { useState, useEffect } from 'react';
import { X, Package, Hash, AlertTriangle, Layers, Plus, Minus } from 'lucide-react';
import { addInventoryItem, updateInventoryItem } from '../services/storageService';

const AddInventoryModal = ({ onClose, item }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: 0,
    unit: 'unidade',
    min_quantity: 0,
    observations: '',
    entrada: '',
    saida: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        category: item.category || '',
        quantity: item.quantity,
        unit: item.unit || 'unidade',
        min_quantity: item.min_quantity,
        observations: item.observations || '',
        entrada: '',
        saida: ''
      });
    }
  }, [item]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updates = { [name]: name === 'quantity' || name === 'min_quantity' ? parseInt(value) || 0 : value };
      // If user manually changes quantity, clear the movement fields to prevent snapping back
      if (name === 'quantity') {
        updates.entrada = '';
        updates.saida = '';
      }
      return { ...prev, ...updates };
    });
  };

  const handleMovementChange = (e) => {
    const { name, value } = e.target;
    const numValue = parseInt(value) || 0;
    
    setFormData(prev => {
      const entradaVal = name === 'entrada' ? numValue : (parseInt(prev.entrada) || 0);
      const saidaVal = name === 'saida' ? numValue : (parseInt(prev.saida) || 0);
      
      // Calculate new quantity based on the original item quantity
      const baseQty = item ? item.quantity : 0;
      const newQuantity = Math.max(0, baseQty + entradaVal - saidaVal);
      
      return {
        ...prev,
        [name]: value,
        quantity: newQuantity
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const payload = { ...formData };
    delete payload.entrada;
    delete payload.saida;
    
    if (item) {
      await updateInventoryItem(item.id, payload);
    } else {
      await addInventoryItem(payload);
    }
    
    setLoading(false);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '1rem'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '500px', position: 'relative', padding: '2rem' }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '1.5rem', right: '1.5rem',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)'
          }}
        >
          <X size={20} />
        </button>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
          {item ? 'Editar Insumo' : 'Novo Insumo'}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="form-group">
            <label className="form-label" htmlFor="name">Nome do Insumo *</label>
            <div className="input-with-icon">
              <Package size={18} />
              <input
                type="text" id="name" name="name" className="form-input"
                required placeholder="Ex: Luvas de Procedimento"
                value={formData.name} onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="category">Categoria</label>
            <div className="input-with-icon">
              <Layers size={18} />
              <input
                type="text" id="category" name="category" className="form-input"
                placeholder="Ex: EPIs, Limpeza, Papelaria..."
                value={formData.category} onChange={handleChange}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="quantity">Quantidade Final</label>
              <div className="input-with-icon">
                <Hash size={18} />
                <input
                  type="number" id="quantity" name="quantity" className="form-input"
                  required min="0"
                  value={formData.quantity} onChange={handleChange}
                  style={{ 
                    backgroundColor: (formData.entrada || formData.saida) ? 'var(--primary-light)' : 'var(--background)',
                    transition: 'var(--transition)'
                  }}
                />
              </div>
              {item && (formData.entrada || formData.saida) ? (
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.25rem' }}>Calculado automaticamente</span>
              ) : null}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="unit">Unidade</label>
              <select
                id="unit" name="unit" className="form-input"
                value={formData.unit} onChange={handleChange}
              >
                <option value="unidade">Unidade(s)</option>
                <option value="caixa">Caixa(s)</option>
                <option value="pacote">Pacote(s)</option>
                <option value="litro">Litro(s)</option>
                <option value="kg">Kg</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="min_quantity" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Quantidade Mínima <AlertTriangle size={14} color="var(--warning)" />
            </label>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', marginTop: '-0.25rem' }}>
              Alerta quando o estoque chegar neste valor
            </p>
            <div className="input-with-icon">
              <Hash size={18} />
              <input
                type="number" id="min_quantity" name="min_quantity" className="form-input"
                required min="0"
                value={formData.min_quantity} onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="observations">Observações</label>
            <div className="input-with-icon" style={{ alignItems: 'flex-start' }}>
              <Layers size={18} style={{ marginTop: '0.625rem' }} />
              <textarea
                id="observations" name="observations" className="form-input"
                placeholder="Ex: Lacrados, Importante!, Usado..."
                value={formData.observations} onChange={handleChange}
                rows={3}
                style={{ resize: 'vertical', minHeight: '80px' }}
              />
            </div>
          </div>

          {item && (
            <div style={{ padding: '1.25rem', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)', marginTop: '0.5rem' }}>
              <h3 style={{ fontSize: '0.8125rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Movimentação Rápida
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--secondary)' }}>Entrada (+)</label>
                  <div className="input-with-icon">
                    <Plus size={18} color="var(--secondary)" />
                    <input
                      type="number" name="entrada" className="form-input"
                      min="0" placeholder="Adicionar"
                      value={formData.entrada} onChange={handleMovementChange}
                      style={{ borderColor: formData.entrada ? 'var(--secondary)' : '' }}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--danger)' }}>Saída (-)</label>
                  <div className="input-with-icon">
                    <Minus size={18} color="var(--danger)" />
                    <input
                      type="number" name="saida" className="form-input"
                      min="0" placeholder="Retirar"
                      value={formData.saida} onChange={handleMovementChange}
                      style={{ borderColor: formData.saida ? 'var(--danger)' : '' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Insumo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddInventoryModal;
