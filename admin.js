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

  let currentApplicationId = null;
  let applications = [];

  // Check if admin is logged in
  const isLoggedIn = localStorage.getItem('adminLoggedIn');
  if (isLoggedIn) {
    showDashboard();
  }

  // Admin login
  adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('admin-username').value;
    const password = document.getElementById('admin-password').value;

    // Simple admin credentials (in production, use proper authentication)
    if (username === 'admin' && password === 'admin123') {
      localStorage.setItem('adminLoggedIn', 'true');
      showDashboard();
    } else {
      alert('Invalid credentials');
    }
  });

  // Logout
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('adminLoggedIn');
    showLogin();
  });

  // Show dashboard
  function showDashboard() {
    adminLoginCard.style.display = 'none';
    adminDashboard.style.display = 'block';
    loadApplications();
  }

  // Show login
  function showLogin() {
    adminLoginCard.style.display = 'block';
    adminDashboard.style.display = 'none';
  }

  // Load applications
  async function loadApplications() {
    try {
      const response = await fetch('/admin/applications', {
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
      console.error('Error loading applications:', error);
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

  // Show application details
  function showApplicationDetails(appId) {
    const app = applications.find(a => a.id == appId);
    if (!app) return;

    currentApplicationId = appId;
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
      </div>
    `;

    applicationModal.style.display = 'block';
  }

  // Update application status
  async function updateApplicationStatus(appId, status) {
    try {
      const response = await fetch(`/admin/applications/${appId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        // Update local data
        const app = applications.find(a => a.id == appId);
        if (app) {
          app.status = status;
        }
        renderApplications(statusFilter.value);
        updateStats();
        applicationModal.style.display = 'none';
        alert(`Application ${status} successfully!`);
      } else {
        alert('Failed to update application status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating application status');
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
});