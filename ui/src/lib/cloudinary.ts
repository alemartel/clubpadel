import { Cloudinary } from 'cloudinary-core';

// Cloudinary configuration
const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

if (!cloudName || !uploadPreset) {
  console.error('Cloudinary configuration missing!');
  console.error('Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET environment variables.');
  console.error('Current values:', { cloudName, uploadPreset });
}

// Create Cloudinary instance
export const cloudinary = new Cloudinary({
  cloud_name: cloudName,
  secure: true,
});

// Upload widget configuration
export const uploadWidgetConfig = {
  cloudName,
  uploadPreset,
  cropping: true,
  croppingAspectRatio: 1,
  croppingShowDimensions: true,
  folder: 'clubpadel/profile-pictures',
  maxImageWidth: 1000,
  maxImageHeight: 1000,
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
  theme: 'minimal',
  styles: {
    palette: {
      window: '#FFFFFF',
      sourceBg: '#F4F4F5',
      windowBorder: '#90A0B3',
      tabIcon: '#0078FF',
      inactiveTabIcon: '#8E9FBF',
      menuIcons: '#5A616A',
      link: '#0078FF',
      action: '#0078FF',
      inProgress: '#0078FF',
      complete: '#20B832',
      error: '#EA2727',
      textDark: '#000000',
      textLight: '#FFFFFF',
    },
    fonts: {
      default: null,
      "'Inter', sans-serif": {
        url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap',
        active: true,
      },
    },
  },
};

// Utility function to get optimized image URL
export const getOptimizedImageUrl = (publicId: string, width?: number, height?: number) => {
  if (!publicId) return null;
  
  const transformations = [];
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  transformations.push('c_fill', 'f_auto', 'q_auto');
  
  return cloudinary.url(publicId, {
    transformation: transformations.join(','),
  });
};

// Utility function to get avatar-sized image URL
export const getAvatarImageUrl = (publicId: string, size: number = 100) => {
  return getOptimizedImageUrl(publicId, size, size);
};
