// Admin dashboard functionality
document.addEventListener('DOMContentLoaded', () => {
  const adminLoginForm = document.getElementById('admin-login-form');
  const adminLoginCard = document.getElementById('admin-login');
  const adminDashboard = document.getElementById('admin-dashboard');
  const logoutBtn = document.getElementById('logout-btn');
  const applicationsTbody = document.getElementById('applications-tbody');
  const statusFilter = document.getElementById('status-filter');
  const applicationModal = document.getElementById('application-modal');
  const modalBody = document.getElementById('modal-body');
  const approveBtn = document.getElementById('approve-btn');
  const rejectBtn = document.getElementById('reject-btn');
  const closeModal = document.getElementById('close-modal');
  const modalClose = document.querySelector('.modal-close');
  const refreshBtn = document.getElementById('refresh-btn');

  let currentApplicationId = null;
  let applications = [];

  // Check if admin is logged in on page load
  function checkAdminLogin() {
    const adminSession = localStorage.getItem('adminLoggedIn');
    if (adminSession === 'true') {
      showDashboard();
    } else {
      showLogin();
    }
  }

  function showLogin() {
    adminLoginCard.style.display = 'block';
    adminDashboard.style.display = 'none';
    logoutBtn.style.display = 'none';
  }

  function showDashboard() {
    adminLoginCard.style.display = 'none';
    adminDashboard.style.display = 'block';
    logoutBtn.style.display = 'block';
    
    // Display admin profile info
    const adminUser = localStorage.getItem('admin_user');
    if (adminUser) {
      try {
        const admin = JSON.parse(adminUser);
        console.log('[AdminDashboard] Logged in admin:', admin.username);
        
        // Update topbar to show admin info
        const supportBtn = document.querySelector('.actions .support');
        if (supportBtn) {
          supportBtn.textContent = `Admin: ${admin.name || admin.username}`;
          supportBtn.style.cursor = 'default';
          supportBtn.style.background = 'transparent';
          supportBtn.style.color = '#fff';
        }
      } catch (e) {
        console.warn('[AdminDashboard] Failed to parse admin user:', e);
      }
    }
    
    loadApplications();
  }

  // Admin login handler
  adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('admin-username').value.trim();
    const password = document.getElementById('admin-password').value.trim();

    if (!username) {
      alert('Username is required');
      return;
    }
    if (!password) {
      alert('Password is required');
      return;
    }

    try {
      console.log('[AdminAuth] Attempting login with username:', username);
      const response = await fetch('http://127.0.0.1:5000/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      console.log('[AdminAuth] Response status:', response.status);
      const data = await response.json();
      console.log('[AdminAuth] Response data:', data);

      if (data.success && data.admin) {
        console.log('[AdminAuth] Login successful:', data.admin);
        localStorage.setItem('adminLoggedIn', 'true');
        localStorage.setItem('admin_user', JSON.stringify(data.admin));
        document.getElementById('admin-username').value = '';
        document.getElementById('admin-password').value = '';
        showDashboard();
      } else {
        alert(data.message || 'Invalid credentials');
      }
    } catch (error) {
      console.error('[AdminAuth] Error:', error);
      alert('Error connecting to server: ' + error.message);
    }
  });

  // Logout handler
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('admin_user');
    document.getElementById('admin-username').value = '';
    document.getElementById('admin-password').value = '';
    showLogin();
  });

  // Load applications and stats
  async function loadApplications() {
    try {
      // Load stats
      const statsResponse = await fetch('http://127.0.0.1:5000/admin/stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        document.getElementById('total-applications').textContent = stats.total_applications;
        document.getElementById('approved-applications').textContent = stats.approved_applications;
        document.getElementById('pending-applications').textContent = stats.pending_applications;
        document.getElementById('rejected-applications').textContent = stats.rejected_applications;
      }

      // Load applications
      const response = await fetch('http://127.0.0.1:5000/admin/applications', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        applications = await response.json();
        renderApplications();
        updateStats();
      } else {
        console.error('Failed to load applications');
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  // Render applications table
  function renderApplications(filter = 'all') {
    applicationsTbody.innerHTML = '';

    const filteredApps = filter === 'all' ?
      applications :
      applications.filter(app => app.status === filter);

    filteredApps.forEach(app => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${app.id}</td>
        <td>${app.student_name}</td>
        <td>${app.enrollment}</td>
        <td>${app.route_title}</td>
        <td><span class="status-badge status-${app.status}">${app.status.charAt(0).toUpperCase() + app.status.slice(1)}</span></td>
        <td>${new Date(app.created_at).toLocaleDateString()}</td>
        <td>
          <button class="action-btn view-btn" data-id="${app.id}">View</button>
          ${app.status === 'pending' ? `
            <button class="action-btn approve-btn" data-id="${app.id}">Approve</button>
            <button class="action-btn reject-btn" data-id="${app.id}">Reject</button>
          ` : ''}
          <button class="action-btn delete-btn" data-id="${app.id}">Delete</button>
        </td>
      `;
      applicationsTbody.appendChild(tr);
    });

    // Add event listeners
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const appId = e.target.dataset.id;
        showApplicationDetails(appId);
      });
    });

    document.querySelectorAll('.approve-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const appId = e.target.dataset.id;
        updateApplicationStatus(appId, 'approved');
      });
    });

    document.querySelectorAll('.reject-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const appId = e.target.dataset.id;
        updateApplicationStatus(appId, 'rejected');
      });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const appId = e.target.dataset.id;
        if (confirm('Delete this application from the database?')) {
          deleteApplication(appId);
        }
      });
    });
  }

  // Update stats
  function updateStats() {
    const total = applications.length;
    const approved = applications.filter(app => app.status === 'approved').length;
    const pending = applications.filter(app => app.status === 'pending').length;
    const rejected = applications.filter(app => app.status === 'rejected').length;

    document.getElementById('total-applications').textContent = total;
    document.getElementById('approved-applications').textContent = approved;
    document.getElementById('pending-applications').textContent = pending;
    document.getElementById('rejected-applications').textContent = rejected;
  }

  // Status filter
  statusFilter.addEventListener('change', (e) => {
    renderApplications(e.target.value);
  });

  refreshBtn.addEventListener('click', () => {
    loadApplications();
  });

  // Auto-refresh every 20 seconds so admin view stays in sync with database changes
  setInterval(loadApplications, 20000);

  // Show application details
  function showApplicationDetails(appId) {
    const app = applications.find(a => a.id == appId);
    if (!app) return;

    currentApplicationId = appId;
    let passIdHtml = '';
    if (app.pass_id) {
      passIdHtml = `
        <div class="detail-item">
          <strong>Pass ID:</strong> ${app.pass_id}
        </div>
      `;
    }

    modalBody.innerHTML = `
      <div class="detail-grid">
        <div class="detail-item">
          <strong>Application ID:</strong> ${app.id}
        </div>
        <div class="detail-item">
          <strong>Student Name:</strong> ${app.student_name}
        </div>
        <div class="detail-item">
          <strong>Enrollment:</strong> ${app.enrollment}
        </div>
        <div class="detail-item">
          <strong>Mobile:</strong> ${app.mobile}
        </div>
        <div class="detail-item">
          <strong>Email:</strong> ${app.email}
        </div>
        <div class="detail-item">
          <strong>Aadhaar:</strong> ${app.aadhaar}
        </div>
        <div class="detail-item">
          <strong>Department:</strong> ${app.dept}
        </div>
        <div class="detail-item">
          <strong>Route:</strong> ${app.route_title}
        </div>
        <div class="detail-item">
          <strong>Fee:</strong> ₹${app.fee.toLocaleString()}
        </div>
        <div class="detail-item">
          <strong>Status:</strong> <span class="status-badge status-${app.status}">${app.status.charAt(0).toUpperCase() + app.status.slice(1)}</span>
        </div>
        <div class="detail-item">
          <strong>Applied Date:</strong> ${new Date(app.created_at).toLocaleDateString()}
        </div>
        ${passIdHtml}
      </div>
    `;

    applicationModal.style.display = 'block';
  }

  // Update application status
  async function updateApplicationStatus(appId, status) {
    try {
      const response = await fetch(`http://127.0.0.1:5000/admin/applications/${appId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Update local data
        const app = applications.find(a => a.id == appId);
        if (app) {
          app.status = status;
          if (result.pass_id) {
            app.pass_id = result.pass_id;
          }
        }
        renderApplications(statusFilter.value);
        updateStats();
        applicationModal.style.display = 'none';
        
        if (status === 'approved' && result.pass_id) {
          alert(`Application approved successfully!\nPass ID: ${result.pass_id}`);
        } else {
          alert(`Application ${status} successfully!`);
        }
      } else {
        alert('Failed to update application status: ' + (result.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating application status');
    }
  }

  async function deleteApplication(appId) {
    try {
      const response = await fetch(`http://127.0.0.1:5000/admin/applications/${appId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();

      if (response.ok && result.success) {
        applications = applications.filter(app => app.id != appId);
        renderApplications(statusFilter.value);
        updateStats();
        applicationModal.style.display = 'none';
        alert('Application deleted successfully.');
      } else {
        alert('Failed to delete application: ' + (result.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting application:', error);
      alert('Error deleting application');
    }
  }

  // Modal close events
  closeModal.addEventListener('click', () => {
    applicationModal.style.display = 'none';
  });

  modalClose.addEventListener('click', () => {
    applicationModal.style.display = 'none';
  });

  approveBtn.addEventListener('click', () => {
    if (currentApplicationId) {
      updateApplicationStatus(currentApplicationId, 'approved');
    }
  });

  rejectBtn.addEventListener('click', () => {
    if (currentApplicationId) {
      updateApplicationStatus(currentApplicationId, 'rejected');
    }
  });

  // Close modal when clicking outside
  window.addEventListener('click', (e) => {
    if (e.target === applicationModal) {
      applicationModal.style.display = 'none';
    }
  });

  // Check admin login on page load
  checkAdminLogin();
});