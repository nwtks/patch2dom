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
  const vnodeKeys = []
  vnodes.forEach(vn => {
    if (vn && vn.attrs && vn.attrs.domkey) {
      vnodeKeys.push(vn.attrs.domkey)
    }
  })

  const keyedNodes = Object.create(null)
  for (let nd = parent.firstChild; nd; nd = nd.nextSibling) {
    const ndKey = getKey(nd)
    if (ndKey) {
      if (vnodeKeys.indexOf(ndKey) >= 0) {
        keyedNodes[ndKey] = nd
      } else {
        parent.removeChild(nd)
      }
    }
  }

  let node = parent.firstChild
  vnodes.forEach(vn => {
    const vntype = typeof vn
    if (vntype === 'string' || vntype === 'number') {
      if (node) {
        if (node.nodeType === TEXT_NODE) {
          node.nodeValue = vn
          node = node.nextSibling
        } else {
          parent.insertBefore(document.createTextNode(vn), node)
        }
      } else {
        parent.appendChild(document.createTextNode(vn))
      }
    } else if (isObject(vn)) {
      const vnkey = vn.attrs.domkey
      const keyed = vnkey ? keyedNodes[vnkey] : null
      if (keyed) {
        delete keyedNodes[vnkey]
        if (keyed === node) {
          node = node.nextSibling
        } else {
          parent.insertBefore(keyed, node)
        }
        patchAttrs(keyed, vn.attrs)
        patchChildren(keyed, vn.children)
      } else if (node) {
        if (vnkey) {
          parent.insertBefore(createElement(vn), node)
        } else {
          while (true) {
            if (!node) {
              parent.appendChild(createElement(vn))
              break
            }
            if (containsValue(keyedNodes, node)) {
              node = node.nextSibling
            } else {
              if (isSameTag(node, vn)) {
                patchAttrs(node, vn.attrs)
                patchChildren(node, vn.children)
                node = node.nextSibling
              } else {
                parent.insertBefore(createElement(vn), node)
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

  for (const k in keyedNodes) {
    parent.removeChild(keyedNodes[k])
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
  const elAttrs = el.attributes
  for (let i = elAttrs.length - 1; i >= 0; i -= 1) {
    const a = elAttrs[i]
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
      } else if (v === false) {
        el.removeAttribute(k.toLowerCase())
      }
      if (k === 'value') {
        if (v == null) {
          el.removeAttribute(k)
        } else {
          el.setAttribute(k, v)
        }
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

function isSameTag(n, vn) {
  return (
    n.nodeType === ELEMENT_NODE &&
    n.nodeName.toLowerCase() === vn.name.toLowerCase()
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
