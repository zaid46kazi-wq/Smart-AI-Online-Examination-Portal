import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ttmdiobkwbxyhyasttke.supabase.co';
const supabaseKey = 'sb_publishable_6FWcaoaf5jdqVSB0ZBjWfA_mRwgVzt6';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Convert base64 dataURL to Blob for Storage upload
const dataURLtoBlob = (dataurl) => {
    let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
};

/**
 * Uploads a base64 snapshot to Supabase Storage 'warnings' bucket
 * @returns {string|null} public URL of the uploaded image
 */
export const uploadSnapshot = async (base64Image, userId, examId) => {
    if (!base64Image) return null;
    try {
        const fileExt = "jpg";
        const fileName = `${userId}_${examId}_${Date.now()}.${fileExt}`;
        const filePath = `snapshots/${fileName}`;

        const blob = dataURLtoBlob(base64Image);

        const { data, error } = await supabase.storage
            .from('warnings')
            .upload(filePath, blob, { upsert: false });

        if (error) {
            console.error("Storage upload error:", error);
            return null;
        }

        const { data: publicData } = supabase.storage.from('warnings').getPublicUrl(filePath);
        return publicData.publicUrl;
    } catch (err) {
        console.error("Upload process failed:", err.message);
        return null;
    }
};

/**
 * Logs a warning directly into the warnings database table.
 */
export const logWarning = async (userId, examId, type, imageUrl) => {
  try {
    const { error } = await supabase.from('warnings').insert([
      {
        user_id: userId,
        exam_id: examId,
        type: type,
        image_url: imageUrl
      }
    ]);
    if (error) throw error;
    console.log(`Warning logged: ${type}`);
  } catch (err) {
    console.error('Failed to log warning:', err.message);
  }
};
