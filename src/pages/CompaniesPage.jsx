import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, Plus, ChevronDown, ChevronRight, Search,
  Trash2, Users, FileText, MapPin
} from 'lucide-react';
import { getGroups, getCompanies, addGroup, addCompany, deleteGroup } from '../services/storageService';
import AddGroupModal from '../components/AddGroupModal';
import AddCompanyModal from '../components/AddCompanyModal';

const CompaniesPage = () => {
  const [groups, setGroups] = useState([]);
  const [allCompanies, setAllCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    const [fetchedGroups, fetchedCompanies] = await Promise.all([
      getGroups(),
      getCompanies()
    ]);
    setGroups(fetchedGroups);
    setAllCompanies(fetchedCompanies);
    
    // Começa com todos os grupos colapsados (fechados)
    setExpandedGroups(new Set());
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(groupId) ? next.delete(groupId) : next.add(groupId);
      return next;
    });
  };

  const handleAddGroup = async (groupData) => {
    await addGroup(groupData);
    await loadData();
    setShowGroupModal(false);
  };

  const handleAddCompany = async (companyData) => {
    await addCompany({ ...companyData, groupId: selectedGroupId });
    await loadData();
    setShowCompanyModal(false);
  };

  const handleDeleteGroup = async (groupId) => {
    if (window.confirm('Deseja realmente excluir este grupo e todas as suas empresas?')) {
      await deleteGroup(groupId);
      await loadData();
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Carregando empresas...</div>;
  }

  const filteredGroups = groups.filter(group => {
    const companiesInGroup = allCompanies.filter(c => c.groupId === group.id);
    const matchGroup = group.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCompany = companiesInGroup.some(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cnpj.includes(searchTerm)
    );
    return matchGroup || matchCompany;
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-h1">Empresas por Grupo</h1>
          <p className="text-subtitle">Gerencie os grupos econômicos e suas empresas com CNPJ.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowGroupModal(true)} id="btn-add-group">
          <Plus size={18} /> Novo Grupo
        </button>
      </header>

      {/* Search */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Search size={20} color="var(--text-secondary)" />
          <input
            id="search-companies"
            type="text"
            placeholder="Buscar por grupo, empresa ou CNPJ..."
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

      {/* Groups List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredGroups.map(group => {
          const companiesInGroup = allCompanies.filter(c => c.groupId === group.id && (
            !searchTerm ||
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.cnpj.includes(searchTerm) ||
            group.name.toLowerCase().includes(searchTerm.toLowerCase())
          ));
          const isExpanded = expandedGroups.has(group.id);

          return (
            <div key={group.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Group Header */}
              <div
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '1.25rem 1.5rem', cursor: 'pointer',
                  backgroundColor: isExpanded ? 'var(--primary-light)' : 'var(--surface)',
                  borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
                  transition: 'var(--transition)',
                }}
                onClick={() => toggleGroup(group.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: 'var(--radius-md)',
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
                  }}>
                    <Building2 size={20} color="white" />
                  </div>
                  <div>
                    <h3 style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '1rem' }}>{group.name}</h3>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      {companiesInGroup.length} empresa{companiesInGroup.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedGroupId(group.id);
                      setShowCompanyModal(true);
                    }}
                  >
                    <Plus size={14} /> Empresa
                  </button>
                  <button
                    style={{ padding: '0.375rem', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }}
                    onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                    title="Excluir Grupo"
                  >
                    <Trash2 size={16} />
                  </button>
                  {isExpanded ? <ChevronDown size={20} color="var(--text-secondary)" /> : <ChevronRight size={20} color="var(--text-secondary)" />}
                </div>
              </div>

              {/* Companies List (Expanded) */}
              {isExpanded && (
                <div style={{
                  maxHeight: isExpanded ? '2000px' : '0',
                  transition: 'max-height 0.3s ease',
                  overflow: 'hidden',
                }}>
                  {companiesInGroup.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Nenhuma empresa cadastrada neste grupo.
                    </div>
                  ) : (
                    companiesInGroup.map((company, idx) => (
                      <Link
                        key={company.id}
                        to={`/company/${company.id}`}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '1rem 1.5rem',
                          borderBottom: idx < companiesInGroup.length - 1 ? '1px solid var(--border)' : 'none',
                          transition: 'var(--transition)',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--background)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            backgroundColor: 'var(--secondary-light)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Building2 size={16} color="var(--secondary)" />
                          </div>
                          <div>
                            <h4 style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.9375rem' }}>{company.name}</h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.125rem' }}>
                              <span style={{
                                fontSize: '0.8125rem', color: 'var(--text-secondary)',
                                fontFamily: "'JetBrains Mono', 'Fira Code', monospace", letterSpacing: '0.5px'
                              }}>
                                CNPJ: {company.cnpj}
                              </span>
                              {company.contact && (
                                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <Users size={12} /> {company.contact}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={18} color="var(--text-secondary)" />
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredGroups.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <Building2 size={48} style={{ marginBottom: '1rem', opacity: 0.4 }} />
            <p>Nenhum grupo encontrado.</p>
          </div>
        )}
      </div>

      {showGroupModal && <AddGroupModal onClose={() => setShowGroupModal(false)} onSave={handleAddGroup} />}
      {showCompanyModal && <AddCompanyModal onClose={() => setShowCompanyModal(false)} onSave={handleAddCompany} />}
    </div>
  );
};

export default CompaniesPage;
