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

  // ============ CLOZE STRUCTURE ============

  /**
   * Split cloze at selection boundary
   * Select "family history" in {{c1::family history of ASCVD}}
   * → {{c1::family history}} {{c1::of ASCVD}}
   */
  function splitCloze(event, elem) {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) return // Need a selection

    const cloze = getClozeAtCursor(elem)
    if (!cloze) return

    const selectedText = selection.toString()
    if (!selectedText) return

    // Get plain text content
    const temp = document.createElement('div')
    temp.innerHTML = cloze.content
    const plainContent = temp.textContent || ''

    // Find where selection is within the cloze content
    const selStart = plainContent.indexOf(selectedText)
    if (selStart === -1) return

    const selEnd = selStart + selectedText.length

    // Get the parts
    const beforeSel = plainContent.substring(0, selStart).trim()
    const selected = selectedText.trim()
    const afterSel = plainContent.substring(selEnd).trim()

    if (!selected) return

    const hint = cloze.hint ? `::${cloze.hint}` : ''
    const html = elem.innerHTML
    const before = html.substring(0, cloze.htmlStart)
    const after = html.substring(cloze.htmlEnd)

    // Build the split clozes
    let newClozes = ''
    if (beforeSel) {
      newClozes += `{{c${cloze.number}::${beforeSel}${hint}}} `
    }
    newClozes += `{{c${cloze.number}::${selected}${hint}}}`
    if (afterSel) {
      newClozes += ` {{c${cloze.number}::${afterSel}${hint}}}`
    }

    elem.innerHTML = before + newClozes + after
    placeCursorAtOffset(elem, cloze.textStart)
  }

  /**
   * Merge adjacent same-number clozes (including text between them)
   * {{c1::one}} two {{c1::three}} → {{c1::one two three}}
   */
  function mergeClozes(event, elem) {
    const cloze = getClozeAtCursor(elem)
    if (!cloze) return

    const html = elem.innerHTML
    const allClozes = getAllClozes(elem)

    // Find all clozes with same number
    const sameClozes = allClozes.filter(c => c.number === cloze.number)
    if (sameClozes.length <= 1) return // Nothing to merge

    // Find the first and last cloze with this number
    const firstCloze = sameClozes[0]
    const lastCloze = sameClozes[sameClozes.length - 1]

    // Get everything between first cloze start and last cloze end
    const betweenHtml = html.substring(firstCloze.index, lastCloze.index + lastCloze.match.length)

    // Extract all content: replace cloze markup with content, keep text between
    const mergedContent = betweenHtml.replace(/\{\{c\d+::(.*?)(?:::.*?)?\}\}/g, '$1')

    // Use hint from first cloze that has one, or none
    const hintCloze = sameClozes.find(c => c.hint)
    const hint = hintCloze ? `::${hintCloze.hint}` : ''

    // Build merged cloze
    const newCloze = `{{c${cloze.number}::${mergedContent}${hint}}}`

    // Replace in HTML
    const before = html.substring(0, firstCloze.index)
    const after = html.substring(lastCloze.index + lastCloze.match.length)
    elem.innerHTML = before + newCloze + after

    // Position cursor at start of merged cloze
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = before
    placeCursorAtOffset(elem, tempDiv.textContent.length)
  }

  /**
   * Move selected text out of cloze
   * Smart: start→before, end→after, middle→split
   */
  function moveOutOfCloze(event, elem) {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) return

    const cloze = getClozeAtCursor(elem)
    if (!cloze) return

    const selectedText = selection.toString()
    if (!selectedText) return

    // Get plain content of cloze
    const temp = document.createElement('div')
    temp.innerHTML = cloze.content
    const plainContent = temp.textContent || ''

    // Find where selection is within the cloze content
    const selStart = plainContent.indexOf(selectedText)
    if (selStart === -1) return // Selection not found in cloze content

    const selEnd = selStart + selectedText.length
    const contentLen = plainContent.length

    // Determine position: start, end, or middle
    const atStart = selStart === 0
    const atEnd = selEnd === contentLen

    const hint = cloze.hint ? `::${cloze.hint}` : ''
    const html = elem.innerHTML
    const before = html.substring(0, cloze.htmlStart)
    const after = html.substring(cloze.htmlEnd)

    let newHtml

    if (atStart && atEnd) {
      // Selected entire content - just remove cloze markup
      newHtml = before + selectedText + after
    } else if (atStart) {
      // At start - move before cloze
      const remaining = plainContent.substring(selEnd).trim()
      newHtml = before + selectedText + ' ' + `{{c${cloze.number}::${remaining}${hint}}}` + after
    } else if (atEnd) {
      // At end - move after cloze
      const remaining = plainContent.substring(0, selStart).trim()
      newHtml = before + `{{c${cloze.number}::${remaining}${hint}}}` + ' ' + selectedText + after
    } else {
      // Middle - split into three parts
      const beforeSel = plainContent.substring(0, selStart).trim()
      const afterSel = plainContent.substring(selEnd).trim()
      newHtml = before +
        `{{c${cloze.number}::${beforeSel}${hint}}}` + ' ' +
        selectedText + ' ' +
        `{{c${cloze.number}::${afterSel}${hint}}}` + after
    }

    elem.innerHTML = newHtml
    placeCursorAtOffset(elem, before.length)
  }

  /**
   * Convert selected image to cloze
   * <img src="..."> → {{c1::<img src="...">}}
   */
  function imageToClose(event, elem) {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)

    // Check if selection contains an image
    let img = null
    if (range.startContainer.nodeType === Node.ELEMENT_NODE) {
      img = range.startContainer.querySelector('img')
    }
    if (!img && range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE) {
      img = range.commonAncestorContainer.querySelector('img')
    }
    if (!img) {
      // Check if cursor is on/near an image
      const allImgs = elem.querySelectorAll('img')
      for (const testImg of allImgs) {
        if (selection.containsNode(testImg, true)) {
          img = testImg
          break
        }
      }
    }

    if (!img) return // No image found

    // Find highest cloze number and increment
    let highest = 0
    const html = elem.innerHTML
    let m
    const myRe = /\{\{c(\d+)::/g
    while ((m = myRe.exec(html)) !== null) {
      highest = Math.max(highest, parseInt(m[1], 10))
    }
    highest = Math.max(1, highest + 1)

    // Wrap image in cloze
    const imgHtml = img.outerHTML
    const clozeImg = `{{c${highest}::${imgHtml}}}`

    // Replace image with clozed image
    const newHtml = html.replace(imgHtml, clozeImg)
    elem.innerHTML = newHtml
  }

  // ============ CLOZE NAVIGATION ============

  /**
   * Get text position info for a cloze
   */
  function getClozeTextPosition(elem, cloze) {
    const html = elem.innerHTML
    const htmlBefore = html.substring(0, cloze.index)
    const temp = document.createElement('div')
    temp.innerHTML = htmlBefore
    const textStart = temp.textContent.length

    // Get text length of the cloze content
    const clozeTemp = document.createElement('div')
    clozeTemp.innerHTML = cloze.match
    const clozeTextLen = clozeTemp.textContent.length
    const textEnd = textStart + clozeTextLen

    return { textStart, textEnd }
  }

  /**
   * Jump to the next cloze in field (cursor at end of cloze content)
   */
  function jumpToNextCloze(event, elem) {
    const cursorPos = getCursorTextOffset(elem)
    if (cursorPos < 0) return

    const allClozes = getAllClozes(elem)
    if (allClozes.length === 0) return

    // Find the next cloze after cursor position
    for (const cloze of allClozes) {
      const pos = getClozeTextPosition(elem, cloze)

      if (pos.textStart > cursorPos) {
        // Place cursor at end of cloze content
        placeCursorAtOffset(elem, pos.textEnd)
        return
      }
    }

    // Wrap around to first cloze
    const firstCloze = allClozes[0]
    const pos = getClozeTextPosition(elem, firstCloze)
    placeCursorAtOffset(elem, pos.textEnd)
  }

  /**
   * Jump to the previous cloze in field (cursor at end of cloze content)
   */
  function jumpToPrevCloze(event, elem) {
    const cursorPos = getCursorTextOffset(elem)
    if (cursorPos < 0) return

    const allClozes = getAllClozes(elem)
    if (allClozes.length === 0) return

    // Calculate text positions for all clozes
    const clozePositions = allClozes.map(cloze => {
      const pos = getClozeTextPosition(elem, cloze)
      return { cloze, ...pos }
    })

    // Find the previous cloze before cursor position
    for (let i = clozePositions.length - 1; i >= 0; i--) {
      if (clozePositions[i].textStart < cursorPos) {
        placeCursorAtOffset(elem, clozePositions[i].textEnd)
        return
      }
    }

    // Wrap around to last cloze
    const lastPos = clozePositions[clozePositions.length - 1]
    placeCursorAtOffset(elem, lastPos.textEnd)
  }

  /**
   * Jump to beginning of field
   */
  function jumpToBeginning(event, elem) {
    placeCursorAtOffset(elem, 0)
  }

  /**
   * Jump to end of field
   */
  function jumpToEnd(event, elem) {
    const len = elem.textContent ? elem.textContent.length : 0
    placeCursorAtOffset(elem, len)
  }

  // ============ VISUAL FEATURES ============

  // Color palette for cloze numbers
  const CLOZE_COLORS = {
    1: '#4fc3f7', // blue
    2: '#81c784', // green
    3: '#e57373', // red
    4: '#ffb74d', // orange
    5: '#ba68c8', // purple
    6: '#4dd0e1', // cyan
    7: '#fff176', // yellow
    8: '#f06292', // pink
    9: '#a1887f'  // brown
  }

  function getClozeColor(num) {
    return CLOZE_COLORS[num] || '#90a4ae' // default gray
  }

  // Overlay state
  let clozeOverlay = null
  let clozeOverlayEnabled = false // Will be set from config in setupClozeTools
  let clozeOverlayFieldId = null

  /**
   * Create or update the cloze info overlay
   */
  function showClozeOverlay(elem) {
    if (!clozeOverlayEnabled) return

    const fieldId = elem.getAttribute('data-EFDRCfield')
    clozeOverlayFieldId = fieldId

    if (!clozeOverlay) {
      clozeOverlay = document.createElement('div')
      clozeOverlay.id = 'efdrc-cloze-overlay'
      clozeOverlay.style.cssText = `
        position: fixed;
        bottom: 10px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(30, 30, 30, 0.9);
        color: #fff;
        padding: 5px 10px;
        border-radius: 16px;
        font-size: 12px;
        z-index: 99998;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        display: flex;
        align-items: center;
        gap: 6px;
      `
      document.body.appendChild(clozeOverlay)
    }

    updateClozeOverlay(elem)
  }

  function hideClozeOverlay() {
    if (clozeOverlay) {
      clozeOverlay.remove()
      clozeOverlay = null
    }
    clozeOverlayFieldId = null
  }

  function updateClozeOverlay(elem) {
    if (!clozeOverlay || !clozeOverlayEnabled) return

    const allClozes = getAllClozes(elem)
    const clozeAtCursor = getClozeAtCursor(elem)

    // Count clozes by number
    const counts = {}
    let hasEmpty = false
    let hasLong = false
    const maxLength = EFDRC.CONF?.cloze_tools?.max_cloze_length || 50

    for (const cloze of allClozes) {
      counts[cloze.number] = (counts[cloze.number] || 0) + 1

      const temp = document.createElement('div')
      temp.innerHTML = cloze.content
      const plainContent = (temp.textContent || '').trim()
      if (!plainContent) hasEmpty = true
      if (plainContent.length > maxLength) hasLong = true
    }

    // Build compact display - just colored badges
    let html = ''
    const sortedNums = Object.keys(counts).map(n => parseInt(n)).sort((a, b) => a - b)

    for (const num of sortedNums) {
      const color = getClozeColor(num)
      const isActive = clozeAtCursor && clozeAtCursor.number === num
      const style = isActive
        ? `background: ${color}; color: #000; font-weight: 700;`
        : `background: rgba(255,255,255,0.1); color: ${color}; font-weight: 600;`
      html += `<span style="${style} padding: 2px 8px; border-radius: 10px; font-size: 12px;">c${num}</span>`
    }

    // Only show warnings if they exist
    if (hasEmpty) {
      html += `<span style="color: #e57373; font-size: 11px;">⚠ Empty</span>`
    }
    if (hasLong) {
      html += `<span style="color: #ffb74d; font-size: 11px;">⚠ Long</span>`
    }

    // If no clozes at all
    if (sortedNums.length === 0) {
      html = '<span style="color: #666; font-size: 12px;">No clozes</span>'
    }

    clozeOverlay.innerHTML = html
  }

  /**
   * Toggle cloze overlay visibility
   */
  function toggleClozeOverlay(event, elem) {
    clozeOverlayEnabled = !clozeOverlayEnabled

    // Find active field if not provided
    if (!elem || !elem.hasAttribute || !elem.hasAttribute('data-EFDRCfield')) {
      elem = document.querySelector('[data-EFDRCfield][contenteditable="true"]:focus')
      if (!elem) {
        elem = document.querySelector('[data-EFDRCfield]')
      }
    }

    if (clozeOverlayEnabled && elem) {
      showClozeOverlay(elem)
    } else {
      hideClozeOverlay()
    }
  }

  /**
   * Update overlay on cursor movement (called from selection change)
   */
  function onSelectionChange() {
    if (!clozeOverlayEnabled || !clozeOverlayFieldId) return

    const elem = document.querySelector(`[data-EFDRCfield="${clozeOverlayFieldId}"]`)
    if (elem && document.activeElement === elem) {
      updateClozeOverlay(elem)
    }
  }

  // Listen for selection changes to update active cloze indicator
  document.addEventListener('selectionchange', onSelectionChange)



  /**
   * Setup visual features when field gains focus
   */
  function setupVisualFeatures(elem) {
    const autoShow = EFDRC.CONF?.cloze_tools?.auto_show_overlay
    if (autoShow || clozeOverlayEnabled) {
      clozeOverlayEnabled = true
      showClozeOverlay(elem)
    }
  }

  /**
   * Cleanup visual features when field loses focus
   */
  function cleanupVisualFeatures(elem) {
    hideClozeOverlay()
  }

  // ============ ADVANCED EDITING ============

  /**
   * Copy the inner content of cloze at cursor to clipboard
   * {{c1::Apple::hint}} → copies "Apple"
   */
  function copyClozeContent(event, elem) {
    const cloze = getClozeAtCursor(elem)
    if (!cloze) return

    // Get plain text content
    const temp = document.createElement('div')
    temp.innerHTML = cloze.content
    const plainContent = temp.textContent || ''

    // Use fallback method that works in Anki's webview
    const textarea = document.createElement('textarea')
    textarea.value = plainContent
    textarea.style.cssText = 'position:fixed;left:-9999px;top:-9999px;'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()

    try {
      document.execCommand('copy')
    } catch (err) {
      console.error('Copy failed:', err)
    }

    document.body.removeChild(textarea)
    elem.focus()
  }

  function showToast(message) {
    const existing = document.getElementById('efdrc-toast')
    if (existing) existing.remove()

    const toast = document.createElement('div')
    toast.id = 'efdrc-toast'
    toast.textContent = message
    toast.style.cssText = `
      position: fixed;
      bottom: 60px;
      left: 50%;
      transform: translateX(-50%);
      background: #333;
      color: #fff;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      z-index: 99999;
      opacity: 0;
      transition: opacity 0.2s;
    `
    document.body.appendChild(toast)

    requestAnimationFrame(() => {
      toast.style.opacity = '1'
      setTimeout(() => {
        toast.style.opacity = '0'
        setTimeout(() => toast.remove(), 200)
      }, 1500)
    })
  }

  /**
   * Preview how the card will look during review
   */
  let previewPopup = null

  function showCardPreview(event, elem) {
    hideCardPreview()

    const html = elem.innerHTML
    const allClozes = getAllClozes(elem)

    if (allClozes.length === 0) return

    // Find unique cloze numbers
    const clozeNums = [...new Set(allClozes.map(c => c.number))].sort((a, b) => a - b)

    previewPopup = document.createElement('div')
    previewPopup.id = 'efdrc-preview-popup'
    previewPopup.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #2a2a2a;
      color: #e0e0e0;
      padding: 20px 24px;
      border-radius: 10px;
      font-size: 14px;
      z-index: 99999;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      max-width: 80%;
      max-height: 80%;
      overflow: auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `

    let previewHtml = `
      <div style="font-size: 13px; font-weight: 500; margin-bottom: 16px; color: #fff;">
        Card Preview
      </div>
    `

    // Generate preview for each cloze number
    for (const num of clozeNums) {
      const color = getClozeColor(num)
      const previewText = html.replace(/\{\{c(\d+)::(.*?)(?:::(.*?))?\}\}/g, (match, cNum, content, hint) => {
        const clozeNum = parseInt(cNum, 10)
        const temp = document.createElement('div')
        temp.innerHTML = content
        const plainContent = temp.textContent || ''

        if (clozeNum === num) {
          const displayHint = hint || '...'
          return `<span style="color: ${color}; font-weight: 500;">[${displayHint}]</span>`
        } else {
          return plainContent
        }
      })

      previewHtml += `
        <div style="margin-bottom: 12px; padding: 12px; background: #3a3a3a; border-radius: 6px;">
          <div style="color: ${color}; font-size: 11px; margin-bottom: 6px; font-weight: 600;">Card ${num}</div>
          <div style="line-height: 1.5;">${previewText}</div>
        </div>
      `
    }

    previewPopup.innerHTML = previewHtml

    document.body.appendChild(previewPopup)

    // Close on Escape or Enter - use capture and prevent propagation
    const closeHandler = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        hideCardPreview()
        document.removeEventListener('keydown', closeHandler, true)
      }
    }
    document.addEventListener('keydown', closeHandler, true)

    // Close on click outside
    setTimeout(() => {
      document.addEventListener('click', function clickOutside(e) {
        if (previewPopup && !previewPopup.contains(e.target)) {
          hideCardPreview()
          document.removeEventListener('click', clickOutside)
        }
      })
    }, 100)
  }

  function hideCardPreview() {
    if (previewPopup) {
      previewPopup.remove()
      previewPopup = null
    }
  }

  /**
   * Find and replace within clozes only
   */
  let findReplacePopup = null

  function showFindReplace(event, elem) {
    hideFindReplace()

    findReplacePopup = document.createElement('div')
    findReplacePopup.id = 'efdrc-find-replace-popup'
    findReplacePopup.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #2a2a2a;
      color: #e0e0e0;
      padding: 20px 24px;
      border-radius: 10px;
      font-size: 14px;
      z-index: 99999;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      min-width: 320px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `

    findReplacePopup.innerHTML = `
      <div style="font-size: 13px; font-weight: 500; margin-bottom: 16px; color: #fff;">
        Find & Replace in Clozes
      </div>
      <div style="margin-bottom: 14px;">
        <input type="text" id="efdrc-find-input" style="
          width: 100%;
          padding: 10px 12px;
          border: none;
          border-radius: 6px;
          background: #3a3a3a;
          color: #fff;
          font-size: 14px;
          box-sizing: border-box;
          outline: none;
        " placeholder="Find...">
      </div>
      <div style="margin-bottom: 16px;">
        <input type="text" id="efdrc-replace-input" style="
          width: 100%;
          padding: 10px 12px;
          border: none;
          border-radius: 6px;
          background: #3a3a3a;
          color: #fff;
          font-size: 14px;
          box-sizing: border-box;
          outline: none;
        " placeholder="Replace with...">
      </div>
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button id="efdrc-cancel-btn" style="
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          background: #444;
          color: #ccc;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
        ">Cancel</button>
        <button id="efdrc-replace-all-btn" style="
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          background: #4a9eff;
          color: #fff;
          font-weight: 500;
          cursor: pointer;
          font-size: 13px;
        ">Replace All</button>
      </div>
      <div id="efdrc-replace-result" style="margin-top: 12px; font-size: 12px; color: #888; text-align: center;"></div>
    `

    document.body.appendChild(findReplacePopup)

    const findInput = document.getElementById('efdrc-find-input')
    const replaceInput = document.getElementById('efdrc-replace-input')
    const replaceBtn = document.getElementById('efdrc-replace-all-btn')
    const cancelBtn = document.getElementById('efdrc-cancel-btn')
    const resultDiv = document.getElementById('efdrc-replace-result')

    findInput.focus()

    replaceBtn.addEventListener('click', () => {
      const findText = findInput.value
      const replaceText = replaceInput.value

      if (!findText) return

      const html = elem.innerHTML
      let count = 0

      // Replace only within cloze content
      const newHtml = html.replace(/(\{\{c\d+::)(.*?)((?:::.*?)?\}\})/g, (match, prefix, content, suffix) => {
        if (content.includes(findText)) {
          const newContent = content.split(findText).join(replaceText)
          count += (content.split(findText).length - 1)
          return prefix + newContent + suffix
        }
        return match
      })

      if (count > 0) {
        elem.innerHTML = newHtml
        resultDiv.textContent = `Replaced ${count} occurrence${count > 1 ? 's' : ''}`
        resultDiv.style.color = '#81c784'
      } else {
        resultDiv.textContent = 'No matches found in clozes'
        resultDiv.style.color = '#e57373'
      }
    })

    cancelBtn.addEventListener('click', hideFindReplace)

    // Close on Escape
    const closeHandler = (e) => {
      if (e.key === 'Escape') {
        hideFindReplace()
        document.removeEventListener('keydown', closeHandler)
        elem.focus()
      }
    }
    document.addEventListener('keydown', closeHandler)
  }

  function hideFindReplace() {
    if (findReplacePopup) {
      findReplacePopup.remove()
      findReplacePopup = null
    }
  }

  // ============ CARD NAVIGATION ============

  /**
   * Replay the question (show front of card) without undoing edits
   */
  function replayQuestion(event, elem) {
    // Just show the question directly - edits are saved on blur automatically
    pycmd('EFDRC!showQuestion')
  }

  // ============ HINT FUNCTIONS ============

  /**
   * Set or update hint for cloze at cursor
   * @param {HTMLElement} elem - The editable field element
   * @param {Object} cloze - The cloze object
   * @param {string} hint - The new hint text
   */
  function setClozeHint(elem, cloze, hint) {
    const newCloze = hint
      ? `{{c${cloze.number}::${cloze.content}::${hint}}}`
      : `{{c${cloze.number}::${cloze.content}}}`

    const html = elem.innerHTML
    const before = html.substring(0, cloze.htmlStart)
    const after = html.substring(cloze.htmlEnd)
    elem.innerHTML = before + newCloze + after

    placeCursorAtOffset(elem, cloze.textStart)
    return true
  }

  /**
   * Remove hint from cloze at cursor
   */
  function removeHint(event, elem) {
    const cloze = getClozeAtCursor(elem)
    if (!cloze) return

    if (cloze.hint) {
      setClozeHint(elem, cloze, null)
    }
  }

  /**
   * Add word count hint to cloze at cursor
   * e.g., "2 words" or "1 word"
   */
  function addWordCountHint(event, elem) {
    const cloze = getClozeAtCursor(elem)
    if (!cloze) return

    // Strip HTML tags to count words in plain text
    const temp = document.createElement('div')
    temp.innerHTML = cloze.content
    const plainText = temp.textContent || ''

    // Count words (split by whitespace, filter empty)
    const words = plainText.trim().split(/\s+/).filter(w => w.length > 0)
    const count = words.length
    const hint = count === 1 ? '1 word' : `${count} words`

    setClozeHint(elem, cloze, hint)
  }

  // State for hint preview
  let hintPreviewElem = null
  let hintPreviewClozeIndex = null
  let hintPreviewClozeNumber = null
  let hintPreviewFieldId = null
  let hintPreviewOriginalHtml = null

  /**
   * Strip HTML tags from content
   */
  function stripHtml(html) {
    const temp = document.createElement('div')
    temp.innerHTML = html
    return temp.textContent || ''
  }

  /**
   * Show floating hint preview centered on screen
   */
  function showHintPreview(elem, cloze, clozeIndex) {
    hideHintPreview()

    hintPreviewFieldId = elem.getAttribute('data-EFDRCfield')
    hintPreviewClozeIndex = clozeIndex
    hintPreviewOriginalHtml = elem.innerHTML
    hintPreviewClozeNumber = cloze.number

    hintPreviewElem = document.createElement('div')
    hintPreviewElem.id = 'efdrc-hint-preview-float'
    hintPreviewElem.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%);
        color: #fff;
        padding: 16px 24px;
        border-radius: 12px;
        font-size: 14px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        max-width: 600px;
        min-width: 300px;
        z-index: 99999;
        border: 1px solid rgba(255,255,255,0.1);
      ">
        <div style="color: #888; font-size: 11px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Card Preview (c${cloze.number}) - Esc to close</div>
        <div id="efdrc-hint-preview-content" style="
          font-size: 14px;
          line-height: 1.5;
          word-break: break-word;
        "></div>
      </div>
    `

    document.body.appendChild(hintPreviewElem)

    // Initial preview update
    updateFloatingHintPreview(elem)

    // Listen for typing to update preview
    elem.addEventListener('input', handleHintTyping)
    elem.addEventListener('keydown', handleHintKeydown)
  }

  function hideHintPreview() {
    if (hintPreviewElem) {
      // Remove listeners from field
      const elem = document.querySelector(`[data-EFDRCfield="${hintPreviewFieldId}"]`)
      if (elem) {
        elem.removeEventListener('input', handleHintTyping)
        elem.removeEventListener('keydown', handleHintKeydown)
      }

      hintPreviewElem.remove()
      hintPreviewElem = null
    }
    hintPreviewClozeIndex = null
    hintPreviewClozeNumber = null
    hintPreviewFieldId = null
    hintPreviewOriginalHtml = null
  }

  function handleHintTyping() {
    const elem = document.querySelector(`[data-EFDRCfield="${hintPreviewFieldId}"]`)
    if (elem) {
      updateFloatingHintPreview(elem)
    }
  }

  function handleHintKeydown(event) {
    if (event.key === 'Escape') {
      hideHintPreview()
    } else if (event.key === 'Enter') {
      event.preventDefault()
      // Get current field and find the cloze to position cursor after it
      const elem = document.querySelector(`[data-EFDRCfield="${hintPreviewFieldId}"]`)
      if (elem) {
        const allClozes = getAllClozes(elem)
        const cloze = allClozes[hintPreviewClozeIndex]
        if (cloze) {
          // Calculate text position after the cloze
          const html = elem.innerHTML
          const htmlBefore = html.substring(0, cloze.index)
          const temp = document.createElement('div')
          temp.innerHTML = htmlBefore
          const textBefore = temp.textContent.length

          // Get text length of the full cloze
          const clozeTemp = document.createElement('div')
          clozeTemp.innerHTML = cloze.match
          const clozeTextLen = clozeTemp.textContent.length

          // Position cursor right after the cloze
          placeCursorAtOffset(elem, textBefore + clozeTextLen)
        }
      }
      hideHintPreview()
    }
  }

  function updateFloatingHintPreview(elem) {
    const preview = document.getElementById('efdrc-hint-preview-content')
    if (!preview) return

    const html = elem.innerHTML

    // Get current cloze at the stored index
    const allClozes = getAllClozes(elem)
    const currentCloze = allClozes[hintPreviewClozeIndex]

    if (!currentCloze) {
      hideHintPreview()
      return
    }

    // Track which occurrence we're on
    let occurrenceCount = 0

    // Replace all clozes for preview - hide ALL clozes with same number (like real card)
    const regex = /\{\{c(\d+)::(.*?)(?:::(.*?))?\}\}/g
    const previewText = html.replace(regex, (match, num, content, hint) => {
      const clozeNum = parseInt(num, 10)
      const plainContent = stripHtml(content)
      const currentIndex = occurrenceCount
      occurrenceCount++

      if (clozeNum === hintPreviewClozeNumber) {
        // ALL clozes with this number should be hidden (like real card review)
        const displayHint = hint || '...'
        return `<span style="color: #4fc3f7; font-weight: 500;">[${displayHint}]</span>`
      } else {
        // Other numbered clozes - show content normally
        return plainContent
      }
    })

    preview.innerHTML = previewText
  }

  /**
   * Use selected text as hint for the cloze
   * Select "App" in {{c1::Apple}} → {{c1::Apple::App}}
   */
  function hintFromSelection(event, elem) {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) return // No selection

    const selectedText = selection.toString().trim()
    if (!selectedText) return

    const cloze = getClozeAtCursor(elem)
    if (!cloze) return

    // Set the selected text as the hint
    setClozeHint(elem, cloze, selectedText)
  }

  /**
   * Add hint to cloze - inserts :: and positions cursor, shows preview
   */
  function addHint(event, elem) {
    const cloze = getClozeAtCursor(elem)
    if (!cloze) return

    // Find cloze index
    const allClozes = getAllClozes(elem)
    const clozeIndex = allClozes.findIndex(c => c.index === cloze.index)

    const html = elem.innerHTML

    // Build new cloze with :: at end (or keep existing hint)
    const newCloze = cloze.hint
      ? `{{c${cloze.number}::${cloze.content}::${cloze.hint}}}`
      : `{{c${cloze.number}::${cloze.content}::}}`

    // Replace only this cloze
    const before = html.substring(0, cloze.htmlStart)
    const after = html.substring(cloze.htmlEnd)
    elem.innerHTML = before + newCloze + after

    // Position cursor right before the closing }}
    // The cursor should be after :: (where hint goes)
    const hintStartPos = cloze.textStart + `{{c${cloze.number}::`.length + stripHtml(cloze.content).length + '::'.length
    const hintEndPos = hintStartPos + (cloze.hint ? cloze.hint.length : 0)

    // Place cursor at hint position
    placeCursorAtOffset(elem, hintEndPos)

    // Show floating preview
    showHintPreview(elem, cloze, clozeIndex)
  }

  /**
   * Register cloze tool shortcuts from config
   */
  EFDRC.setupClozeTools = function () {
    // Initialize overlay state from config
    clozeOverlayEnabled = EFDRC.CONF?.cloze_tools?.auto_show_overlay || false

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

    // Hint shortcuts
    if (shortcuts.add_hint) {
      EFDRC.registerShortcut(shortcuts.add_hint, addHint)
    }

    if (shortcuts.remove_hint) {
      EFDRC.registerShortcut(shortcuts.remove_hint, removeHint)
    }

    if (shortcuts.word_count_hint) {
      EFDRC.registerShortcut(shortcuts.word_count_hint, addWordCountHint)
    }

    if (shortcuts.hint_from_selection) {
      EFDRC.registerShortcut(shortcuts.hint_from_selection, hintFromSelection)
    }

    // Card navigation - register both on field and globally
    if (shortcuts.replay_question) {
      EFDRC.registerShortcut(shortcuts.replay_question, replayQuestion)
      setupGlobalReplayShortcut(shortcuts.replay_question)
    }

    // Structure shortcuts
    if (shortcuts.split_cloze) {
      EFDRC.registerShortcut(shortcuts.split_cloze, splitCloze)
    }

    if (shortcuts.merge_clozes) {
      EFDRC.registerShortcut(shortcuts.merge_clozes, mergeClozes)
    }

    if (shortcuts.move_out_of_cloze) {
      EFDRC.registerShortcut(shortcuts.move_out_of_cloze, moveOutOfCloze)
    }

    if (shortcuts.image_to_cloze) {
      EFDRC.registerShortcut(shortcuts.image_to_cloze, imageToClose)
    }

    // Navigation shortcuts
    if (shortcuts.jump_next_cloze) {
      EFDRC.registerShortcut(shortcuts.jump_next_cloze, jumpToNextCloze)
    }

    if (shortcuts.jump_prev_cloze) {
      EFDRC.registerShortcut(shortcuts.jump_prev_cloze, jumpToPrevCloze)
    }

    if (shortcuts.jump_to_beginning) {
      EFDRC.registerShortcut(shortcuts.jump_to_beginning, jumpToBeginning)
    }

    if (shortcuts.jump_to_end) {
      EFDRC.registerShortcut(shortcuts.jump_to_end, jumpToEnd)
    }

    // Visual features
    if (shortcuts.toggle_overlay) {
      EFDRC.registerShortcut(shortcuts.toggle_overlay, toggleClozeOverlay)
    }

    // Advanced editing
    if (shortcuts.copy_cloze_content) {
      EFDRC.registerShortcut(shortcuts.copy_cloze_content, copyClozeContent)
    }

    if (shortcuts.preview_card) {
      EFDRC.registerShortcut(shortcuts.preview_card, showCardPreview)
    }

    if (shortcuts.find_replace) {
      EFDRC.registerShortcut(shortcuts.find_replace, showFindReplace)
    }
  }

  // Hook into field focus/blur for visual features
  const originalHandleFocus = EFDRC.handleFocus
  EFDRC.handleFocus = function(event, target) {
    originalHandleFocus(event, target)
    setupVisualFeatures(target)
  }

  const originalHandleBlur = EFDRC.handleBlur
  EFDRC.handleBlur = function(event, target) {
    cleanupVisualFeatures(target)
    originalHandleBlur(event, target)
  }

  /**
   * Parse shortcut string into scutInfo object (same format as EFDRC.shortcuts)
   */
  function parseShortcut(shortcut) {
    const specialCharCodes = {
      '-': 'minus', '=': 'equal', '[': 'bracketleft', ']': 'bracketright',
      ';': 'semicolon', "'": 'quote', '`': 'backquote', '\\': 'backslash',
      ',': 'comma', '.': 'period', '/': 'slash'
    }
    const shortcutKeys = shortcut.toLowerCase().split(/[+]/).map(key => key.trim())
    const scutInfo = {
      ctrl: shortcutKeys.includes('ctrl'),
      shift: shortcutKeys.includes('shift'),
      alt: shortcutKeys.includes('alt')
    }
    let mainKey = shortcutKeys[shortcutKeys.length - 1]
    if (mainKey.length === 1) {
      if (/\d/.test(mainKey)) {
        mainKey = 'digit' + mainKey
      } else if (/[a-zA-Z]/.test(mainKey)) {
        mainKey = 'key' + mainKey
      } else if (specialCharCodes[mainKey]) {
        mainKey = specialCharCodes[mainKey]
      }
    }
    scutInfo.key = mainKey
    return scutInfo
  }

  /**
   * Check if event matches shortcut info
   */
  function matchShortcut(event, scutInfo) {
    if (scutInfo.key !== event.code.toLowerCase()) return false
    if (scutInfo.ctrl !== (event.ctrlKey || event.metaKey)) return false
    if (scutInfo.shift !== event.shiftKey) return false
    if (scutInfo.alt !== event.altKey) return false
    return true
  }

  /**
   * Setup global keyboard listener for replay question
   */
  function setupGlobalReplayShortcut(shortcutStr) {
    const scutInfo = parseShortcut(shortcutStr)

    document.addEventListener('keydown', (event) => {
      if (matchShortcut(event, scutInfo)) {
        event.preventDefault()
        event.stopPropagation()
        replayQuestion(event, null)
      }
    }, true)
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
    startRenumberSequence,
    setClozeHint,
    addHint,
    removeHint,
    addWordCountHint,
    showHintPreview,
    hideHintPreview,
    replayQuestion,
    hintFromSelection,
    splitCloze,
    mergeClozes,
    moveOutOfCloze,
    imageToClose,
    jumpToNextCloze,
    jumpToPrevCloze,
    jumpToBeginning,
    jumpToEnd,
    toggleClozeOverlay,
    showClozeOverlay,
    hideClozeOverlay,
    getClozeColor,
    copyClozeContent,
    showCardPreview,
    hideCardPreview,
    showFindReplace,
    hideFindReplace
  }
})()
