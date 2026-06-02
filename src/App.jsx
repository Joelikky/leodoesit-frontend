import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmationModal from './ConfirmationModal'; 
import imageCompression from 'browser-image-compression'; 

// 🔥 Import the logos
import ldiLogo from './assets/ldi-logo.png';
import gandivaLogo from './assets/gi-logo.png';

// 🔥 Import the small square symbols
import ldiSymbol from './assets/ldi-symbol.png';
import giSymbol from './assets/gi-symbol.png';

const MONTHS = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

const changeBrowserIcon = (iconUrl) => {
  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = iconUrl;
};

export default function Portal() {
  const [user, setUser] = useState(null);
  const [timesheets, setTimesheets] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  // Dynamic Branding State
  const [companyName, setCompanyName] = useState('Contractor Portal');
  const [themeColor, setThemeColor] = useState('#10B981'); 

  // Password Reset States
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });

  // Form State
  const [hours, setHours] = useState('');
  const [periodStart, setPeriodStart] = useState(''); 
  const [periodEnd, setPeriodEnd] = useState('');     
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isCompressing, setIsCompressing] = useState(false); 
  const [isModalOpen, setIsModalOpen] = useState(false); 
  
  // Sidebar Selection State
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() === 0 ? 11 : new Date().getMonth() - 1);
  const [viewYear, setViewYear] = useState(new Date().getMonth() === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear());
  
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const navigate = useNavigate();

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const urlUid = queryParams.get('uid');
  
    if (!urlUid) {
      console.error("UID missing");
      navigate('/');
      return;
    }
  
    // 🛡️ MULTI-TIER SESSION PARSE: Checks uid session space first, then falls back to local user blocks
    let userString = sessionStorage.getItem(`user_${urlUid}`) || localStorage.getItem('user');
  
    if (!userString) {
      console.error("User session missing");
      navigate('/');
      return;
    }
  
    const currentUser = JSON.parse(userString);
    
    // 🔥 ROBUST BACKUP LAYER: If names are blank inside session keys, extract text values from token mapping context
    if (!currentUser.first_name || currentUser.first_name === 'undefined') {
      const userSpecificToken = sessionStorage.getItem(`token_${urlUid}`) || localStorage.getItem('token');
      if (userSpecificToken) {
        try {
          // Decode signed token base64 chunk string data
          const base64Url = userSpecificToken.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          
          const decodedToken = JSON.parse(jsonPayload);
          currentUser.first_name = decodedToken.firstName || currentUser.name?.split(' ')[0] || 'Contractor';
          currentUser.last_name = decodedToken.lastName || currentUser.name?.split(' ')[1] || 'Profile';
        } catch (e) {
          console.error("Failed parsing fallback identity maps from active JWT payload data structures:", e);
        }
      }
    }

    setUser(currentUser);
  
    if (currentUser.tenant_name) {
      if (currentUser.tenant_name.toLowerCase().includes('gandiva')) {
        setCompanyName('Gandiva Insights');
        setThemeColor('#4F46E5');
        document.title = "Gandiva Portal";
        changeBrowserIcon(giSymbol);
      } else {
        setCompanyName('Leodoes It');
        setThemeColor('#10B981');
        document.title = "Leodoes IT Portal";
        changeBrowserIcon(ldiSymbol);
      }
    }
  
    // 🛡️ FRONTEND GUARDRAIL
    if (currentUser.tenant_id && currentUser.tenant_id !== 'undefined' && currentUser.tenant_id !== 'null') {
      fetchMyTimesheets(currentUser.email, currentUser.tenant_id, urlUid);
    } else {
      console.error("Invalid tenant layout parameters detected on session context parse.");
      setLoading(false);
    }
  
  }, [navigate]);

  const fetchMyTimesheets = async (email, tenantId, uid) => {
    if (!tenantId || tenantId === 'undefined' || tenantId === 'null') {
      console.error("Tenant ID layout parameter verification aborted.");
      return;
    }
    if (!uid || uid === 'undefined') {
      console.error("UID missing");
      return;
    }

    const userSpecificToken = sessionStorage.getItem(`token_${uid}`) || localStorage.getItem('token');
  
    if (!userSpecificToken) {
      console.error("Token missing");
      setLoading(false);
      return;
    }
  
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/timesheets/me/${email}`,
        {
          headers: {
            'x-tenant-id': tenantId,
            'Authorization': `Bearer ${userSpecificToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
  
      const data = await response.json();
  
      if (data.success) {
        setTimesheets(
          Array.isArray(data.data)
            ? data.data
            : (data.data ? [data.data] : [])
        );
      } else {
        console.error(data.error);
      }
    } catch (error) {
      console.error("Failed to fetch timesheets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    const processedFiles = [];
    setIsCompressing(true); 

    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const options = { maxSizeMB: 0.15, maxWidthOrHeight: 1920, useWebWorker: true, fileType: 'image/jpeg' };
        try {
          const compressedBlob = await imageCompression(file, options);
          const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
          const finalFile = new File([compressedBlob], newFileName, { type: "image/jpeg" });
          processedFiles.push(finalFile);
        } catch (error) {
          console.error("Compression error:", error);
          processedFiles.push(file); 
        }
      } else {
        const MAX_FILE_SIZE_MB = 5; 
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > MAX_FILE_SIZE_MB) {
          alert(`⚠️ The file "${file.name}" is way too large (${fileSizeMB.toFixed(1)} MB).\n\nPlease compress it to under 5 MB, or upload image screenshots instead.`);
        } else {
          processedFiles.push(file); 
        }
      }
    }

    if (processedFiles.length === 0) e.target.value = '';
    setUploadedFiles(processedFiles);
    setIsCompressing(false); 
  };

  const handleOpenPopup = (e) => {
    e.preventDefault();
    if (!hours || !periodStart || !periodEnd || uploadedFiles.length === 0) {
      alert("⚠️ You must enter your hours, select the start/end dates, AND attach proof of work.");
      return;
    }
    if (new Date(periodStart) > new Date(periodEnd)) {
      alert("⚠️ The Start Date cannot be after the End Date.");
      return;
    }
    setIsModalOpen(true);
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    const queryParams = new URLSearchParams(window.location.search);
    const targetUid = queryParams.get('uid') || user?.id;
    const userSpecificToken = sessionStorage.getItem(`token_${targetUid}`) || localStorage.getItem('token');

    try {
      const startDate = new Date(periodStart);
      const endDate = new Date(periodEnd);

      const formData = new FormData();
      formData.append('user_id', targetUid);
      formData.append('period_start', startDate.toISOString());
      formData.append('period_end', endDate.toISOString());
      formData.append('total_hours', parseFloat(hours));
      
      uploadedFiles.forEach(file => formData.append('screenshots', file));

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/timesheets`, {
        method: 'POST',
        headers: { 
          'x-tenant-id': user.tenant_id,
          'Authorization': `Bearer ${userSpecificToken}`
        },
        body: formData 
      });

      const data = await response.json();
      if (data.success) {
        await fetchMyTimesheets(user.email, user.tenant_id, targetUid); 
        setIsModalOpen(false);
        setIsCreatingNew(false); 
        setHours('');
        setPeriodStart('');
        setPeriodEnd('');
        setUploadedFiles([]);
        
        const fileInput = document.getElementById('file-upload-input');
        if (fileInput) fileInput.value = '';
// 🔥 NEW: Check if the backend detected an hours mismatch
if (data.ocrMismatchDetected) {
  alert(`⚠️ Timesheet submitted, but our automated system noticed a difference!\n\nYou entered ${hours} hours, but the uploaded document appears to show ${data.extractedOcrHours} hours. Your manager has been notified to review it.`);
} else {
        alert("✅ Timesheet and files submitted successfully!");
      }
     } else {
        alert("❌ Failed to submit: " + data.error);
      }
    } catch (error) {
      alert("❌ Network Error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("New passwords do not match!");
      return;
    }
    
    const queryParams = new URLSearchParams(window.location.search);
    const targetUid = queryParams.get('uid') || user?.id;
    const userSpecificToken = sessionStorage.getItem(`token_${targetUid}`) || localStorage.getItem('token');

    try {
      setIsSubmitting(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/change-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userSpecificToken}`
        },
        body: JSON.stringify({ 
          userId: targetUid, 
          oldPassword: passwordData.oldPassword, 
          newPassword: passwordData.newPassword 
        })
      });

      const data = await response.json();
      if (data.success) {
        alert("Password updated successfully!");
        setIsPasswordModalOpen(false);
        setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        alert("Failed to update password: " + data.error);
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred connecting to the server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    const queryParams = new URLSearchParams(window.location.search);
    const targetUid = queryParams.get('uid') || user?.id;
  
    sessionStorage.removeItem(`token_${targetUid}`);
    sessionStorage.removeItem(`user_${targetUid}`);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  
    document.title = "Portal Login";
    changeBrowserIcon('/vite.svg');
    navigate('/');
  };

  const handleYearChange = (e) => {
    const selectedYear = parseInt(e.target.value);
    setViewYear(selectedYear);
    setIsCreatingNew(false);
    
    if (selectedYear === currentYear && parseInt(viewMonth) > currentMonth) {
      setViewMonth(currentMonth);
    }
  };

  if (loading || !user) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Portal...</div>;

  const displayedTimesheets = timesheets.filter(ts => {
    if (!ts.period_start) return false;
    const tsDate = new Date(ts.period_start);
    return tsDate.getMonth() === parseInt(viewMonth) && tsDate.getFullYear() === parseInt(viewYear);
  });

  return (
    <div style={styles.container}>
      
      {/* --- TOP NAVIGATION --- */}
      <nav style={styles.nav}>
        <div className="responsive-header" style={styles.navContent}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <div style={styles.logoBadge}>
              <img 
                src={companyName.toLowerCase().includes('gandiva') ? gandivaLogo : ldiLogo} 
                alt={`${companyName} Logo`} 
                style={{ height: 'auto', maxHeight: '30px', objectFit: 'contain', display: 'block' }} 
              />
            </div>
            {/* 🔥 FIXED LOGIC BADGE: Shows name parameter greets right alongside status container flags */}
            <span style={{...styles.portalBadge, backgroundColor: themeColor}}>
              {user.first_name && user.first_name !== 'Contractor' ? `Welcome, ${user.first_name} ${user.last_name || ''}` : 'Contractor Portal'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '5px' }}>
            <span style={styles.userInfo}>👤 {user.first_name} {user.last_name}</span>
            <button onClick={() => setIsPasswordModalOpen(true)} style={styles.changePassBtn}>
              Password
            </button>
            <button onClick={handleLogout} style={styles.logoutBtn}>Log Out</button>
          </div>
        </div>
      </nav>

      {/* --- CORE STRUCTURAL GRID CONTENT --- */}
      <div className="dashboard-content" style={styles.portalLayout}>
        
        {/* --- LEFT SIDEBAR --- */}
        <div className="billing-card" style={styles.sidebar}>
          <h3 style={{ margin: '0 0 20px 0', color: '#111827', fontSize: '18px' }}>Billing Filter</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Month</label>
              <select 
                value={viewMonth} 
                onChange={(e) => { setViewMonth(e.target.value); setIsCreatingNew(false); }} 
                style={styles.input}
              >
                {MONTHS.map((month, index) => {
                  if (parseInt(viewYear) === currentYear && index > currentMonth) return null;
                  return <option key={index} value={index}>{month}</option>;
                })}
              </select>
            </div>
            
            <div style={styles.inputGroup}>
              <label style={styles.label}>Year</label>
              <select value={viewYear} onChange={handleYearChange} style={styles.input}>
                <option value={currentYear}>{currentYear}</option>
                <option value={currentYear - 1}>{currentYear - 1}</option>
              </select>
            </div>
          </div>

          <div style={styles.sidebarStatusBox}>
            <div style={{ color: displayedTimesheets.length > 0 ? '#059669' : '#6B7280', fontWeight: 'bold', marginBottom: '15px', fontSize: '14px' }}>
              {displayedTimesheets.length} Timesheet(s) Found
            </div>

            <button 
              onClick={() => setIsCreatingNew(true)} 
              style={{ ...styles.addBtn, backgroundColor: themeColor, color: 'white', cursor: 'pointer' }}
            >
              + Submit New Timesheet
            </button>
          </div>
        </div>

        {/* --- RIGHT MAIN CARD --- */}
        <div className="billing-card" style={styles.mainCard}>
          
          {!isCreatingNew && displayedTimesheets.length > 0 ? (
            <div style={styles.statusView}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                  <h1 style={{...styles.title, fontSize: '22px'}}>Your Submitted Timesheets</h1>
                  <p style={styles.subtitle}>Showing data for {MONTHS[viewMonth]} {viewYear}</p>
                </div>
                <button onClick={() => setIsCreatingNew(true)} style={{...styles.addBtn, backgroundColor: themeColor, width: 'auto', padding: '10px 20px', color: 'white'}}>
                  + Add Another
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {displayedTimesheets.map((ts, idx) => (
                  <div key={ts.id || idx} style={{ ...styles.statusBox, display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left', padding: '15px', flexWrap: 'wrap', gap: '15px' }}>
                    <div>
                      <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#111827', fontSize: '15px' }}>
                        {new Date(ts.period_start).toLocaleDateString()} &nbsp;→&nbsp; {new Date(ts.period_end).toLocaleDateString()}
                      </p>
                      <p style={{ margin: 0, color: '#6B7280', fontSize: '13px' }}>
                        <strong>{ts.total_hours}</strong> Hours Logged
                      </p>
                    </div>
                    <div>
                      {ts.status === 'SUBMITTED' && <span style={styles.badgePending}>⏳ Pending Review</span>}
                      {ts.status === 'APPROVED' && <span style={styles.badgeApproved}>✅ Approved</span>}
                      {ts.status === 'REJECTED' && <span style={styles.badgeRejected}>❌ Rejected</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          ) : isCreatingNew || (displayedTimesheets.length > 0 && displayedTimesheets.some(ts => ts.status === 'REJECTED')) ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                  <h1 style={{...styles.title, fontSize: '22px'}}>Submit Your Hours</h1>
                  <p style={styles.subtitle}>Enter the exact dates you worked.</p>
                </div>
                <button onClick={() => setIsCreatingNew(false)} style={styles.cancelBtn}>Cancel</button>
              </div>

              <form onSubmit={handleOpenPopup} style={styles.form}>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  <div style={{ ...styles.inputGroup, flex: '1 1 200px' }}>
                    <label style={styles.label}>Start Date</label>
                    <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} style={styles.input} required />
                  </div>
                  <div style={{ ...styles.inputGroup, flex: '1 1 200px' }}>
                    <label style={styles.label}>End Date</label>
                    <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} style={styles.input} required />
                  </div>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Total Hours for this Period</label>
                  <input type="number" step="0.01" placeholder="e.g. 40.00" value={hours} onChange={(e) => setHours(e.target.value)} style={styles.input} required />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Proof of Work (Screenshots or PDF max 5MB)</label>
                  <div style={styles.uploadArea}>
                    <p style={{ margin: '0 0 10px 0', color: '#6B7280', fontSize: '13px' }}>Upload screenshots verifying your tracked time.</p>
                    <input id="file-upload-input" type="file" multiple accept="image/*,application/pdf" onChange={handleFileChange} style={{ margin: '0 auto', display: 'block', padding: '10px', maxWidth: '100%' }} />
                    
                    {isCompressing && <p style={{ color: '#D97706', fontWeight: 'bold', fontSize: '13px' }}>⏳ Processing files...</p>}
                    
                    {!isCompressing && uploadedFiles.length > 0 && (
                      <div style={styles.fileList}>
                        {uploadedFiles.map((file, i) => (
                          <div key={i} style={styles.fileItem}>📎 {file.name.length > 20 ? file.name.slice(0,20)+'...' : file.name} ({(file.size / 1024).toFixed(0)} KB)</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <button type="submit" style={{ ...styles.submitBtn, backgroundColor: isSubmitting || isCompressing || uploadedFiles.length === 0 ? '#9CA3AF' : themeColor }} disabled={isSubmitting || isCompressing || uploadedFiles.length === 0}>
                  {isCompressing ? 'Processing Files...' : isSubmitting ? 'Submitting...' : 'Submit Timesheet for Approval'}
                </button>
              </form>
            </div>
            
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 10px' }}>
              <div style={{ fontSize: '44px', marginBottom: '10px' }}>📂</div>
              <h2 style={{ color: '#111827', margin: '0 0 10px 0', fontSize: '20px' }}>No Data Found</h2>
              <p style={{ color: '#6B7280', margin: '0 0 20px 0', fontSize: '14px' }}>You have not submitted any timesheets for {MONTHS[viewMonth]} {viewYear}.</p>
              <button onClick={() => setIsCreatingNew(true)} style={{...styles.addBtn, backgroundColor: themeColor, color: 'white', maxWidth: '280px', margin: '0 auto'}}>
                + Submit Your First Timesheet
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* --- CHANGE PASSWORD MODAL --- */}
      {isPasswordModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#111827', fontSize: '18px' }}>Change Password</h3>
              <button onClick={() => setIsPasswordModalOpen(false)} style={styles.closeBtn}>✕</button>
            </div>
            <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={styles.label}>Current Password</label>
                <input 
                  type="password" 
                  required 
                  style={styles.modalInput}
                  value={passwordData.oldPassword}
                  onChange={(e) => setPasswordData({...passwordData, oldPassword: e.target.value})}
                />
              </div>

              <div>
                <label style={styles.label}>New Password</label>
                <input 
                  type="password" 
                  required 
                  style={styles.modalInput}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                />
              </div>

              <div>
                <label style={styles.label}>Confirm Password</label>
                <input 
                  type="password" 
                  required 
                  style={styles.modalInput}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" disabled={isSubmitting} style={{...styles.submitBtn, backgroundColor: themeColor, padding: '10px', width: 'auto', flex: 1}}>
                  {isSubmitting ? 'Updating...' : 'Update Password'}
                </button>
                <button type="button" onClick={() => setIsPasswordModalOpen(false)} style={{...styles.cancelBtn, padding: '10px 15px'}}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleFinalSubmit}
        hours={hours}
        payout={hours ? (parseFloat(hours) * parseFloat(user.pay_rate || 0)).toFixed(2) : "0.00"}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', width: '100%', backgroundColor: '#F3F4F6', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column', margin: 0, padding: 0, boxSizing: 'border-box' },
  nav: { backgroundColor: '#111827', padding: '10px 0', width: '100%' },
  navContent: { maxWidth: '1000px', margin: '0 auto', padding: '0 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', boxSizing: 'border-box' },
  logoBadge: { backgroundColor: 'white', padding: '6px 10px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  portalBadge: { color: 'white', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', letterSpacing: '0.5px', whiteSpace: 'nowrap' },
  changePassBtn: { backgroundColor: 'transparent', color: '#D1D5DB', border: '1px solid #4B5563', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
  userInfo: { color: '#D1D5DB', fontSize: '13px', fontWeight: '500' },
  logoutBtn: { backgroundColor: 'transparent', color: '#9CA3AF', border: '1px solid #4B5563', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
  portalLayout: { flex: 1, width: '100%', maxWidth: '1000px', margin: '20px auto', padding: '0 15px 30px 15px', boxSizing: 'border-box' },
  sidebar: { padding: '20px', borderRadius: '16px', boxShadow: '0 4px 15px -3px rgba(0, 0, 0, 0.05)', backgroundColor: 'white' },
  mainCard: { padding: '25px', borderRadius: '16px', boxShadow: '0 4px 15px -3px rgba(0, 0, 0, 0.05)', backgroundColor: 'white' },
  sidebarStatusBox: { marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column' },
  title: { margin: '0 0 5px 0', color: '#111827', fontSize: '24px', fontWeight: '700' },
  subtitle: { margin: 0, color: '#6B7280', fontSize: '14px' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '15px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', boxSizing: 'border-box' },
  label: { fontSize: '12px', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px', backgroundColor: '#F9FAFB', outline: 'none', width: '100%', boxSizing: 'border-box' },
  uploadArea: { border: '2px dashed #D1D5DB', borderRadius: '8px', padding: '20px', textAlign: 'center', backgroundColor: '#F9FAFB' },
  fileList: { marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'center' },
  fileItem: { backgroundColor: '#E0E7FF', color: '#3730A3', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' },
  submitBtn: { color: 'white', border: 'none', padding: '14px', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', width: '100%' },
  addBtn: { border: 'none', padding: '12px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', width: '100%', textAlign: 'center' },
  cancelBtn: { backgroundColor: '#F3F4F6', color: '#4B5563', border: '1px solid #D1D5DB', padding: '8px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' },
  statusView: { display: 'flex', flexDirection: 'column' },
  statusBox: { backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '12px', boxSizing: 'border-box' },
  badgePending: { backgroundColor: '#FEF3C7', color: '#D97706', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #FDE68A', whiteSpace: 'nowrap' },
  badgeApproved: { backgroundColor: '#D1FAE5', color: '#059669', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #A7F3D0', whiteSpace: 'nowrap' },
  badgeRejected: { backgroundColor: '#FEE2E2', color: '#DC2626', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #FECACA', whiteSpace: 'nowrap' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' },
  modalContent: { backgroundColor: 'white', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '380px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', boxSizing: 'border-box' },
  modalInput: { width: '100%', padding: '10px', border: '1px solid #D1D5DB', borderRadius: '6px', boxSizing: 'border-box', outline: 'none', fontSize: '14px' },
  closeBtn: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#9CA3AF' }
};