/**
 * Cloze Tools for EFDRC
 * Provides cloze manipulation features: removal and numbering
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

      // Get the text length of the FULL cloze markup (not just content)
      // This handles cases where cloze content might have HTML tags
      const clozeTemp = document.createElement('div')
      clozeTemp.innerHTML = match[0]
      const clozeTextLength = clozeTemp.textContent.length
      const textEnd = textStart + clozeTextLength

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
   */
  function removeAllClozesInField(event, elem) {
    const cursorPos = getCursorTextOffset(elem)

    // Replace all clozes - use same pattern as removeClozesOfSameNumber
    const html = elem.innerHTML
    const regex = /\{\{c\d+::(.*?)(?:::(.*?))?\}\}/g
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
   * Change the number of a cloze
   * @param {HTMLElement} elem - The editable field element
   * @param {Object} cloze - The cloze object from getClozeAtCursor
   * @param {number} newNumber - The new cloze number
   */
  function changeClozeNumber(elem, cloze, newNumber) {
    const newCloze = cloze.hint
      ? `{{c${newNumber}::${cloze.content}::${cloze.hint}}}`
      : `{{c${newNumber}::${cloze.content}}}`

    const html = elem.innerHTML
    const before = html.substring(0, cloze.htmlStart)
    const after = html.substring(cloze.htmlEnd)
    elem.innerHTML = before + newCloze + after

    // Restore cursor position
    placeCursorAtOffset(elem, cloze.textStart)
    return true
  }

  /**
   * Increment cloze number at cursor
   */
  function incrementClozeNumber(event, elem) {
    const cloze = getClozeAtCursor(elem)
    if (!cloze) return

    changeClozeNumber(elem, cloze, cloze.number + 1)
  }

  /**
   * Decrement cloze number at cursor (minimum 1)
   */
  function decrementClozeNumber(event, elem) {
    const cloze = getClozeAtCursor(elem)
    if (!cloze) return

    const newNumber = Math.max(1, cloze.number - 1)
    if (newNumber !== cloze.number) {
      changeClozeNumber(elem, cloze, newNumber)
    }
  }

  // State for renumber key sequence
  let renumberPending = false
  let renumberElement = null
  let renumberCloze = null
  let renumberTimeout = null
  let renumberPopup = null

  /**
   * Create and show the renumber popup
   */
  function showRenumberPopup() {
    hideRenumberPopup()

    renumberPopup = document.createElement('div')
    renumberPopup.id = 'efdrc-renumber-popup'
    renumberPopup.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #333;
        color: #fff;
        padding: 16px 24px;
        border-radius: 8px;
        font-size: 16px;
        z-index: 99999;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        text-align: center;
      ">
        <div style="font-weight: bold; margin-bottom: 8px;">Renumber Cloze</div>
        <div style="color: #aaa;">Press <strong style="color: #fff;">1-9</strong> to set number</div>
        <div style="
          display: flex;
          justify-content: center;
          gap: 6px;
          margin-top: 12px;
        ">
          ${[1,2,3,4,5,6,7,8,9].map(n => `
            <span style="
              width: 28px;
              height: 28px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #555;
              border-radius: 4px;
              font-weight: bold;
            ">${n}</span>
          `).join('')}
        </div>
      </div>
    `
    document.body.appendChild(renumberPopup)
  }

  /**
   * Hide the renumber popup
   */
  function hideRenumberPopup() {
    if (renumberPopup) {
      renumberPopup.remove()
      renumberPopup = null
    }
  }

  /**
   * Start renumber sequence - waits for 1-9 key press
   */
  function startRenumberSequence(event, elem) {
    const cloze = getClozeAtCursor(elem)
    if (!cloze) return  // No cloze at cursor, don't start

    renumberPending = true
    renumberElement = elem
    renumberCloze = cloze

    showRenumberPopup()

    // Cancel after 3 seconds if no number pressed
    clearTimeout(renumberTimeout)
    renumberTimeout = setTimeout(() => {
      renumberPending = false
      renumberElement = null
      renumberCloze = null
      hideRenumberPopup()
    }, 3000)
  }

  /**
   * Handle number key press during renumber sequence
   * Returns true if handled, false otherwise
   */
  function handleRenumberKey(event) {
    if (!renumberPending || !renumberElement || !renumberCloze) return false

    const key = event.key
    if (key >= '1' && key <= '9') {
      event.preventDefault()
      event.stopPropagation()

      const newNumber = parseInt(key, 10)
      changeClozeNumber(renumberElement, renumberCloze, newNumber)

      // Reset state
      clearTimeout(renumberTimeout)
      renumberPending = false
      renumberElement = null
      renumberCloze = null
      hideRenumberPopup()
      return true
    }

    // Any other key cancels the sequence
    renumberPending = false
    renumberElement = null
    renumberCloze = null
    clearTimeout(renumberTimeout)
    hideRenumberPopup()
    return false
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

    // Numbering shortcuts
    if (shortcuts.increment) {
      EFDRC.registerShortcut(shortcuts.increment, incrementClozeNumber)
    }

    if (shortcuts.decrement) {
      EFDRC.registerShortcut(shortcuts.decrement, decrementClozeNumber)
    }

    if (shortcuts.renumber) {
      EFDRC.registerShortcut(shortcuts.renumber, startRenumberSequence)
    }
  }

  // Listen for number keys during renumber sequence
  document.addEventListener('keydown', (event) => {
    if (renumberPending) {
      handleRenumberKey(event)
    }
  }, true)

  // Expose helper functions for potential future use
  EFDRC.clozeTools = {
    getClozeAtCursor,
    getAllClozes,
    stripClozeMarkup,
    removeClozeAtCursorOrSelection,
    removeAllClozesInField,
    removeClozesOfSameNumber,
    changeClozeNumber,
    incrementClozeNumber,
    decrementClozeNumber,
    startRenumberSequence
  }
})()
