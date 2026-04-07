import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

export default function AdminWarnings() {
    const [warnings, setWarnings] = useState([]);
    const [selectedImage, setSelectedImage] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWarnings();

        // PART 5: REALTIME UPDATES
        const channel = supabase
            .channel('warnings_realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'warnings' }, (payload) => {
                console.log('New warning received!', payload.new);
                setWarnings(prev => [payload.new, ...prev]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchWarnings = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('warnings')
            .select('*')
            .order('timestamp', { ascending: false });
        
        if (!error && data) {
            setWarnings(data);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8 text-slate-800">
            <h1 className="text-3xl font-bold mb-6 text-slate-900 border-b pb-4 border-slate-200">Admin Dashboard: Warnings</h1>
            
            {loading ? (
                <div className="text-center py-12 text-slate-500">Loading warnings...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {warnings.length === 0 ? (
                        <div className="col-span-full py-12 text-center text-slate-500 font-medium">No warnings recorded.</div>
                    ) : (
                        warnings.map((w) => (
                            <div key={w.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                                <div className="p-4 bg-slate-100 flex justify-between border-b border-slate-200 text-xs font-bold font-mono">
                                    <span className="text-red-500 uppercase">{w.type.replace('_', ' ')}</span>
                                    <span className="text-slate-500">{new Date(w.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                                <div className="h-48 bg-slate-50 flex items-center justify-center cursor-pointer relative group" onClick={() => setSelectedImage(w.image_url)}>
                                    {w.image_url ? (
                                        <img src={w.image_url} alt="Warning Snapshot" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-slate-400 italic">No Image</div>
                                    )}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                        <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-slate-900 px-3 py-1 rounded text-xs font-bold shadow">View Full</span>
                                    </div>
                                </div>
                                <div className="p-4 text-sm leading-relaxed text-slate-700">
                                    <p><strong className="text-slate-900">Student ID:</strong> {w.user_id}</p>
                                    <p><strong className="text-slate-900">Exam ID:</strong> {w.exam_id}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Modal for full image */}
            {selectedImage && (
                <div 
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
                    onClick={() => setSelectedImage(null)}
                >
                    <img 
                        src={selectedImage} 
                        className="max-w-full max-h-full rounded-lg shadow-2xl border-4 border-slate-800" 
                        alt="Enlarged warning"
                        onClick={e => e.stopPropagation()}
                    />
                    <button 
                        className="absolute top-6 right-6 text-white bg-slate-800 hover:bg-red-500 rounded-full w-10 h-10 flex items-center justify-center font-bold transition-colors"
                        onClick={() => setSelectedImage(null)}
                    >&times;</button>
                </div>
            )}
        </div>
    );
}
