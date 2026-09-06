import { Suspense, lazy } from 'react'

const loadSheets = () => import('./SheetsImpl.jsx')
const lazyNamed = (name) => lazy(() => loadSheets().then((module) => ({ default: module[name] })))

const LazyActivityLogSheet = lazyNamed('ActivityLogSheet')
const LazyCircleEditor = lazyNamed('CircleEditor')
const LazyCirclePicker = lazyNamed('CirclePicker')
const LazyCompletedSheet = lazyNamed('CompletedSheet')
const LazyConfirmDialog = lazyNamed('ConfirmDialog')

const renderLazy = (Component, props) => (
  <Suspense fallback={null}>
    <Component {...props} />
  </Suspense>
)

export function ActivityLogSheet(props) { return renderLazy(LazyActivityLogSheet, props) }
export function CircleEditor(props) { return renderLazy(LazyCircleEditor, props) }
export function CirclePicker(props) { return renderLazy(LazyCirclePicker, props) }
export function CompletedSheet(props) { return renderLazy(LazyCompletedSheet, props) }
export function ConfirmDialog(props) { return renderLazy(LazyConfirmDialog, props) }
