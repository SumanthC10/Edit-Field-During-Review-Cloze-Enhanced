(function () {
  window.EFDRCE = {}
  const EFDRCE = window.EFDRCE
  EFDRCE.shortcuts = []

  const removeSpan = function (el) {
    // removes all span code because depending on the note type
    // pressing backspace can wrap the text in span and apply different styling.
    const elems = el.getElementsByTagName('span')
    for (let x = 0; x < elems.length; x++) {
      const span = elems[x]
      const children = span.childNodes
      for (let y = 0; y < children.length; y++) {
        // insert after node so caret position is maintained. If last sibling, inserted at end.
        span.parentNode.insertBefore(children[y], span.nextSibling)
      }
      span.parentNode.removeChild(span)
    }
  }

  const wrapCloze = function (event, el, altKey) {
    let highest = 0
    const val = el.innerHTML
    let m
    const myRe = /\{\{c(\d+)::/g
    while ((m = myRe.exec(val)) !== null) {
      highest = Math.max(highest, m[1])
    }
    if (!altKey) {
      highest += 1
    }
    highest = Math.max(1, highest)
    EFDRCE.wrapInternal(el, '{{c' + highest + '::', '}}', false)
    event.preventDefault()
  }

  const ctrlLinkEnable = function () {
    const links = document.querySelectorAll('[data-EFDRCEfield] a')
    for (const el of links) {
      el.setAttribute('contenteditable', 'false')
    }
  }

  const ctrlLinkDisable = function () {
    const links = document.querySelectorAll("[data-EFDRCEfield] a[contenteditable='false']")
    for (const el of links) {
      el.removeAttribute('contenteditable')
    }
  }

  const b64DecodeUnicode = function (str) {
    return decodeURIComponent(window.atob(str).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    }).join(''))
  }

  /* Event Handlers */
  EFDRCE.handlePaste = function (e) {
    if (!EFDRCE.CONF.process_paste) {
      return
    }
    const paste = (e.clipboardData || window.clipboardData)
    if (paste.types.length === 0 || (paste.types.length === 1 && paste.types[0] === 'text/plain')) {
      return
    }
    e.preventDefault()
    window.pycmd('EFDRCE!paste') // python code accesses clipboard
  }

  EFDRCE.handleKeydown = function (ev, target) {
    for (const scutInfo of EFDRCE.shortcuts) {
      if (matchShortcut(ev, scutInfo)) {
        const handled = scutInfo.handler(ev, target)
        if (handled !== -1) {
          ev.preventDefault()
        }
      }
    }
    if (isCtrlKey(ev.code)) EFDRCE.ctrldown()
    ev.stopPropagation()
  }

  EFDRCE.handleKeyUp = (ev, target) => {
    if (isCtrlKey(ev.code)) EFDRCE.ctrlup()
    ev.stopPropagation()
  }
  EFDRCE.handleKeyPress = (ev, target) => {
    ev.stopPropagation()
  }

  EFDRCE.handleFocus = function (event, target) {
    if (typeof window.showTooltip === 'function' && typeof window.showTooltip2 === 'undefined') {
      // Disable Popup Dictionary addon tooltip on double mouse click.
      // Using hotkey should still work however.
      window.showTooltip2 = window.showTooltip
      window.showTooltip = function (event, tooltip, element) {
        EFDRCE.tooltip = {
          ev: event,
          tt: tooltip,
          el: element
        }
      }
      window.showTooltip.hide = function () { }
      window.invokeTooltipAtSelectedElm2 = window.invokeTooltipAtSelectedElm
      window.invokeTooltipAtSelectedElm = function () {
        window.invokeTooltipAtSelectedElm2()
        window.showTooltip2(EFDRCE.tooltip.ev, EFDRCE.tooltip.tt, EFDRCE.tooltip.el)
      }
    }

    const qEl = document.getElementById('qa')
    if (qEl !== null) {
      qEl.setAttribute('data-efdrce-editing', 'true')
    }

    const fld = target.getAttribute('data-EFDRCEfield')
    window.pycmd('EFDRCE!focuson#' + fld)
  }

  EFDRCE.handleBlur = function (event, target) {
    if (typeof showTooltip2 === 'function') {
      // Restore Popup Dictionary
      window.showTooltip = window.showTooltip2
      delete window.showTooltip2
      window.invokeTooltipAtSelectedElm = window.invokeTooltipAtSelectedElm2
      delete window.invokeTooltipAtSelectedElm2
    }

    const qEl = document.getElementById('qa')
    if (qEl !== null) {
      qEl.removeAttribute('data-efdrce-editing')
    }

    const el = target
    if (EFDRCE.CONF.remove_span) {
      removeSpan(el)
    }
    el.setAttribute('contenteditable', 'false')
    if (el.hasAttribute('data-EFDRCEnid')) {
      EFDRCE.cleanResize(el)
      window.pycmd('EFDRCE#' + el.getAttribute('data-EFDRCEnid') + '#' + el.getAttribute('data-EFDRCEfield') + '#' + el.innerHTML)
    }
    window.pycmd('EFDRCE!reload')
  }

  /* Shortcuts */
  const specialCharCodes = {
    '-': 'minus',
    '=': 'equal',
    '[': 'bracketleft',
    ']': 'bracketright',
    ';': 'semicolon',
    "'": 'quote',
    '`': 'backquote',
    '\\': 'backslash',
    ',': 'comma',
    '.': 'period',
    '/': 'slash'
  }

  const registerShortcut = function (shortcut, handler) {
    const shortcutKeys = shortcut.toLowerCase().split(/[+]/).map(key => key.trim())
    const modKeys = ['ctrl', 'shift', 'alt']
    const scutInfo = {}
    modKeys.forEach(modKey => { scutInfo[modKey] = shortcutKeys.includes(modKey) })
    let mainKey = shortcutKeys[shortcutKeys.length - 1]
    if (mainKey.length === 1) {
      if (/\d/.test(mainKey)) {
        mainKey = 'digit' + mainKey
      } else if (/[a-zA-Z]/.test(mainKey)) {
        mainKey = 'key' + mainKey
      } else {
        const code = specialCharCodes[mainKey]
        if (code) {
          mainKey = code
        }
      }
    }
    scutInfo.key = mainKey
    scutInfo.handler = handler
    EFDRCE.shortcuts.push(scutInfo)
  }
  // Expose registerShortcut to notetype JS
  EFDRCE.registerShortcut = registerShortcut

  const matchShortcut = function (event, scutInfo) {
    if (scutInfo.key !== event.code.toLowerCase()) return false
    if (scutInfo.ctrl !== (event.ctrlKey || event.metaKey)) return false
    if (scutInfo.shift !== event.shiftKey) return false
    if (scutInfo.alt !== event.altKey) return false
    return true
  }

  const registerFormattingShortcut = function () {
    for (const key in EFDRCE.CONF.special_formatting) {
      const format = EFDRCE.CONF.special_formatting[key]
      if (!format.enabled) {
        continue
      }
      const shortcut = format.shortcut
      registerShortcut(shortcut, () => {
        if (format.arg) {
          document.execCommand(format.command, false, format.arg.value)
        } else {
          document.execCommand(format.command, false)
        }
      }) // spread args list
    }
  }

  const isCtrlKey = function (keycode) {
    return ['ControlLeft', 'MetaLeft', 'ControlRight', 'MetaRight'].includes(keycode)
  }

  window.addEventListener('keydown', function (ev) {
    if (isCtrlKey(ev.code)) {
      EFDRCE.ctrldown()
    }
  })

  window.addEventListener('keyup', function (ev) {
    if (isCtrlKey(ev.code)) {
      EFDRCE.ctrlup()
    }
  })

  /* Called from reviewer.py */
  EFDRCE.registerConfig = function (confStr) {
    EFDRCE.CONF = JSON.parse(confStr)
    EFDRCE.CONF.span = (EFDRCE.CONF.tag === 'span')
    EFDRCE.resizeImageMode = EFDRCE.CONF.resize_image_default_state
  }

  EFDRCE.setupReviewer = function () {
    // image resizer
    registerShortcut(EFDRCE.CONF.shortcuts['image-resize'], (event) => {
      EFDRCE.resizeImageMode = !EFDRCE.resizeImageMode
      EFDRCE.maybeResizeOrClean()
    })
    registerShortcut(EFDRCE.CONF.shortcuts.cloze, (event, el) => {
      wrapCloze(event, el, false)
    })
    registerShortcut(EFDRCE.CONF.shortcuts['cloze-alt'], (event, el) => {
      wrapCloze(event, el, true)
    })
    registerShortcut('Backspace', (event, el) => {
      if (EFDRCE.CONF.span) return
      if (EFDRCE.CONF.remove_span) setTimeout(() => removeSpan(el), 0)
      return -1
    })
    registerShortcut('Delete', (event, el) => {
      if (EFDRCE.CONF.remove_span) setTimeout(() => removeSpan(el), 0)
      return -1
    })
    registerShortcut('Escape', (event, el) => {
      el.blur()
    })
    registerFormattingShortcut()
  }

  const handlers = [
    ['onpaste', 'handlePaste'],
    ['onfocus', 'handleFocus'],
    ['onblur', 'handleBlur'],
    ['onkeydown', 'handleKeydown'],
    ['onkeyup', 'handleKeyUp'],
    ['onkeypress', 'handleKeyPress']
  ]

  EFDRCE.serveCard = function () { // fld: string
    const els = document.querySelectorAll('[data-EFDRCEfield]')
    for (const el of els) {
      if (EFDRCE.CONF.ctrl_click) {
        const fldName = b64DecodeUnicode(el.getAttribute('data-EFDRCEfield'))
        el.setAttribute('data-placeholder', fldName)
      } else {
        el.setAttribute('contenteditable', 'true')
      }
      for (const handlerInfo of handlers) {
        el.setAttribute(handlerInfo[0], `EFDRCE.${handlerInfo[1]}(event, this)`)
      }
    }
  }

  EFDRCE.ctrldown = function () {
    if (EFDRCE.CONF.ctrl_click) {
      // Set 'data-EFDRCE-ctrl' attribute on '#q' element
      // which is reset when card or side changes.
      // It can be used for styling in note type templates
      const qEl = document.getElementById('qa')
      if (qEl !== null) {
        qEl.setAttribute('data-efdrce-ctrl', 'true')
      }

      const els = document.querySelectorAll('[data-EFDRCEfield]')
      for (const el of els) {
        el.setAttribute('contenteditable', 'true')
      }
    } else {
      ctrlLinkEnable() // Ctrl + Click on a link to click a link
    }
  }

  EFDRCE.ctrlup = function () {
    if (EFDRCE.CONF.ctrl_click) {
      const qEl = document.getElementById('qa')
      if (qEl !== null) {
        qEl.removeAttribute('data-efdrce-ctrl')
      }

      const els = document.querySelectorAll('[data-EFDRCEfield]')
      for (const el of els) {
        if (el !== document.activeElement) {
          el.setAttribute('contenteditable', 'false')
        }
      }
    } else {
      ctrlLinkDisable()
    }
  }

  EFDRCE.showRawField = function (encoded, nid, fld) {
    const val = b64DecodeUnicode(encoded)
    const elems = document.querySelectorAll(`[data-EFDRCEfield='${fld}']`)
    for (let e = 0; e < elems.length; e++) {
      const elem = elems[e]
      if (elem.innerHTML !== val) {
        elem.innerHTML = val
      }
      elem.setAttribute('data-EFDRCEnid', nid)
    }
    EFDRCE.maybeResizeOrClean(true)
  }
})()
