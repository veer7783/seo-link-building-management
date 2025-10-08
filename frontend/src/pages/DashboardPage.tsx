import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  TrendingUp,
  ShoppingCart,
  Link as LinkIcon,
  AttachMoney,
  Warning,
  CheckCircle,
  Error,
  Schedule,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboardService';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

const DashboardPage: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  
  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: dashboardService.getDashboardMetrics,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  if (error) {
    return (
      <Box className="error-container">
        <Alert severity="error">
          Failed to load dashboard data. Please try again.
        </Alert>
      </Box>
    );
  }

  const getStageColor = (stage: string) => {
    switch (stage.toLowerCase()) {
      case 'brief_pending': return 'warning';
      case 'content_creation': return 'info';
      case 'content_review': return 'secondary';
      case 'published': return 'success';
      case 'completed': return 'success';
      default: return 'default';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      {/* Key Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card className="dashboard-card">
            <CardContent className="dashboard-card-content">
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography className="metric-value">
                    {metrics?.totalOrders || 0}
                  </Typography>
                  <Typography className="metric-label">
                    Total Orders
                  </Typography>
                </Box>
                <ShoppingCart color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card className="dashboard-card">
            <CardContent className="dashboard-card-content">
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography className="metric-value">
                    {metrics?.activeOrders || 0}
                  </Typography>
                  <Typography className="metric-label">
                    Active Orders
                  </Typography>
                </Box>
                <TrendingUp color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card className="dashboard-card">
            <CardContent className="dashboard-card-content">
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography className="metric-value">
                    {metrics?.livePlacements || 0}
                  </Typography>
                  <Typography className="metric-label">
                    Live Placements
                  </Typography>
                </Box>
                <LinkIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {isSuperAdmin && (
          <Grid item xs={12} sm={6} md={3}>
            <Card className="dashboard-card">
              <CardContent className="dashboard-card-content">
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography className="metric-value">
                      {formatCurrency(metrics?.monthlyRevenue || 0)}
                    </Typography>
                    <Typography className="metric-label">
                      Monthly Revenue
                    </Typography>
                  </Box>
                  <AttachMoney color="primary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      <Grid container spacing={3}>
        {/* Orders by Stage */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Orders by Stage
              </Typography>
              <Box sx={{ mt: 2 }}>
                {metrics?.ordersByStage?.map((stage) => (
                  <Box key={stage.stage} sx={{ mb: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="body2">
                        {stage.stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Typography>
                      <Chip 
                        label={stage.count} 
                        size="small" 
                        color={getStageColor(stage.stage) as any}
                      />
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={(stage.count / (metrics?.totalOrders || 1)) * 100}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Link Health Summary */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Link Health Summary
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <CheckCircle color="success" />
                    <Box>
                      <Typography variant="h6">
                        {metrics?.linkHealthSummary?.live || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Live Links
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Error color="error" />
                    <Box>
                      <Typography variant="h6">
                        {metrics?.linkHealthSummary?.removed || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Removed Links
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Schedule color="info" />
                    <Box>
                      <Typography variant="h6">
                        {metrics?.linkHealthSummary?.checking || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Checking
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <LinkIcon color="primary" />
                    <Box>
                      <Typography variant="h6">
                        {metrics?.linkHealthSummary?.total || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Links
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* SLA Breaches */}
        {metrics?.slaBreaches && metrics.slaBreaches.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
                  <Warning color="warning" />
                  <Typography variant="h6">
                    SLA Breaches ({metrics.slaBreaches.length})
                  </Typography>
                </Box>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Order Number</TableCell>
                        <TableCell>Client</TableCell>
                        <TableCell>Stage</TableCell>
                        <TableCell>Days Overdue</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {metrics.slaBreaches.map((breach) => (
                        <TableRow key={breach.id}>
                          <TableCell>{breach.orderNumber}</TableCell>
                          <TableCell>{breach.clientName}</TableCell>
                          <TableCell>
                            <Chip 
                              label={breach.stage.replace(/_/g, ' ')} 
                              size="small" 
                              color="warning"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography color="error" fontWeight="bold">
                              {breach.daysOverdue} days
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Recent Activity */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activity
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Activity</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {metrics?.recentActivity?.slice(0, 10).map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell>{activity.description}</TableCell>
                        <TableCell>
                          <Chip 
                            label={activity.type} 
                            size="small" 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{formatDate(activity.timestamp)}</TableCell>
                      </TableRow>
                    )) || (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          <Typography color="text.secondary">
                            No recent activity
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
