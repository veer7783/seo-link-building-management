import React from 'react';
import { Chip } from '@mui/material';

interface StatusChipProps {
  status?: string;
  variant?: 'filled' | 'outlined';
}

const StatusChip: React.FC<StatusChipProps> = ({ status, variant = 'filled' }) => {
  // Handle undefined or null status
  if (!status) {
    return (
      <Chip
        label="Unknown"
        color="default"
        variant={variant}
        size="small"
        className="status-chip"
      />
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'live':
      case 'completed':
      case 'approved':
      case 'paid':
        return 'success';
      case 'inactive':
      case 'removed':
      case 'rejected':
      case 'overdue':
        return 'error';
      case 'pending':
      case 'in_progress':
      case 'draft':
        return 'warning';
      case 'paused':
      case 'sent':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatLabel = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Chip
      label={formatLabel(status)}
      color={getStatusColor(status) as any}
      variant={variant}
      size="small"
      className="status-chip"
    />
  );
};

export default StatusChip;
