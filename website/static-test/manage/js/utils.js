(function () {
  function esc(s) {
    if (s === null || s === undefined) return ''
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10)
  }

  function isoDate(d) {
    return d.toISOString().slice(0, 10)
  }

  function queryParam(name) {
    return new URLSearchParams(location.search).get(name)
  }

  function renderPager(container, page, pageSize, total, onChange) {
    if (!container) return
    var totalPages = Math.max(1, Math.ceil(total / pageSize))
    if (total <= pageSize) {
      container.innerHTML = ''
      container.hidden = true
      return
    }
    container.hidden = false
    container.innerHTML =
      '<button type="button" class="btn btn-ghost" data-p="prev"' +
      (page <= 1 ? ' disabled' : '') +
      '>上一页</button>' +
      '<span>' +
      page +
      ' / ' +
      totalPages +
      '</span>' +
      '<button type="button" class="btn btn-ghost" data-p="next"' +
      (page >= totalPages ? ' disabled' : '') +
      '>下一页</button>'
    container.querySelector('[data-p="prev"]').onclick = function () {
      if (page > 1) onChange(page - 1)
    }
    container.querySelector('[data-p="next"]').onclick = function () {
      if (page < totalPages) onChange(page + 1)
    }
  }

  function openModal(id) {
    var el = document.getElementById(id)
    if (el) el.hidden = false
  }

  function closeModal(id) {
    var el = document.getElementById(id)
    if (el) el.hidden = true
  }

  window.AdminUtils = {
    esc: esc,
    todayISO: todayISO,
    isoDate: isoDate,
    queryParam: queryParam,
    renderPager: renderPager,
    openModal: openModal,
    closeModal: closeModal
  }
})()
