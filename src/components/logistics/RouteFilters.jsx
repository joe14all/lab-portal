/**
 * Route Filter Controls Component
 * 
 * Demonstrates Section 4.2 enhancements:
 * - Date filtering
 * - Status filtering
 * - Driver filtering
 * - Sorting
 * - Pagination
 * 
 * This component can be integrated into RoutePlanner or used standalone
 */

import React from 'react';
import { useLogistics } from '../../contexts';
import { useRouteFilters, useRoutePagination, useRouteSorting } from '../../hooks/useLogistics';
import styles from './RouteFilters.module.css';

const RouteFilters = () => {
  const { vehicles, loading } = useLogistics();
  
  const {
    filters,
    filterByToday,
    filterByTomorrow,
    filterByActive,
    filterByCompleted,
    setDriverFilter,
    clearFilters,
  } = useRouteFilters();

  const {
    routes: paginatedRoutes,
    currentPage,
    totalPages,
    pageSize,
    totalCount,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
    setPageSize,
  } = useRoutePagination();

  const {
    sorting,
    toggleSort,
  } = useRouteSorting();

  // Get unique drivers for filter dropdown
  const drivers = React.useMemo(() => {
    const driverSet = new Set();
    vehicles.forEach(v => {
      if (v.assignedDriverId) {
        driverSet.add(v.assignedDriverId);
      }
    });
    return Array.from(driverSet);
  }, [vehicles]);

  const getSortIcon = (field) => {
    if (sorting.field !== field) return '↕';
    return sorting.order === 'asc' ? '↑' : '↓';
  };

  return (
    <div className={styles.container}>
      {/* Quick Filters */}
      <div className={styles.quickFilters}>
        <h3>Quick Filters</h3>
        <div className={styles.filterButtons}>
          <button 
            className={`${styles.filterBtn} ${filters.date === new Date().toISOString().split('T')[0] ? styles.active : ''}`}
            onClick={filterByToday}
          >
            Today
          </button>
          <button 
            className={styles.filterBtn}
            onClick={filterByTomorrow}
          >
            Tomorrow
          </button>
          <button 
            className={`${styles.filterBtn} ${filters.status.includes('Scheduled') ? styles.active : ''}`}
            onClick={filterByActive}
          >
            Active
          </button>
          <button 
            className={`${styles.filterBtn} ${filters.status.includes('Completed') ? styles.active : ''}`}
            onClick={filterByCompleted}
          >
            Completed
          </button>
          <button 
            className={styles.clearBtn}
            onClick={clearFilters}
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Driver Filter */}
      <div className={styles.driverFilter}>
        <label>Filter by Driver:</label>
        <select 
          value={filters.driverId || ''} 
          onChange={(e) => setDriverFilter(e.target.value || null)}
        >
          <option value="">All Drivers</option>
          {drivers.map(driverId => (
            <option key={driverId} value={driverId}>{driverId}</option>
          ))}
        </select>
      </div>

      {/* Results Summary */}
      <div className={styles.resultsSummary}>
        <p>
          Showing {paginatedRoutes.length} of {totalCount} routes
          {filters.date && ` on ${filters.date}`}
          {filters.status.length > 0 && ` with status: ${filters.status.join(', ')}`}
          {filters.driverId && ` for driver: ${filters.driverId}`}
        </p>
      </div>

      {/* Sort Controls */}
      <div className={styles.sortControls}>
        <span>Sort by:</span>
        <button onClick={() => toggleSort('date')}>
          Date {getSortIcon('date')}
        </button>
        <button onClick={() => toggleSort('status')}>
          Status {getSortIcon('status')}
        </button>
        <button onClick={() => toggleSort('driverId')}>
          Driver {getSortIcon('driverId')}
        </button>
      </div>

      {/* Routes Table */}
      <div className={styles.routesTable}>
        {loading ? (
          <p>Loading...</p>
        ) : paginatedRoutes.length === 0 ? (
          <p className={styles.emptyState}>No routes match the selected filters</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Route ID</th>
                <th>Date</th>
                <th>Driver</th>
                <th>Status</th>
                <th>Stops</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRoutes.map(route => (
                <tr key={route.id}>
                  <td>{route.id}</td>
                  <td>{route.date}</td>
                  <td>{route.driverId || 'Unassigned'}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[route.status.toLowerCase()]}`}>
                      {route.status}
                    </span>
                  </td>
                  <td>{route.stops?.length || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button 
            onClick={prevPage} 
            disabled={!hasPrevPage}
            className={styles.pageBtn}
          >
            ← Previous
          </button>
          
          <span className={styles.pageInfo}>
            Page {currentPage} of {totalPages}
          </span>

          <button 
            onClick={nextPage} 
            disabled={!hasNextPage}
            className={styles.pageBtn}
          >
            Next →
          </button>

          <select 
            value={pageSize} 
            onChange={(e) => setPageSize(Number(e.target.value))}
            className={styles.pageSizeSelect}
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>
      )}
    </div>
  );
};

export default RouteFilters;
