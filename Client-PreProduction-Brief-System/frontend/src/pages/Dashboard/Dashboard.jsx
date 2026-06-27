import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getDashboardSummary } from '../../services/reportService';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';
import Toast from '../../components/Common/Toast';
import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import './Dashboard.css';

// Register ChartJS plugins
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await getDashboardSummary();
        setData(res);
      } catch (err) {
        console.error('Error loading dashboard summary:', err);
        setToast({ message: 'Failed to load dashboard statistics.', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  if (!data) {
    return (
      <div className="page-container">
        <h2>Dashboard Error</h2>
        <p>Could not retrieve dashboard data. Please try again later.</p>
      </div>
    );
  }

  const { cards, recentSubmissions, recentApprovals, recentComments } = data;

  // Chart 1: Status Distribution (Pie Chart)
  const statusLabels = ['Draft', 'Submitted', 'Under Review', 'Revision Requested', 'Approved', 'Rejected', 'Archived'];
  const statusValues = [
    cards.draft || 0,
    cards.submitted || 0,
    cards.underReview || 0,
    cards.revisionRequested || 0,
    cards.approved || 0,
    cards.rejected || 0,
    cards.archived || 0,
  ];

  const statusChartData = {
    labels: statusLabels,
    datasets: [
      {
        label: 'Briefs Status Count',
        data: statusValues,
        backgroundColor: [
          'rgba(156, 163, 175, 0.6)', // Draft
          'rgba(59, 130, 246, 0.6)',  // Submitted
          'rgba(245, 158, 11, 0.6)',  // Under Review
          'rgba(239, 68, 68, 0.6)',   // Revision Requested
          'rgba(16, 185, 129, 0.6)',  // Approved
          'rgba(220, 38, 38, 0.6)',   // Rejected
          'rgba(107, 114, 128, 0.6)'  // Archived
        ],
        borderColor: [
          '#9ca3af', '#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#dc2626', '#6b7280'
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#334155', font: { family: 'Inter' } }
      },
      tooltip: {
        backgroundColor: '#ffffff',
        titleColor: '#0f172a',
        bodyColor: '#334155',
        borderColor: 'rgba(15, 23, 42, 0.08)',
        borderWidth: 1
      }
    }
  };

  // Chart 2: Mock monthly trends to represent "Monthly Briefs" & "Approval Trends"
  const monthlyBriefsData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        type: 'bar',
        label: 'New Submissions',
        data: [4, 7, 5, 9, 12, cards.submitted + cards.approved + cards.underReview || 8],
        backgroundColor: 'rgba(99, 102, 241, 0.6)',
        borderColor: '#6366f1',
        borderWidth: 1,
      },
      {
        type: 'line',
        label: 'Approved Projects',
        data: [2, 4, 3, 7, 8, cards.approved || 5],
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  const trendChartOptions = {
    ...chartOptions,
    scales: {
      x: { grid: { color: 'rgba(15, 23, 42, 0.06)' }, ticks: { color: '#475569' } },
      y: { grid: { color: 'rgba(15, 23, 42, 0.06)' }, ticks: { color: '#475569', stepSize: 1 } }
    }
  };

  return (
    <div className="page-container">
      {/* Title */}
      <div className="flex-between header-row" style={{ marginBottom: '24px' }}>
        <div>
          <h1>Studio Dashboard</h1>
          <p>Real-time overview of DigiQuest production requirements</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/briefs')}>
          View All Briefs
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card card-glass border-glow-total">
          <span className="kpi-icon">📁</span>
          <div className="kpi-info">
            <span className="kpi-title">Total Briefs</span>
            <h2 className="kpi-value">{cards.total}</h2>
          </div>
        </div>

        <div className="kpi-card card-glass border-glow-submitted">
          <span className="kpi-icon icon-submitted">📥</span>
          <div className="kpi-info">
            <span className="kpi-title">Submitted</span>
            <h2 className="kpi-value">{cards.submitted}</h2>
          </div>
        </div>

        <div className="kpi-card card-glass border-glow-review">
          <span className="kpi-icon icon-review">🔍</span>
          <div className="kpi-info">
            <span className="kpi-title">Under Review</span>
            <h2 className="kpi-value">{cards.underReview}</h2>
          </div>
        </div>

        <div className="kpi-card card-glass border-glow-approved">
          <span className="kpi-icon icon-approved">✓</span>
          <div className="kpi-info">
            <span className="kpi-title">Approved</span>
            <h2 className="kpi-value">{cards.approved}</h2>
          </div>
        </div>

        <div className="kpi-card card-glass border-glow-revision">
          <span className="kpi-icon icon-revision">⚠</span>
          <div className="kpi-info">
            <span className="kpi-title">Revisions</span>
            <h2 className="kpi-value">{cards.revisionRequested}</h2>
          </div>
        </div>

        <div className="kpi-card card-glass border-glow-archived">
          <span className="kpi-icon icon-archived">📦</span>
          <div className="kpi-info">
            <span className="kpi-title">Archived</span>
            <h2 className="kpi-value">{cards.archived}</h2>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        <div className="chart-card card-glass">
          <h3>Pre-Production Status</h3>
          <div className="chart-wrapper">
            <Pie data={statusChartData} options={chartOptions} />
          </div>
        </div>

        <div className="chart-card card-glass">
          <h3>Submission & Approval Trends</h3>
          <div className="chart-wrapper">
            <Line data={monthlyBriefsData} options={trendChartOptions} />
          </div>
        </div>
      </div>

      {/* Activities Grid */}
      <div className="activities-grid">
        {/* Recent Submissions */}
        <div className="activity-card card-glass">
          <h3>Latest Submissions</h3>
          {recentSubmissions.length === 0 ? (
            <p className="no-activity">No active brief submissions.</p>
          ) : (
            <ul className="activity-list">
              {recentSubmissions.map((brief) => (
                <li key={brief.id} className="activity-item">
                  <div className="activity-item-main">
                    <Link to={`/briefs/${brief.id}`} target="_blank" rel="noopener noreferrer" className="activity-project-name">
                      {brief.project_name}
                    </Link>
                    <span className="activity-company">{brief.client_name}</span>
                  </div>
                  <div className="activity-item-aside">
                    <span className={`badge badge-${brief.status.toLowerCase().replace(' ', '')}`}>
                      {brief.status}
                    </span>
                    <span className="activity-date">
                      {new Date(brief.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Comments */}
        <div className="activity-card card-glass">
          <h3>Recent Comment Feed</h3>
          {recentComments.length === 0 ? (
            <p className="no-activity">No comments posted yet.</p>
          ) : (
            <ul className="activity-list">
              {recentComments.map((comment) => (
                <li key={comment.id} className="activity-item align-start">
                  <div className="comment-avatar">
                    {comment.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="comment-details">
                    <p className="comment-bubble-text">
                      <strong>{comment.username}</strong> ({comment.role}) commented on{' '}
                      <Link to={`/briefs/${comment.brief_id}`} target="_blank" rel="noopener noreferrer" className="activity-project-name">
                        {comment.project_name}
                      </Link>
                    </p>
                    <p className="comment-preview-quote">"{comment.comment}"</p>
                    <span className="activity-date">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
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

export default Dashboard;
