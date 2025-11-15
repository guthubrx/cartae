/**
 * Security Operations Dashboard
 * Session 81g - Incident Response & Security Operations
 *
 * Interface principale de monitoring sécurité temps réel.
 * Affiche:
 * - Événements de sécurité en temps réel
 * - Audit logs filtrables
 * - Détection d'anomalies
 * - Alertes actives
 * - Statistiques Fail2ban
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  LinearProgress,
  Badge,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { AuditLogViewer } from './AuditLogViewer';
import { SuspiciousActivityDetector } from './SuspiciousActivityDetector';
import { useSecurityEvents } from '../hooks/useSecurityEvents';
import { useFail2banStats } from '../hooks/useFail2banStats';

/**
 * Types pour événements de sécurité
 */
interface SecurityEvent {
  id: string;
  timestamp: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  type: 'auth_failure' | 'brute_force' | 'port_scan' | 'sql_injection' | 'ddos' | 'unauthorized_access';
  ip: string;
  user?: string;
  endpoint?: string;
  action: 'blocked' | 'logged' | 'alerted';
  details: string;
}

interface Fail2banStats {
  totalBans: number;
  activeBans: number;
  jails: {
    name: string;
    active: boolean;
    currentlyBanned: number;
    totalBanned: number;
  }[];
}

interface SecurityMetrics {
  authFailures24h: number;
  blockedIPs24h: number;
  suspiciousActivities24h: number;
  activeAlerts: number;
}

/**
 * Composant principal Dashboard Sécurité
 */
export const SecurityDashboard: React.FC = () => {
  // State management
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [refreshInterval] = useState<number>(5000); // 5 secondes
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);

  // Custom hooks pour data fetching
  const { events, loading: eventsLoading, error: eventsError, refresh: refreshEvents } = useSecurityEvents();
  const { stats, loading: statsLoading, refresh: refreshStats } = useFail2banStats();
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    authFailures24h: 0,
    blockedIPs24h: 0,
    suspiciousActivities24h: 0,
    activeAlerts: 0,
  });

  /**
   * Auto-refresh des données
   */
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshEvents();
      refreshStats();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshEvents, refreshStats]);

  /**
   * Calcul des métriques depuis les événements
   */
  useEffect(() => {
    if (!events) return;

    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    const recentEvents = events.filter(
      (e) => new Date(e.timestamp).getTime() > twentyFourHoursAgo
    );

    setMetrics({
      authFailures24h: recentEvents.filter((e) => e.type === 'auth_failure').length,
      blockedIPs24h: recentEvents.filter((e) => e.action === 'blocked').length,
      suspiciousActivities24h: recentEvents.filter((e) =>
        ['brute_force', 'port_scan', 'sql_injection'].includes(e.type)
      ).length,
      activeAlerts: events.filter((e) => e.severity === 'critical' || e.severity === 'high').length,
    });
  }, [events]);

  /**
   * Handler pour refresh manuel
   */
  const handleManualRefresh = useCallback(() => {
    refreshEvents();
    refreshStats();
  }, [refreshEvents, refreshStats]);

  /**
   * Obtenir couleur selon sévérité
   */
  const getSeverityColor = (severity: SecurityEvent['severity']): string => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'default';
      case 'info':
        return 'success';
      default:
        return 'default';
    }
  };

  /**
   * Obtenir icône selon type
   */
  const getTypeIcon = (type: SecurityEvent['type']) => {
    switch (type) {
      case 'auth_failure':
        return <WarningIcon />;
      case 'brute_force':
        return <ErrorIcon />;
      case 'port_scan':
        return <SecurityIcon />;
      case 'sql_injection':
        return <BlockIcon />;
      case 'ddos':
        return <ErrorIcon />;
      case 'unauthorized_access':
        return <WarningIcon />;
      default:
        return <SecurityIcon />;
    }
  };

  /**
   * Render loading state
   */
  if (eventsLoading || statsLoading) {
    return (
      <Box sx={{ width: '100%', p: 3 }}>
        <LinearProgress />
        <Typography variant="h6" sx={{ mt: 2, textAlign: 'center' }}>
          Chargement des données de sécurité...
        </Typography>
      </Box>
    );
  }

  /**
   * Render error state
   */
  if (eventsError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Erreur lors du chargement des événements de sécurité: {eventsError}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Security Operations Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Chip
            label={autoRefresh ? 'Auto-refresh: ON' : 'Auto-refresh: OFF'}
            color={autoRefresh ? 'success' : 'default'}
            onClick={() => setAutoRefresh(!autoRefresh)}
          />
          <IconButton onClick={handleManualRefresh} color="primary">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Métriques en temps réel */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Auth Failures (24h)
                  </Typography>
                  <Typography variant="h4">{metrics.authFailures24h}</Typography>
                </Box>
                <WarningIcon sx={{ fontSize: 48, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Blocked IPs (24h)
                  </Typography>
                  <Typography variant="h4">{metrics.blockedIPs24h}</Typography>
                </Box>
                <BlockIcon sx={{ fontSize: 48, color: 'error.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Suspicious Activities
                  </Typography>
                  <Typography variant="h4">{metrics.suspiciousActivities24h}</Typography>
                </Box>
                <SecurityIcon sx={{ fontSize: 48, color: 'info.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Active Alerts
                  </Typography>
                  <Typography variant="h4">
                    <Badge badgeContent={metrics.activeAlerts} color="error">
                      {metrics.activeAlerts}
                    </Badge>
                  </Typography>
                </Box>
                <ErrorIcon sx={{ fontSize: 48, color: 'error.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Fail2ban Statistics */}
      {stats && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Fail2ban Status
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="textSecondary">
                Total Bans: <strong>{stats.totalBans}</strong>
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Active Bans: <strong>{stats.activeBans}</strong>
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" gutterBottom>
                Active Jails:
              </Typography>
              {stats.jails.map((jail) => (
                <Chip
                  key={jail.name}
                  label={`${jail.name}: ${jail.currentlyBanned} banned`}
                  size="small"
                  color={jail.active ? 'success' : 'default'}
                  sx={{ mr: 1, mb: 1 }}
                />
              ))}
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Événements récents */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">Recent Security Events</Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>IP Address</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Details</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {events && events.slice(0, 20).map((event) => (
                <TableRow key={event.id} hover>
                  <TableCell>
                    {new Date(event.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={event.severity}
                      size="small"
                      color={getSeverityColor(event.severity) as any}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getTypeIcon(event.type)}
                      <Typography variant="body2">{event.type}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {event.ip}
                    </Typography>
                  </TableCell>
                  <TableCell>{event.user || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={event.action}
                      size="small"
                      color={event.action === 'blocked' ? 'error' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {event.details}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => setSelectedEvent(event)}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Détecteur d'activités suspectes */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <SuspiciousActivityDetector events={events || []} />
        </Grid>
        <Grid item xs={12} md={6}>
          <AuditLogViewer />
        </Grid>
      </Grid>
    </Box>
  );
};

export default SecurityDashboard;
