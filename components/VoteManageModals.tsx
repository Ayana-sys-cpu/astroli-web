'use client';
import { motion, AnimatePresence } from 'framer-motion';

interface VoteManageModalsProps {
  editOpen: boolean;
  editEndValue: string;
  onEditEndChange: (val: string) => void;
  onEditSave: () => void;
  onEditClose: () => void;
  onEditOpenFinish: () => void;
  onEditOpenDelete: () => void;

  finishOpen: boolean;
  onFinishConfirm: () => void;
  onFinishClose: () => void;

  deleteOpen: boolean;
  onDeleteConfirm: () => void;
  onDeleteClose: () => void;

  loading: boolean;
}

export default function VoteManageModals({
  editOpen, editEndValue, onEditEndChange, onEditSave, onEditClose,
  onEditOpenFinish, onEditOpenDelete,
  finishOpen, onFinishConfirm, onFinishClose,
  deleteOpen, onDeleteConfirm, onDeleteClose,
  loading,
}: VoteManageModalsProps) {
  return (
    <>
      {/* ── Edit Vote End Date modal ── */}
      <AnimatePresence>
        {editOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
            onClick={onEditClose}
          >
            <motion.div
              initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className="w-full max-w-sm rounded-2xl p-7 flex flex-col gap-5"
              style={{ background: '#0d0d18', border: '1px solid rgba(0,212,255,0.25)', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}
              onClick={e => e.stopPropagation()}
            >
              <div>
                <p className="font-space text-[10px] tracking-[0.2em] mb-2" style={{ color: '#00D4FF' }}>EDIT VOTE</p>
                <h3 className="font-space font-black text-lg tracking-tight" style={{ color: '#E8E8F0' }}>Update End Date</h3>
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-space text-[9px] font-bold tracking-[0.15em]" style={{ color: 'rgba(232,232,240,0.4)' }}>
                  NEW END DATE &amp; TIME
                </label>
                <input
                  type="datetime-local"
                  value={editEndValue}
                  onChange={e => onEditEndChange(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 font-inter text-sm outline-none"
                  style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.3)', color: '#E8E8F0', colorScheme: 'dark' }}
                />
                <p className="font-inter text-[11px]" style={{ color: 'rgba(232,232,240,0.28)' }}>
                  The countdown timer will update immediately for all students.
                </p>
              </div>
              <div className="flex flex-col gap-3 pt-1">
                <motion.button
                  onClick={onEditSave}
                  disabled={loading || !editEndValue}
                  whileHover={!loading ? { scale: 1.02 } : undefined}
                  whileTap={!loading ? { scale: 0.97 } : undefined}
                  className="w-full py-3 rounded-xl font-space font-bold text-sm tracking-[0.1em]"
                  style={{ background: 'rgba(0,212,255,0.8)', color: '#0a0a0f', cursor: loading ? 'default' : 'pointer' }}
                >
                  {loading ? 'SAVING…' : 'SAVE NEW DATE'}
                </motion.button>
                <div className="flex gap-3">
                  <button
                    onClick={onEditOpenFinish}
                    className="flex-1 py-2.5 rounded-xl font-space text-[10px] font-bold tracking-[0.1em] transition-all hover:opacity-80"
                    style={{ background: 'rgba(255,184,0,0.1)', color: '#FFB800', border: '1px solid rgba(255,184,0,0.3)' }}
                  >
                    ◼ FINISH VOTE
                  </button>
                  <button
                    onClick={onEditOpenDelete}
                    className="flex-1 py-2.5 rounded-xl font-space text-[10px] font-bold tracking-[0.1em] transition-all hover:opacity-80"
                    style={{ background: 'rgba(255,92,92,0.1)', color: '#FF5C5C', border: '1px solid rgba(255,92,92,0.3)' }}
                  >
                    🗑 DELETE
                  </button>
                </div>
                <button
                  onClick={onEditClose}
                  className="w-full py-2.5 rounded-xl font-space text-[10px] font-bold tracking-[0.1em] transition-all hover:opacity-70"
                  style={{ background: 'rgba(232,232,240,0.05)', color: 'rgba(232,232,240,0.4)', border: '1px solid rgba(232,232,240,0.1)' }}
                >
                  CANCEL
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Finish Vote confirmation modal ── */}
      <AnimatePresence>
        {finishOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
            style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)' }}
            onClick={onFinishClose}
          >
            <motion.div
              initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className="w-full max-w-sm rounded-2xl p-7 flex flex-col gap-5"
              style={{ background: '#0d0d18', border: '1px solid rgba(255,184,0,0.3)', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-full mx-auto" style={{ background: 'rgba(255,184,0,0.1)', border: '1px solid rgba(255,184,0,0.35)' }}>
                <span style={{ fontSize: 22 }}>◼</span>
              </div>
              <div className="text-center">
                <h3 className="font-space font-black text-lg tracking-tight mb-2" style={{ color: '#E8E8F0' }}>End vote now?</h3>
                <p className="font-inter text-sm leading-relaxed" style={{ color: 'rgba(232,232,240,0.5)' }}>
                  Are you sure? Ending the vote now will finalize results before the original scheduled end time.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <motion.button
                  onClick={onFinishConfirm}
                  disabled={loading}
                  whileHover={!loading ? { scale: 1.02 } : undefined}
                  whileTap={!loading ? { scale: 0.97 } : undefined}
                  className="w-full py-3 rounded-xl font-space font-bold text-sm tracking-[0.1em]"
                  style={{ background: 'rgba(255,184,0,0.85)', color: '#0a0a0f', cursor: loading ? 'default' : 'pointer' }}
                >
                  {loading ? 'ENDING…' : 'YES, END VOTE'}
                </motion.button>
                <button
                  onClick={onFinishClose}
                  className="w-full py-2.5 rounded-xl font-space text-[10px] font-bold tracking-[0.1em] transition-all hover:opacity-70"
                  style={{ background: 'rgba(232,232,240,0.05)', color: 'rgba(232,232,240,0.4)', border: '1px solid rgba(232,232,240,0.1)' }}
                >
                  KEEP VOTE RUNNING
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Vote high-visibility modal ── */}
      <AnimatePresence>
        {deleteOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
            onClick={onDeleteClose}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className="w-full max-w-sm rounded-2xl p-7 flex flex-col gap-5"
              style={{ background: '#130808', border: '1.5px solid rgba(255,51,51,0.4)', boxShadow: '0 24px 60px rgba(255,51,51,0.15)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-center w-14 h-14 rounded-full mx-auto" style={{ background: 'rgba(255,51,51,0.12)', border: '1px solid rgba(255,51,51,0.4)' }}>
                <span style={{ fontSize: 26 }}>⚠</span>
              </div>
              <div className="text-center">
                <h3 className="font-space font-black text-xl tracking-tight mb-3" style={{ color: '#FF5C5C' }}>Delete this vote?</h3>
                <p className="font-inter text-sm leading-relaxed" style={{ color: 'rgba(232,232,240,0.5)' }}>
                  Are you sure you want to delete this vote? This action cannot be undone and will remove the voting option for all students in the class.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <motion.button
                  onClick={onDeleteConfirm}
                  disabled={loading}
                  whileHover={!loading ? { scale: 1.02 } : undefined}
                  whileTap={!loading ? { scale: 0.97 } : undefined}
                  className="w-full py-3.5 rounded-xl font-space font-bold text-sm tracking-[0.15em]"
                  style={{ background: '#FF3333', color: '#fff', cursor: loading ? 'default' : 'pointer', boxShadow: '0 4px 20px rgba(255,51,51,0.35)' }}
                >
                  {loading ? 'DELETING…' : 'DELETE VOTE'}
                </motion.button>
                <button
                  onClick={onDeleteClose}
                  className="w-full py-2.5 rounded-xl font-space text-[10px] font-bold tracking-[0.1em] transition-all hover:opacity-70"
                  style={{ background: 'rgba(232,232,240,0.05)', color: 'rgba(232,232,240,0.4)', border: '1px solid rgba(232,232,240,0.1)' }}
                >
                  KEEP VOTE
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
