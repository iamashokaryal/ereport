// ===========================================
// Enumerator System - Shared Utilities & Firebase Functions
// ===========================================

// ========== Session Management ==========
function setSession(userId, userName, role, area = null) {
  sessionStorage.setItem('userId', userId);
  sessionStorage.setItem('userName', userName);
  sessionStorage.setItem('role', role);
  if (area) sessionStorage.setItem('area', area);
  sessionStorage.setItem('loginTime', new Date().getTime());
}

function getSession() {
  return {
    userId: sessionStorage.getItem('userId'),
    userName: sessionStorage.getItem('userName'),
    role: sessionStorage.getItem('role'),
    area: sessionStorage.getItem('area'),
    loginTime: sessionStorage.getItem('loginTime')
  };
}

function clearSession() {
  sessionStorage.clear();
}

function isLoggedIn() {
  return sessionStorage.getItem('userId') !== null;
}

function logout() {
  clearSession();
  window.location.href = 'login.html';
}

// ========== Local Storage (Backup) ==========
function saveToLocalStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function getFromLocalStorage(key) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}

// ========== Firebase User Management ==========

// Check if user exists in Firestore
async function userExists(userId) {
  try {
    const doc = await db.collection('users').doc(userId).get();
    return doc.exists;
  } catch (error) {
    console.error('Error checking user:', error);
    return false;
  }
}

// Get user data from Firestore
async function getUserData(userId) {
  try {
    const doc = await db.collection('users').doc(userId).get();
    return doc.exists ? doc.data() : null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
}

// Create new enumerator
async function createEnumerator(userId, name, password, area) {
  try {
    // Check if user already exists
    if (await userExists(userId)) {
      return { success: false, message: 'User ID already exists!' };
    }

    await db.collection('users').doc(userId).set({
      name: name,
      password: hashPassword(password), // Simple hash
      role: 'enumerator',
      area: area,
      createdAt: new Date(),
      createdBy: getSession().userId
    });

    return { success: true, message: 'Enumerator created successfully!' };
  } catch (error) {
    console.error('Error creating enumerator:', error);
    return { success: false, message: error.message };
  }
}

// Verify login credentials
async function verifyLogin(userId, password) {
  // Special case for admin
  if (userId === ADMIN_ID && password === ADMIN_PASSWORD) {
    return {
      success: true,
      userId: ADMIN_ID,
      name: 'Administrator',
      role: 'admin',
      area: null
    };
  }

  // Check Firestore for enumerator
  try {
    const user = await getUserData(userId);
    if (user && user.password === hashPassword(password)) {
      return {
        success: true,
        userId: userId,
        name: user.name,
        role: 'enumerator',
        area: user.area
      };
    }
    return { success: false, message: 'Invalid credentials!' };
  } catch (error) {
    console.error('Error verifying login:', error);
    return { success: false, message: 'Login error. Please try again.' };
  }
}

// Get all enumerators
async function getAllEnumerators() {
  try {
    const snapshot = await db.collection('users')
      .where('role', '==', 'enumerator')
      .get();

    let enumerators = [];
    snapshot.forEach(doc => {
      enumerators.push({
        id: doc.id,
        ...doc.data()
      });
    });
    return enumerators;
  } catch (error) {
    console.error('Error fetching enumerators:', error);
    return [];
  }
}

// ========== Report Management ==========

// Check if report already submitted today
async function hasSubmittedToday(userId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const snapshot = await db.collection('reports')
      .where('user_id', '==', userId)
      .where('date', '==', today)
      .get();

    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking report:', error);
    return false;
  }
}

// Submit daily report
async function submitReport(reportData) {
  try {
    // Validate data
    if (reportData.completed + reportData.pending !== reportData.total) {
      return {
        success: false,
        message: 'Error: Completed + Pending must equal Total!'
      };
    }

    // Check for duplicate submission
    const today = new Date().toISOString().split('T')[0];
    if (reportData.date === today) {
      const hasSubmitted = await hasSubmittedToday(reportData.user_id);
      if (hasSubmitted) {
        return {
          success: false,
          message: 'You have already submitted today! Come back tomorrow.'
        };
      }
    }

    // Add to Firestore
    const docRef = await db.collection('reports').add({
      ...reportData,
      timestamp: new Date(),
      submittedAt: new Date().toLocaleString()
    });

    return {
      success: true,
      message: 'Report submitted successfully!',
      docId: docRef.id
    };
  } catch (error) {
    console.error('Error submitting report:', error);
    return { success: false, message: error.message };
  }
}

// Get user's reports
async function getUserReports(userId) {
  try {
    const snapshot = await db.collection('reports')
      .where('user_id', '==', userId)
      .orderBy('date', 'desc')
      .get();

    let reports = [];
    snapshot.forEach(doc => {
      reports.push({
        id: doc.id,
        ...doc.data()
      });
    });
    return reports;
  } catch (error) {
    console.error('Error fetching reports:', error);
    return [];
  }
}

// Get all reports (admin only)
async function getAllReports(filterDate = null) {
  try {
    let query = db.collection('reports');

    if (filterDate) {
      query = query.where('date', '==', filterDate);
    }

    const snapshot = await query.orderBy('timestamp', 'desc').get();

    let reports = [];
    snapshot.forEach(doc => {
      reports.push({
        id: doc.id,
        ...doc.data()
      });
    });
    return reports;
  } catch (error) {
    console.error('Error fetching all reports:', error);
    return [];
  }
}

// Get reports by date range
async function getReportsByDateRange(startDate, endDate) {
  try {
    const snapshot = await db.collection('reports')
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .orderBy('date', 'desc')
      .get();

    let reports = [];
    snapshot.forEach(doc => {
      reports.push({
        id: doc.id,
        ...doc.data()
      });
    });
    return reports;
  } catch (error) {
    console.error('Error fetching reports:', error);
    return [];
  }
}

// Get report summary for enumerator
async function getEnumeratorSummary(userId) {
  try {
    const reports = await getUserReports(userId);

    let summary = {
      totalReports: reports.length,
      totalECensus: 0,
      totalPhysical: 0,
      totalEstablishments: 0,
      totalCompleted: 0,
      totalPending: 0
    };

    reports.forEach(report => {
      summary.totalECensus += report.ecensus || 0;
      summary.totalPhysical += report.physical || 0;
      summary.totalEstablishments += report.total || 0;
      summary.totalCompleted += report.completed || 0;
      summary.totalPending += report.pending || 0;
    });

    return summary;
  } catch (error) {
    console.error('Error calculating summary:', error);
    return null;
  }
}

// Get admin summary
async function getAdminSummary() {
  try {
    const reports = await getAllReports();

    let summary = {
      totalReports: reports.length,
      totalECensus: 0,
      totalPhysical: 0,
      totalEstablishments: 0,
      totalCompleted: 0,
      totalPending: 0,
      enumeratorCount: 0
    };

    reports.forEach(report => {
      summary.totalECensus += report.ecensus || 0;
      summary.totalPhysical += report.physical || 0;
      summary.totalEstablishments += report.total || 0;
      summary.totalCompleted += report.completed || 0;
      summary.totalPending += report.pending || 0;
    });

    // Get enumerator count
    const enumerators = await getAllEnumerators();
    summary.enumeratorCount = enumerators.length;

    return summary;
  } catch (error) {
    console.error('Error calculating admin summary:', error);
    return null;
  }
}

// ========== Utility Functions ==========

// Simple hash function (for demo - use proper hashing in production)
function hashPassword(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

// Get today's date in YYYY-MM-DD format
function getTodayDate() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

// Format date for display
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Format timestamp for display
function formatTimestamp(date) {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleString('en-US');
}

// Show notification
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `alert alert-${type} alert-dismissible fade show`;
  notification.setAttribute('role', 'alert');
  notification.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;

  // Insert at top of body
  document.body.insertAdjacentElement('afterbegin', notification);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

// Check authentication before page load
function checkAuth() {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
  }
}

// Check admin access
function checkAdminAccess() {
  const session = getSession();
  if (!session.role || session.role !== 'admin') {
    alert('Admin access required!');
    window.location.href = 'login.html';
  }
}

// Check enumerator access
function checkEnumeratorAccess() {
  const session = getSession();
  if (!session.role || session.role !== 'enumerator') {
    alert('Enumerator access required!');
    window.location.href = 'login.html';
  }
}

// Update UI with current user info
function updateUserInfo() {
  const session = getSession();
  const userNameElement = document.getElementById('userName');
  const userRoleElement = document.getElementById('userRole');

  if (userNameElement) {
    userNameElement.textContent = session.userName || 'User';
  }
  if (userRoleElement) {
    userRoleElement.textContent = session.role === 'admin' ? 'Administrator' : 'Enumerator';
  }
}

// Real-time listener setup
function setupRealtimeListener(collectionName, callback, whereConditions = null) {
  try {
    let query = db.collection(collectionName);

    if (whereConditions) {
      whereConditions.forEach(condition => {
        query = query.where(condition.field, condition.operator, condition.value);
      });
    }

    const unsubscribe = query.onSnapshot(snapshot => {
      let data = [];
      snapshot.forEach(doc => {
        data.push({
          id: doc.id,
          ...doc.data()
        });
      });
      callback(data);
    }, error => {
      console.error('Listener error:', error);
    });

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up listener:', error);
    return null;
  }
}

// Print table
function printTable(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;

  const printWindow = window.open('', '', 'height=400,width=600');
  printWindow.document.write('<html><head><title>Report</title>');
  printWindow.document.write('<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">');
  printWindow.document.write('</head><body>');
  printWindow.document.write(table.outerHTML);
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  printWindow.print();
}

// Export to CSV
function exportToCSV(tableId, filename = 'export.csv') {
  const table = document.getElementById(tableId);
  if (!table) return;

  let csv = [];
  const rows = table.querySelectorAll('tr');

  rows.forEach(row => {
    let rowData = [];
    row.querySelectorAll('td, th').forEach(cell => {
      rowData.push('"' + cell.textContent.trim() + '"');
    });
    csv.push(rowData.join(','));
  });

  const csvContent = csv.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
