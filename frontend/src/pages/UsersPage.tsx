import React from 'react';
import { Box, Typography } from '@mui/material';

const UsersPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        User Management
      </Typography>
      <Typography variant="body1" color="text.secondary">
        User management functionality will be implemented here.
      </Typography>
    </Box>
  );
};

export default UsersPage;
