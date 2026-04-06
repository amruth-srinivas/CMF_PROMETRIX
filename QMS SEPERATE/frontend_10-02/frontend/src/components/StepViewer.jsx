import React, { Suspense, useRef, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Html, useProgress, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// Loading indicator: spinner icon + progress (progress 0-100, or use drei useProgress when no prop)
function Loader({ progress: progressProp }) {
  const { progress: dreiProgress } = useProgress();
  const progress = typeof progressProp === 'number' ? progressProp : Math.round(dreiProgress);
  return (
    <Html center>
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '24px 32px',
        borderRadius: '12px',
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      }}>
        <div style={{
          width: 48,
          height: 48,
          margin: '0 auto 12px',
          border: '3px solid #e5e7eb',
          borderTopColor: '#2563eb',
          borderRadius: '50%',
          animation: 'stepviewer-spin 0.8s linear infinite'
        }} role="status" aria-label="Loading" />
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151', fontWeight: 500 }}>
          {progress}%
        </p>
      </div>
      <style>{`
        @keyframes stepviewer-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Html>
  );
}

function Model({ url, onLoad, onError }) {
  const group = useRef();
  const modelRef = useRef(null);
  const [error, setError] = useState(null);
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const { scene } = useThree();

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setProgress(0);
    let cancelled = false;
    const loader = new GLTFLoader();

    const loadFromBlobUrl = (blobUrl) => {
      loader.load(
        blobUrl,
        (gltf) => {
          if (blobUrl) URL.revokeObjectURL(blobUrl);
          if (cancelled) return;
          setProgress(100);
          const root = gltf.scene;
          if (root) {
            // Define a palette of professional, mild colors for different parts
            const colorPalette = [
              0x6b7280, // Gray
              0x9ca3af, // Light Gray
              0x4b5563, // Dark Gray
              0x374151, // Darker Gray
              0x78716c, // Stone Gray
              0x57534e, // Warm Gray
              0x44403c, // Charcoal
              0x292524, // Almost Black
              0x71717a, // Medium Gray
              0xa1a1aa, // Silver Gray
            ];
            
            let colorIndex = 0;
            
            // Traverse and override materials to make them colorful
            root.traverse((child) => {
              if (child.isMesh && child.material) {
                // Create a new material with nice colors
                const material = child.material.clone();
                
                // Assign different colors to different parts
                if (material.color) {
                  material.color.setHex(colorPalette[colorIndex % colorPalette.length]);
                  colorIndex++;
                }
                
                // Set metalness and roughness for better appearance
                material.metalness = 0.3;
                material.roughness = 0.4;
                
                // Ensure material is updated
                material.needsUpdate = true;
                child.material = material;
              }
            });
            
            const box = new THREE.Box3().setFromObject(root);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z) || 1;
            root.position.sub(center);
            root.scale.multiplyScalar(2 / maxDim);
          }
          modelRef.current = root;
          setModel(root);
          setLoading(false);
          setError(null);
          if (onLoad) onLoad();
        },
        (event) => {
          if (cancelled) return;
          const p = event.total ? Math.round((event.loaded / event.total) * 50) + 50 : 75;
          setProgress(Math.min(p, 99));
        },
        (err) => {
          if (blobUrl) URL.revokeObjectURL(blobUrl);
          if (cancelled) return;
          console.error('GLTF load error:', err);
          setError(err?.message || 'Failed to load 3D model');
          setLoading(false);
          if (onError) onError(err);
        }
      );
    };

    setProgress(5);
    fetch(url, { method: 'GET' })
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          let msg = `Server error ${res.status}`;
          try {
            const body = await res.json();
            if (body?.detail) msg = typeof body.detail === 'string' ? body.detail : body.detail.msg || msg;
          } catch {
            const text = await res.text();
            if (text) msg = text.slice(0, 200);
          }
          setError(msg);
          setLoading(false);
          return;
        }
        setProgress(25);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled || !blob) return;
        setProgress(50);
        const blobUrl = URL.createObjectURL(blob);
        loadFromBlobUrl(blobUrl);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'Failed to fetch 3D model');
        setLoading(false);
        if (onError) onError(err);
      });

    return () => {
      cancelled = true;
      const prev = modelRef.current;
      if (prev && scene) scene.remove(prev);
      modelRef.current = null;
    };
  }, [url, scene]);

  if (error) {
    return (
      <Html center>
        <div style={{
          color: '#ef4444',
          background: '#fef2f2',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <h5 style={{ marginTop: 0 }}>Error Loading 3D Model</h5>
          <p>{error}</p>
          <div style={{ marginTop: '1rem', textAlign: 'left' }}>
            <p><strong>Supported:</strong> STEP (.stp, .step) — converted to 3D for preview. GLB / GLTF also supported.</p>
          </div>
        </div>
      </Html>
    );
  }

  if (loading) {
    return <Loader progress={progress} />;
  }

  return model ? <primitive ref={group} object={model} /> : null;
}

// Main viewer component
export default function StepViewer({ fileUrl, onLoad, onError, style, ...props }) {
  const [error, setError] = useState(null);

  const handleError = (error) => {
    console.error('3D Viewer Error:', error);
    setError(error);
    if (onError) onError(error);
  };

  const handleLoad = () => {
    setError(null);
    if (onLoad) onLoad();
  };

  const containerStyle = {
    width: '100%',
    height: '400px',
    position: 'relative',
    background: '#ffffff',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #e5e7eb',
    ...style
  };

  return (
    <div style={containerStyle} {...props}>
      {!fileUrl ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          padding: '2rem',
          textAlign: 'center',
          color: '#6c757d'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
          <h3 style={{ margin: '0 0 0.5rem' }}>No 3D Model</h3>
          <p style={{ margin: '0 0 1.5rem', maxWidth: '300px' }}>
            Upload a 3D model file to view it here
          </p>
          <div style={{
            background: '#e9ecef',
            padding: '0.75rem 1.25rem',
            borderRadius: '4px',
            fontSize: '0.875rem'
          }}>
            <p style={{ margin: '0 0 0.5rem' }}><strong>Supported formats:</strong></p>
            <ul style={{
              textAlign: 'left',
              margin: '0',
              paddingLeft: '1.25rem',
              listStyleType: 'none'
            }}>
              <li>✅ STEP / STP (.step, .stp) — converted for 3D preview</li>
              <li>✅ GLB (.glb)</li>
              <li>✅ GLTF (.gltf)</li>
            </ul>
          </div>
        </div>
      ) : (
        <>
          <Canvas
            shadows
            camera={{
              position: [4, 4, 4],
              fov: 50,
              near: 0.1,
              far: 100
            }}
          >
            <ambientLight intensity={1.2} />
            <directionalLight
              position={[10, 10, 5]}
              intensity={2}
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
            />
            <directionalLight
              position={[-10, -10, -5]}
              intensity={0.5}
              color="#ffffff"
            />
            <pointLight
              position={[5, 5, 5]}
              intensity={1}
              color="#ffffff"
            />
            <Grid
              args={[20, 20]}
              cellSize={1}
              cellThickness={0.5}
              cellColor="#6b7280"
              sectionSize={5}
              sectionThickness={1}
              sectionColor="#374151"
              fadeDistance={30}
              fadeStrength={1}
              followCamera={false}
              infiniteGrid={true}
            />
            <Suspense fallback={<Loader />}>
              <Model 
                url={fileUrl} 
                onLoad={handleLoad} 
                onError={handleError} 
              />
            </Suspense>
            <OrbitControls 
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              minDistance={1}
              maxDistance={20}
            />
          </Canvas>
          
          <div style={{ 
            position: 'absolute',
            bottom: '10px',
            left: 0,
            right: 0,
            textAlign: 'center',
            color: '#6c757d',
            fontSize: '12px',
            pointerEvents: 'none',
            textShadow: '0 1px 0 rgba(255,255,255,0.8)'
          }}>
            Left-click to rotate • Right-click to pan • Scroll to zoom
          </div>
        </>
      )}
    </div>
  );
}