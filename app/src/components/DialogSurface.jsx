import useDialogA11y from '../hooks/useDialogA11y.js'

export default function DialogSurface({
  children,
  onClose,
  className = '',
  role = 'dialog',
  labelledBy,
  describedBy,
  scrimLabel = 'Close',
}) {
  const dialogRef = useDialogA11y(onClose)

  return (
    <div className="modalwrap on">
      <button className="scrim" aria-label={scrimLabel} data-act="modal-cancel" onClick={onClose} />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`modal${className ? ` ${className}` : ''}`}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
      >
        {children}
      </div>
    </div>
  )
}
