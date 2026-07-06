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
})()
