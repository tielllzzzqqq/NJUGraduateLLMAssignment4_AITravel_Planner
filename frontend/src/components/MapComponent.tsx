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

    // Clean up previous map instance
    if (mapInstance.current) {
      try {
        mapInstance.current.clearMap();
        mapInstance.current.destroy();
      } catch (e) {
        console.warn('Error cleaning up previous map:', e);
      }
      mapInstance.current = null;
    }

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
            
            // Load AMap without plugins (we use HTTP API for route planning)
            script.src = `https://webapi.amap.com/maps?v=2.0&key=${amapKey}&callback=${callbackName}`;
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

        // Set city center immediately (don't wait for geocoding)
        const cityCoordinates: { [key: string]: [number, number] } = {
          '北京': [116.397428, 39.90923],
          '上海': [121.473701, 31.230416],
          '广州': [113.264385, 23.129112],
          '深圳': [114.057868, 22.543099],
          '杭州': [120.153576, 30.287459],
          '成都': [104.066541, 30.572269],
          '苏州': [120.585315, 31.298886],
          '南京': [118.796877, 32.060255],
          '武汉': [114.316200, 30.581000],
          '西安': [108.939840, 34.341270],
        };
        
        // Find city and set center immediately
        let foundCity = false;
        for (const [city, coords] of Object.entries(cityCoordinates)) {
          if (destination.includes(city)) {
            console.log(`MapComponent: Setting map center immediately to ${city}`);
            mapInstance.current.setCenter(coords);
            mapInstance.current.setZoom(13);
            foundCity = true;
            break;
          }
        }
        
        if (!foundCity) {
          console.log('MapComponent: City not found in preset list, keeping default center');
        }

        // Wait for map to be fully loaded, then start geocoding
        mapInstance.current.on('complete', () => {
          console.log('MapComponent: Map fully loaded, starting geocoding');
          
          // No need for plugins - we'll use HTTP API for route planning
          setTimeout(() => {
            try {
              if (!mapInstance.current) {
                console.error('MapComponent: Map instance is null');
                return;
              }
              
              console.log('MapComponent: Starting geocoding for destination and activities');
                
                // Helper function to validate coordinates (China: lng 73-135, lat 18-54)
                const validateCoordinates = (lng: number, lat: number): boolean => {
                  if (!lng || !lat || isNaN(lng) || isNaN(lat)) return false;
                  // China coordinates range
                  if (lng < 73 || lng > 135 || lat < 18 || lat > 54) {
                    console.warn(`MapComponent: Invalid coordinates (outside China): lng=${lng}, lat=${lat}`);
                    return false;
                  }
                  return true;
                };

                // Helper function to geocode using HTTP API (more reliable than SDK plugins)
                const geocodeWithHTTP = (address: string, searchName?: string): Promise<{ lng: number; lat: number } | null> => {
                  return new Promise((resolve) => {
                    const amapKey = import.meta.env.VITE_AMAP_KEY;
                    if (!amapKey) {
                      console.error('MapComponent: AMap API Key not found');
                      resolve(null);
                      return;
                    }

                    // Build queries - avoid duplicate city name
                    const queries: string[] = [];
                    if (searchName) {
                      // If address already contains city, don't add it again
                      if (!address.includes(destination)) {
                        queries.push(`${destination}${searchName}`);
                        queries.push(`${destination}${address}`);
                      } else {
                        queries.push(searchName);
                        queries.push(address);
                      }
                      queries.push(searchName);
                    }
                    if (!address.includes(destination)) {
                      queries.push(`${destination}${address}`);
                    }
                    queries.push(address);
                    
                    // Remove duplicates
                    const uniqueQueries = Array.from(new Set(queries));
                    
                    const tryNext = (index: number) => {
                      if (index >= uniqueQueries.length) {
                        console.warn(`MapComponent: HTTP geocoding failed for all queries of "${address}"`);
                        resolve(null);
                        return;
                      }
                      
                      const query = uniqueQueries[index];
                      console.log(`MapComponent: Trying HTTP geocoding for "${query}" (${index + 1}/${uniqueQueries.length})`);
                      
                      // Use Geocoding API (地理编码API)
                      const geocodeUrl = `https://restapi.amap.com/v3/geocode/geo?key=${amapKey}&address=${encodeURIComponent(query)}&city=${encodeURIComponent(destination || '')}`;
                      
                      fetch(geocodeUrl)
                        .then(response => response.json())
                        .then(data => {
                          console.log(`MapComponent: HTTP geocoding response for "${query}":`, data);
                          
                          if (data.status === '1' && data.geocodes && data.geocodes.length > 0) {
                            const locationStr = data.geocodes[0].location;
                            const parts = locationStr.split(',');
                            if (parts.length === 2) {
                              const lng = Number(parts[0]);
                              const lat = Number(parts[1]);
                              if (validateCoordinates(lng, lat)) {
                                console.log(`MapComponent: HTTP geocoding found location for "${query}":`, { lng, lat });
                                resolve({ lng, lat });
                                return;
                              }
                            }
                          }
                          
                          // If geocoding fails, try POI search
                          console.log(`MapComponent: Geocoding failed, trying POI search for "${query}"`);
                          const poiUrl = `https://restapi.amap.com/v3/place/text?key=${amapKey}&keywords=${encodeURIComponent(query)}&city=${encodeURIComponent(destination || '')}&citylimit=true&offset=1&page=1&extensions=base`;
                          
                          fetch(poiUrl)
                            .then(response => response.json())
                            .then(poiData => {
                              console.log(`MapComponent: POI search response for "${query}":`, poiData);
                              
                              if (poiData.status === '1' && poiData.pois && poiData.pois.length > 0) {
                                const poi = poiData.pois[0];
                                const locationStr = poi.location;
                                const parts = locationStr.split(',');
                                if (parts.length === 2) {
                                  const lng = Number(parts[0]);
                                  const lat = Number(parts[1]);
                                  if (validateCoordinates(lng, lat)) {
                                    console.log(`MapComponent: POI search found location for "${query}":`, { lng, lat });
                                    resolve({ lng, lat });
                                    return;
                                  }
                                }
                              }
                              
                              // Try next query
                              tryNext(index + 1);
                            })
                            .catch(error => {
                              console.error(`MapComponent: POI search error for "${query}":`, error);
                              tryNext(index + 1);
                            });
                        })
                        .catch(error => {
                          console.error(`MapComponent: HTTP geocoding error for "${query}":`, error);
                          tryNext(index + 1);
                        });
                    };
                    
                    tryNext(0);
                  });
                };

                // Geocode all locations and then draw route
                const geocodePromises: Promise<void>[] = [];
                
                // Helper function to geocode - use HTTP API (most reliable)
                const geocodeLocation = (address: string, activityName?: string): Promise<{ lng: number; lat: number } | null> => {
                  console.log(`MapComponent: Geocoding "${address}"${activityName ? ` (name: ${activityName})` : ''}`);
                  // Use HTTP API directly (more reliable than SDK plugins)
                  return geocodeWithHTTP(address, activityName);
                };

                // First, geocode destination (map center already set, just update if we get better coordinates)
                const destinationPromise = geocodeLocation(destination).then((location) => {
                  if (location) {
                    destinationLocation = location;
                    console.log('MapComponent: Destination location found:', destinationLocation);
                    
                    // Update map center if we got coordinates
                    if (mapInstance.current) {
                      mapInstance.current.setCenter([location.lng, location.lat]);
                      mapInstance.current.setZoom(13);
                      console.log('MapComponent: Map center updated to destination');
                    }
                  } else {
                    console.warn('MapComponent: Failed to geocode destination:', destination);
                  }
                });
                geocodePromises.push(destinationPromise);

                // Then, geocode all activities in order
                activities.forEach((activity, index) => {
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
                  } else if (activity.location) {
                    // Geocode activity location
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
                    
                    // Use activity name for better search results
                    const activityPromise = geocodeLocation(geocodeQuery, activity.name).then((location) => {
                      if (location) {
                        const pos = {
                          lng: location.lng,
                          lat: location.lat,
                          name: activity.name,
                          index: index
                        };
                        activityPoints.push(pos);
                        console.log(`MapComponent: Added activity ${index + 1} "${activity.name}" with coordinates:`, pos);

                        // Add marker
                        if (mapInstance.current) {
                          const marker = new AMap.Marker({
                            position: [location.lng, location.lat],
                            title: activity.name,
                            map: mapInstance.current,
                            icon: new AMap.Icon({
                              size: new AMap.Size(32, 32),
                              image: activity.type === 'attraction' ? 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png' :
                                     activity.type === 'restaurant' ? 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png' :
                                     activity.type === 'transport' ? 'https://webapi.amap.com/theme/v1.3/markers/n/mark_g.png' :
                                     'https://webapi.amap.com/theme/v1.3/markers/n/mark_p.png',
                              imageOffset: new AMap.Pixel(0, 0),
                              imageSize: new AMap.Size(32, 32),
                            }),
                            label: {
                              content: `${index + 1}. ${activity.name}`,
                              direction: 'right',
                              offset: new AMap.Pixel(10, 0),
                            },
                            zIndex: 100,
                          });
                          markers.push(marker);
                          console.log(`MapComponent: Marker added for activity ${index + 1} "${activity.name}"`);
                        }
                      } else {
                        console.warn(`MapComponent: Failed to geocode activity ${index + 1} "${activity.name}" at "${activity.location}"`);
                      }
                    });
                    geocodePromises.push(activityPromise);
                  } else {
                    console.warn(`MapComponent: Activity ${index + 1} has no location or coordinates:`, activity);
                  }
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
                      console.warn('MapComponent: No destination location and no activity points');
                      // Last resort: try to use a known city center as fallback
                      // Common Chinese city coordinates
                      const cityCoordinates: { [key: string]: [number, number] } = {
                        '北京': [116.397428, 39.90923],
                        '上海': [121.473701, 31.230416],
                        '广州': [113.264385, 23.129112],
                        '深圳': [114.057868, 22.543099],
                        '杭州': [120.153576, 30.287459],
                        '成都': [104.066541, 30.572269],
                        '苏州': [120.585315, 31.298886],
                        '南京': [118.796877, 32.060255],
                        '武汉': [114.316200, 30.581000],
                        '西安': [108.939840, 34.341270],
                      };
                      
                      // Try to find city in destination name
                      let foundCity = false;
                      for (const [city, coords] of Object.entries(cityCoordinates)) {
                        if (destination.includes(city)) {
                          console.log(`MapComponent: Using fallback coordinates for city: ${city}`);
                          mapInstance.current.setCenter(coords);
                          mapInstance.current.setZoom(13);
                          foundCity = true;
                          break;
                        }
                      }
                      
                      if (!foundCity) {
                        console.warn('MapComponent: Could not determine city, showing default location (Beijing)');
                        // Default to Beijing
                        mapInstance.current.setCenter([116.397428, 39.90923]);
                        mapInstance.current.setZoom(10);
                      }
                    }

                    // Draw route between activity points in sequence
                    if (activityPoints.length < 2) {
                      console.warn('MapComponent: Not enough activity points to draw route', {
                        activityPointsCount: activityPoints.length,
                        activitiesCount: activities.length
                      });
                      return;
                    }

                    // Draw route between points using HTTP API
                    const routePoints = activityPoints
                      .map(p => ({ lng: p.lng, lat: p.lat }))
                      .filter(p => validateCoordinates(p.lng, p.lat));
                    
                    if (routePoints.length < 2) {
                      console.warn('MapComponent: Not enough valid route points after validation');
                      return;
                    }

                    console.log(`MapComponent: Planning route with ${routePoints.length} points:`, routePoints);

                    // Use HTTP API for route planning (doesn't require JS API key)
                    const amapKey = import.meta.env.VITE_AMAP_KEY;
                    if (!amapKey) {
                      console.warn('MapComponent: AMap API Key not found, using simple polyline');
                      drawSimpleRoute(routePoints);
                      return;
                    }

                    // Build waypoints string for HTTP API
                    const waypoints = routePoints.slice(1, -1)
                      .map(p => `${p.lng},${p.lat}`)
                      .join('|');
                    
                    const origin = `${routePoints[0].lng},${routePoints[0].lat}`;
                    const destination = `${routePoints[routePoints.length - 1].lng},${routePoints[routePoints.length - 1].lat}`;
                    
                    // Build URL for driving route API
                    let routeUrl = `https://restapi.amap.com/v3/direction/driving?key=${amapKey}&origin=${origin}&destination=${destination}&extensions=base`;
                    if (waypoints) {
                      routeUrl += `&waypoints=${encodeURIComponent(waypoints)}`;
                    }
                    
                    console.log(`MapComponent: Requesting route from HTTP API...`);
                    
                    fetch(routeUrl)
                      .then(response => response.json())
                      .then(data => {
                        console.log(`MapComponent: Route planning response:`, data);
                        
                        if (data.status === '1' && data.route && data.route.paths && data.route.paths.length > 0) {
                          // Get the first (best) route
                          const path = data.route.paths[0];
                          const steps = path.steps || [];
                          
                          // Extract all coordinates from route steps
                          const routePath: number[][] = [];
                          steps.forEach((step: any) => {
                            // Each step has a polyline in format "lng1,lat1;lng2,lat2;..."
                            if (step.polyline) {
                              const points = step.polyline.split(';');
                              points.forEach((point: string) => {
                                const [lng, lat] = point.split(',').map(Number);
                                if (validateCoordinates(lng, lat)) {
                                  routePath.push([lng, lat]);
                                }
                              });
                            }
                          });
                          
                          if (routePath.length > 0) {
                            console.log(`MapComponent: Drawing route with ${routePath.length} points`);
                            
                            // Draw route polyline on map
                            const polyline = new AMap.Polyline({
                              path: routePath,
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
                            console.log('MapComponent: Route drawn successfully');
                          } else {
                            console.warn('MapComponent: No valid route points extracted, using simple polyline');
                            drawSimpleRoute(routePoints);
                          }
                        } else {
                          console.warn(`MapComponent: Route planning failed - status: ${data.status}, info: ${data.info}`);
                          // Fallback: draw simple polyline
                          drawSimpleRoute(routePoints);
                        }
                      })
                      .catch(error => {
                        console.error('MapComponent: Error in route planning HTTP API:', error);
                        // Fallback: draw simple polyline
                        drawSimpleRoute(routePoints);
                      });
                  });
                } catch (error) {
                  console.error('MapComponent: Error in geocoding initialization:', error);
                }
              }, 500); // Wait 500ms after map load
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

