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
      const amapKey = import.meta.env.VITE_AMAP_KEY;
      
      if (!amapKey) {
        console.error('高德地图API Key未配置');
        if (mapContainer.current) {
          mapContainer.current.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #666;">
              <p>地图加载失败</p>
              <p style="font-size: 12px; margin-top: 10px;">请检查高德地图API Key配置</p>
              <p style="font-size: 12px; margin-top: 5px; color: #999;">VITE_AMAP_KEY 未设置</p>
            </div>
          `;
        }
        return;
      }

      try {
        let AMap = (window as any).AMap;
        
        if (!AMap) {
          // Load AMap script
          await new Promise((resolve, reject) => {
            // Clean up any existing callback
            if ((window as any).initAMap) {
              delete (window as any).initAMap;
            }
            
            const script = document.createElement('script');
            const callbackName = `initAMap_${Date.now()}`;
            
            (window as any)[callbackName] = () => {
              delete (window as any)[callbackName];
              resolve(true);
            };
            
            // Load AMap with Geocoder plugin
            script.src = `https://webapi.amap.com/maps?v=2.0&key=${amapKey}&plugin=AMap.Geocoder&callback=${callbackName}`;
            script.async = true;
            script.onerror = () => {
              delete (window as any)[callbackName];
              reject(new Error('Failed to load AMap script'));
            };
            
            // Remove any existing AMap script
            const existingScript = document.querySelector('script[src*="webapi.amap.com"]');
            if (existingScript) {
              existingScript.remove();
            }
            
            document.head.appendChild(script);
          });
          
          // Wait a bit for AMap to be available
          let retries = 0;
          while (!(window as any).AMap && retries < 10) {
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
          }
          
          AMap = (window as any).AMap;
        }

        if (!AMap) {
          console.error('Failed to load AMap after script load');
          throw new Error('AMap not available');
        }

        // Initialize map
        mapInstance.current = new AMap.Map(mapContainer.current, {
          zoom: 13,
          center: [116.397428, 39.90923], // Default to Beijing
        });

        // Load Geocoder plugin and use it
        AMap.plugin('AMap.Geocoder', () => {
          const geocoder = new AMap.Geocoder({
            city: '全国', // 城市设为全国，默认会进行全国范围搜索
          });

          // Geocode destination to get coordinates
          geocoder.getLocation(destination, (status: string, result: any) => {
            if (status === 'complete' && result.geocodes && result.geocodes.length > 0) {
              const location = result.geocodes[0].location;
              if (location && location.lng && location.lat) {
                mapInstance.current.setCenter([location.lng, location.lat]);
                mapInstance.current.setZoom(13);

                // Add marker for destination
                new AMap.Marker({
                  position: [location.lng, location.lat],
                  title: destination,
                  map: mapInstance.current,
                });
              }
            } else {
              console.warn('Geocoding failed for destination:', destination, status);
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
                if (status === 'complete' && result.geocodes && result.geocodes.length > 0) {
                  const location = result.geocodes[0].location;
                  if (location && location.lng && location.lat) {
                    new AMap.Marker({
                      position: [location.lng, location.lat],
                      title: activity.name,
                      map: mapInstance.current,
                    });
                  }
                }
              });
            }
          });
        });
      } catch (error: any) {
        console.error('Map initialization error:', error);
        if (mapContainer.current) {
          const errorMessage = error?.message || '未知错误';
          mapContainer.current.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #666;">
              <p style="color: #e74c3c; font-weight: bold;">地图加载失败</p>
              <p style="font-size: 12px; margin-top: 10px;">请检查高德地图API Key配置</p>
              <p style="font-size: 11px; margin-top: 5px; color: #999;">错误: ${errorMessage}</p>
              <p style="font-size: 11px; margin-top: 5px; color: #999;">API Key: ${import.meta.env.VITE_AMAP_KEY ? '已配置' : '未配置'}</p>
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

