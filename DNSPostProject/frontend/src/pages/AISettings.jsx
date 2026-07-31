import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { showToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';

export function AISettings() {
    const { user, logout } = useAuth();
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

    // Client-Side Validation
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
        if (conf > 100) errs.push('Phone Confidence Threshold cannot exceed 100%.');
        if (conf < 0.05) errs.push('Phone Confidence Threshold must be at least 5% (0.05).');

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
            
            showToast('AI Security & Eye Tracking Settings saved successfully!', 'success');
            setSaveStatusMsg(`Saved & Synchronized at ${new Date().toLocaleTimeString()} by ${user?.username || 'Admin'}`);
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
            <div className="min-h-screen flex items-center justify-center bg-surface">
                <div className="text-center">
                    <div className="inline-block w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-3"></div>
                    <p className="text-xs font-bold text-muted uppercase tracking-widest">Loading AI Proctoring Configuration Engine...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-surface min-h-screen flex flex-col font-body">
            {/* Header Banner */}
            <header className="w-full bg-primary text-on-primary py-3 px-6 text-center shadow-lg relative z-10">
                <h1 className="text-lg font-bold font-headline tracking-tight">AGMR College of Engineering</h1>
                <p className="text-xs opacity-80">Online Examination System — AI Proctoring & Eye Tracking Control Panel</p>
            </header>

            {/* Top Navigation */}
            <nav className="sticky top-0 z-40 bg-surface-container-lowest/90 backdrop-blur-xl border-b border-outline-variant/10 px-6 py-3 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold font-headline text-primary">AI Security Command Center</h2>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-on-surface-variant">Welcome, {user?.username || 'Instructor'}</span>
                    <button onClick={logout} className="px-3 py-1.5 rounded-lg text-xs font-bold text-error bg-error-container/10 hover:bg-error-container/20 transition-all flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">logout</span> Logout
                    </button>
                </div>
            </nav>

            <div className="flex flex-1">
                {/* Sidebar */}
                <aside className="w-64 bg-surface-container-lowest border-r border-outline-variant/10 flex flex-col p-4 space-y-2">
                    <div className="px-3 py-2 mb-4">
                        <h3 className="text-xs font-bold text-outline uppercase tracking-widest">Instructor Portal</h3>
                        <p className="text-sm font-bold text-on-surface">AGMR College</p>
                    </div>

                    <Link to="/admin" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-all">
                        <span className="material-symbols-outlined text-xl">dashboard</span> Overview
                    </Link>
                    <Link to="/create-exam" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-all">
                        <span className="material-symbols-outlined text-xl">add_circle</span> Create Exam
                    </Link>
                    <Link to="/results" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-all">
                        <span className="material-symbols-outlined text-xl">analytics</span> View Results
                    </Link>
                    <Link to="/ai-settings" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold bg-primary text-on-primary shadow-sm">
                        <span className="material-symbols-outlined text-xl">settings_suggest</span> AI Security Settings
                    </Link>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-8 space-y-8 overflow-y-auto">
                    <div className="flex justify-between items-center border-b border-outline-variant/10 pb-4">
                        <div>
                            <h1 className="text-2xl font-bold font-headline text-on-surface">AI Engine & Eye Tracking Configuration</h1>
                            <p className="text-sm text-on-surface-variant mt-1">
                                Dynamic threshold configuration panel. Settings saved here directly control MediaPipe Eye Gaze & Object Detection algorithms.
                            </p>
                        </div>

                        {/* Config Metadata Badge */}
                        <div className="text-right bg-surface-container-low p-3 rounded-2xl border border-outline-variant/10">
                            <div className="text-xs font-bold text-primary flex items-center justify-end gap-1">
                                <span className="material-symbols-outlined text-sm">published_with_changes</span>
                                <span>Active Configuration</span>
                            </div>
                            <div className="text-[11px] text-outline mt-0.5">
                                Updated By: <span className="font-bold text-on-surface">{settings.updated_by || user?.username || 'Admin'}</span>
                            </div>
                            <div className="text-[10px] text-outline">
                                Last Modified: {settings.updated_at ? new Date(settings.updated_at).toLocaleString() : 'Just Now'}
                            </div>
                        </div>
                    </div>

                    {/* Validation Errors Overlay */}
                    {validationErrors.length > 0 && (
                        <div className="p-4 rounded-2xl bg-error/10 border border-error/20 text-error space-y-1">
                            <div className="flex items-center gap-2 font-bold text-sm">
                                <span className="material-symbols-outlined">warning</span> Configuration Validation Errors:
                            </div>
                            <ul className="list-disc list-inside text-xs font-bold space-y-0.5 pl-2">
                                {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                            </ul>
                        </div>
                    )}

                    {saveStatusMsg && (
                        <div className="p-3 rounded-xl bg-success/10 border border-success/20 text-success text-xs font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            <span>{saveStatusMsg}</span>
                        </div>
                    )}

                    <form onSubmit={handleSave} className="space-y-8 max-w-4xl">
                        {/* Section 1: Eye Tracking & Iris Gaze Module */}
                        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-primary/20 shadow-md space-y-4">
                            <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                                <span className="material-symbols-outlined">visibility</span> Eye Gaze Estimation & Iris Tracking Settings
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-outline uppercase mb-1">Eye Tracking Sensitivity</label>
                                    <select
                                        value={settings.eye_tracking_sensitivity || 'medium'}
                                        onChange={e => setSettings({ ...settings, eye_tracking_sensitivity: e.target.value })}
                                        className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm font-bold text-on-surface"
                                    >
                                        <option value="low">Low (Strict — High Tolerance)</option>
                                        <option value="medium">Medium (Balanced — Standard)</option>
                                        <option value="high">High (Sensitive — Low Tolerance)</option>
                                    </select>
                                    <p className="text-[10px] text-outline mt-1">Adjusts gaze offset threshold sensitivity.</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-outline uppercase mb-1">Max Gaze-Away Duration (sec)</label>
                                    <input
                                        type="number" step="0.5" min="1" max="15"
                                        value={settings.eye_gaze_max_duration_sec}
                                        onChange={e => setSettings({ ...settings, eye_gaze_max_duration_sec: parseFloat(e.target.value) || 3.0 })}
                                        className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm font-bold text-on-surface"
                                    />
                                    <p className="text-[10px] text-outline mt-1">Continuous gaze-away duration before warning.</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-outline uppercase mb-1">Max Repeated Side Glances</label>
                                    <input
                                        type="number" min="1" max="10"
                                        value={settings.eye_gaze_side_glance_limit}
                                        onChange={e => setSettings({ ...settings, eye_gaze_side_glance_limit: parseInt(e.target.value) || 3 })}
                                        className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm font-bold text-on-surface"
                                    />
                                    <p className="text-[10px] text-outline mt-1">Rapid left/right glance flips limit before flagging.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <div>
                                    <label className="block text-xs font-bold text-outline uppercase mb-1">Eye Blink / Closure Duration Thresh (sec)</label>
                                    <input
                                        type="number" step="0.5" min="1" max="10"
                                        value={settings.eye_blink_duration_thresh_sec}
                                        onChange={e => setSettings({ ...settings, eye_blink_duration_thresh_sec: parseFloat(e.target.value) || 3.0 })}
                                        className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm font-bold text-on-surface"
                                    />
                                    <p className="text-[10px] text-outline mt-1">Abnormal continuous eye closure threshold (EAR &lt; 0.14).</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-outline uppercase mb-1">Eye Detection Confidence (0.50 - 0.99)</label>
                                    <input
                                        type="number" step="0.05" min="0.50" max="0.99"
                                        value={settings.eye_gaze_confidence_threshold}
                                        onChange={e => setSettings({ ...settings, eye_gaze_confidence_threshold: parseFloat(e.target.value) || 0.80 })}
                                        className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm font-bold text-on-surface"
                                    />
                                    <p className="text-[10px] text-outline mt-1">Minimum landmark confidence for eye tracking.</p>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Face Missing & Detection */}
                        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm space-y-4">
                            <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                                <span className="material-symbols-outlined">face</span> Face Presence & Missing Timeout
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-outline uppercase mb-1">Face Missing Timeout (Seconds)</label>
                                    <input
                                        type="number" step="0.5" min="1" max="30"
                                        value={settings.face_timeout_seconds}
                                        onChange={e => setSettings({ ...settings, face_timeout_seconds: parseFloat(e.target.value) || 5 })}
                                        className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-outline uppercase mb-1">Max Allowed Faces</label>
                                    <input
                                        type="number" min="1" max="5"
                                        value={settings.max_allowed_faces}
                                        onChange={e => setSettings({ ...settings, max_allowed_faces: parseInt(e.target.value) || 1 })}
                                        className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm font-bold"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Head Pose Angles */}
                        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm space-y-4">
                            <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                                <span className="material-symbols-outlined">screen_rotation</span> 3D Head Pose Angles & Hold Time
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-outline uppercase mb-1">Max Left (°)</label>
                                    <input
                                        type="number" min="5" max="90"
                                        value={settings.head_yaw_left_deg}
                                        onChange={e => setSettings({ ...settings, head_yaw_left_deg: parseFloat(e.target.value) || 22 })}
                                        className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-outline uppercase mb-1">Max Right (°)</label>
                                    <input
                                        type="number" min="5" max="90"
                                        value={settings.head_yaw_right_deg}
                                        onChange={e => setSettings({ ...settings, head_yaw_right_deg: parseFloat(e.target.value) || 22 })}
                                        className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-outline uppercase mb-1">Max Up (°)</label>
                                    <input
                                        type="number" min="5" max="90"
                                        value={settings.head_pitch_up_deg}
                                        onChange={e => setSettings({ ...settings, head_pitch_up_deg: parseFloat(e.target.value) || 18 })}
                                        className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-outline uppercase mb-1">Max Down (°)</label>
                                    <input
                                        type="number" min="5" max="90"
                                        value={settings.head_pitch_down_deg}
                                        onChange={e => setSettings({ ...settings, head_pitch_down_deg: parseFloat(e.target.value) || 18 })}
                                        className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm font-bold"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-outline uppercase mb-1">Head Pose Sustained Duration (Seconds)</label>
                                <input
                                    type="number" step="0.1" min="0.5" max="10"
                                    value={settings.head_pose_hold_time_sec}
                                    onChange={e => setSettings({ ...settings, head_pose_hold_time_sec: parseFloat(e.target.value) || 1.5 })}
                                    className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm font-bold"
                                />
                            </div>
                        </div>

                        {/* Section 4: Mobile Phone Detection (COCO-SSD) */}
                        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm space-y-4">
                            <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                                <span className="material-symbols-outlined">smartphone</span> Mobile Phone Detection (COCO-SSD)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-outline uppercase mb-1">Confidence Threshold (0.05 - 1.0)</label>
                                    <input
                                        type="number" step="0.05" min="0.05" max="1.0"
                                        value={settings.phone_confidence_threshold}
                                        onChange={e => setSettings({ ...settings, phone_confidence_threshold: parseFloat(e.target.value) || 0.50 })}
                                        className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-outline uppercase mb-1">Scan Interval (ms)</label>
                                    <input
                                        type="number" step="100" min="200" max="3000"
                                        value={settings.phone_detection_interval_ms}
                                        onChange={e => setSettings({ ...settings, phone_detection_interval_ms: parseInt(e.target.value) || 600 })}
                                        className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-outline uppercase mb-1">Repeated Detection Limit</label>
                                    <input
                                        type="number" min="1" max="10"
                                        value={settings.phone_repeat_limit}
                                        onChange={e => setSettings({ ...settings, phone_repeat_limit: parseInt(e.target.value) || 2 })}
                                        className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm font-bold"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 5: Warning & Auto-Submit System */}
                        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm space-y-4">
                            <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                                <span className="material-symbols-outlined">warning</span> Warning Thresholds & Automatic Action
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-outline uppercase mb-1">Maximum Allowed Warnings</label>
                                    <input
                                        type="number" min="1" max="20"
                                        value={settings.max_warnings}
                                        onChange={e => setSettings({ ...settings, max_warnings: parseInt(e.target.value) || 3 })}
                                        className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm font-bold"
                                    />
                                </div>
                                <div className="flex items-center gap-3 pt-6">
                                    <input
                                        type="checkbox" id="autoSubmit"
                                        checked={!!settings.auto_submit_enabled}
                                        onChange={e => setSettings({ ...settings, auto_submit_enabled: e.target.checked ? 1 : 0 })}
                                        className="w-5 h-5 accent-primary cursor-pointer"
                                    />
                                    <label htmlFor="autoSubmit" className="text-xs font-bold text-on-surface cursor-pointer">
                                        Automatically Submit Exam when Max Warnings Limit is Reached
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Section 6: Dynamic Risk Weights */}
                        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm space-y-4">
                            <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                                <span className="material-symbols-outlined">analytics</span> Dynamic Risk Score Weights (0–100 Scale)
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-bold">
                                <div>
                                    <label className="block text-outline uppercase mb-1">Looking Away (+Points)</label>
                                    <input
                                        type="number" min="5" max="50"
                                        value={settings.risk_weights?.LOOKING_AWAY || 10}
                                        onChange={e => setSettings({
                                            ...settings,
                                            risk_weights: { ...settings.risk_weights, LOOKING_AWAY: parseInt(e.target.value) || 10 }
                                        })}
                                        className="w-full bg-surface-container-high border-none rounded-xl px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-outline uppercase mb-1">Rapid Side Glances (+Points)</label>
                                    <input
                                        type="number" min="5" max="50"
                                        value={settings.risk_weights?.RAPID_SIDE_GLANCES || 15}
                                        onChange={e => setSettings({
                                            ...settings,
                                            risk_weights: { ...settings.risk_weights, RAPID_SIDE_GLANCES: parseInt(e.target.value) || 15 }
                                        })}
                                        className="w-full bg-surface-container-high border-none rounded-xl px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-outline uppercase mb-1">Eyes Closed Long (+Points)</label>
                                    <input
                                        type="number" min="5" max="50"
                                        value={settings.risk_weights?.EYES_CLOSED_LONG || 20}
                                        onChange={e => setSettings({
                                            ...settings,
                                            risk_weights: { ...settings.risk_weights, EYES_CLOSED_LONG: parseInt(e.target.value) || 20 }
                                        })}
                                        className="w-full bg-surface-container-high border-none rounded-xl px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-outline uppercase mb-1">Multiple Faces (+Points)</label>
                                    <input
                                        type="number" min="5" max="50"
                                        value={settings.risk_weights?.MULTIPLE_FACES || 40}
                                        onChange={e => setSettings({
                                            ...settings,
                                            risk_weights: { ...settings.risk_weights, MULTIPLE_FACES: parseInt(e.target.value) || 40 }
                                        })}
                                        className="w-full bg-surface-container-high border-none rounded-xl px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-outline uppercase mb-1">Phone Detected (+Points)</label>
                                    <input
                                        type="number" min="5" max="50"
                                        value={settings.risk_weights?.PHONE_DETECTED || 30}
                                        onChange={e => setSettings({
                                            ...settings,
                                            risk_weights: { ...settings.risk_weights, PHONE_DETECTED: parseInt(e.target.value) || 30 }
                                        })}
                                        className="w-full bg-surface-container-high border-none rounded-xl px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-outline uppercase mb-1">Face Missing (+Points)</label>
                                    <input
                                        type="number" min="5" max="50"
                                        value={settings.risk_weights?.FACE_MISSING || 20}
                                        onChange={e => setSettings({
                                            ...settings,
                                            risk_weights: { ...settings.risk_weights, FACE_MISSING: parseInt(e.target.value) || 20 }
                                        })}
                                        className="w-full bg-surface-container-high border-none rounded-xl px-3 py-2"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Save Action Buttons */}
                        <div className="flex justify-end gap-4 pt-4 border-t border-outline-variant/10">
                            <button
                                type="button"
                                onClick={() => navigate('/admin')}
                                className="px-6 py-3 rounded-xl font-bold text-sm bg-surface-container-high text-on-surface hover:bg-surface-container transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-8 py-3 rounded-xl font-bold text-sm bg-primary text-on-primary hover:bg-primary-dim transition-all shadow-md flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-base">save</span>
                                {saving ? 'Saving & Applying Configuration...' : 'Save AI Configuration'}
                            </button>
                        </div>
                    </form>
                </main>
            </div>
        </div>
    );
}

export default AISettings;
