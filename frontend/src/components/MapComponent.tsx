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
            
            // Load AMap with Geocoder and Driving plugins for route planning
            script.src = `https://webapi.amap.com/maps?v=2.0&key=${amapKey}&plugin=AMap.Geocoder,AMap.Driving,AMap.Transfer&callback=${callbackName}`;
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

        // Initialize map with default center (will be updated after geocoding)
        mapInstance.current = new AMap.Map(mapContainer.current, {
          zoom: 13,
          center: [116.397428, 39.90923], // Default to Beijing, will be updated
        });

        // Store markers and route points (ordered by activity sequence)
        const markers: any[] = [];
        const activityPoints: Array<{ lng: number; lat: number; name: string; index: number }> = [];
        let destinationLocation: { lng: number; lat: number } | null = null;

        // Fallback: draw simple polyline if route planning fails
        const drawSimpleRoute = (points: Array<{ lng: number; lat: number }>) => {
          if (points.length < 2 || !mapInstance.current) return;

          const path = points.map(p => [p.lng, p.lat]);
          const polyline = new AMap.Polyline({
            path: path,
            isOutline: true,
            outlineColor: '#ffeeff',
            borderWeight: 3,
            strokeColor: '#3366FF',
            strokeOpacity: 1,
            strokeWeight: 6,
            strokeStyle: 'solid',
            lineJoin: 'round',
            lineCap: 'round',
            zIndex: 50,
          });
          mapInstance.current.add(polyline);
        };

        // Load plugins and initialize map
        AMap.plugin(['AMap.Geocoder', 'AMap.Driving'], () => {
          const geocoder = new AMap.Geocoder({
            city: '全国', // 城市设为全国，默认会进行全国范围搜索
          });

          // Geocode all locations and then draw route
          const geocodePromises: Promise<void>[] = [];

          // First, geocode destination to set map center
          const destinationPromise = new Promise<void>((resolve) => {
            geocoder.getLocation(destination, (status: string, result: any) => {
              if (status === 'complete' && result.geocodes && result.geocodes.length > 0) {
                const location = result.geocodes[0].location;
                if (location && location.lng && location.lat) {
                  destinationLocation = { lng: location.lng, lat: location.lat };
                  // Set map center to destination
                  mapInstance.current.setCenter([location.lng, location.lat]);
                  mapInstance.current.setZoom(13);
                  resolve();
                } else {
                  resolve();
                }
              } else {
                console.warn('Geocoding failed for destination:', destination, status);
                resolve();
              }
            });
          });
          geocodePromises.push(destinationPromise);

          // Then, geocode all activities in order
          activities.forEach((activity, index) => {
            const activityPromise = new Promise<void>((resolve) => {
              if (activity.coordinates && activity.coordinates.lng && activity.coordinates.lat) {
                // Use existing coordinates
                const pos = { 
                  lng: activity.coordinates.lng, 
                  lat: activity.coordinates.lat,
                  name: activity.name,
                  index: index
                };
                activityPoints.push(pos);

                // Add marker
                const marker = new AMap.Marker({
                  position: [pos.lng, pos.lat],
                  title: activity.name,
                  map: mapInstance.current,
                  icon: new AMap.Icon({
                    size: new AMap.Size(28, 28),
                    image: activity.type === 'attraction' ? 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png' :
                           activity.type === 'restaurant' ? 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png' :
                           activity.type === 'transport' ? 'https://webapi.amap.com/theme/v1.3/markers/n/mark_g.png' :
                           'https://webapi.amap.com/theme/v1.3/markers/n/mark_p.png',
                    imageOffset: new AMap.Pixel(0, 0),
                    imageSize: new AMap.Size(28, 28),
                  }),
                  label: {
                    content: `${index + 1}. ${activity.name}`,
                    direction: 'right',
                  },
                });
                markers.push(marker);
                resolve();
              } else if (activity.location) {
                // Geocode activity location
                geocoder.getLocation(activity.location, (status: string, result: any) => {
                  if (status === 'complete' && result.geocodes && result.geocodes.length > 0) {
                    const location = result.geocodes[0].location;
                    if (location && location.lng && location.lat) {
                      const pos = {
                        lng: location.lng,
                        lat: location.lat,
                        name: activity.name,
                        index: index
                      };
                      activityPoints.push(pos);

                      // Add marker
                      const marker = new AMap.Marker({
                        position: [location.lng, location.lat],
                        title: activity.name,
                        map: mapInstance.current,
                        icon: new AMap.Icon({
                          size: new AMap.Size(28, 28),
                          image: activity.type === 'attraction' ? 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png' :
                                 activity.type === 'restaurant' ? 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png' :
                                 activity.type === 'transport' ? 'https://webapi.amap.com/theme/v1.3/markers/n/mark_g.png' :
                                 'https://webapi.amap.com/theme/v1.3/markers/n/mark_p.png',
                          imageOffset: new AMap.Pixel(0, 0),
                          imageSize: new AMap.Size(28, 28),
                        }),
                        label: {
                          content: `${index + 1}. ${activity.name}`,
                          direction: 'right',
                        },
                      });
                      markers.push(marker);
                    }
                  }
                  resolve();
                });
              } else {
                resolve();
              }
            });
            geocodePromises.push(activityPromise);
          });

          // Wait for all geocoding to complete, then draw route
          Promise.all(geocodePromises).then(() => {
            // Sort activity points by index to maintain order
            activityPoints.sort((a, b) => a.index - b.index);

            // Update map center if we have activity points
            if (activityPoints.length > 0) {
              // Fit map bounds to show all markers
              if (markers.length > 0) {
                const bounds = new AMap.Bounds();
                markers.forEach(marker => {
                  bounds.extend(marker.getPosition());
                });
                // Add some padding
                mapInstance.current.setBounds(bounds, false, [20, 20, 20, 20]);
              } else if (destinationLocation) {
                mapInstance.current.setCenter([destinationLocation.lng, destinationLocation.lat]);
                mapInstance.current.setZoom(13);
              }
            } else if (destinationLocation) {
              mapInstance.current.setCenter([destinationLocation.lng, destinationLocation.lat]);
              mapInstance.current.setZoom(13);
            }

            // Draw route between activity points in sequence
            if (activityPoints.length < 2) {
              console.warn('Not enough activity points to draw route');
              return;
            }

            // Draw route between points using Driving service
            const driving = new AMap.Driving({
              map: mapInstance.current,
              panel: null, // Don't show route panel
              hideMarkers: true, // We already have custom markers
            });

            // Build route points in order
            const routePoints = activityPoints.map(p => ({ lng: p.lng, lat: p.lat }));

            // If we have more than 2 points, use waypoints
            if (routePoints.length === 2) {
              // Simple two-point route
              driving.search(
                new AMap.LngLat(routePoints[0].lng, routePoints[0].lat),
                new AMap.LngLat(routePoints[1].lng, routePoints[1].lat),
                {},
                (status: string, result: any) => {
                  if (status === 'complete') {
                    console.log('Route planning complete');
                    // Route is automatically drawn on the map by AMap.Driving
                  } else {
                    console.warn('Route planning failed:', status);
                    // Fallback: draw simple polyline
                    drawSimpleRoute(routePoints);
                  }
                }
              );
            } else {
              // Multiple points: use waypoints
              const waypoints = routePoints.slice(1, -1).map(p => new AMap.LngLat(p.lng, p.lat));
              
              driving.search(
                new AMap.LngLat(routePoints[0].lng, routePoints[0].lat),
                new AMap.LngLat(routePoints[routePoints.length - 1].lng, routePoints[routePoints.length - 1].lat),
                {
                  waypoints: waypoints,
                },
                (status: string, result: any) => {
                  if (status === 'complete') {
                    console.log('Route planning complete with waypoints');
                    // Route is automatically drawn on the map by AMap.Driving
                  } else {
                    console.warn('Route planning failed:', status);
                    // Fallback: draw simple polyline
                    drawSimpleRoute(routePoints);
                  }
                }
              );
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
        try {
          mapInstance.current.clearMap();
          mapInstance.current.destroy();
        } catch (e) {
          console.warn('Error cleaning up map:', e);
        }
        mapInstance.current = null;
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

