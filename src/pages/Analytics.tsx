
import React from 'react';
import { Navigate } from 'react-router-dom';

const AnalyticsPage: React.FC = () => {
  // Redirect to dashboard with analytics tab
  return <Navigate to="/dashboard/analytics" replace />;
};

export default AnalyticsPage;
