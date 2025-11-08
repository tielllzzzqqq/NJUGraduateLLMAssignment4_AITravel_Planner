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

    console.log('MapComponent: Initializing map with:', {
      destination,
      activitiesCount: activities.length,
      activities: activities.map(a => ({ name: a.name, location: a.location, hasCoordinates: !!(a.coordinates?.lat && a.coordinates?.lng) }))
    });

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

        console.log('MapComponent: Map initialized');
        
        // Wait for map to be ready before geocoding
        mapInstance.current.on('complete', () => {
          console.log('MapComponent: Map ready event fired');
          initializeGeocoding();
        });
        
        // Also try immediate initialization if map is already ready
        if (mapInstance.current.getZoom) {
          console.log('MapComponent: Map seems ready, initializing geocoding');
          // Use setTimeout to ensure map is fully initialized
          setTimeout(() => {
            initializeGeocoding();
          }, 500);
        } else {
          // Fallback: initialize after a delay
          setTimeout(() => {
            initializeGeocoding();
          }, 1000);
        }
        
        function initializeGeocoding() {

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
            console.log('MapComponent: Plugins loaded, creating Geocoder');
            
            try {
              const geocoder = new AMap.Geocoder({
                city: '全国', // 城市设为全国，默认会进行全国范围搜索
                radius: 1000, // 搜索半径，单位米
              });
              console.log('MapComponent: Geocoder created:', geocoder);
              
              // Test geocoder is working
              if (!geocoder || typeof geocoder.getLocation !== 'function') {
                console.error('MapComponent: Geocoder is not properly initialized');
                return;
              }
              
              if (!mapInstance.current) {
                console.error('MapComponent: Map instance is null');
                return;
              }
              
              console.log('MapComponent: Starting geocoding for destination and activities');

          // Geocode all locations and then draw route
          const geocodePromises: Promise<void>[] = [];

          // First, geocode destination to set map center
          const destinationPromise = new Promise<void>((resolve) => {
            console.log('MapComponent: Geocoding destination:', destination);
            
            // Add timeout to prevent hanging
            const timeoutId = setTimeout(() => {
              console.warn('MapComponent: Destination geocoding timeout');
              resolve();
            }, 10000); // 10 second timeout
            
            try {
              console.log('MapComponent: About to call geocoder.getLocation with destination:', destination);
              console.log('MapComponent: Geocoder object:', geocoder);
              console.log('MapComponent: geocoder.getLocation type:', typeof geocoder.getLocation);
              
              // Call getLocation
              const result = geocoder.getLocation(destination, (status: string, result: any) => {
                console.log('MapComponent: ===== CALLBACK EXECUTED =====');
                clearTimeout(timeoutId);
                console.log('MapComponent: Destination geocoding callback - status:', status);
                console.log('MapComponent: Destination geocoding callback - result:', result);
                
                if (status === 'complete' && result && result.geocodes && result.geocodes.length > 0) {
                  const location = result.geocodes[0].location;
                  console.log('MapComponent: Destination location object:', location);
                  
                  if (location && typeof location.lng === 'number' && typeof location.lat === 'number') {
                    destinationLocation = { lng: location.lng, lat: location.lat };
                    console.log('MapComponent: Destination location found:', destinationLocation);
                    
                    // Set map center to destination immediately
                    if (mapInstance.current) {
                      mapInstance.current.setCenter([location.lng, location.lat]);
                      mapInstance.current.setZoom(13);
                      console.log('MapComponent: Map center set to destination');
                    }
                    resolve();
                  } else {
                    console.warn('MapComponent: Destination location invalid - missing lng/lat:', location);
                    resolve();
                  }
                } else {
                  console.warn('MapComponent: Geocoding failed for destination:', destination, 'Status:', status, 'Result:', result);
                  resolve();
                }
              });
            } catch (error) {
              clearTimeout(timeoutId);
              console.error('MapComponent: Error in destination geocoding:', error);
              resolve();
            }
          });
          geocodePromises.push(destinationPromise);

          // Then, geocode all activities in order
          activities.forEach((activity, index) => {
            const activityPromise = new Promise<void>((resolve) => {
              console.log(`MapComponent: Processing activity ${index + 1}:`, {
                name: activity.name,
                location: activity.location,
                hasCoordinates: !!(activity.coordinates?.lat && activity.coordinates?.lng),
                coordinates: activity.coordinates
              });

              if (activity.coordinates && activity.coordinates.lng && activity.coordinates.lat) {
                // Use existing coordinates
                const pos = { 
                  lng: activity.coordinates.lng, 
                  lat: activity.coordinates.lat,
                  name: activity.name,
                  index: index
                };
                activityPoints.push(pos);
                console.log(`MapComponent: Added activity ${index + 1} with existing coordinates:`, pos);

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
                console.log(`MapComponent: Geocoding activity location: ${activity.location}`);
                // Try to geocode with the full location string first
                let geocodeQuery = activity.location;
                
                // If location is just a city name (same as destination), use activity name instead
                if (geocodeQuery === destination || geocodeQuery.trim() === destination.trim()) {
                  geocodeQuery = `${destination}${activity.name}`;
                  console.log(`MapComponent: Location is same as destination, using activity name: ${geocodeQuery}`);
                } else if (!geocodeQuery.includes('市') && !geocodeQuery.includes('区') && !geocodeQuery.includes('县') && !geocodeQuery.includes('路') && !geocodeQuery.includes('街')) {
                  // If location is not specific enough, combine with destination and activity name
                  geocodeQuery = `${destination}${activity.location}`;
                  if (!geocodeQuery.includes(activity.name)) {
                    geocodeQuery = `${destination}${activity.name}`;
                  }
                  console.log(`MapComponent: Location not specific, enhanced query: ${geocodeQuery}`);
                }
                
                // Add timeout for geocoding
                const timeoutId = setTimeout(() => {
                  console.warn(`MapComponent: Activity ${index + 1} geocoding timeout`);
                  resolve();
                }, 10000);
                
                try {
                  geocoder.getLocation(geocodeQuery, (status: string, result: any) => {
                    clearTimeout(timeoutId);
                    console.log(`MapComponent: Activity ${index + 1} geocoding result:`, status, result);
                    
                    if (status === 'complete' && result && result.geocodes && result.geocodes.length > 0) {
                      const location = result.geocodes[0].location;
                      console.log(`MapComponent: Activity ${index + 1} location object:`, location);
                      
                      if (location && typeof location.lng === 'number' && typeof location.lat === 'number') {
                        const pos = {
                          lng: location.lng,
                          lat: location.lat,
                          name: activity.name,
                          index: index
                        };
                        activityPoints.push(pos);
                        console.log(`MapComponent: Added activity ${index + 1} with geocoded coordinates:`, pos);

                        // Add marker
                        if (mapInstance.current) {
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
                          console.log(`MapComponent: Marker added for activity ${index + 1}`);
                        }
                      } else {
                        console.warn(`MapComponent: Activity ${index + 1} location invalid - missing lng/lat:`, location);
                      }
                    } else {
                      console.warn(`MapComponent: Geocoding failed for activity ${index + 1}:`, activity.location, 'Status:', status, 'Result:', result);
                      // Try fallback: use activity name + destination
                      if (activity.name !== activity.location) {
                        console.log(`MapComponent: Trying fallback geocoding with name: ${activity.name}`);
                        const fallbackTimeoutId = setTimeout(() => {
                          console.warn(`MapComponent: Fallback geocoding timeout for activity ${index + 1}`);
                          resolve();
                        }, 10000);
                        
                        try {
                          geocoder.getLocation(`${destination}${activity.name}`, (fallbackStatus: string, fallbackResult: any) => {
                            clearTimeout(fallbackTimeoutId);
                            console.log(`MapComponent: Fallback geocoding result for activity ${index + 1}:`, fallbackStatus, fallbackResult);
                            
                            if (fallbackStatus === 'complete' && fallbackResult && fallbackResult.geocodes && fallbackResult.geocodes.length > 0) {
                              const location = fallbackResult.geocodes[0].location;
                              if (location && typeof location.lng === 'number' && typeof location.lat === 'number') {
                                const pos = {
                                  lng: location.lng,
                                  lat: location.lat,
                                  name: activity.name,
                                  index: index
                                };
                                activityPoints.push(pos);
                                console.log(`MapComponent: Added activity ${index + 1} with fallback coordinates:`, pos);

                                if (mapInstance.current) {
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
                            }
                            resolve();
                          });
                        } catch (error) {
                          clearTimeout(fallbackTimeoutId);
                          console.error(`MapComponent: Error in fallback geocoding for activity ${index + 1}:`, error);
                          resolve();
                        }
                      } else {
                        resolve();
                      }
                    }
                    // Always resolve, even if geocoding failed
                    if (status !== 'complete') {
                      resolve();
                    }
                  });
                } catch (error) {
                  clearTimeout(timeoutId);
                  console.error(`MapComponent: Error in geocoding for activity ${index + 1}:`, error);
                  resolve();
                }
              } else {
                console.warn(`MapComponent: Activity ${index + 1} has no location or coordinates:`, activity);
                resolve();
              }
            });
            geocodePromises.push(activityPromise);
          });

          // Wait for all geocoding to complete, then draw route
          Promise.all(geocodePromises).then(() => {
            console.log('MapComponent: All geocoding completed', {
              activityPointsCount: activityPoints.length,
              markersCount: markers.length,
              destinationLocation
            });

            // Sort activity points by index to maintain order
            activityPoints.sort((a, b) => a.index - b.index);
            console.log('MapComponent: Sorted activity points:', activityPoints);

            // Update map center if we have activity points
            if (activityPoints.length > 0) {
              // Fit map bounds to show all markers
              if (markers.length > 0) {
                const bounds = new AMap.Bounds();
                markers.forEach(marker => {
                  bounds.extend(marker.getPosition());
                });
                console.log('MapComponent: Setting map bounds to show all markers');
                // Add some padding
                mapInstance.current.setBounds(bounds, false, [20, 20, 20, 20]);
              } else if (destinationLocation) {
                console.log('MapComponent: No markers, centering on destination');
                mapInstance.current.setCenter([destinationLocation.lng, destinationLocation.lat]);
                mapInstance.current.setZoom(13);
              }
            } else if (destinationLocation) {
              console.log('MapComponent: No activity points, centering on destination');
              mapInstance.current.setCenter([destinationLocation.lng, destinationLocation.lat]);
              mapInstance.current.setZoom(13);
            } else {
              console.warn('MapComponent: No destination location and no activity points, map will show default location');
            }

            // Draw route between activity points in sequence
            if (activityPoints.length < 2) {
              console.warn('MapComponent: Not enough activity points to draw route', {
                activityPointsCount: activityPoints.length,
                activitiesCount: activities.length
              });
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
        }
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

