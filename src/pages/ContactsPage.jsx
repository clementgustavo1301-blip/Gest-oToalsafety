import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Search, Plus, Edit2, Trash2, X, AlertCircle, Phone, Mail, Building2, User, Briefcase, MessageCircle } from 'lucide-react';

const ContactsPage = () => {
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState('all');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [currentContact, setCurrentContact] = useState({
    id: null,
    group_id: '',
    name: '',
    role: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .order('name');
        
      if (groupsError) throw groupsError;
      setGroups(groupsData || []);
      
      // Fetch contacts with group info
      const { data: contactsData, error: contactsError } = await supabase
        .from('group_contacts')
        .select(`
          *,
          group:groups(name)
        `)
        .order('name');
        
      if (contactsError) throw contactsError;
      setContacts(contactsData || []);
      
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      // Ignores if table does not exist (fallback for dev mode)
      if (err.code !== '42P01') {
        setError('Erro ao carregar os dados. Verifique a conexão.');
      } else {
        setContacts([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (contact = null) => {
    if (contact) {
      setCurrentContact(contact);
    } else {
      setCurrentContact({
        id: null,
        group_id: groups.length > 0 ? groups[0].id : '',
        name: '',
        role: '',
        email: '',
        phone: ''
      });
    }
    setError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSaveContact = async (e) => {
    e.preventDefault();
    if (!currentContact.name || !currentContact.group_id) {
      setError('Nome e Grupo são obrigatórios.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const contactData = {
        group_id: currentContact.group_id,
        name: currentContact.name,
        role: currentContact.role,
        email: currentContact.email,
        phone: currentContact.phone
      };

      if (currentContact.id) {
        // Update
        const { error } = await supabase
          .from('group_contacts')
          .update(contactData)
          .eq('id', currentContact.id);
          
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('group_contacts')
          .insert([contactData]);
          
        if (error) throw error;
      }

      await fetchData();
      handleCloseModal();
    } catch (err) {
      console.error('Erro ao salvar contato:', err);
      setError('Erro ao salvar contato: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContact = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este contato?')) return;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('group_contacts')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      await fetchData();
    } catch (err) {
      console.error('Erro ao excluir contato:', err);
      setError('Erro ao excluir contato.');
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (contact.email && contact.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesGroup = filterGroup === 'all' || contact.group_id === filterGroup;
    return matchesSearch && matchesGroup;
  });

  return (
    <div className="page-container fade-in">
      <div className="page-header header-responsive">
        <div>
          <h1 className="page-title">Contatos</h1>
          <p className="page-description">Gerencie os contatos dos grupos</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={20} />
          Adicionar Contato
        </button>
      </div>

      {error && (
        <div className="error-message" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: 'var(--radius-md)' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="filters-actions">
          <div className="input-with-icon" style={{ flex: 1, minWidth: '200px' }}>
            <Search size={18} />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Buscar por nome ou e-mail..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="filter-select"
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
          >
            <option value="all">Todos os Grupos</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Carregando contatos...
          </div>
        ) : filteredContacts.length > 0 ? (
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--secondary-light)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Nome</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Grupo</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Cargo</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Contato</th>
                  <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', color: 'var(--text-secondary)' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map(contact => (
                  <tr key={contact.id} style={{ borderBottom: '1px solid var(--border)', transition: 'var(--transition)' }} className="table-row-hover">
                    <td style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 'bold' }}>
                          {contact.name.charAt(0).toUpperCase()}
                        </div>
                        {contact.name}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.5rem', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', border: '1px solid var(--border)' }}>
                        <Building2 size={12} />
                        {contact.group?.name || 'Desconhecido'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                      {contact.role || '-'}
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {contact.email && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}>
                            <Mail size={14} /> {contact.email}
                          </div>
                        )}
                        {contact.phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                              <Phone size={14} /> {contact.phone}
                            </div>
                            <a 
                              href={`https://wa.me/55${contact.phone.replace(/\D/g, '')}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                padding: '0.25rem',
                                backgroundColor: '#25D366', 
                                color: 'white', 
                                borderRadius: 'var(--radius-md)',
                                transition: 'var(--transition)'
                              }}
                              title="Chamar no WhatsApp"
                              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                            >
                              <MessageCircle size={14} />
                            </a>
                          </div>
                        )}
                        {!contact.email && !contact.phone && '-'}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button 
                          onClick={() => handleOpenModal(contact)}
                          style={{ padding: '0.375rem', color: 'var(--primary)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--primary-light)', transition: 'var(--transition)' }}
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteContact(contact.id)}
                          style={{ padding: '0.375rem', color: 'var(--danger)', borderRadius: 'var(--radius-md)', backgroundColor: '#fee2e2', transition: 'var(--transition)' }}
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Nenhum contato encontrado.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="text-h2">{currentContact.id ? 'Editar Contato' : 'Adicionar Contato'}</h2>
              <button onClick={handleCloseModal} style={{ color: 'var(--text-secondary)', padding: '0.25rem' }}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSaveContact}>
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                <div className="form-group">
                  <label className="form-label">Grupo *</label>
                  <div className="input-with-icon">
                    <Building2 size={18} />
                    <select 
                      className="form-input modal-input" 
                      value={currentContact.group_id}
                      onChange={(e) => setCurrentContact({...currentContact, group_id: e.target.value})}
                      required
                    >
                      <option value="" disabled>Selecione um grupo</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Nome Completo *</label>
                  <div className="input-with-icon">
                    <User size={18} />
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Ex: João da Silva"
                      value={currentContact.name}
                      onChange={(e) => setCurrentContact({...currentContact, name: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Cargo / Função</label>
                  <div className="input-with-icon">
                    <Briefcase size={18} />
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Ex: Gerente de RH, Engenheiro de Segurança..."
                      value={currentContact.role}
                      onChange={(e) => setCurrentContact({...currentContact, role: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid-responsive-2">
                  <div className="form-group">
                    <label className="form-label">E-mail</label>
                    <div className="input-with-icon">
                      <Mail size={18} />
                      <input 
                        type="email" 
                        className="form-input" 
                        placeholder="Ex: joao@empresa.com"
                        value={currentContact.email}
                        onChange={(e) => setCurrentContact({...currentContact, email: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Telefone / WhatsApp</label>
                    <div className="input-with-icon">
                      <Phone size={18} />
                      <input 
                        type="tel" 
                        className="form-input" 
                        placeholder="Ex: (00) 00000-0000"
                        value={currentContact.phone}
                        onChange={(e) => setCurrentContact({...currentContact, phone: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

              </div>
              
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleCloseModal}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Salvando...' : 'Salvar Contato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactsPage;
