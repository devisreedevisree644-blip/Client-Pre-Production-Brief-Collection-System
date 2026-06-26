import React, { useState, useEffect, useCallback } from 'react';
import { getReportSummary, getReportTrends, exportReportCSV } from '../../services/reportService';
import { getClients } from '../../services/clientService';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';
import Toast from '../../components/Common/Toast';
import { Bar, Pie, Line } from 'react-chartjs-2';
import './Reports.css';

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [clients, setClients] = useState([]);
  const [toast, setToast] = useState(null);

  // Filters State
  const [clientId, setClientId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Fetch client listing
  useEffect(() => {
    const fetchClientsData = async () => {
      try {
        const clientData = await getClients();
        setClients(clientData);
      } catch (err) {
        console.error(err);
      }
    };
    fetchClientsData();
  }, []);

  // Fetch reports data
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        client_id: clientId,
        start_date: startDate,
        delivery_date: endDate,
        status: statusFilter
      };
      
      const summaryData = await getReportSummary(params);
      const trendsData = await getReportTrends({ client_id: clientId });
      
      setSummary(summaryData);
      setTrends(trendsData);
    } catch (err) {
      setToast({ message: 'Failed to generate analytical reports.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [clientId, startDate, endDate, statusFilter]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Export report
  const handleCSVExport = async () => {
    try {
      const params = {
        client_id: clientId,
        start_date: startDate,
        delivery_date: endDate
      };
      await exportReportCSV(params);
      setToast({ message: 'CSV export initiated successfully!', type: 'success' });
    } catch (err) {
      setToast({ message: 'Failed to export CSV report.', type: 'error' });
    }
  };

  if (loading && !summary) {
    return <LoadingSpinner fullPage />;
  }

  // Set up chart data configurations
  const statusLabels = Object.keys(summary?.statusDistribution || {});
  const statusValues = Object.values(summary?.statusDistribution || {});

  const statusChartData = {
    labels: statusLabels.length ? statusLabels : ['Empty'],
    datasets: [
      {
        label: 'Statuses',
        data: statusValues.length ? statusValues : [0],
        backgroundColor: ['#6366f1', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#374151', '#4b5563'],
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1
      }
    ]
  };

  const priorityLabels = Object.keys(summary?.priorityDistribution || {});
  const priorityValues = Object.values(summary?.priorityDistribution || {});

  const priorityChartData = {
    labels: priorityLabels.length ? priorityLabels : ['Empty'],
    datasets: [
      {
        label: 'Priorities',
        data: priorityValues.length ? priorityValues : [0],
        backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'],
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1
      }
    ]
  };

  const trendsChartData = {
    labels: trends.map((t) => t.month),
    datasets: [
      {
        label: 'Submissions Trend',
        data: trends.map((t) => parseInt(t.count, 10)),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.3
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#f3f4f6', font: { family: 'Inter' } }
      }
    }
  };

  return (
    <div className="page-container">
      {/* Title block */}
      <div className="flex-between header-row" style={{ marginBottom: '24px' }}>
        <div>
          <h1>Reports & Analytics</h1>
          <p>Analyze pre-production brief performance, rejection frequencies, and approval times</p>
        </div>
        <button className="btn btn-primary" onClick={handleCSVExport}>
          📥 Export CSV Summary
        </button>
      </div>

      {/* Filter panel */}
      <div className="filters-panel card-glass" style={{ marginBottom: '24px' }}>
        <div className="report-filters-grid">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Client Company</label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">All Companies</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Start Date Bound</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>End Date Bound</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Overview Analytics Cards */}
      {summary && (
        <div className="report-cards-grid">
          <div className="kpi-card card-glass border-glow-total">
            <div className="kpi-info">
              <span className="kpi-title">Total Briefs</span>
              <h2 className="kpi-value">{summary.totalBriefs}</h2>
            </div>
          </div>
          <div className="kpi-card card-glass border-glow-approved">
            <div className="kpi-info">
              <span className="kpi-title">Approved briefs</span>
              <h2 className="kpi-value">{summary.approvedBriefs}</h2>
            </div>
          </div>
          <div className="kpi-card card-glass border-glow-revision">
            <div className="kpi-info">
              <span className="kpi-title">Pending Reviews</span>
              <h2 className="kpi-value">{summary.pendingReviews}</h2>
            </div>
          </div>
          <div className="kpi-card card-glass border-glow-review">
            <div className="kpi-info">
              <span className="kpi-title">Avg Approval Time</span>
              <h2 className="kpi-value">{summary.averageApprovalHours} hrs</h2>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Charts Grid */}
      <div className="report-charts-grid" style={{ marginTop: '24px' }}>
        <div className="chart-card card-glass">
          <h3>Brief Status Distribution (Pie Chart)</h3>
          <div className="chart-wrapper">
            <Pie data={statusChartData} options={chartOptions} />
          </div>
        </div>

        <div className="chart-card card-glass">
          <h3>Project Priorities (Bar Chart)</h3>
          <div className="chart-wrapper">
            <Bar data={priorityChartData} options={chartOptions} />
          </div>
        </div>

        <div className="chart-card card-glass" style={{ gridColumn: 'span 2' }}>
          <h3>Submission Trends (Line Chart)</h3>
          <div className="chart-wrapper">
            <Line data={trendsChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default Reports;
