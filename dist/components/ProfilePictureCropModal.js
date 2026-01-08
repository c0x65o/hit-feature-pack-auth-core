'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { useUi } from '@hit/ui-kit';
/**
 * Utility function to create a circular cropped image from the cropped area
 */
const createCircularImage = async (imageSrc, pixelCrop) => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.src = imageSrc;
        image.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }
            // Set canvas size to the crop size (square for circle)
            const size = Math.min(pixelCrop.width, pixelCrop.height);
            canvas.width = size;
            canvas.height = size;
            // Create circular clipping path
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
            ctx.clip();
            // Draw the cropped image
            ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, size, size);
            // Convert to base64
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('Failed to create blob'));
                    return;
                }
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve(reader.result);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            }, 'image/png', 0.95);
        };
        image.onerror = () => {
            reject(new Error('Failed to load image'));
        };
    });
};
export function ProfilePictureCropModal({ open, onClose, imageSrc, onCropComplete, }) {
    const { Modal, Button, Spinner } = useUi();
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const onCropChange = useCallback((crop) => {
        setCrop(crop);
    }, []);
    const onZoomChange = useCallback((zoom) => {
        setZoom(zoom);
    }, []);
    const onCropCompleteCallback = useCallback((_croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);
    const handleSave = async () => {
        if (!croppedAreaPixels) {
            return;
        }
        try {
            setIsProcessing(true);
            const croppedImageBase64 = await createCircularImage(imageSrc, croppedAreaPixels);
            onCropComplete(croppedImageBase64);
            onClose();
        }
        catch (error) {
            console.error('Error cropping image:', error);
            alert(error instanceof Error ? error.message : 'Failed to crop image');
        }
        finally {
            setIsProcessing(false);
        }
    };
    const handleCancel = () => {
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
        onClose();
    };
    return (_jsx(Modal, { open: open, onClose: handleCancel, title: "Crop Profile Picture", description: "Adjust the image to select the area for your profile picture", size: "lg", children: _jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "relative w-full", style: { height: '400px' }, children: _jsx(Cropper, { image: imageSrc, crop: crop, zoom: zoom, aspect: 1, cropShape: "round", onCropChange: onCropChange, onZoomChange: onZoomChange, onCropComplete: onCropCompleteCallback, style: {
                            containerStyle: {
                                width: '100%',
                                height: '100%',
                                position: 'relative',
                                background: '#1a1a1a',
                            },
                        } }) }), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "block text-sm font-medium text-gray-400", children: "Zoom" }), _jsx("input", { type: "range", min: 1, max: 3, step: 0.1, value: zoom, onChange: (e) => setZoom(parseFloat(e.target.value)), className: "w-full" })] }), _jsxs("div", { className: "flex justify-end gap-3 pt-4", children: [_jsx(Button, { variant: "ghost", onClick: handleCancel, disabled: isProcessing, children: "Cancel" }), _jsx(Button, { variant: "primary", onClick: handleSave, disabled: isProcessing || !croppedAreaPixels, loading: isProcessing, children: "Save" })] })] }) }));
}
//# sourceMappingURL=ProfilePictureCropModal.js.map