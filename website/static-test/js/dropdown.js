(function (global) {
  function initDropdown(rootId) {
    var dropdown = document.getElementById(rootId)
    if (!dropdown) return

    var btn = dropdown.querySelector('.nav-dropdown-trigger, .nav-dropdown-trigger-btn')
    var menu = dropdown.querySelector('.nav-dropdown-menu')
    if (!btn || !menu) return

    function close() {
      dropdown.classList.remove('is-open')
      btn.setAttribute('aria-expanded', 'false')
      menu.hidden = true
    }

    function open() {
      dropdown.classList.add('is-open')
      btn.setAttribute('aria-expanded', 'true')
      menu.hidden = false
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation()
      if (menu.hidden) open()
      else close()
    })

    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', close)
    })

    document.addEventListener('click', function (e) {
      if (!dropdown.contains(e.target)) close()
    })

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close()
    })
  }

  global.initDropdown = initDropdown
})(window)
