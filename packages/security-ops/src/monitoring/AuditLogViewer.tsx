/**
 * Audit Log Viewer Component
 * Session 81g - Incident Response & Security Operations
 *
 * Composant pour visualiser et filtrer les audit logs.
 * Fonctionnalités:
 * - Timeline des événements d'audit
 * - Filtrage par utilisateur, action, IP, date
 * - Export des logs (CSV, JSON)
 * - Détection de patterns suspects
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Pagination,
  Stack,
  Alert,
} from '@mui/material';
import {
  FilterList as FilterListIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useAuditLogs } from '../hooks/useAuditLogs';

/**
 * Types pour audit logs
 */
interface AuditLog {
  id: string;
  timestamp: string;
  userId: string | null;
  username: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failure';
  details: Record<string, any>;
  hashPrev: string | null;
  hashCurrent: string;
}

interface AuditFilters {
  userId?: string;
  username?: string;
  action?: string;
  resource?: string;
  ipAddress?: string;
  status?: 'success' | 'failure';
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

/**
 * Composant principal Audit Log Viewer
 */
export const AuditLogViewer: React.FC = () => {
  // State pour filtres
  const [filters, setFilters] = useState<AuditFilters>({});
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(25);

  // Fetch audit logs avec filtres
  const { logs, totalCount, loading, error, refresh } = useAuditLogs({
    ...filters,
    page,
    pageSize,
  });

  // State pour affichage
  const [showFilters, setShowFilters] = useState<boolean>(false);

  /**
   * Handler pour changement de filtre
   */
  const handleFilterChange = useCallback((key: keyof AuditFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setPage(1); // Reset à la première page
  }, []);

  /**
   * Handler pour reset filtres
   */
  const handleClearFilters = useCallback(() => {
    setFilters({});
    setPage(1);
  }, []);

  /**
   * Export logs en CSV
   */
  const handleExportCSV = useCallback(() => {
    if (!logs || logs.length === 0) return;

    const headers = ['Timestamp', 'User', 'Action', 'Resource', 'IP', 'Status', 'Details'];
    const rows = logs.map((log) => [
      log.timestamp,
      log.username || log.userId || 'Anonymous',
      log.action,
      `${log.resource}${log.resourceId ? `:${log.resourceId}` : ''}`,
      log.ipAddress,
      log.status,
      JSON.stringify(log.details),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [logs]);

  /**
   * Export logs en JSON
   */
  const handleExportJSON = useCallback(() => {
    if (!logs || logs.length === 0) return;

    const jsonContent = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [logs]);

  /**
   * Obtenir couleur selon status
   */
  const getStatusColor = (status: AuditLog['status']): 'success' | 'error' => {
    return status === 'success' ? 'success' : 'error';
  };

  /**
   * Nombre total de pages
   */
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <Paper sx={{ p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Audit Logs</Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Toggle Filters">
            <IconButton onClick={() => setShowFilters(!showFilters)} size="small">
              <FilterListIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export CSV">
            <IconButton onClick={handleExportCSV} size="small" disabled={!logs || logs.length === 0}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export JSON">
            <IconButton onClick={handleExportJSON} size="small" disabled={!logs || logs.length === 0}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Filtres */}
      {showFilters && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Filters
          </Typography>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Username"
                  size="small"
                  value={filters.username || ''}
                  onChange={(e) => handleFilterChange('username', e.target.value)}
                  fullWidth
                />
                <TextField
                  label="IP Address"
                  size="small"
                  value={filters.ipAddress || ''}
                  onChange={(e) => handleFilterChange('ipAddress', e.target.value)}
                  fullWidth
                />
              </Stack>

              <Stack direction="row" spacing={2}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Action</InputLabel>
                  <Select
                    value={filters.action || ''}
                    onChange={(e) => handleFilterChange('action', e.target.value)}
                    label="Action"
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="login">Login</MenuItem>
                    <MenuItem value="logout">Logout</MenuItem>
                    <MenuItem value="create">Create</MenuItem>
                    <MenuItem value="update">Update</MenuItem>
                    <MenuItem value="delete">Delete</MenuItem>
                    <MenuItem value="access">Access</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status || ''}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    label="Status"
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="success">Success</MenuItem>
                    <MenuItem value="failure">Failure</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <Stack direction="row" spacing={2}>
                <DatePicker
                  label="Date From"
                  value={filters.dateFrom || null}
                  onChange={(date) => handleFilterChange('dateFrom', date)}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
                <DatePicker
                  label="Date To"
                  value={filters.dateTo || null}
                  onChange={(date) => handleFilterChange('dateTo', date)}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
              </Stack>

              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ClearIcon />}
                  onClick={handleClearFilters}
                >
                  Clear Filters
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<SearchIcon />}
                  onClick={refresh}
                >
                  Apply
                </Button>
              </Stack>
            </Stack>
          </LocalizationProvider>
        </Box>
      )}

      {/* Error state */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error loading audit logs: {error}
        </Alert>
      )}

      {/* Table */}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Timestamp</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Resource</TableCell>
              <TableCell>IP Address</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : logs && logs.length > 0 ? (
              logs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontSize="0.75rem">
                      {new Date(log.timestamp).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontSize="0.75rem">
                      {log.username || log.userId || 'Anonymous'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={log.action} size="small" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontSize="0.75rem">
                      {log.resource}
                      {log.resourceId && `:${log.resourceId}`}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontSize="0.75rem" fontFamily="monospace">
                      {log.ipAddress}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={log.status}
                      size="small"
                      color={getStatusColor(log.status)}
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title={JSON.stringify(log.details, null, 2)}>
                      <Typography
                        variant="body2"
                        fontSize="0.75rem"
                        noWrap
                        sx={{ maxWidth: 150, cursor: 'pointer' }}
                      >
                        {JSON.stringify(log.details)}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No audit logs found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, newPage) => setPage(newPage)}
            color="primary"
          />
        </Box>
      )}

      {/* Footer info */}
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" color="textSecondary">
          Showing {logs?.length || 0} of {totalCount} total logs
        </Typography>
        <Typography variant="caption" color="textSecondary">
          Page {page} of {totalPages}
        </Typography>
      </Box>
    </Paper>
  );
};

export default AuditLogViewer;
