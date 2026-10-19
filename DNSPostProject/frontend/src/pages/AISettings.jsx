import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Eye, 
    UserCheck, 
    RotateCcw, 
    Smartphone, 
    AlertTriangle, 
    Activity, 
    Save, 
    CheckCircle2, 
    Clock, 
    ShieldCheck, 
    Info 
} from 'lucide-react';
import { showToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { AppLayout } from '../components/ui/AppLayout';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export function AISettings() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [validationErrors, setValidationErrors] = useState([]);
    const [saveStatusMsg, setSaveStatusMsg] = useState('');

    const [settings, setSettings] = useState({
        max_warnings: 3,
        auto_submit_enabled: 1,
        face_timeout_seconds: 5,
        head_yaw_left_deg: 22,
        head_yaw_right_deg: 22,
        head_pitch_up_deg: 18,
        head_pitch_down_deg: 18,
        head_pose_hold_time_sec: 1.5,
        eye_gaze_max_duration_sec: 3.0,
        eye_gaze_side_glance_limit: 3,
        eye_gaze_confidence_threshold: 0.80,
        eye_blink_duration_thresh_sec: 3.0,
        eye_tracking_sensitivity: 'medium',
        eye_gaze_threshold: 0.12,
        phone_confidence_threshold: 0.50,
        phone_detection_interval_ms: 600,
        phone_repeat_limit: 2,
        max_allowed_faces: 1,
        multiple_faces_duration_sec: 1.0,
        allowed_tab_switches: 1,
        max_fullscreen_exits: 2,
        enable_ctrl_c: 1,
        enable_ctrl_v: 1,
        enable_ctrl_a: 1,
        enable_ctrl_p: 1,
        enable_ctrl_s: 1,
        enable_ctrl_shift_i: 1,
        enable_ctrl_shift_j: 1,
        enable_ctrl_u: 1,
        enable_f12: 1,
        enable_right_click: 1,
        screenshot_quality: 0.70,
        updated_at: '',
        updated_by: 'System',
        risk_weights: {
            LOOKING_AWAY: 10,
            RAPID_SIDE_GLANCES: 15,
            EYES_CLOSED_LONG: 20,
            HEAD_YAW: 10,
            HEAD_PITCH: 10,
            FACE_MISSING: 20,
            MULTIPLE_FACES: 40,
            PHONE_DETECTED: 30,
            TAB_SWITCH: 15,
            FULLSCREEN_EXIT: 10,
            KEYBOARD_SHORTCUT: 5,
            RIGHT_CLICK: 5
        }
    });

    useEffect(() => {
        async function fetchSettings() {
            try {
                const data = await apiFetch('/api/proctor/settings');
                if (data && typeof data === 'object') {
                    setSettings(prev => ({
                        ...prev,
                        ...data,
                        risk_weights: { ...prev.risk_weights, ...(data.risk_weights || {}) }
                    }));
                }
            } catch (err) {
                showToast('Failed to load AI settings: ' + err.message, 'error');
            } finally {
                setLoading(false);
            }
        }
        fetchSettings();
    }, []);

    const validateSettings = () => {
        const errs = [];
        if (settings.max_warnings < 1) errs.push('Max warnings must be at least 1.');
        if (settings.face_timeout_seconds <= 0) errs.push('Face timeout must be greater than 0 seconds.');
        if (settings.eye_gaze_max_duration_sec <= 0) errs.push('Maximum gaze-away duration must be greater than 0 seconds.');
        if (settings.eye_blink_duration_thresh_sec <= 0) errs.push('Eye blink duration threshold must be greater than 0 seconds.');
        if (settings.head_yaw_left_deg > 90 || settings.head_yaw_left_deg < 5) errs.push('Head Yaw Left Angle must be between 5° and 90°.');
        if (settings.head_yaw_right_deg > 90 || settings.head_yaw_right_deg < 5) errs.push('Head Yaw Right Angle must be between 5° and 90°.');
        if (settings.head_pitch_up_deg > 90 || settings.head_pitch_up_deg < 5) errs.push('Head Pitch Up Angle must be between 5° and 90°.');
        if (settings.head_pitch_down_deg > 90 || settings.head_pitch_down_deg < 5) errs.push('Head Pitch Down Angle must be between 5° and 90°.');
        
        let conf = parseFloat(settings.phone_confidence_threshold);
        if (conf > 1.0 && conf <= 100) {
            conf = conf / 100;
        }
        if (conf > 1.0) errs.push('Phone Confidence Threshold cannot exceed 1.0 (100%).');
        if (conf < 0.05) errs.push('Phone Confidence Threshold must be at least 0.05 (5%).');

        setValidationErrors(errs);
        return errs.length === 0;
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaveStatusMsg('');
        if (!validateSettings()) {
            showToast('Validation failed. Please correct input errors.', 'error');
            return;
        }

        setSaving(true);
        try {
            const res = await apiFetch('/api/proctor/settings', {
                method: 'POST',
                body: JSON.stringify(settings)
            });
            
            showToast('Proctoring & Eye Tracking settings saved successfully!', 'success');
            setSaveStatusMsg(`Saved & Synchronized at ${new Date().toLocaleTimeString()} by ${user?.username || 'Administrator'}`);
            if (res.settings) {
                setSettings(prev => ({
                    ...prev,
                    ...res.settings,
                    risk_weights: { ...prev.risk_weights, ...(res.settings.risk_weights || {}) }
                }));
            }
        } catch (err) {
            showToast('Failed to save settings: ' + err.message, 'error');
            if (err.validationErrors) setValidationErrors(err.validationErrors);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <AppLayout activeTab="security">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <div className="w-8 h-8 border-3 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Loading Security Policies...</p>
                    </div>
                </div>
            </AppLayout>
        );
    }

    const inputClasses = "w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors";
    const labelClasses = "block text-xs font-semibold text-slate-700 mb-1.5";
    const helpClasses = "text-[11px] text-slate-500 mt-1";

    return (
        <AppLayout activeTab="security">
            <div className="space-y-6 max-w-5xl">
                <PageHeader
                    title="Proctoring & Security Policies"
                    description="Configure MediaPipe computer vision thresholds, iris gaze tracking, and automated examination integrity rules."
                    badge={
                        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-semibold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>Policy Enforcement Active</span>
                        </div>
                    }
                    action={
                        <Button
                            type="button"
                            variant="primary"
                            icon={Save}
                            loading={saving}
                            onClick={handleSave}
                        >
                            {saving ? 'Enforcing...' : 'Save & Enforce Policies'}
                        </Button>
                    }
                />

                {validationErrors.length > 0 && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs shadow-2xs">
                        <div className="flex items-center gap-2 font-semibold mb-1">
                            <AlertTriangle className="w-4 h-4 text-red-600" /> Validation Errors:
                        </div>
                        <ul className="list-disc list-inside text-xs space-y-0.5 text-red-700 pl-1">
                            {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                        </ul>
                    </div>
                )}

                {saveStatusMsg && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-2xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>{saveStatusMsg}</span>
                    </div>
                )}

                <form onSubmit={handleSave} className="space-y-6">
                    {/* Section 1: Eye Tracking & Iris Gaze */}
                    <Card
                        title="Eye Gaze & Iris Tracking Policies"
                        subtitle="Fine-tune MediaPipe face mesh gaze direction and iris deviation algorithms"
                        icon={Eye}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div>
                                <label className={labelClasses}>Eye Tracking Sensitivity</label>
                                <select
                                    value={settings.eye_tracking_sensitivity || 'medium'}
                                    onChange={e => setSettings({ ...settings, eye_tracking_sensitivity: e.target.value })}
                                    className={inputClasses}
                                >
                                    <option value="low">Low (Strict — High Tolerance)</option>
                                    <option value="medium">Medium (Standard — Recommended)</option>
                                    <option value="high">High (Sensitive — Low Tolerance)</option>
                                </select>
                                <p className={helpClasses}>Gaze offset deviation threshold.</p>
                            </div>

                            <div>
                                <label className={labelClasses}>Max Gaze-Away Time (seconds)</label>
                                <input
                                    type="number" step="0.5" min="1" max="15"
                                    value={settings.eye_gaze_max_duration_sec}
                                    onChange={e => setSettings({ ...settings, eye_gaze_max_duration_sec: parseFloat(e.target.value) || 3.0 })}
                                    className={inputClasses}
                                />
                                <p className={helpClasses}>Continuous off-screen focus limit.</p>
                            </div>

                            <div>
                                <label className={labelClasses}>Side Glance Flips Limit</label>
                                <input
                                    type="number" min="1" max="10"
                                    value={settings.eye_gaze_side_glance_limit}
                                    onChange={e => setSettings({ ...settings, eye_gaze_side_glance_limit: parseInt(e.target.value) || 3 })}
                                    className={inputClasses}
                                />
                                <p className={helpClasses}>Rapid left/right glance cycles limit.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5 pt-4 border-t border-slate-100">
                            <div>
                                <label className={labelClasses}>Eye Closure / Blink Duration Threshold (sec)</label>
                                <input
                                    type="number" step="0.5" min="1" max="10"
                                    value={settings.eye_blink_duration_thresh_sec}
                                    onChange={e => setSettings({ ...settings, eye_blink_duration_thresh_sec: parseFloat(e.target.value) || 3.0 })}
                                    className={inputClasses}
                                />
                                <p className={helpClasses}>Flagged if eyes remain closed longer than duration (EAR &lt; 0.14).</p>
                            </div>

                            <div>
                                <label className={labelClasses}>Eye Detection Landmark Confidence (0.50 - 0.99)</label>
                                <input
                                    type="number" step="0.05" min="0.50" max="0.99"
                                    value={settings.eye_gaze_confidence_threshold}
                                    onChange={e => setSettings({ ...settings, eye_gaze_confidence_threshold: parseFloat(e.target.value) || 0.80 })}
                                    className={inputClasses}
                                />
                                <p className={helpClasses}>Minimum confidence to accept landmark geometry.</p>
                            </div>
                        </div>
                    </Card>

                    {/* Section 2: Face Presence & Geometry */}
                    <Card
                        title="Face Presence & Count Parameters"
                        subtitle="Detect absent candidates or unauthorized secondary individuals in view"
                        icon={UserCheck}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className={labelClasses}>Face Absence Timeout (seconds)</label>
                                <input
                                    type="number" step="0.5" min="1" max="30"
                                    value={settings.face_timeout_seconds}
                                    onChange={e => setSettings({ ...settings, face_timeout_seconds: parseFloat(e.target.value) || 5 })}
                                    className={inputClasses}
                                />
                                <p className={helpClasses}>Triggers warning if face is missing continuously.</p>
                            </div>
                            <div>
                                <label className={labelClasses}>Maximum Permitted Faces</label>
                                <input
                                    type="number" min="1" max="5"
                                    value={settings.max_allowed_faces}
                                    onChange={e => setSettings({ ...settings, max_allowed_faces: parseInt(e.target.value) || 1 })}
                                    className={inputClasses}
                                />
                                <p className={helpClasses}>More than 1 face flags multiple persons in camera frame.</p>
                            </div>
                        </div>
                    </Card>

                    {/* Section 3: Head Pose Angles */}
                    <Card
                        title="Head Pose Orientation (Yaw & Pitch)"
                        subtitle="3D mathematical rotational bounds for student head movement"
                        icon={RotateCcw}
                    >
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className={labelClasses}>Max Yaw Left (°)</label>
                                <input
                                    type="number" min="5" max="90"
                                    value={settings.head_yaw_left_deg}
                                    onChange={e => setSettings({ ...settings, head_yaw_left_deg: parseFloat(e.target.value) || 22 })}
                                    className={inputClasses}
                                />
                            </div>
                            <div>
                                <label className={labelClasses}>Max Yaw Right (°)</label>
                                <input
                                    type="number" min="5" max="90"
                                    value={settings.head_yaw_right_deg}
                                    onChange={e => setSettings({ ...settings, head_yaw_right_deg: parseFloat(e.target.value) || 22 })}
                                    className={inputClasses}
                                />
                            </div>
                            <div>
                                <label className={labelClasses}>Max Pitch Up (°)</label>
                                <input
                                    type="number" min="5" max="90"
                                    value={settings.head_pitch_up_deg}
                                    onChange={e => setSettings({ ...settings, head_pitch_up_deg: parseFloat(e.target.value) || 18 })}
                                    className={inputClasses}
                                />
                            </div>
                            <div>
                                <label className={labelClasses}>Max Pitch Down (°)</label>
                                <input
                                    type="number" min="5" max="90"
                                    value={settings.head_pitch_down_deg}
                                    onChange={e => setSettings({ ...settings, head_pitch_down_deg: parseFloat(e.target.value) || 18 })}
                                    className={inputClasses}
                                />
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <label className={labelClasses}>Sustained Head Pose Duration (seconds)</label>
                            <input
                                type="number" step="0.1" min="0.5" max="10"
                                value={settings.head_pose_hold_time_sec}
                                onChange={e => setSettings({ ...settings, head_pose_hold_time_sec: parseFloat(e.target.value) || 1.5 })}
                                className="w-full md:w-1/2 px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors"
                            />
                            <p className={helpClasses}>Consecutive time head must stay past angle limit before warning is registered.</p>
                        </div>
                    </Card>

                    {/* Section 4: Mobile Phone Detection (COCO-SSD) */}
                    <Card
                        title="Mobile Phone & Device Detection (COCO-SSD)"
                        subtitle="Neural network object recognition parameters running in-browser"
                        icon={Smartphone}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div>
                                <label className={labelClasses}>Confidence Threshold (0.05 - 1.0)</label>
                                <input
                                    type="number" step="0.05" min="0.05" max="1.0"
                                    value={settings.phone_confidence_threshold}
                                    onChange={e => setSettings({ ...settings, phone_confidence_threshold: parseFloat(e.target.value) || 0.50 })}
                                    className={inputClasses}
                                />
                                <p className={helpClasses}>Lower values increase sensitivity; default is 0.50 (50%).</p>
                            </div>
                            <div>
                                <label className={labelClasses}>Detection Interval (ms)</label>
                                <input
                                    type="number" step="100" min="200" max="3000"
                                    value={settings.phone_detection_interval_ms}
                                    onChange={e => setSettings({ ...settings, phone_detection_interval_ms: parseInt(e.target.value) || 600 })}
                                    className={inputClasses}
                                />
                                <p className={helpClasses}>Scanning frequency against video feed.</p>
                            </div>
                            <div>
                                <label className={labelClasses}>Repeated Detection Limit</label>
                                <input
                                    type="number" min="1" max="10"
                                    value={settings.phone_repeat_limit}
                                    onChange={e => setSettings({ ...settings, phone_repeat_limit: parseInt(e.target.value) || 2 })}
                                    className={inputClasses}
                                />
                                <p className={helpClasses}>Number of consecutive frames required to confirm.</p>
                            </div>
                        </div>
                    </Card>

                    {/* Section 5: Warning & Auto-Submit */}
                    <Card
                        title="Warning Thresholds & Automatic Termination"
                        subtitle="Academic disciplinary policies enforced upon repeated violations"
                        icon={AlertTriangle}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                            <div>
                                <label className={labelClasses}>Maximum Permitted Warnings</label>
                                <input
                                    type="number" min="1" max="20"
                                    value={settings.max_warnings}
                                    onChange={e => setSettings({ ...settings, max_warnings: parseInt(e.target.value) || 3 })}
                                    className={inputClasses}
                                />
                                <p className={helpClasses}>Student is permitted up to this number before enforcement actions.</p>
                            </div>
                            <div className="pt-2">
                                <label className="flex items-center gap-3 cursor-pointer p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={!!settings.auto_submit_enabled}
                                        onChange={e => setSettings({ ...settings, auto_submit_enabled: e.target.checked ? 1 : 0 })}
                                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                    />
                                    <div>
                                        <div className="text-xs font-semibold text-slate-800">Automatic Exam Termination</div>
                                        <div className="text-[11px] text-slate-500">Auto-submit candidate exam when maximum warning count is exhausted</div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </Card>

                    {/* Section 6: Dynamic Risk Weights */}
                    <Card
                        title="Security Risk Index Scoring Weights"
                        subtitle="Points assigned per incident type towards total suspicious score (0-100)"
                        icon={Activity}
                    >
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                            <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-xl text-center">
                                <span className="block text-[11px] font-semibold text-slate-600 truncate">Looking Away</span>
                                <input
                                    type="number" min="5" max="50"
                                    value={settings.risk_weights?.LOOKING_AWAY || 10}
                                    onChange={e => setSettings({
                                        ...settings,
                                        risk_weights: { ...settings.risk_weights, LOOKING_AWAY: parseInt(e.target.value) || 10 }
                                    })}
                                    className="w-full mt-1.5 px-2 py-1 text-xs font-bold text-center bg-white border border-slate-200 rounded-md focus:border-blue-600 outline-none"
                                />
                            </div>

                            <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-xl text-center">
                                <span className="block text-[11px] font-semibold text-slate-600 truncate">Side Glances</span>
                                <input
                                    type="number" min="5" max="50"
                                    value={settings.risk_weights?.RAPID_SIDE_GLANCES || 15}
                                    onChange={e => setSettings({
                                        ...settings,
                                        risk_weights: { ...settings.risk_weights, RAPID_SIDE_GLANCES: parseInt(e.target.value) || 15 }
                                    })}
                                    className="w-full mt-1.5 px-2 py-1 text-xs font-bold text-center bg-white border border-slate-200 rounded-md focus:border-blue-600 outline-none"
                                />
                            </div>

                            <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-xl text-center">
                                <span className="block text-[11px] font-semibold text-slate-600 truncate">Eyes Closed</span>
                                <input
                                    type="number" min="5" max="50"
                                    value={settings.risk_weights?.EYES_CLOSED_LONG || 20}
                                    onChange={e => setSettings({
                                        ...settings,
                                        risk_weights: { ...settings.risk_weights, EYES_CLOSED_LONG: parseInt(e.target.value) || 20 }
                                    })}
                                    className="w-full mt-1.5 px-2 py-1 text-xs font-bold text-center bg-white border border-slate-200 rounded-md focus:border-blue-600 outline-none"
                                />
                            </div>

                            <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-xl text-center">
                                <span className="block text-[11px] font-semibold text-slate-600 truncate">Multiple Faces</span>
                                <input
                                    type="number" min="5" max="50"
                                    value={settings.risk_weights?.MULTIPLE_FACES || 40}
                                    onChange={e => setSettings({
                                        ...settings,
                                        risk_weights: { ...settings.risk_weights, MULTIPLE_FACES: parseInt(e.target.value) || 40 }
                                    })}
                                    className="w-full mt-1.5 px-2 py-1 text-xs font-bold text-center bg-white border border-slate-200 rounded-md focus:border-blue-600 outline-none"
                                />
                            </div>

                            <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-xl text-center">
                                <span className="block text-[11px] font-semibold text-slate-600 truncate">Phone Detected</span>
                                <input
                                    type="number" min="5" max="50"
                                    value={settings.risk_weights?.PHONE_DETECTED || 30}
                                    onChange={e => setSettings({
                                        ...settings,
                                        risk_weights: { ...settings.risk_weights, PHONE_DETECTED: parseInt(e.target.value) || 30 }
                                    })}
                                    className="w-full mt-1.5 px-2 py-1 text-xs font-bold text-center bg-white border border-slate-200 rounded-md focus:border-blue-600 outline-none"
                                />
                            </div>

                            <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-xl text-center">
                                <span className="block text-[11px] font-semibold text-slate-600 truncate">Face Missing</span>
                                <input
                                    type="number" min="5" max="50"
                                    value={settings.risk_weights?.FACE_MISSING || 20}
                                    onChange={e => setSettings({
                                        ...settings,
                                        risk_weights: { ...settings.risk_weights, FACE_MISSING: parseInt(e.target.value) || 20 }
                                    })}
                                    className="w-full mt-1.5 px-2 py-1 text-xs font-bold text-center bg-white border border-slate-200 rounded-md focus:border-blue-600 outline-none"
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Bottom Action Bar */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => navigate('/admin')}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            icon={Save}
                            loading={saving}
                        >
                            {saving ? 'Applying Policies...' : 'Save & Enforce Policies'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

export default AISettings;
