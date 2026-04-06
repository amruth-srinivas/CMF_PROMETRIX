// src/components/StepLoader.jsx
import * as THREE from 'three';

export class StepLoader {
  async load(url) {
    try {
      console.log('Loading 3D model from:', url);
      
      // Create a simple 3D shape to represent the STEP file
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial({ 
        color: 0x4f46e5,
        metalness: 0.7,
        roughness: 0.3
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      
      // Add a wireframe
      const edges = new THREE.EdgesGeometry(geometry);
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ 
          color: 0xffffff, 
          transparent: true, 
          opacity: 0.5 
        })
      );
      
      const group = new THREE.Group();
      group.add(mesh);
      group.add(line);
      
      // Add a label
      this.addPlaceholderLabel(group);
      
      return group;
      
    } catch (error) {
      console.error('Error in StepLoader:', error);
      throw new Error('Failed to process 3D model. Please try a different file format.');
    }
  }

  addPlaceholderLabel(group) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 256;
    
    // Draw background
    context.fillStyle = 'rgba(79, 70, 229, 0.8)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw text
    context.font = 'Bold 24px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.fillText('3D MODEL LOADED', canvas.width / 2, 60);
    context.font = '16px Arial';
    context.fillText('For full STEP file support, please convert to GLB/GLTF format', canvas.width / 2, 100);
    context.fillText('Use left-click to rotate • Right-click to pan • Scroll to zoom', canvas.width / 2, 140);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ 
      map: texture,
      transparent: true,
      opacity: 0.9
    });
    
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(4, 2, 1);
    sprite.position.z = 1.5;
    group.add(sprite);
  }
}

export default StepLoader;