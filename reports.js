// Reports dashboard functionality
document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logout-btn');
  const generateReportBtn = document.getElementById('generate-report');
  const exportReportBtn = document.getElementById('export-report');
  const searchInput = document.getElementById('search-input');
  const prevPageBtn = document.getElementById('prev-page');
  const nextPageBtn = document.getElementById('next-page');

  let applications = [];
  let filteredApplications = [];
  let currentPage = 1;
  const itemsPerPage = 25;

  // Charts
  let mainChart, departmentChart, routeChart;

  // Check if admin is logged in
  const isLoggedIn = localStorage.getItem('adminLoggedIn');
  if (!isLoggedIn) {
    window.location.href = 'admin.html';
    return;
  }

  // Logout
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('adminLoggedIn');
    window.location.href = 'admin.html';
  });

  // Initialize
  initializeCharts();
  loadReportData();

  // Generate report
  generateReportBtn.addEventListener('click', () => {
    loadReportData();
  });

  // Export report
  exportReportBtn.addEventListener('click', () => {
    exportToPDF();
  });

  // Search functionality
  searchInput.addEventListener('input', (e) => {
    filterApplications(e.target.value);
  });

  // Pagination
  prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderTable();
    }
  });

  nextPageBtn.addEventListener('click', () => {
    const maxPages = Math.ceil(filteredApplications.length / itemsPerPage);
    if (currentPage < maxPages) {
      currentPage++;
      renderTable();
    }
  });

  function initializeCharts() {
    const mainCtx = document.getElementById('main-chart').getContext('2d');
    const deptCtx = document.getElementById('department-chart').getContext('2d');
    const routeCtx = document.getElementById('route-chart').getContext('2d');

    mainChart = new Chart(mainCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Applications',
          data: [],
          borderColor: '#1f4b93',
          backgroundColor: 'rgba(31, 75, 147, 0.1)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });

    departmentChart = new Chart(deptCtx, {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });

    routeChart = new Chart(routeCtx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'Applications',
          data: [],
          backgroundColor: '#1f4b93'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }

  async function loadReportData() {
    try {
      const reportType = document.getElementById('report-type').value;
      const timePeriod = document.getElementById('time-period').value;
      const statusFilter = document.getElementById('status-filter').value;

      const response = await fetch(`/reports/data?type=${reportType}&period=${timePeriod}&status=${statusFilter}`);
      const data = await response.json();

      applications = data.applications || [];
      filteredApplications = [...applications];

      updateMetrics(data.metrics);
      updateCharts(data.charts);
      renderTable();

    } catch (error) {
      console.error('Error loading report data:', error);
    }
  }

  function updateMetrics(metrics) {
    document.getElementById('total-applications').textContent = metrics.total || 0;
    document.getElementById('approved-count').textContent = metrics.approved || 0;
    document.getElementById('total-revenue').textContent = `₹${(metrics.revenue || 0).toLocaleString()}`;
    document.getElementById('growth-rate').textContent = `${metrics.growth || 0}%`;
  }

  function updateCharts(charts) {
    // Main chart
    document.getElementById('chart-title').textContent = charts.main.title;
    mainChart.data.labels = charts.main.labels;
    mainChart.data.datasets[0].data = charts.main.data;
    mainChart.update();

    // Department chart
    departmentChart.data.labels = charts.department.labels;
    departmentChart.data.datasets[0].data = charts.department.data;
    departmentChart.update();

    // Route chart
    routeChart.data.labels = charts.route.labels;
    routeChart.data.datasets[0].data = charts.route.data;
    routeChart.update();
  }

  function renderTable() {
    const tbody = document.getElementById('report-tbody');
    tbody.innerHTML = '';

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = filteredApplications.slice(startIndex, endIndex);

    pageData.forEach(app => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${new Date(app.created_at).toLocaleDateString()}</td>
        <td>${app.id}</td>
        <td>${app.student_name}</td>
        <td>${app.dept}</td>
        <td>${app.route_title}</td>
        <td>₹${app.fee.toLocaleString()}</td>
        <td><span class="status-badge status-${app.status}">${app.status.charAt(0).toUpperCase() + app.status.slice(1)}</span></td>
      `;
      tbody.appendChild(tr);
    });

    updatePagination();
  }

  function updatePagination() {
    const maxPages = Math.ceil(filteredApplications.length / itemsPerPage);
    document.getElementById('page-info').textContent = `Page ${currentPage} of ${maxPages}`;
    document.getElementById('table-info').textContent = `Showing ${filteredApplications.length} entries`;

    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === maxPages;
  }

  function filterApplications(searchTerm) {
    filteredApplications = applications.filter(app =>
      app.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.enrollment.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.dept.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.route_title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    currentPage = 1;
    renderTable();
  }

  function exportToPDF() {
    // Simple PDF export simulation
    alert('PDF export functionality would be implemented here with a library like jsPDF or html2pdf');
  }
});