(function () {
  var header = document.querySelector('.site-header')
  if (header) {
    function onScroll() {
      header.classList.toggle('is-scrolled', window.scrollY > 24)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
  }

  initDropdown('site-nav-dropdown')
  initDropdown('toolbox-dropdown')

  var yearEl = document.getElementById('year')
  if (yearEl) yearEl.textContent = String(new Date().getFullYear())

  document.querySelectorAll('.product-media img, .contact-qr-img img').forEach(function (img) {
    function markMissing() {
      var wrap = img.closest('.product-media, .contact-qr-img')
      if (wrap) wrap.classList.add('is-missing')
    }
    img.addEventListener('error', markMissing)
    if (img.complete && img.naturalWidth === 0) markMissing()
  })

  function showReveals(nodes) {
    nodes.forEach(function (el) {
      el.classList.add('is-visible')
    })
  }

  var revealEls = document.querySelectorAll('.reveal')
  if (!revealEls.length) return

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduceMotion || !('IntersectionObserver' in window)) {
    return
  }

  document.documentElement.classList.add('has-reveal-animate')

  var revealed = 0
  function revealAllFallback() {
    if (revealed >= revealEls.length) return
    showReveals(revealEls)
  }

  setTimeout(revealAllFallback, 400)

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          revealed++
          observer.unobserve(entry.target)
        }
      })
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.01 }
  )

  revealEls.forEach(function (el) {
    observer.observe(el)
  })

  showReveals(document.querySelectorAll('.hero .reveal'))
  requestAnimationFrame(function () {
    showReveals(document.querySelectorAll('.hero .reveal'))
  })
})()
