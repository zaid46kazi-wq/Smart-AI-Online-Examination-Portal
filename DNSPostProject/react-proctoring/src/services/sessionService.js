import { supabase } from './supabaseClient';

/**
 * Service to manage exam sessions and prevent multiple attempts
 */
export const sessionService = {
  /**
   * Check if user can start an exam
   * Returns { canStart: boolean, error: string }
   */
  async checkAttemptStatus(userId, examId) {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('status, id')
        .eq('user_id', userId)
        .eq('exam_id', examId)
        .maybeSingle();

      if (error) throw error;

      if (!data) return { canStart: true, new: true };

      if (data.status === 'completed') {
        return { canStart: false, error: 'Multiple attempts are not allowed. You have already submitted this exam.' };
      }

      if (data.status === 'in_progress') {
        return { canStart: true, new: false, sessionId: data.id };
      }

      return { canStart: false, error: 'Unauthorized attempt state detected.' };
    } catch (err) {
      console.error('Session Check Error:', err.message);
      return { canStart: false, error: 'Network validation failed. Please refresh.' };
    }
  },

  /**
   * Start a new exam session or resume existing
   */
  async startSession(userId, examId) {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .upsert({
          user_id: userId,
          exam_id: examId,
          status: 'in_progress',
          start_time: new Date().toISOString()
        }, { onConflict: 'user_id,exam_id' })
        .select()
        .single();

      if (error) throw error;
      return { success: true, sessionId: data.id };
    } catch (err) {
      console.error('Start Session Error:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Mark exam as completed (Locks attempt forever)
   */
  async completeSession(userId, examId) {
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ 
          status: 'completed', 
          end_time: new Date().toISOString() 
        })
        .match({ user_id: userId, exam_id: examId });

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Complete Session Error:', err.message);
      return { success: false, error: err.message };
    }
  }
};
