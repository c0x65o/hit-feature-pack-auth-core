interface ProfilePictureCropModalProps {
    open: boolean;
    onClose: () => void;
    imageSrc: string;
    onCropComplete: (croppedImageBase64: string) => void;
}
export declare function ProfilePictureCropModal({ open, onClose, imageSrc, onCropComplete, }: ProfilePictureCropModalProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=ProfilePictureCropModal.d.ts.map