/**
 * Evidence Capture Utility
 * Captures currently visible frame and uploads to Supabase
 */
import { supabase } from '../services/supabaseClient';

export const captureScreenFrame = async (video) => {
  if (!video) return null;

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85);
  });
};

export const uploadEvidence = async (userId, type, blob) => {
  if (!blob) return null;

  const fileName = `${userId}_${type}_${Date.now()}.jpg`;
  const filePath = `evidence/${fileName}`;

  try {
    const { data, error } = await supabase.storage
      .from('proctoring_evidence')
      .upload(filePath, blob);

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from('proctoring_evidence')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.warn('Evidence storage failed (is bucket created?):', err.message);
    return null;
  }
};
