import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';

export default function CheckinHistory() {
    const { checkins } = useSession();
    const navigate = useNavigate();

  
    const listCheckins = [...(checkins || [])].reverse();
    const graphCheckins = checkins || [];

    return (
        <div className="flex-grow pt-[64px] pb-xl px-container-margin md:px-lg max-w-lg mx-auto w-full flex flex-col">
            <header className="fixed top-0 left-0 w-full bg-surface flex items-center justify-between px-md h-touch-target z-50 border-b border-outline-variant">
                <button
                    className="w-touch-target h-touch-target flex items-center justify-center text-primary hover:bg-surface-container-low rounded-full transition-colors -ml-sm"
                    onClick={() => navigate('/home')} aria-label="Back">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <span className="font-headline text-label-lg font-bold text-on-surface tracking-tight">Wellbeing History</span>
                <div className="w-touch-target"></div>
            </header>

            {graphCheckins.length > 0 && (
                <div className="mt-md fade-up">
                    <h2 className="font-headline text-headline-md text-on-surface mb-sm">Distress Score Trend</h2>
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex items-end justify-between h-32 gap-xs overflow-x-auto">
                        {graphCheckins.map((chk, idx) => {
                            const heightPercentage = Math.max(10, chk.distressScore); // Set min height for visibility
                            const isDanger = chk.distressScore > 60;
                            return (
                                <div key={`graph-${chk.id}`} className="flex flex-col items-center justify-end h-full flex-shrink-0 w-8">
                                    <span className="text-[10px] text-on-surface-variant mb-1">{chk.distressScore}</span>
                                    <div
                                        className={`w-full rounded-t-md opacity-80 ${isDanger ? 'bg-error' : 'bg-primary'}`}
                                        style={{ height: `${heightPercentage}%` }}
                                    ></div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="mt-lg fade-up fade-up-1">
                <h2 className="font-headline text-headline-md text-on-surface mb-sm">Past Check-ins</h2>

                {listCheckins.length === 0 ? (
                    <p className="text-on-surface-variant italic text-center py-md">No history available.</p>
                ) : (
                    <div className="flex flex-col gap-sm">
                        {listCheckins.map((chk) => {
                            const dateStr = new Date(chk.timestamp).toLocaleString(undefined, {
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            });
                            const isStable = chk.concernLevel === 'Stable';

                            return (
                                <div key={chk.id} className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl shadow-sm flex flex-col gap-xs">
                                    <div className="flex items-center justify-between border-b border-surface-variant pb-xs mb-xs">
                                        <span className="font-label text-label-sm text-on-surface-variant">{dateStr}</span>
                                        <span className={`font-label text-label-sm px-2 py-0.5 rounded ${isStable ? 'bg-primary-container text-on-primary-container' : 'bg-error-container text-on-error-container'}`}>
                                            {chk.concernLevel}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-on-surface-variant font-label text-label-sm">Score</span>
                                        <span className="font-bold">{chk.distressScore}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-on-surface-variant font-label text-label-sm">Trend</span>
                                        <span className="font-bold flex items-center gap-1 text-sm">
                                            {chk.trend === 'Up' && '➚ Up'}
                                            {chk.trend === 'Down' && '➘ Down'}
                                            {chk.trend === 'Stable' && '→ Stable'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-on-surface-variant font-label text-label-sm">Primary Signal</span>
                                        <span className="font-body text-body-sm">{chk.concernType}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
