import React, { useState, useEffect } from 'react';
// 🔥 FIX 1: Import the shared structural context hook
import { useOutletContext } from 'react-router-dom';

export default function Contractors() {
  // 🔥 FIX 2: Extract context variables safely with an empty object fallback
  const context = useOutletContext() || {};
  let adminUser = context.adminUser;
  let adminToken = context.adminToken;

  // 🔥 FOOLPROOF BACKUP: If layout wrapper context lags, parse tracking parameters from sessionStorage
  const queryParams = new URLSearchParams(window.location.search);
  const currentUid = queryParams.get('uid');

  if (!adminUser && currentUid) {
    const backupUserString = sessionStorage.getItem(`user_${currentUid}`) || sessionStorage.getItem('leodoesit_user');
    if (backupUserString) adminUser = JSON.parse(backupUserString);
  }
  if (!adminToken && currentUid) {
    adminToken = sessionStorage.getItem(`token_${currentUid}`) || sessionStorage.getItem('leodoesit_token');
  }

  const currentTenantId = adminUser?.tenant_id;

  const [contractors, setContractors] = useState([]);
  const [invoices, setInvoices] = useState([]); 
  const [clients, setClients] = useState([]);
  const [subVendors, setSubVendors] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  
  // Checkbox Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [selectedContracts, setSelectedContracts] = useState([]);
  const [selectedVisas, setSelectedVisas] = useState([]);
  const [selectedVendors, setSelectedVendors] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; 
  const [sortConfig, setSortConfig] = useState({ key: 'first_name', direction: 'asc' });

  const [showArchive, setShowArchive] = useState(false);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [insightUser, setInsightUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null); 
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  
  // Password Reset States
  const [passwordModalUser, setPasswordModalUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  
  const initialFormState = {
    first_name: '', last_name: '', email: '',
    phone_number: '', address: '', dob: '', visa_status: '',
    role: '', start_date: '', invoice_num: '', contract_type: 'W2',
    pay_rate: '', invoice_rate: '',
    c2c_name: '', c2c_email: '', c2c_phone: '', c2c_net_terms: '', c2c_address: '',
    vendor_name: '', vendor_email: '', vendor_address: '', vendor_for: '', project_start_date: '', project_end_date: '', net_terms: 'Net 30',
    i9_completed: false, w4_completed: false, everify_completed: false, bank_details_completed: false
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    // 🔥 FIX 3: Robust Multi-Tenant framework shield guard check
    if (
      !currentTenantId || 
      currentTenantId === 'undefined' || 
      currentTenantId === 'null' || 
      !adminToken
    ) {
      setLoading(false);
      return;
    }

    fetchContractors(currentTenantId, adminToken);
    fetchInvoices(currentTenantId, adminToken); 
    fetchClients(currentTenantId, adminToken);
    fetchSubVendors(currentTenantId, adminToken); 
  }, [currentTenantId, adminToken]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedContracts, selectedVisas, selectedVendors, showArchive]);

  // --- API Calls ---
  const fetchContractors = async (tenantId, token) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users`, {
        headers: { 
          'Content-Type': 'application/json', 
          'x-tenant-id': tenantId,
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) setContractors(data.data || []);
    } catch (error) { 
      console.error(error); 
    } finally { 
      setLoading(false); 
    }
  };

  const fetchInvoices = async (tenantId, token) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/invoices`, {
        headers: { 
          'Content-Type': 'application/json', 
          'x-tenant-id': tenantId,
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) setInvoices(data.data || []);
    } catch (error) { console.error(error); }
  };

  const fetchClients = async (tenantId, token) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/clients`, {
        headers: { 
          'Content-Type': 'application/json', 
          'x-tenant-id': tenantId,
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) setClients(data.data || []);
    } catch (error) { console.error(error); }
  };

  const fetchSubVendors = async (tenantId, token) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/sub_vendors`, {
        headers: { 
          'Content-Type': 'application/json', 
          'x-tenant-id': tenantId,
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) setSubVendors(data.data || []);
    } catch (error) { console.error(error); }
  };

  // --- Handlers ---
  const handleArchiveContractor = async (id, name) => {
    if (!currentTenantId || !adminToken) return;
    if (!window.confirm(`Move ${name} to the Archive?`)) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/${id}`, { 
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json', 
          'x-tenant-id': currentTenantId,
          'Authorization': `Bearer ${adminToken}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setContractors(contractors.map(c => c.id === id ? { ...c, is_deleted: true } : c));
        setViewingUser(null);
      } else { alert("Failed to archive: " + (data.error || "Unknown server error")); }
    } catch (error) { alert("Network error archiving employee."); }
  };

  const handleRestoreContractor = async (id, name) => {
    if (!currentTenantId || !adminToken) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/${id}/restore`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          'x-tenant-id': currentTenantId,
          'Authorization': `Bearer ${adminToken}`
        }
      });
      const data = await response.json();
      if (data.success) setContractors(contractors.map(c => c.id === id ? { ...c, is_deleted: false } : c));
    } catch (error) { alert("Network error restoring employee."); }
  };

  const handlePermanentDelete = async (id, name) => {
    if (!currentTenantId || !adminToken) return;
    const confirmText = window.prompt(`Type "DELETE" to permanently destroy the record for ${name}.`);
    if (confirmText?.trim() !== "DELETE") return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/${id}/permanent`, { 
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json', 
          'x-tenant-id': currentTenantId,
          'Authorization': `Bearer ${adminToken}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setContractors(contractors.filter(c => c.id !== id));
        setViewingUser(null);
      } else { alert("Failed to permanently delete: " + (data.error || "Unknown server error")); }
    } catch (error) { alert("Network error performing permanent delete."); }
  };

  const formatPhoneNumber = (value) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, ''); 
    if (phoneNumber.length < 4) return phoneNumber;
    if (phoneNumber.length < 7) return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const handleOpenAddModal = () => {
    let maxNum = 0;
    contractors.forEach(c => {
      const num = parseInt(c.invoice_num, 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    });
    setFormData({ ...initialFormState, invoice_num: String(maxNum + 1).padStart(2, '0') });
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => { setIsAddModalOpen(false); setFormData(initialFormState); };
  const handleCloseEditModal = () => { setEditingId(null); setEditFormData({}); };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: (name === 'phone_number' || name === 'c2c_phone') ? formatPhoneNumber(value) : value });
  };

  const handleEditChange = (e) => {
    const { name, type, checked, value } = e.target;
    const finalValue = type === 'checkbox' ? checked : value;
    setEditFormData({ ...editFormData, [name]: (name === 'phone_number' || name === 'c2c_phone') ? formatPhoneNumber(finalValue) : finalValue });
  };

  const handleEditClick = (user) => {
    setViewingUser(null);
    setEditingId(user.id);
    setEditFormData({ ...user, is_active: user.is_active !== false }); 
  };

  const handleClientSelect = (e, isEdit = false) => {
    const selectedName = e.target.value;
    const selectedClient = clients.find(c => String(c.company_name || c.name).trim() === String(selectedName).trim());
    const updates = {
      vendor_name: selectedName,
      vendor_email: selectedClient ? (selectedClient.billing_email || selectedClient.email || '') : '',
      net_terms: selectedClient ? (selectedClient.net_terms || 'Net 30') : 'Net 30',
      vendor_address: selectedClient ? (selectedClient.vendor_address || selectedClient.address || '') : ''
    };
    isEdit ? setEditFormData({ ...editFormData, ...updates }) : setFormData({ ...formData, ...updates });
  };

  const handleSidebarSelect = (e, isEdit = false) => {
    const selectedName = e.target.value;
    const selectedSV = subVendors.find(sv => sv.company_name === selectedName);
    const updates = {
      c2c_name: selectedName,
      c2c_email: selectedSV ? (selectedSV.billing_email || '') : '',
      c2c_phone: selectedSV ? (selectedSV.billing_phone || '') : '',
      c2c_net_terms: selectedSV ? (selectedSV.net_terms || 'Net 30') : '',
      c2c_address: selectedSV ? (selectedSV.address || '') : ''
    };
    isEdit ? setEditFormData({ ...editFormData, ...updates }) : setFormData({ ...formData, ...updates });
  };

  const handleAddContractor = async (e) => {
    e.preventDefault();
    if (!currentTenantId || !adminToken) return;
    setIsSubmitting(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users`, {
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json', 
          'x-tenant-id': currentTenantId,
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ ...formData, tenant_id: currentTenantId })
      });
      const data = await response.json();
      if (data.success) { 
        fetchContractors(currentTenantId, adminToken); 
        handleCloseAddModal(); 
      } else { alert("Failed to add: " + data.error); }
    } catch (error) { alert("Network error."); } finally { setIsSubmitting(false); }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!currentTenantId || !adminToken) return;
    setIsSubmitting(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/${editingId}`, {
        method: 'PUT', 
        headers: { 
          'Content-Type': 'application/json', 
          'x-tenant-id': currentTenantId,
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(editFormData)
      });
      const data = await response.json();
      if (data.success) {
        setContractors(contractors.map(c => c.id === editingId ? { ...c, ...data.data } : c));
        handleCloseEditModal(); 
      } else { alert("Failed to update: " + data.error); }
    } catch (error) { alert("Network error."); } finally { setIsSubmitting(false); }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!currentTenantId || !adminToken) return;
    setIsSubmitting(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/${passwordModalUser.id}/password`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          'x-tenant-id': currentTenantId,
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ newPassword })
      });
      const data = await response.json();
      if (data.success) {
        alert("Password updated successfully!");
        setPasswordModalUser(null);
        setNewPassword('');
      } else {
        alert("Failed to update password. Make sure your backend route exists.");
      }
    } catch (error) {
      alert("Network error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['First Name', 'Last Name', 'Email', 'Role', 'Status', 'Visa', 'Vendor', 'Contract Type'];
    const csvData = processedContractors.map(c => [
        c.first_name || '', c.last_name || '', c.email || '', c.role || 'N/A', c.is_active !== false ? 'Active' : 'Inactive', c.visa_status || 'N/A', c.vendor_name || 'N/A', c.contract_type || 'W2'
    ]);
    const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'Team_Roster.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const openInsights = (user) => {
    setViewingUser(null);
    const userInvoices = invoices.filter(inv => inv.first_name === user.first_name && inv.last_name === user.last_name);
    const totalBilled = userInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount_invoiced || 0), 0);
    const totalPaid = userInvoices.filter(inv => inv.status === 'PAID').reduce((sum, inv) => sum + parseFloat(inv.amount_invoiced || 0), 0);
    setInsightUser({ ...user, totalBilled, totalPaid, pendingAmount: totalBilled - totalPaid, invoiceCount: userInvoices.length });
  };

  const toggleFilter = (setState, value) => {
    setState(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };

  // --- Filtering & Sorting ---
  let processedContractors = contractors.filter(user => {
    if (!user) return false;
    if (user.role === 'ADMIN' || user.email === 'admin@leodoesit.com') return false; 
    const isArchived = user.is_deleted === true;
    if (showArchive && !isArchived) return false; 
    if (!showArchive && isArchived) return false; 

    // Search Bar Filter
    const searchString = `${user.first_name || ''} ${user.last_name || ''} ${user.email || ''} ${user.vendor_name || ''}`.toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase());

    // Checkbox Filters
    const cType = user.contract_type || 'W2';
    const matchesContract = selectedContracts.length === 0 || selectedContracts.includes(cType);
    
    const userVisa = user.visa_status || 'N/A';
    const matchesVisa = selectedVisas.length === 0 || selectedVisas.includes(userVisa);
    
    const userVendor = user.vendor_name || 'N/A';
    const matchesVendor = selectedVendors.length === 0 || selectedVendors.includes(userVendor);

    return matchesSearch && matchesContract && matchesVisa && matchesVendor;
  });

  processedContractors.sort((a, b) => {
    let valA = String(a[sortConfig.key] || '').toLowerCase();
    let valB = String(b[sortConfig.key] || '').toLowerCase();
    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(processedContractors.length / itemsPerPage);
  const currentItems = processedContractors.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const allVendors = Array.from(new Set(contractors.map(c => c.vendor_name || 'N/A').filter(v => v !== 'N/A'))).sort();
  const allVisas = ['US Citizen', 'Green Card', 'H1B', 'OPT', 'CPT', 'H4 EAD', 'N/A'];

  const activeStats = contractors.filter(c => c && !c.is_deleted && c.role !== 'ADMIN' && !c.email?.includes('admin@'));
  const statTotalEmployees = activeStats.length;
  const statW2 = activeStats.filter(c => c.contract_type === 'W2' || !c.contract_type).length; 
  const statC2C = activeStats.filter(c => c.contract_type === 'C2C').length;
  const statVendors = clients.length;

  return (
    <div style={{ backgroundColor: '#F3F4F6', minHeight: '100vh', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif', boxSizing: 'border-box', width: '100%' }}>
      
      {/* 1. Top Action Bar */}
      <div className="responsive-header" style={styles.header}>
        <div>
          <h1 style={styles.title}>{showArchive ? '📦 Archived Records' : 'Team Roster'}</h1>
          <p style={styles.subtitle}>Manage your workforce, set billing rates, and view insights.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', width: 'auto' }}>
          <button onClick={() => setShowArchive(!showArchive)} style={styles.darkBtn}>
            {showArchive ? '👥 Back to Roster' : '📦 View Archive'}
          </button>
          {!showArchive && (
            <>
              <button onClick={exportToCSV} style={styles.darkBtn}>⬇️ Export CSV</button>
              
              <button 
                onClick={() => setShowFilters(!showFilters)} 
                style={{...styles.darkBtn, backgroundColor: showFilters ? '#4F46E5' : 'white', color: showFilters ? 'white' : '#374151', border: '1px solid #D1D5DB'}}
              >
                ⚙️ Filters {(selectedContracts.length + selectedVisas.length + selectedVendors.length) > 0 ? `(${(selectedContracts.length + selectedVisas.length + selectedVendors.length)})` : ''}
              </button>

              <div style={styles.searchWrapper}>
                <span style={{padding: '0 10px', color: '#9CA3AF'}}>🔍</span>
                <input type="text" placeholder="Search team..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={styles.topSearchInput} />
              </div>
              <button onClick={handleOpenAddModal} style={styles.primaryBtn}>+ Add Employee</button>
            </>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🔥 BRANDING REDACTION FIXED: Greeting component element container removed */}
      {/* ========================================================================= */}

      {/* Advanced Filter Panel */}
      {showFilters && !showArchive && (
        <div style={styles.filterPanel}>
          <div style={styles.filterColumn}>
            <h4 style={styles.filterTitle}>Contract Type</h4>
            <div style={styles.filterList}>
              {['W2', 'C2C', '1099'].map(type => (
                <label key={type} style={styles.checkboxLabel}>
                  <input type="checkbox" checked={selectedContracts.includes(type)} onChange={() => toggleFilter(setSelectedContracts, type)} />
                  {type}
                </label>
              ))}
            </div>
          </div>

          <div style={styles.filterColumn}>
            <h4 style={styles.filterTitle}>Visa Status</h4>
            <div style={styles.filterList}>
              {allVisas.map(visa => (
                <label key={visa} style={styles.checkboxLabel}>
                  <input type="checkbox" checked={selectedVisas.includes(visa)} onChange={() => toggleFilter(setSelectedVisas, visa)} />
                  {visa}
                </label>
              ))}
            </div>
          </div>

          <div style={styles.filterColumn}>
            <h4 style={styles.filterTitle}>End Client / Vendor</h4>
            <div style={styles.filterList}>
              {allVendors.map(vendor => (
                <label key={vendor} style={styles.checkboxLabel}>
                  <input type="checkbox" checked={selectedVendors.includes(vendor)} onChange={() => toggleFilter(setSelectedVendors, vendor)} />
                  {vendor}
                </label>
              ))}
              <label style={styles.checkboxLabel}>
                <input type="checkbox" checked={selectedVendors.includes('N/A')} onChange={() => toggleFilter(setSelectedVendors, 'N/A')} />
                Unassigned (N/A)
              </label>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-end', width: '100%' }}>
             <button 
                onClick={() => { setSelectedContracts([]); setSelectedVisas([]); setSelectedVendors([]); }}
                style={{ backgroundColor: '#F3F4F6', border: '1px solid #D1D5DB', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold', color: '#4B5563', width: '100%', marginTop: '10px' }}
             >
                Clear Filters
             </button>
          </div>
        </div>
      )}

      {/* 2. KPI Cards */}
      {!showArchive && (
        <div className="dashboard-content" style={{ marginBottom: '30px' }}>
          <div style={styles.kpiGrid}>
            <div style={{...styles.kpiCard, background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)'}}>
              <h3 style={styles.kpiTitle}>Total No of Employees</h3>
              <p style={styles.kpiValue}>{String(statTotalEmployees).padStart(2, '0')}</p>
              <span style={styles.kpiBgNum}>{String(statTotalEmployees).padStart(2, '0')}</span>
            </div>
            <div style={{...styles.kpiCard, background: 'linear-gradient(135deg, #0EA5E9, #0369A1)'}}>
              <h3 style={styles.kpiTitle}>Total No of Vendors</h3>
              <p style={styles.kpiValue}>{String(statVendors).padStart(2, '0')}</p>
              <span style={styles.kpiBgNum}>{String(statVendors).padStart(2, '0')}</span>
            </div>
            <div style={{...styles.kpiCard, background: 'linear-gradient(135deg, #F59E0B, #B45309)'}}>
              <h3 style={styles.kpiTitle}>W2 Employees</h3>
              <p style={styles.kpiValue}>{String(statW2).padStart(2, '0')}</p>
              <span style={styles.kpiBgNum}>{String(statW2).padStart(2, '0')}</span>
            </div>
            <div style={{...styles.kpiCard, background: 'linear-gradient(135deg, #10B981, #047857)'}}>
              <h3 style={styles.kpiTitle}>C2C Contractors</h3>
              <p style={styles.kpiValue}>{String(statC2C).padStart(2, '0')}</p>
              <span style={styles.kpiBgNum}>{String(statC2C).padStart(2, '0')}</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Modern Table */}
      <div className="billing-card" style={styles.tableCardContainer}>
        {loading ? (
          <p style={{ padding: '20px' }}>Loading team...</p>
        ) : (!currentTenantId || currentTenantId === 'undefined') ? (
          <p style={{ padding: '20px', color: '#DC2626', fontWeight: 'bold' }}>⚠️ Missing multi-tenant authorization framework context. Re-authenticating...</p>
        ) : processedContractors.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
             <div style={{ fontSize: '30px', marginBottom: '10px' }}>🕵️</div>
             <h3 style={{ margin: '0 0 5px 0', color: '#111827' }}>No matches found</h3>
             <p style={{ color: '#6B7280', margin: 0 }}>Try adjusting your search or clearing the advanced filters.</p>
          </div>
        ) : (
          <>
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={{...styles.thSortable, width: '180px'}} onClick={() => handleSort('first_name')}>
                      Name {sortConfig.key === 'first_name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th style={{...styles.th, width: '220px'}}>Contact & Vendor</th>
                    <th style={{...styles.thCentered, width: '240px'}}>Financials</th>
                    <th style={{...styles.thCentered, width: '160px'}}>Role / Visa</th>
                    <th style={{...styles.thCentered, width: '200px'}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((user) => {
                    return (
                      <tr key={user.id} style={styles.tableRow}>
                        <td style={styles.tdData}>
                          <div onClick={() => setViewingUser(user)} style={{...styles.nameLink, ...styles.truncate}} title={`${user.first_name} ${user.last_name}`}>
                            {user.first_name} {user.last_name}
                          </div>
                        </td>
                        
                        <td style={styles.tdData}>
                          <div style={{ color: '#4B5563', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                             <span>✉️</span>
                             <span style={styles.truncate} title={user.email}>{user.email}</span>
                          </div>
                          <div style={{ color: '#6B7280', fontSize: '12px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                             <span>🏢</span> 
                             <span style={{ fontWeight: '600', color: '#374151', ...styles.truncate }} title={user.vendor_name || 'N/A'}>{user.vendor_name || 'N/A'}</span>
                          </div>
                        </td>
                        
                        <td style={styles.tdCentered}>
                          <div style={{
                            ...styles.financialBadge,
                            backgroundColor: user.is_active !== false ? '#D1FAE5' : '#FEE2E2',
                            color: user.is_active !== false ? '#065F46' : '#991B1B',
                            border: user.is_active !== false ? 'none' : '1px solid #FECACA'
                          }}>
                            Pay: ${parseFloat(user.pay_rate || 0).toFixed(2)} | Bill: ${parseFloat(user.invoice_rate || 0).toFixed(2)}
                          </div>
                        </td>
                        
                        <td style={styles.tdCentered}>
                          <div style={{...styles.truncate, fontWeight: 'bold', color: '#111827', fontSize: '13px' }} title={user.role || 'Unassigned'}>
                              {user.role || 'Unassigned'}
                          </div>
                          <div style={{color: '#3B82F6', fontSize: '12px', fontWeight: '700', margin: '4px 0', ...styles.truncate}} title={`${user.contract_type || 'W2'} • ${user.visa_status || 'N/A'} • ${user.is_active !== false ? 'Active' : 'Inactive'}`}>
                            {user.contract_type || 'W2'} • {user.visa_status || 'N/A'}
                          </div>
                        </td>
                        
                        <td style={styles.tdCentered}>
                          <div style={styles.actionGroup}>
                            <button onClick={() => openInsights(user)} style={styles.iconBtn}>📊 Stats</button>
                            <button onClick={() => handleEditClick(user)} style={styles.iconBtn}>Edit</button>
                            {showArchive ? (
                              <button onClick={() => handleRestoreContractor(user.id, user.first_name)} style={styles.iconBtnSquare}>↩️</button>
                            ) : (
                              <button onClick={() => handleArchiveContractor(user.id, user.first_name)} style={styles.iconBtnSquare} title="Archive">📦</button>
                            )}
                            <button onClick={() => handlePermanentDelete(user.id, user.first_name)} style={{...styles.iconBtnSquare, backgroundColor: '#FEE2E2', borderColor: '#FCA5A5'}} title="Delete">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div style={styles.pagination}>
                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} style={styles.pageBtn}>Previous</button>
                <span style={styles.pageInfo}>Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} style={styles.pageBtn}>Next</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* --- ADD EMPLOYEE MODAL --- */}
      {isAddModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.largeModalBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: '15px', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#111827', fontSize: '20px' }}>Create New Employee Record</h2>
              <button onClick={handleCloseAddModal} style={styles.closeBtn}>✕</button>
            </div>
            
            <form onSubmit={handleAddContractor} style={{ overflowY: 'auto', maxHeight: '70vh', paddingRight: '5px' }}>
              <h3 style={styles.sectionHeader}>1. Personal Info</h3>
              <div style={styles.formGrid}>
                <input required type="text" name="first_name" placeholder="First Name *" value={formData.first_name} onChange={handleChange} style={styles.input} />
                <input required type="text" name="last_name" placeholder="Last Name *" value={formData.last_name} onChange={handleChange} style={styles.input} />
                <input required type="email" name="email" placeholder="Email Address *" value={formData.email} onChange={handleChange} style={{ ...styles.input, gridColumn: 'span 2' }} />
                <input required type="tel" name="phone_number" placeholder="Phone Number *" value={formData.phone_number} onChange={handleChange} style={styles.input} />
                <input type="date" name="dob" title="Date of Birth" value={formData.dob} onChange={handleChange} style={styles.input} />
                <select name="visa_status" value={formData.visa_status} onChange={handleChange} style={{ ...styles.input, gridColumn: 'span 2' }}>
                  <option value="">-- Select Visa Status --</option>
                  <option value="US Citizen">US Citizen</option>
                  <option value="Green Card">Green Card (GC)</option>
                  <option value="H1B">H1B</option>
                  <option value="OPT">OPT</option>
                  <option value="CPT">CPT</option>
                  <option value="H4 EAD">H4 EAD</option>
                </select>
                <div style={styles.fullWidthInput}>
                  <input type="text" name="address" placeholder="Full Address" value={formData.address} onChange={handleChange} style={styles.input} />
                </div>
              </div>

              <h3 style={styles.sectionHeader}>2. Work & Financial Details</h3>
              <div style={styles.formGrid}>
                <input type="text" name="role" placeholder="Role (e.g. Software Engineer)" value={formData.role} onChange={handleChange} style={styles.input} />
                <input type="date" name="start_date" title="Start Date" value={formData.start_date} onChange={handleChange} style={styles.input} />
                <input type="text" name="invoice_num" placeholder="Initial Invoice Number" value={formData.invoice_num} onChange={handleChange} style={styles.input} />
                <select name="contract_type" value={formData.contract_type} onChange={handleChange} style={styles.input}>
                    <option value="W2">W2 (Direct Hire)</option>
                    <option value="1099">1099 (Contractor)</option>
                    <option value="C2C">C2C (Corp-to-Corp)</option>
                </select>
                <div style={styles.rateWrapper} title="Employee Pay Rate">
                  <span style={styles.currencySymbol}>Pay $</span>
                  <input required type="number" step="0.01" name="pay_rate" placeholder="0.00" value={formData.pay_rate} onChange={handleChange} style={styles.rateInput} />
                </div>
                <div style={styles.rateWrapper} title="Client Billing Rate">
                  <span style={styles.currencySymbol}>Bill $</span>
                  <input required type="number" step="0.01" name="invoice_rate" placeholder="0.00" value={formData.invoice_rate} onChange={handleChange} style={styles.rateInput} />
                </div>
              </div>

              {formData.contract_type === 'C2C' && (
                  <div style={{ backgroundColor: '#F3F4F6', padding: '15px', borderRadius: '8px', marginTop: '15px', borderLeft: '4px solid #4F46E5' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#374151' }}>Corp-to-Corp (C2C) Information</h4>
                      <div style={styles.formGrid}>
                          <select required name="c2c_name" value={formData.c2c_name || ''} onChange={(e) => handleSidebarSelect(e, false)} style={{ ...styles.input, gridColumn: 'span 2' }}>
                            <option value="">-- Select Sub Vendor --</option>
                            {subVendors.map(sv => (<option key={sv.id} value={sv.company_name}>{sv.company_name}</option>))}
                          </select>
                          <input required type="email" name="c2c_email" placeholder="C2C Email (Auto)" value={formData.c2c_email || ''} readOnly style={{...styles.input, backgroundColor: '#E5E7EB', cursor: 'not-allowed'}} />
                          <input required type="tel" name="c2c_phone" placeholder="C2C Phone Number (Auto)" value={formData.c2c_phone || ''} readOnly style={{...styles.input, backgroundColor: '#E5E7EB', cursor: 'not-allowed'}} />
                          <input type="text" name="c2c_net_terms" placeholder="C2C Net Terms (Auto)" value={formData.c2c_net_terms || ''} readOnly style={{...styles.input, gridColumn: 'span 2', backgroundColor: '#E5E7EB', cursor: 'not-allowed'}} />
                          <div style={styles.fullWidthInput}>
                            <input type="text" name="c2c_address" placeholder="C2C Address (Auto)" value={formData.c2c_address || ''} readOnly style={{...styles.input, backgroundColor: '#E5E7EB', cursor: 'not-allowed'}} />
                          </div>
                      </div>
                  </div>
              )}

              {formData.contract_type === 'W2' && (
                  <div style={{ backgroundColor: '#F3F4F6', padding: '15px', borderRadius: '8px', marginTop: '15px', borderLeft: '4px solid #10B981' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#374151' }}>W2 Onboarding Compliance</h4>
                      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                        <label><input type="checkbox" name="i9_completed" checked={formData.i9_completed} onChange={handleChange} /> I-9 Form</label>
                        <label><input type="checkbox" name="w4_completed" checked={formData.w4_completed} onChange={handleChange} /> W-4 Form</label>
                        <label><input type="checkbox" name="everify_completed" checked={formData.everify_completed} onChange={handleChange} /> E-Verify</label>
                        <label><input type="checkbox" name="bank_details_completed" checked={formData.bank_details_completed} onChange={handleChange} /> Bank Details</label>
                      </div>
                  </div>
              )}

              <h3 style={styles.sectionHeader}>3. Vendor / Project Details</h3>
              <div style={styles.formGrid}>
                <select name="vendor_name" value={formData.vendor_name} onChange={(e) => handleClientSelect(e, false)} style={{ ...styles.input, gridColumn: 'span 2' }}>
                  <option value="">-- Select End Client --</option>
                  {clients.map(client => (<option key={client.id} value={client.company_name}>{client.company_name}</option>))}
                </select>
                <input type="email" name="vendor_email" value={formData.vendor_email} placeholder="Vendor Email (Auto)" readOnly style={{...styles.input, gridColumn: 'span 2', backgroundColor: '#E5E7EB', cursor: 'not-allowed'}} />
                
                <input type="text" name="vendor_for" value={formData.vendor_for} placeholder="Vendor For (e.g. End Client Name)" onChange={handleChange} style={styles.input} />
                <input type="text" name="net_terms" value={formData.net_terms} placeholder="Net Terms (Auto)" readOnly style={{...styles.input, backgroundColor: '#E5E7EB', cursor: 'not-allowed'}} />
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', color: '#6B7280', fontWeight: 'bold' }}>Project Start Date</label>
                    <input type="date" name="project_start_date" value={formData.project_start_date || ''} onChange={handleChange} style={styles.input} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', color: '#6B7280', fontWeight: 'bold' }}>Project End Date</label>
                    <input type="date" name="project_end_date" value={formData.project_end_date || ''} onChange={handleChange} style={styles.input} />
                </div>
                
                <div style={styles.fullWidthInput}>
                  <input type="text" name="vendor_address" value={formData.vendor_address} placeholder="Vendor Address (Auto)" readOnly style={{...styles.input, backgroundColor: '#E5E7EB', cursor: 'not-allowed'}} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '30px' }}>
                <button type="button" onClick={handleCloseAddModal} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={styles.saveBtn}>{isSubmitting ? 'Saving...' : 'Create Employee'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT EMPLOYEE MODAL --- */}
      {editingId && (
        <div style={styles.modalOverlay}>
          <div style={styles.largeModalBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: '15px', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#111827', fontSize: '20px' }}>Edit Employee Record</h2>
              <button onClick={handleCloseEditModal} style={styles.closeBtn}>✕</button>
            </div>
            
            <form onSubmit={handleSaveEdit} style={{ overflowY: 'auto', maxHeight: '70vh', paddingRight: '5px' }}>
              <div style={{ backgroundColor: '#F9FAFB', padding: '15px', borderRadius: '8px', border: '1px solid #E5E7EB', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="checkbox" name="is_active" checked={editFormData.is_active !== false} onChange={handleEditChange} style={{ width: '18px', height: '18px' }} />
                <label style={{ fontSize: '15px', color: '#111827', fontWeight: 'bold' }}>Employee is Active</label>
              </div>

              <h3 style={styles.sectionHeader}>1. Personal Info</h3>
              <div style={styles.formGrid}>
                <input required type="text" name="first_name" placeholder="First Name *" value={editFormData.first_name || ''} onChange={handleEditChange} style={styles.input} />
                <input required type="text" name="last_name" placeholder="Last Name *" value={editFormData.last_name || ''} onChange={handleEditChange} style={styles.input} />
                <input required type="email" name="email" placeholder="Email Address *" value={editFormData.email || ''} onChange={handleEditChange} style={{ ...styles.input, gridColumn: 'span 2' }} />
                <input required type="tel" name="phone_number" placeholder="Phone Number *" value={editFormData.phone_number || ''} onChange={handleEditChange} style={styles.input} />
                <input type="date" name="dob" title="Date of Birth" value={editFormData.dob || ''} onChange={handleEditChange} style={styles.input} />
                <select name="visa_status" value={editFormData.visa_status || ''} onChange={handleEditChange} style={{ ...styles.input, gridColumn: 'span 2' }}>
                  <option value="">-- Select Visa Status --</option>
                  <option value="US Citizen">US Citizen</option>
                  <option value="Green Card">Green Card (GC)</option>
                  <option value="H1B">H1B</option>
                  <option value="OPT">OPT</option>
                  <option value="CPT">CPT</option>
                  <option value="H4 EAD">H4 EAD</option>
                </select>
                <div style={styles.fullWidthInput}>
                  <input type="text" name="address" placeholder="Full Address" value={editFormData.address || ''} onChange={handleEditChange} style={styles.input} />
                </div>
              </div>

              <h3 style={styles.sectionHeader}>2. Work & Financial Details</h3>
              <div style={styles.formGrid}>
                <input type="text" name="role" placeholder="Role (e.g. Software Engineer)" value={editFormData.role || ''} onChange={handleEditChange} style={styles.input} />
                <input type="date" name="start_date" title="Start Date" value={editFormData.start_date || ''} onChange={handleEditChange} style={styles.input} />
                <input type="text" name="invoice_num" placeholder="Initial Invoice Number" value={editFormData.invoice_num || ''} onChange={handleEditChange} style={styles.input} />
                
                <select name="contract_type" value={editFormData.contract_type || 'W2'} onChange={handleEditChange} style={styles.input}>
                    <option value="W2">W2 (Direct Hire)</option>
                    <option value="1099">1099 (Contractor)</option>
                    <option value="C2C">C2C (Corp-to-Corp)</option>
                </select>

                <div style={styles.rateWrapper} title="Employee Pay Rate">
                  <span style={styles.currencySymbol}>Pay $</span>
                  <input required type="number" step="0.01" name="pay_rate" placeholder="0.00" value={editFormData.pay_rate || ''} onChange={handleEditChange} style={styles.rateInput} />
                </div>
                <div style={styles.rateWrapper} title="Client Billing Rate">
                  <span style={styles.currencySymbol}>Bill $</span>
                  <input required type="number" step="0.01" name="invoice_rate" placeholder="0.00" value={editFormData.invoice_rate || ''} onChange={handleEditChange} style={styles.rateInput} />
                </div>
              </div>

              {editFormData.contract_type === 'C2C' && (
                  <div style={{ backgroundColor: '#F3F4F6', padding: '15px', borderRadius: '8px', marginTop: '15px', borderLeft: '4px solid #4F46E5' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#374151' }}>Corp-to-Corp (C2C) Information</h4>
                      <div style={styles.formGrid}>
                          <select required name="c2c_name" value={editFormData.c2c_name || ''} onChange={(e) => handleSidebarSelect(e, true)} style={{ ...styles.input, gridColumn: 'span 2' }}>
                            <option value="">-- Select Sub Vendor --</option>
                            {subVendors.map(sv => (<option key={sv.id} value={sv.company_name}>{sv.company_name}</option>))}
                          </select>
                          <input required type="email" name="c2c_email" placeholder="C2C Email" value={editFormData.c2c_email || ''} readOnly style={{...styles.input, backgroundColor: '#E5E7EB', cursor: 'not-allowed'}} />
                          <input required type="tel" name="c2c_phone" placeholder="C2C Phone Number (Auto)" value={editFormData.c2c_phone || ''} readOnly style={{...styles.input, backgroundColor: '#E5E7EB', cursor: 'not-allowed'}} />
                          <input type="text" name="c2c_net_terms" placeholder="C2C Net Terms (Auto)" value={editFormData.c2c_net_terms || ''} readOnly style={{...styles.input, gridColumn: 'span 2', backgroundColor: '#E5E7EB', cursor: 'not-allowed'}} />
                          <div style={styles.fullWidthInput}>
                            <input type="text" name="c2c_address" placeholder="C2C Address (Auto)" value={editFormData.c2c_address || ''} readOnly style={{...styles.input, backgroundColor: '#E5E7EB', cursor: 'not-allowed'}} />
                          </div>
                      </div>
                  </div>
              )}

              {editFormData.contract_type === 'W2' && (
                  <div style={{ backgroundColor: '#F3F4F6', padding: '15px', borderRadius: '8px', marginTop: '15px', borderLeft: '4px solid #10B981' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#374151' }}>W2 Onboarding Compliance</h4>
                      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                        <label><input type="checkbox" name="i9_completed" checked={editFormData.i9_completed || false} onChange={handleEditChange} /> I-9 Form</label>
                        <label><input type="checkbox" name="w4_completed" checked={editFormData.w4_completed || false} onChange={handleEditChange} /> W-4 Form</label>
                        <label><input type="checkbox" name="everify_completed" checked={editFormData.everify_completed || false} onChange={handleEditChange} /> E-Verify</label>
                        <label><input type="checkbox" name="bank_details_completed" checked={editFormData.bank_details_completed || false} onChange={handleEditChange} /> Bank Details</label>
                      </div>
                  </div>
              )}

              <h3 style={styles.sectionHeader}>3. Vendor / Project Details</h3>
              <div style={styles.formGrid}>
                <select name="vendor_name" value={editFormData.vendor_name || ''} onChange={(e) => handleClientSelect(e, true)} style={{ ...styles.input, gridColumn: 'span 2' }}>
                  <option value="">-- Select End Client --</option>
                  {clients.map(client => (<option key={client.id} value={client.company_name}>{client.company_name}</option>))}
                </select>
                <input type="email" name="vendor_email" value={editFormData.vendor_email || ''} placeholder="Vendor Email (Auto)" readOnly style={{...styles.input, gridColumn: 'span 2', backgroundColor: '#E5E7EB', cursor: 'not-allowed'}} />
                
                <input type="text" name="vendor_for" value={editFormData.vendor_for || ''} placeholder="Vendor For" onChange={handleEditChange} style={styles.input} />
                <input type="text" name="net_terms" value={editFormData.net_terms || ''} placeholder="Net Terms (Auto)" readOnly style={{...styles.input, backgroundColor: '#E5E7EB', cursor: 'not-allowed'}} />
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', color: '#6B7280', fontWeight: 'bold' }}>Project Start Date</label>
                    <input type="date" name="project_start_date" value={editFormData.project_start_date || ''} onChange={handleEditChange} style={styles.input} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', color: '#6B7280', fontWeight: 'bold' }}>Project End Date</label>
                    <input type="date" name="project_end_date" value={editFormData.project_end_date || ''} onChange={handleEditChange} style={styles.input} />
                </div>
                
                <div style={styles.fullWidthInput}>
                  <input type="text" name="vendor_address" value={editFormData.vendor_address || ''} placeholder="Vendor Address (Auto)" readOnly style={{...styles.input, backgroundColor: '#E5E7EB', cursor: 'not-allowed'}} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '30px' }}>
                <button type="button" onClick={handleCloseEditModal} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={styles.saveBtn}>{isSubmitting ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- VIEW PROFILE MODAL --- */}
      {viewingUser && (
        <div style={styles.modalOverlay}>
          <div style={styles.largeModalBox}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #E5E7EB', position: 'relative', flexWrap: 'wrap', width: '100%' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#6366F1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold' }}>
                {viewingUser.first_name ? viewingUser.first_name[0] : ''}{viewingUser.last_name ? viewingUser.last_name[0] : ''}
              </div>
              <div>
                <h2 style={{ margin: 0, color: '#111827', fontSize: '20px' }}>{viewingUser.first_name} {viewingUser.last_name}</h2>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                   <span style={{ fontSize: '13px', color: '#4B5563', fontWeight: '600' }}>{viewingUser.role || 'Unassigned Role'}</span>
                   <span style={{ color: '#D1D5DB' }}>•</span>
                   <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px', backgroundColor: viewingUser.is_active !== false ? '#D1FAE5' : '#FEE2E2', color: viewingUser.is_active !== false ? '#065F46' : '#991B1B' }}>
                     {viewingUser.is_active !== false ? 'Active' : 'Inactive'}
                   </span>
                </div>
              </div>
              <button onClick={() => setViewingUser(null)} style={{...styles.closeBtn, position: 'absolute', top: '-5px', right: '-5px'}}>✕</button>
            </div>
            
            <div style={{ overflowY: 'auto', maxHeight: '55vh', paddingRight: '5px' }}>
              <h3 style={styles.sectionHeader}>Personal Information</h3>
              <div style={styles.formGrid}>
                <ProfileWidget label="Email Address" value={viewingUser.email} icon="📧" />
                <ProfileWidget label="Phone Number" value={viewingUser.phone_number} icon="📱" />
                <ProfileWidget label="Date of Birth" value={viewingUser.dob} icon="🎂" />
                <ProfileWidget label="Visa Status" value={viewingUser.visa_status} icon="🛂" highlightColor="#3B82F6" />
                <div style={styles.fullWidthInput}>
                  <ProfileWidget label="Home Address" value={viewingUser.address} icon="📍" />
                </div>
              </div>

              <h3 style={styles.sectionHeader}>Contract & Financials</h3>
              <div style={styles.formGrid}>
                <ProfileWidget label="Contract Type" value={viewingUser.contract_type || 'W2'} icon="📄" />
                <ProfileWidget label="Start Date" value={viewingUser.start_date} icon="🗓️" />
                <ProfileWidget label="Pay Rate (Employee)" value={viewingUser.pay_rate ? `$${viewingUser.pay_rate}/hr` : null} icon="💵" highlightColor="#10B981" />
                <ProfileWidget label="Bill Rate (Client)" value={viewingUser.invoice_rate ? `$${viewingUser.invoice_rate}/hr` : null} icon="💰" highlightColor="#8B5CF6" />
              </div>

              {(viewingUser.contract_type === 'W2' || !viewingUser.contract_type) && (
                <>
                  <h3 style={styles.sectionHeader}>W2 Compliance Checklist</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', backgroundColor: '#F9FAFB', padding: '15px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                    <ComplianceBadge label="I-9 Form" completed={viewingUser.i9_completed} />
                    <ComplianceBadge label="W-4 Form" completed={viewingUser.w4_completed} />
                    <ComplianceBadge label="E-Verify" completed={viewingUser.everify_completed} />
                    <ComplianceBadge label="Bank Details" completed={viewingUser.bank_details_completed} />
                  </div>
                </>
              )}
              
              {viewingUser.contract_type === 'C2C' && (
                <>
                  <h3 style={styles.sectionHeader}>Corp-to-Corp Details</h3>
                  <div style={styles.formGrid}>
                    <ProfileWidget label="Sub-Vendor Company" value={viewingUser.c2c_name} icon="🏢" />
                    <ProfileWidget label="Vendor Net Terms" value={viewingUser.c2c_net_terms} icon="⏱️" />
                    <ProfileWidget label="Billing Email" value={viewingUser.c2c_email} icon="✉️" />
                    <ProfileWidget label="Billing Phone" value={viewingUser.c2c_phone} icon="📞" />
                  </div>
                </>
              )}

              <h3 style={styles.sectionHeader}>Client & Project</h3>
              <div style={styles.formGrid}>
                <ProfileWidget label="Direct Client" value={viewingUser.vendor_name} icon="🤝" />
                <ProfileWidget label="End Client (Vendor For)" value={viewingUser.vendor_for} icon="🎯" />
                <ProfileWidget label="Project Start" value={viewingUser.project_start_date} icon="⏳" />
                <ProfileWidget label="Project End" value={viewingUser.project_end_date} icon="🏁" />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '25px', paddingTop: '20px', borderTop: '1px solid #E5E7EB', flexWrap: 'wrap', gap: '15px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={() => openInsights(viewingUser)} style={styles.insightBtn}>📊 Stats</button>
                <button onClick={() => handleEditClick(viewingUser)} style={styles.editBtn}>✏️ Edit</button>
                <button onClick={() => setPasswordModalUser(viewingUser)} style={styles.passwordBtn}>🔑 Password</button>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => handleArchiveContractor(viewingUser.id, viewingUser.first_name)} style={styles.archiveBtn}>📦 Archive</button>
                <button onClick={() => setViewingUser(null)} style={{...styles.cancelBtn, backgroundColor: '#9CA3AF'}}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- RESET PASSWORD MODAL --- */}
      {passwordModalUser && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#111827', fontSize: '18px' }}>Reset Password</h2>
              <button onClick={() => setPasswordModalUser(null)} style={styles.closeBtn}>✕</button>
            </div>
            <p style={{ color: '#4B5563', marginBottom: '20px', fontSize: '14px' }}>
              Set a new password for <strong>{passwordModalUser.first_name} {passwordModalUser.last_name}</strong>.
            </p>
            <form onSubmit={handlePasswordReset}>
              <input 
                type="text" 
                required 
                placeholder="Enter new password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                style={{...styles.input, width: '100%', marginBottom: '20px', boxSizing: 'border-box'}} 
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" disabled={isSubmitting} style={{...styles.saveBtn, flex: 1}}>{isSubmitting ? 'Saving...' : 'Update Password'}</button>
                <button type="button" onClick={() => setPasswordModalUser(null)} style={{...styles.cancelBtn, backgroundColor: '#F3F4F6', color: '#4B5563', flex: 1}}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- FINANCIAL INSIGHTS MODAL --- */}
      {insightUser && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#111827', fontSize: '18px' }}>Financial Insights</h2>
              <button onClick={() => setInsightUser(null)} style={styles.closeBtn}>✕</button>
            </div>
            <h3 style={{ marginTop: 0, color: '#4F46E5', fontSize: '16px' }}>{insightUser.first_name} {insightUser.last_name}</h3>
            <div style={styles.statsGrid}>
              <div style={styles.statBox}>
                <p style={styles.statLabel}>Total Billed</p>
                <h3 style={styles.statValue}>${(insightUser.totalBilled || 0).toFixed(2)}</h3>
              </div>
              <div style={styles.statBox}>
                <p style={styles.statLabel}>Total Collected</p>
                <h3 style={{...styles.statValue, color: '#10B981'}}>${(insightUser.totalPaid || 0).toFixed(2)}</h3>
              </div>
              <div style={styles.statBox}>
                <p style={styles.statLabel}>Pending Amount</p>
                <h3 style={{...styles.statValue, color: '#F59E0B'}}>${(insightUser.pendingAmount || 0).toFixed(2)}</h3>
              </div>
              <div style={styles.statBox}>
                <p style={styles.statLabel}>Invoices</p>
                <h3 style={styles.statValue}>{insightUser.invoiceCount || 0}</h3>
              </div>
            </div>
            <button onClick={() => setInsightUser(null)} style={{...styles.primaryBtn, width: '100%', marginTop: '20px', padding: '12px'}}>Close Dashboard</button>
          </div>
        </div>
      )}

    </div>
  );
}

// --- Helper Components for Modals ---
const ProfileWidget = ({ label, value, icon, highlightColor }) => (
  <div style={{ backgroundColor: highlightColor ? `${highlightColor}11` : '#F9FAFB', border: `1px solid ${highlightColor ? `${highlightColor}33` : '#E5E7EB'}`, padding: '10px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', boxSizing: 'border-box', width: '100%' }}>
    <div style={{ fontSize: '18px' }}>{icon}</div>
    <div style={{ overflow: 'hidden' }}>
      <div style={{ fontSize: '10px', color: highlightColor || '#6B7280', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{label}</div>
      <div style={{ fontSize: '14px', color: '#111827', fontWeight: '600', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value || '—'}</div>
    </div>
  </div>
);

const ComplianceBadge = ({ label, completed }) => (
  <div style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: completed ? '#D1FAE5' : '#FEE2E2', color: completed ? '#065F46' : '#991B1B', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
    {completed ? '✅' : '❌'} {label}
  </div>
);

// --- Responsive Styles Object ---
const styles = {
  header: { marginBottom: '25px' },
  title: { fontSize: '26px', color: '#111827', margin: '0 0 5px 0', fontWeight: '700' },
  subtitle: { color: '#6B7280', margin: 0, fontSize: '14px' },
  
  welcomeBanner: { backgroundColor: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #E5E7EB', marginBottom: '25px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  avatarBlob: { width: '42px', height: '42px', backgroundColor: '#EEF2FF', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' },
  welcomeText: { fontSize: '18px', color: '#111827', margin: '0 0 2px 0', fontWeight: '700' },
  welcomeSubtext: { fontSize: '13px', color: '#6B7280', margin: 0 },

  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', width: '100%' },
  kpiCard: { position: 'relative', padding: '20px', borderRadius: '12px', color: 'white', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  kpiTitle: { fontSize: '13px', fontWeight: 'bold', margin: '0 0 8px 0', zIndex: 2, position: 'relative' },
  kpiValue: { fontSize: '32px', fontWeight: '900', margin: 0, zIndex: 2, position: 'relative' },
  kpiBgNum: { position: 'absolute', right: '5px', bottom: '-15px', fontSize: '80px', fontWeight: '900', opacity: 0.12, zIndex: 1, lineHeight: 1 },

  filterPanel: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #E5E7EB', marginBottom: '25px', display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: '0 4px 12px -3px rgba(0, 0, 0, 0.05)' },
  filterColumn: { display: 'flex', flexDirection: 'column', gap: '8px' },
  filterTitle: { margin: '0 0 2px 0', fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' },
  filterList: { maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer' },

  darkBtn: { backgroundColor: 'white', color: '#374151', border: '1px solid #D1D5DB', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', flexGrow: 1, textAlign: 'center' },
  primaryBtn: { backgroundColor: '#4F46E5', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', flexGrow: 1, textAlign: 'center' },
  searchWrapper: { display: 'flex', alignItems: 'center', backgroundColor: 'white', border: '1px solid #D1D5DB', borderRadius: '8px', overflow: 'hidden', flexGrow: 2 },
  topSearchInput: { padding: '10px 10px 10px 0', border: 'none', outline: 'none', width: '100%', fontSize: '13px' },
  
  tableCardContainer: { backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)', width: '100%', boxSizing: 'border-box' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  
  tableHeader: { backgroundColor: '#ffffff', borderBottom: '1px solid #E5E7EB' },
  th: { padding: '15px 12px', fontWeight: '600', fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.02em' },
  thSortable: { padding: '15px 12px', fontWeight: '600', fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' },
  thCentered: { padding: '15px 12px', fontWeight: '600', fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', textAlign: 'center' },
  
  tableRow: { borderBottom: '1px solid #F3F4F6' },
  tdData: { padding: '14px 12px', verticalAlign: 'middle' },
  tdCentered: { padding: '14px 12px', verticalAlign: 'middle', textAlign: 'center' },
  
  nameLink: { fontWeight: '700', color: '#4F46E5', fontSize: '14px', cursor: 'pointer' },
  financialBadge: { padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', display: 'inline-block', whiteSpace: 'nowrap' },
  
  truncate: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },

  actionGroup: { display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' },
  iconBtn: { backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', color: '#374151', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  iconBtnSquare: { backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },

  pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', backgroundColor: '#F9FAFB', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' },
  pageBtn: { padding: '6px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', backgroundColor: 'white', cursor: 'pointer', fontWeight: 'bold', color: '#374151' },
  pageInfo: { color: '#6B7280', fontSize: '13px' },

  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' },
  modalBox: { backgroundColor: 'white', padding: '25px', borderRadius: '16px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', boxSizing: 'border-box' },
  largeModalBox: { backgroundColor: 'white', padding: '25px', borderRadius: '16px', width: '100%', maxWidth: '680px', maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', boxSizing: 'border-box' },
  closeBtn: { background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#9CA3AF' },
  sectionHeader: { margin: '15px 0 10px 0', color: '#374151', fontSize: '15px', borderBottom: '2px solid #F3F4F6', paddingBottom: '4px', fontWeight: '700' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' },
  input: { padding: '10px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  fullWidthInput: { gridColumn: '1 / -1', width: '100%', boxSizing: 'border-box' },
  rateWrapper: { display: 'flex', alignItems: 'center', border: '1px solid #D1D5DB', borderRadius: '6px', overflow: 'hidden', backgroundColor: 'white', width: '100%', boxSizing: 'border-box' },
  currencySymbol: { padding: '10px 12px', backgroundColor: '#F3F4F6', color: '#4B5563', fontWeight: 'bold', borderRight: '1px solid #D1D5DB', fontSize: '13px', whiteSpace: 'nowrap' },
  rateInput: { flex: 1, padding: '10px', border: 'none', fontSize: '14px', outline: 'none', width: '100%' },
  statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  subGrid2Col: { gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  statBox: { backgroundColor: '#F9FAFB', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB' },
  statLabel: { margin: 0, fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 'bold' },
  statValue: { margin: '4px 0 0 0', fontSize: '20px', color: '#111827', fontWeight: '700' },
  saveBtn: { backgroundColor: '#10B981', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' },
  cancelBtn: { backgroundColor: '#EF4444', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' },
  insightBtn: { backgroundColor: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' },
  editBtn: { backgroundColor: '#F3F4F6', color: '#4B5563', border: '1px solid #D1D5DB', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' },
  archiveBtn: { backgroundColor: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' },
  passwordBtn: { backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }
};