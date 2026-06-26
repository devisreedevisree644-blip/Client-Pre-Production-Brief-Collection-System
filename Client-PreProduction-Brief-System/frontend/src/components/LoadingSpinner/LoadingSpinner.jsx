import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 'medium', fullPage = false }) => {
  const spinner = <div className={`spinner spinner-${size}`} />;

  if (fullPage) {
    return (
      <div className="spinner-full-page">
        {spinner}
        <span className="spinner-text">Loading DigiQuest System...</span>
      </div>
    );
  }

  return <div className="spinner-container">{spinner}</div>;
};

export default LoadingSpinner;
