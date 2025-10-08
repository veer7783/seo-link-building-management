import React from 'react';
import { CircularProgress, Box } from '@mui/material';

interface LoadingSpinnerProps {
  size?: number;
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 40, 
  message = 'Loading...' 
}) => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap={2}
      className="loading-container"
    >
      <CircularProgress size={size} />
      {message && (
        <Box component="span" color="text.secondary">
          {message}
        </Box>
      )}
    </Box>
  );
};

export default LoadingSpinner;
