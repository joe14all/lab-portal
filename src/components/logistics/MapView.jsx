import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './MapView.module.css';

// Fix Leaflet default icon issue with Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const createCustomIcon = (color) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50% 50% 50% 0;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        transform: rotate(-45deg);
      ">
        <div style="
          width: 8px;
          height: 8px;
          background-color: white;
          border-radius: 50%;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        "></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });
};

// Route color palette
const ROUTE_COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // green
  '#F59E0B', // amber
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
];

const UNASSIGNED_COLOR = '#6B7280'; // gray

// Map bounds adjuster component
const MapBoundsAdjuster = ({ locations }) => {
  const map = useMap();

  useEffect(() => {
    if (locations && locations.length > 0) {
      const bounds = L.latLngBounds(locations.map(loc => [loc.lat, loc.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  }, [locations, map]);

  return null;
};

/**
 * MapView Component
 * 
 * Displays clinic locations on a map with route visualization.
 * 
 * Props:
 * - clinics: Array of clinic objects with geoCoordinates
 * - routes: Array of route objects with stops
 * - unassignedTasks: Array of tasks not yet assigned
 * - selectedTask: Currently selected task (highlights on map)
 * - hoveredTask: Currently hovered task (highlights on map)
 * - onMarkerClick: Callback when clinic marker is clicked (clinicId)
 * - onMarkerHover: Callback when marker is hovered (clinicId or null)
 */
const MapView = ({ 
  clinics = [], 
  routes = [], 
  unassignedTasks = [],
  selectedTask = null,
  hoveredTask = null,
  onMarkerClick = () => {},
  onMarkerHover = () => {}
}) => {
  // Default center (New York City)
  const defaultCenter = [40.7128, -74.0060];
  const defaultZoom = 11;

  // Build clinic locations map for quick lookup
  const clinicLocations = useMemo(() => {
    const map = new Map();
    clinics.forEach(clinic => {
      if (clinic.addresses?.shipping?.geoCoordinates) {
        map.set(clinic.id, {
          id: clinic.id,
          name: clinic.name,
          lat: clinic.addresses.shipping.geoCoordinates.lat,
          lng: clinic.addresses.shipping.geoCoordinates.lng,
          address: clinic.addresses.shipping,
        });
      }
    });
    return map;
  }, [clinics]);

  // Determine which clinics are assigned to which routes
  const clinicRouteMap = useMemo(() => {
    const map = new Map(); // clinicId -> routeIndex
    
    routes.forEach((route, routeIndex) => {
      route.stops?.forEach(stop => {
        if (stop.clinicId && !map.has(stop.clinicId)) {
          map.set(stop.clinicId, routeIndex);
        }
      });
    });

    return map;
  }, [routes]);

  // Get unassigned clinic IDs
  const unassignedClinicIds = useMemo(() => {
    const ids = new Set();
    unassignedTasks.forEach(task => {
      if (task.clinicId) {
        ids.add(task.clinicId);
      }
    });
    return ids;
  }, [unassignedTasks]);

  // Build route polylines
  const routePolylines = useMemo(() => {
    return routes.map((route, routeIndex) => {
      const coords = [];
      
      route.stops?.forEach(stop => {
        const location = clinicLocations.get(stop.clinicId);
        if (location) {
          coords.push([location.lat, location.lng]);
        }
      });

      return {
        routeId: route.id,
        routeName: route.name,
        coords,
        color: ROUTE_COLORS[routeIndex % ROUTE_COLORS.length],
        stopCount: route.stops?.length || 0,
      };
    });
  }, [routes, clinicLocations]);

  // All locations for bounds calculation
  const allLocations = useMemo(() => {
    return Array.from(clinicLocations.values());
  }, [clinicLocations]);

  // Get marker color for a clinic
  const getMarkerColor = (clinicId) => {
    if (clinicRouteMap.has(clinicId)) {
      const routeIndex = clinicRouteMap.get(clinicId);
      return ROUTE_COLORS[routeIndex % ROUTE_COLORS.length];
    }
    if (unassignedClinicIds.has(clinicId)) {
      return UNASSIGNED_COLOR;
    }
    return '#D1D5DB'; // light gray for no tasks
  };

  // Check if clinic is selected or hovered
  const isHighlighted = (clinicId) => {
    return selectedTask?.clinicId === clinicId || hoveredTask?.clinicId === clinicId;
  };

  return (
    <div className={styles.mapContainer}>
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className={styles.map}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapBoundsAdjuster locations={allLocations} />

        {/* Render clinic markers */}
        {Array.from(clinicLocations.values()).map(location => {
          const color = getMarkerColor(location.id);
          const highlighted = isHighlighted(location.id);
          const routeIndex = clinicRouteMap.get(location.id);
          const routeName = routeIndex !== undefined ? routes[routeIndex]?.name : null;

          return (
            <Marker
              key={location.id}
              position={[location.lat, location.lng]}
              icon={createCustomIcon(color)}
              eventHandlers={{
                click: () => onMarkerClick(location.id),
                mouseover: () => onMarkerHover(location.id),
                mouseout: () => onMarkerHover(null),
              }}
              zIndexOffset={highlighted ? 1000 : 0}
            >
              <Popup>
                <div className={styles.popup}>
                  <div className={styles.popupTitle}>{location.name}</div>
                  <div className={styles.popupAddress}>
                    {location.address.line1}<br />
                    {location.address.city}, {location.address.state} {location.address.zip}
                  </div>
                  {routeName && (
                    <div className={styles.popupRoute}>
                      📍 Assigned to: <strong>{routeName}</strong>
                    </div>
                  )}
                  {unassignedClinicIds.has(location.id) && !routeName && (
                    <div className={styles.popupUnassigned}>
                      ⏳ Has unassigned tasks
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Render route polylines */}
        {routePolylines.map(route => (
          route.coords.length > 1 && (
            <Polyline
              key={route.routeId}
              positions={route.coords}
              color={route.color}
              weight={3}
              opacity={0.7}
              dashArray={route.stopCount === 0 ? '10, 10' : undefined}
            >
              <Popup>
                <div className={styles.popup}>
                  <div className={styles.popupTitle}>{route.routeName}</div>
                  <div className={styles.popupRoute}>
                    {route.stopCount} {route.stopCount === 1 ? 'stop' : 'stops'}
                  </div>
                </div>
              </Popup>
            </Polyline>
          )
        ))}
      </MapContainer>

      {/* Map Legend */}
      <div className={styles.legend}>
        <div className={styles.legendTitle}>Map Legend</div>
        <div className={styles.legendItems}>
          {routes.map((route, index) => (
            <div key={route.id} className={styles.legendItem}>
              <div 
                className={styles.legendColor} 
                style={{ backgroundColor: ROUTE_COLORS[index % ROUTE_COLORS.length] }}
              />
              <span className={styles.legendLabel}>
                {route.name} ({route.stops?.length || 0})
              </span>
            </div>
          ))}
          {unassignedTasks.length > 0 && (
            <div className={styles.legendItem}>
              <div 
                className={styles.legendColor} 
                style={{ backgroundColor: UNASSIGNED_COLOR }}
              />
              <span className={styles.legendLabel}>
                Unassigned ({unassignedTasks.length})
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapView;
