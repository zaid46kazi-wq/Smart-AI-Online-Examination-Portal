import { useState, useCallback } from 'react';
import { uploadSnapshot, logWarning } from '../services/supabaseClient';

export const useWarnings = (userId, examId) => {
    const [warningCount, setWarningCount] = useState(0);

    const triggerWarning = useCallback(async (type, base64Snapshot) => {
        // Increment count immediately
        setWarningCount(prev => {
            const next = prev + 1;
            
            // Only capture and store up to 3 warnings
            if (next <= 3) {
                // Handle async upload and db insert without blocking UI
                (async () => {
                    let publicUrl = null;
                    if (base64Snapshot) {
                        publicUrl = await uploadSnapshot(base64Snapshot, userId, examId);
                    }
                    await logWarning(userId, examId, type, publicUrl);
                    
                    if (next >= 3) {
                        alert("MAXIMUM WARNINGS REACHED. EXAM WILL AUTO-SUBMIT.");
                        // Implement auto-submit logic here or propagate via state
                        window.location.href = "/student"; // Simple redirect auto-submit fallback
                    }
                })();
            }
            return next;
        });
    }, [userId, examId]);

    return { warningCount, triggerWarning };
};
