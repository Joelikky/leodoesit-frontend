import { useState, useEffect } from 'react'; 
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';

// Wide text branding logos
import ldiLogo from './assets/ldi-logo.png';
import gandivaLogo from './assets/gi-logo.png';

// Tab Favicons
import ldiSymbol from './assets/ldi-symbol.png';
import giSymbol from './assets/gi-symbol.png';

const changeBrowserIcon = (iconUrl) => {
  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = iconUrl;
};

export default function AdminLayout() {
  const location = useLocation();
  const path = location.pathname;
  const navigate = useNavigate(); 
  
  const [companyName, setCompanyName] = useState('Portal Admin');
  const [themeColor, setThemeColor] = useState('#10B981'); 

  // Capture the URL parameter values at the top scope level
  const queryParams = new URLSearchParams(location.search);
  const currentUid = queryParams.get('uid');
  
  // Generate an appendable query string suffix to protect navigation parameters
  const appendUid = currentUid ? `?uid=${currentUid}` : '';

  // Parse authorization parameters up front for the Outlet context channel distribution
  const adminUserString = sessionStorage.getItem(`user_${currentUid}`);
  const adminUser = adminUserString ? JSON.parse(adminUserString) : null;
  const adminToken = sessionStorage.getItem(`token_${currentUid}`);

  useEffect(() => {
    // Read the tracking parameter explicitly
    if (!currentUid) {
      console.error("UID token parameter dropped from URL bar route context.");
      navigate('/');
      return;
    }

    if (!adminUserString) {
      console.error("No active user session found matching tracking token.");
      navigate('/');
      return;
    }

    const user = JSON.parse(adminUserString);
    if (user.role !== 'ADMIN') {
      alert("Unauthorized access. Admins only.");
      sessionStorage.removeItem(`user_${currentUid}`);
      sessionStorage.removeItem(`token_${currentUid}`);
      navigate('/');
      return;
    }

    // Tenant brand switcher logic
    if (user.tenant_name) {
      if (user.tenant_name.toLowerCase().includes('gandiva')) {
        setCompanyName('Gandiva Insights');
        setThemeColor('#4F46E5'); 
        document.title = "Gandiva Admin"; 
        changeBrowserIcon(giSymbol); 
      } else {
        setCompanyName('Leodoes IT');
        setThemeColor('#10B981'); 
        document.title = "Leodoes IT Admin"; 
        changeBrowserIcon(ldiSymbol); 
      }
    }

  }, [navigate, currentUid, adminUserString]); // Sync on tracking state parameter shifts

  const handleLogout = () => {
    if (currentUid) {
      sessionStorage.removeItem(`user_${currentUid}`);
      sessionStorage.removeItem(`token_${currentUid}`);
    }
    document.title = "Portal Login";
    changeBrowserIcon('/vite.svg'); 
    navigate('/');
  };

  return (
    <div style={styles.container}>
      {/* Sidebar Layout Section */}
      <div style={styles.sidebar}>
        
        <div style={styles.logoContainer}>
          <div style={styles.logoBadge}>
            <img 
              src={companyName.toLowerCase().includes('gandiva') ? gandivaLogo : ldiLogo} 
              alt={`${companyName} Logo`} 
              style={{ 
                maxWidth: '100%', 
                height: 'auto', 
                maxHeight: '45px', 
                objectFit: 'contain',
                display: 'block' 
              }} 
            />
          </div>
        </div>
        
        {/* Append the tracked UID query wrapper token to all Link endpoints */}
        <nav style={styles.nav}>
          <Link to={`/admin/queue${appendUid}`} style={path.includes('/queue') ? styles.activeNavItem : styles.navItem}>
            📋 Approval Queue
          </Link>
          <Link to={`/admin/hub${appendUid}`} style={path.includes('/hub') ? styles.activeNavItem : styles.navItem}>
            💵 Invoicing Hub
          </Link>
          <Link to={`/admin/ledger${appendUid}`} style={path.includes('/ledger') ? styles.activeNavItem : styles.navItem}>
            📚 Invoice Ledger
          </Link>
          <Link to={`/admin/clients${appendUid}`} style={path.includes('/clients') ? styles.activeNavItem : styles.navItem}>
            🏢 Vendors
          </Link>
          <Link to={`/admin/sub-vendors${appendUid}`} style={path.includes('/sub-vendors') ? styles.activeNavItem : styles.navItem}>
            🤝 Sub Vendors
          </Link>
          <Link to={`/admin/contractors${appendUid}`} style={path.includes('/contractors') ? styles.activeNavItem : styles.navItem}>
            👷 Contractors
          </Link>
          <Link to={`/admin/timesheets${appendUid}`} style={path.includes('/timesheets') ? styles.activeNavItem : styles.navItem}>
            🕒 Timesheets
          </Link>
          <Link to={`/admin/reports${appendUid}`} style={path.includes('/reports') ? styles.activeNavItem : styles.navItem}>
            📊 Reports
          </Link>
        </nav>

        <div style={{ padding: '20px', marginTop: 'auto' }}>
          <button onClick={handleLogout} style={styles.logoutBtn}>
             Log Out
          </button>
        </div>
      </div>

      {/* Main Inner Target Context View Window */}
      <div style={styles.main}>
        {/* Inject authenticated framework properties safely to child elements via context */}
        <Outlet context={{ adminUser, adminToken }} /> 
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', minHeight: '100vh', backgroundColor: '#F3F4F6', fontFamily: 'system-ui, sans-serif' },
  sidebar: { width: '250px', backgroundColor: '#111827', color: 'white', padding: '20px', display: 'flex', flexDirection: 'column' },
  logoContainer: { marginBottom: '40px', textAlign: 'center', display: 'flex', justifyContent: 'center' },
  logoBadge: { backgroundColor: 'white', padding: '8px 12px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  nav: { display: 'flex', flexDirection: 'column', gap: '15px' },
  activeNavItem: { backgroundColor: '#374151', padding: '10px 15px', borderRadius: '6px', fontWeight: 'bold', color: 'white', textDecoration: 'none', display: 'block' },
  navItem: { padding: '10px 15px', color: '#9CA3AF', textDecoration: 'none', display: 'block', transition: '0.2s' },
  main: { flex: 1, padding: '40px', overflowY: 'auto' },
  logoutBtn: { width: '100%', padding: '10px', backgroundColor: 'transparent', color: '#9CA3AF', border: '1px solid #4B5563', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }
};