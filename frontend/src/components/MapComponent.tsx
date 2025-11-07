import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

interface Activity {
  time: string;
  type: string;
  name: string;
  location: string;
  coordinates?: { lat: number; lng: number };
}

interface MapComponentProps {
  activities: Activity[];
  destination: string;
}

const MapComponent = forwardRef<any, MapComponentProps>(({ activities, destination }, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    getMap: () => mapInstance.current,
  }));

  useEffect(() => {
    if (!mapContainer.current) return;

    const initMap = async () => {
      try {
        let AMap = (window as any).AMap;
        if (!AMap) {
          // Load AMap script
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `https://webapi.amap.com/maps?v=2.0&key=${import.meta.env.VITE_AMAP_KEY || ''}&callback=initAMap`;
            script.async = true;
            (window as any).initAMap = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
          // Get AMap after script loads
          AMap = (window as any).AMap;
        }

        if (!AMap) {
          console.error('Failed to load AMap');
          return;
        }

        // Initialize map
        mapInstance.current = new AMap.Map(mapContainer.current, {
          zoom: 13,
          center: [116.397428, 39.90923], // Default to Beijing
        });

        // Geocode destination to get coordinates
        const geocoder = new AMap.Geocoder();
        geocoder.getLocation(destination, (status: string, result: any) => {
          if (status === 'complete' && result.geocodes.length > 0) {
            const location = result.geocodes[0].location;
            mapInstance.current.setCenter([location.lng, location.lat]);
            mapInstance.current.setZoom(13);

            // Add marker for destination
            new AMap.Marker({
              position: [location.lng, location.lat],
              title: destination,
              map: mapInstance.current,
            });
          }
        });

        // Add markers for activities with coordinates
        activities.forEach((activity) => {
          if (activity.coordinates && activity.coordinates.lng && activity.coordinates.lat) {
            new AMap.Marker({
              position: [activity.coordinates.lng, activity.coordinates.lat],
              title: activity.name,
              map: mapInstance.current,
            });
          } else if (activity.location) {
            // Geocode activity location
            geocoder.getLocation(activity.location, (status: string, result: any) => {
              if (status === 'complete' && result.geocodes.length > 0) {
                const location = result.geocodes[0].location;
                new AMap.Marker({
                  position: [location.lng, location.lat],
                  title: activity.name,
                  map: mapInstance.current,
                });
              }
            });
          }
        });
      } catch (error) {
        console.error('Map initialization error:', error);
        if (mapContainer.current) {
          mapContainer.current.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #666;">
              <p>地图加载失败</p>
              <p style="font-size: 12px; margin-top: 10px;">请检查高德地图API Key配置</p>
            </div>
          `;
        }
      }
    };

    initMap();

    return () => {
      if (mapInstance.current) {
        mapInstance.current.destroy();
      }
    };
  }, [activities, destination]);

  return (
    <div
      ref={mapContainer}
      style={{
        width: '100%',
        height: '500px',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    />
  );
});

MapComponent.displayName = 'MapComponent';

export default MapComponent;

