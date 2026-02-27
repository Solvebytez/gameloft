'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';

interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedImageFile: File) => void;
  aspectRatio?: number;
  cropSize?: { width: number; height: number };
}

export default function ImageCropModal({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
  aspectRatio = 1,
  cropSize = { width: 512, height: 512 },
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChange = useCallback((crop: { x: number; y: number }) => {
    setCrop(crop);
  }, []);

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom);
  }, []);

  const onCropCompleteCallback = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area
  ): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    canvas.width = cropSize.width;
    canvas.height = cropSize.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      cropSize.width,
      cropSize.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas is empty'));
            return;
          }
          resolve(blob);
        },
        'image/jpeg',
        0.95
      );
    });
  };

  const handleSave = async () => {
    if (!croppedAreaPixels) {
      return;
    }

    setIsProcessing(true);
    try {
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const croppedImageFile = new File(
        [croppedImageBlob],
        'cropped-image.jpg',
        { type: 'image/jpeg' }
      );
      onCropComplete(croppedImageFile);
      onClose();
    } catch (error) {
      console.error('Error cropping image:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
        <h2 className="text-2xl font-bold text-retro-dark mb-4">Crop Image (512x512)</h2>
        
        <div className="relative w-full h-96 bg-gray-100 rounded-lg mb-4">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropCompleteCallback}
            cropSize={cropSize}
            style={{
              containerStyle: {
                width: '100%',
                height: '100%',
                position: 'relative',
              },
            }}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold text-retro-dark mb-2">
            Zoom: {Math.round(zoom * 100)}%
          </label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border-2 border-retro-dark text-retro-dark font-bold rounded hover:bg-gray-100 transition-colors"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isProcessing}
            className="px-6 py-2 bg-green-700 text-white font-bold rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Save Cropped Image'}
          </button>
        </div>
      </div>
    </div>
  );
}

