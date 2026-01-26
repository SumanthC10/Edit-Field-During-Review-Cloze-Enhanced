/**
 * Cloze Tools for EFDRC
 * Provides cloze manipulation features: remove single, remove all, remove same number
 */
(function () {
  const EFDRC = window.EFDRC

  // Regex to match cloze deletions: {{c1::content}} or {{c1::content::hint}}
  const CLOZE_REGEX = /\{\{c(\d+)::(.*?)(?:::(.*?))?\}\}/g

  /**
   * Get the cursor position within an element's text content
   * Returns the character offset from the start of the element's text
   */
  function getCursorTextOffset(elem) {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      return -1
    }
    const range = selection.getRangeAt(0)

    // Create a range from start of element to cursor
    const preCaretRange = document.createRange()
    preCaretRange.selectNodeContents(elem)
    preCaretRange.setEnd(range.startContainer, range.startOffset)

    // Get the text content length up to cursor
    return preCaretRange.toString().length
  }

  /**
   * Find the cloze at the current cursor position
   * Works by mapping HTML cloze positions to text positions
   * @param {HTMLElement} elem - The editable field element
   * @returns {Object|null} - {match, index, number, content, hint, start, end} or null
   */
  function getClozeAtCursor(elem) {
    const cursorPos = getCursorTextOffset(elem)
    if (cursorPos < 0) return null

    const html = elem.innerHTML
    const text = elem.textContent || ''

    // Find all clozes and their positions in both HTML and text
    let match
    const regex = new RegExp(CLOZE_REGEX.source, 'g')

    while ((match = regex.exec(html)) !== null) {
      const htmlStart = match.index
      const htmlEnd = htmlStart + match[0].length

      // Convert HTML position to text position
      // Create a temp element to get text from HTML before this match
      const htmlBefore = html.substring(0, htmlStart)
      const temp = document.createElement('div')
      temp.innerHTML = htmlBefore
      const textStart = temp.textContent.length

      // The cloze content in text is just the content (group 2)
      const clozeContent = match[2]
      const textEnd = textStart + clozeContent.length

      // Check if cursor is within this cloze's text range
      if (cursorPos >= textStart && cursorPos <= textEnd) {
        return {
          match: match[0],
          index: htmlStart,
          number: parseInt(match[1], 10),
          content: match[2],
          hint: match[3] || null,
          htmlStart: htmlStart,
          htmlEnd: htmlEnd,
          textStart: textStart,
          textEnd: textEnd
        }
      }
    }

    return null
  }

  /**
   * Get all clozes in an element
   * @param {HTMLElement} elem - The editable field element
   * @returns {Array} - Array of cloze objects
   */
  function getAllClozes(elem) {
    const html = elem.innerHTML
    const clozes = []
    let match
    const regex = new RegExp(CLOZE_REGEX.source, 'g')

    while ((match = regex.exec(html)) !== null) {
      clozes.push({
        match: match[0],
        index: match.index,
        number: parseInt(match[1], 10),
        content: match[2],
        hint: match[3] || null
      })
    }

    return clozes
  }

  /**
   * Remove cloze markup from a cloze string, keeping the content
   * @param {string} clozeStr - The full cloze string e.g. "{{c1::Apple::fruit}}"
   * @returns {string} - Just the content e.g. "Apple"
   */
  function stripClozeMarkup(clozeStr) {
    const match = clozeStr.match(/\{\{c\d+::(.*?)(?:::.*?)?\}\}/)
    return match ? match[1] : clozeStr
  }

  /**
   * Remove cloze at cursor or remove clozes in selection
   * Ctrl+Shift+R
   */
  function removeClozeAtCursorOrSelection(event, elem) {
    const selection = window.getSelection()

    // Check if there's a selection
    if (selection && !selection.isCollapsed) {
      // Remove all cloze markup within the selection
      const range = selection.getRangeAt(0)
      const selectedHtml = getSelectionHtml()

      if (!selectedHtml) return

      // Replace clozes in selection with their content
      const newHtml = selectedHtml.replace(CLOZE_REGEX, '$2')

      if (newHtml !== selectedHtml) {
        document.execCommand('insertHTML', false, newHtml)
      }
    } else {
      // No selection - find cloze at cursor
      const cloze = getClozeAtCursor(elem)

      if (!cloze) {
        // No cloze at cursor
        return
      }

      // Replace this specific cloze with its content
      const html = elem.innerHTML
      const before = html.substring(0, cloze.htmlStart)
      const after = html.substring(cloze.htmlEnd)
      elem.innerHTML = before + cloze.content + after

      // Try to restore cursor position
      placeCursorAtOffset(elem, cloze.textStart)
    }
  }

  /**
   * Remove ALL cloze markup from the entire field
   * Ctrl+Shift+D
   */
  function removeAllClozesInField(event, elem) {
    const html = elem.innerHTML
    const newHtml = html.replace(CLOZE_REGEX, '$2')

    if (newHtml !== html) {
      const cursorPos = getCursorTextOffset(elem)
      elem.innerHTML = newHtml
      // Restore cursor approximately
      if (cursorPos >= 0) {
        placeCursorAtOffset(elem, Math.min(cursorPos, elem.textContent.length))
      }
    }
  }

  /**
   * Remove all clozes with the same number as the cloze at cursor
   * Ctrl+Shift+Alt+R
   */
  function removeClozesOfSameNumber(event, elem) {
    const cloze = getClozeAtCursor(elem)

    if (!cloze) {
      // No cloze at cursor
      return
    }

    const targetNumber = cloze.number
    const cursorPos = getCursorTextOffset(elem)

    // Replace all clozes with this number
    const html = elem.innerHTML
    const regex = new RegExp(`\\{\\{c${targetNumber}::(.*?)(?:::(.*?))?\\}\\}`, 'g')
    const newHtml = html.replace(regex, '$1')

    if (newHtml !== html) {
      elem.innerHTML = newHtml
      // Restore cursor approximately
      if (cursorPos >= 0) {
        placeCursorAtOffset(elem, Math.min(cursorPos, elem.textContent.length))
      }
    }
  }

  /**
   * Get HTML content of current selection
   */
  function getSelectionHtml() {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return ''

    const range = selection.getRangeAt(0)
    const container = document.createElement('div')
    container.appendChild(range.cloneContents())
    return container.innerHTML
  }

  /**
   * Place cursor at a text offset within an element
   */
  function placeCursorAtOffset(elem, offset) {
    const selection = window.getSelection()
    if (!selection) return

    const range = document.createRange()
    let currentOffset = 0
    let found = false

    function walkNodes(node) {
      if (found) return

      if (node.nodeType === Node.TEXT_NODE) {
        const nodeLength = node.textContent.length
        if (currentOffset + nodeLength >= offset) {
          range.setStart(node, offset - currentOffset)
          range.collapse(true)
          found = true
          return
        }
        currentOffset += nodeLength
      } else {
        for (const child of node.childNodes) {
          walkNodes(child)
          if (found) return
        }
      }
    }

    walkNodes(elem)

    if (found) {
      selection.removeAllRanges()
      selection.addRange(range)
    } else {
      // Fallback: place at end
      range.selectNodeContents(elem)
      range.collapse(false)
      selection.removeAllRanges()
      selection.addRange(range)
    }
  }

  /**
   * Register cloze tool shortcuts from config
   */
  EFDRC.setupClozeTools = function () {
    const shortcuts = EFDRC.CONF.cloze_tools?.shortcuts
    if (!shortcuts) return

    if (shortcuts.remove_single) {
      EFDRC.registerShortcut(shortcuts.remove_single, removeClozeAtCursorOrSelection)
    }

    if (shortcuts.remove_all) {
      EFDRC.registerShortcut(shortcuts.remove_all, removeAllClozesInField)
    }

    if (shortcuts.remove_same_number) {
      EFDRC.registerShortcut(shortcuts.remove_same_number, removeClozesOfSameNumber)
    }
  }

  // Expose helper functions for potential future use
  EFDRC.clozeTools = {
    getClozeAtCursor,
    getAllClozes,
    stripClozeMarkup,
    removeClozeAtCursorOrSelection,
    removeAllClozesInField,
    removeClozesOfSameNumber
  }
})()
