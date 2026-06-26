import React from 'react';
import './EmptyState.css';

const EmptyState = ({ title = 'No records found', message = 'There are no items matching this criteria.', icon = '📂', actionBtn }) => {
  return (
    <div className="empty-state-card card-glass text-center">
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-msg">{message}</p>
      {actionBtn && <div className="empty-state-action">{actionBtn}</div>}
    </div>
  );
};

export default EmptyState;
