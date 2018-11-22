const ELEMENT_NODE = 1
const TEXT_NODE = 3

const isArray = Array.isArray

function patch(parent, vnode) {
  if (isArray(vnode)) {
    patchChildren(parent, vnode)
  } else if (vnode != null) {
    patchChildren(parent, [vnode])
  } else {
    let lastChild = parent.lastChild
    while (lastChild) {
      parent.removeChild(lastChild)
    }
  }
}

function patchChildren(parent, vnodes) {
  const newKeys = []
  vnodes.forEach(vn => {
    if (vn && vn.domkey) {
      newKeys.push(vn.domkey)
    }
  })

  const oldKeyedNodes = Object.create(null)
  for (let oNode = parent.firstChild; oNode; oNode = oNode.nextSibling) {
    const oKey = getKey(oNode)
    if (oKey) {
      if (newKeys.indexOf(oKey) >= 0) {
        oldKeyedNodes[oKey] = oNode
      } else {
        parent.removeChild(oNode)
      }
    }
  }

  let oldNode = parent.firstChild
  vnodes.forEach(vn => {
    const vntype = typeof vn
    if (vntype === 'string' || vntype === 'number') {
      if (oldNode) {
        if (oldNode.nodeType === TEXT_NODE) {
          oldNode.nodeValue = vn
          oldNode = oldNode.nextSibling
        } else {
          parent.insertBefore(document.createTextNode(vn), oldNode)
        }
      } else {
        parent.appendChild(document.createTextNode(vn))
      }
    } else if (isObject(vn)) {
      const vnkey = vn.domkey
      const oldKeyed = vnkey ? oldKeyedNodes[vnkey] : null
      if (oldKeyed) {
        delete oldKeyedNodes[vnkey]
        if (oldKeyed === oldNode) {
          oldNode = oldNode.nextSibling
        } else {
          parent.insertBefore(oldKeyed, oldNode)
        }
        patchAttrs(oldKeyed, vn.attrs)
        patchChildren(oldKeyed, vn.children)
      } else if (oldNode) {
        if (vnkey) {
          parent.insertBefore(createElement(vn), oldNode)
        } else {
          while (true) {
            if (!oldNode) {
              parent.appendChild(createElement(vn))
              break
            }
            if (containsValue(oldKeyedNodes, oldNode)) {
              oldNode = oldNode.nextSibling
            } else {
              if (isSameTag(oldNode, vn)) {
                patchAttrs(oldNode, vn.attrs)
                patchChildren(oldNode, vn.children)
                oldNode = oldNode.nextSibling
              } else {
                parent.insertBefore(createElement(vn), oldNode)
              }
              break
            }
          }
        }
      } else {
        parent.appendChild(createElement(vn))
      }
    }
  })

  for (const ok in oldKeyedNodes) {
    parent.removeChild(oldKeyedNodes[ok])
  }

  let overCount = parent.childNodes.length - vnodes.length
  while (--overCount >= 0) {
    parent.removeChild(parent.lastChild)
  }
}

function createElement(vnode) {
  const el = document.createElement(vnode.name)
  patchAttrs(el, vnode.attrs)
  patchChildren(el, vnode.children)
  return el
}

function patchAttrs(el, attrs) {
  const oldAttrs = el.attributes
  for (let i = oldAttrs.length - 1; i >= 0; i -= 1) {
    const a = oldAttrs[i]
    const n = a.name
    if (!attrs.hasOwnProperty(n) || attrs[n] == null) {
      el.removeAttribute(n)
    }
  }

  Object.getOwnPropertyNames(attrs).forEach(k => {
    const v = attrs[k]
    const vt = typeof v
    if (k in el) {
      el[k] = v
      if (v === true) {
        el.setAttribute(k.toLowerCase(), '')
      }
    } else if (vt === 'function' || (k[0] === 'o' && k[1] === 'n')) {
      el[k] = v
    } else if (vt === 'boolean') {
      if (v === true) {
        el.setAttribute(k, '')
      } else {
        el.removeAttribute(k)
      }
    } else if (v == null) {
      el.removeAttribute(k)
    } else {
      el.setAttribute(k, v)
    }
  })
}

function isSameTag(n, v) {
  return (
    n.nodeType === ELEMENT_NODE &&
    n.nodeName.toLowerCase() === v.name.toLowerCase()
  )
}

function getKey(n) {
  if (n.nodeType === ELEMENT_NODE) {
    return n.getAttribute('domkey')
  }
}

function containsValue(obj, v) {
  for (const k in obj) {
    if (obj[k] === v) {
      return true
    }
  }
  return false
}

function isObject(v) {
  return v && Object.getPrototypeOf(v) === Object.prototype
}

export default patch
