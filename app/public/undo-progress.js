const restartUndoProgress = (toast) => {
  toast.classList.add('undo-progress-restart')
  void toast.offsetWidth
  toast.classList.remove('undo-progress-restart')
}

const observer = new MutationObserver((mutations) => {
  const touched = new Set()
  mutations.forEach((mutation) => {
    const target = mutation.target.nodeType === Node.ELEMENT_NODE ? mutation.target : mutation.target.parentElement
    const toast = target?.closest?.('.undo-toast')
    if (toast) touched.add(toast)
    mutation.addedNodes.forEach((node) => {
      const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
      const addedToast = element?.matches?.('.undo-toast') ? element : element?.querySelector?.('.undo-toast')
      if (addedToast) touched.add(addedToast)
    })
  })
  touched.forEach(restartUndoProgress)
})

observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true })
