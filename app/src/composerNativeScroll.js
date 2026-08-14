const HIT_CLASS = 'composer-native-scroll-hit'

const ensureHitLayer = (stage) => {
  if (!(stage instanceof Element) || !stage.matches('.stage.q')) return
  const scroller = stage.querySelector(':scope > .qvp')
  if (!scroller || scroller.querySelector(`:scope > .${HIT_CLASS}`)) return

  const hit = document.createElement('div')
  hit.className = HIT_CLASS
  hit.setAttribute('aria-hidden', 'true')
  scroller.append(hit)
}

const scan = (root = document) => {
  if (root instanceof Element && root.matches('.stage.q')) ensureHitLayer(root)
  root.querySelectorAll?.('.stage.q').forEach(ensureHitLayer)
}

if (typeof document !== 'undefined') {
  scan()
  const observer = new MutationObserver((records) => {
    records.forEach((record) => {
      record.addedNodes.forEach((node) => {
        if (node instanceof Element) scan(node)
      })
    })
  })
  observer.observe(document.documentElement, { childList: true, subtree: true })
}
