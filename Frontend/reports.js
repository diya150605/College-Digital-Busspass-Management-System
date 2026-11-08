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
  const itemsPerPage = 20;

  // Charts
  let mainChart, departmentChart, routeChart;

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

      const response = await fetch(`http://127.0.0.1:5000/reports/data?type=${reportType}&period=${timePeriod}&status=${statusFilter}`);
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
    const mainChartData = charts.main || { title: 'Applications Overview', labels: [], data: [] };
    const departmentChartData = charts.department || { labels: [], data: [] };
    const routeChartData = charts.route || { labels: [], data: [] };

    document.getElementById('chart-title').textContent = mainChartData.title;
    mainChart.data.labels = mainChartData.labels;
    mainChart.data.datasets[0].data = mainChartData.data;
    mainChart.update();

    departmentChart.data.labels = departmentChartData.labels;
    departmentChart.data.datasets[0].data = departmentChartData.data;
    departmentChart.update();

    routeChart.data.labels = routeChartData.labels;
    routeChart.data.datasets[0].data = routeChartData.data;
    routeChart.update();
  }

  function renderTable() {
    const tbody = document.getElementById('report-tbody');
    tbody.innerHTML = '';

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = filteredApplications.slice(startIndex, endIndex);

    if (pageData.length === 0) {
      const tr = document.createElement('tr');
      tr.className = 'report-table-empty';
      tr.innerHTML = `<td colspan="7">No applications found for the selected filters.</td>`;
      tbody.appendChild(tr);
    } else {
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
    }

    updatePagination();
  }

  function updatePagination() {
    const totalEntries = filteredApplications.length;
    const maxPages = Math.max(1, Math.ceil(totalEntries / itemsPerPage));
    const startIndex = totalEntries === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(totalEntries, currentPage * itemsPerPage);

    document.getElementById('page-info').textContent = `Page ${currentPage} of ${maxPages}`;
    document.getElementById('table-info').textContent = `Showing ${startIndex} to ${endIndex} of ${totalEntries} entries`;

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