const ELEMENT_NODE = 1
const TEXT_NODE = 3

const isArray = Array.isArray
const getOwnPropertyNames = Object.getOwnPropertyNames

const patch = (parent, vnode) => {
  if (isArray(vnode)) {
    patchChildren(parent, vnode)
  } else if (vnode != null) {
    patchChildren(parent, [vnode])
  } else {
    removeChildren(parent)
  }
}

const patchChildren = (parent, vnodes) => {
  if (parent.nodeName === 'TEXTAREA') {
    return
  }

  const keyedNodes = getKeyedNodes(parent, vnodes)

  let node = parent.firstChild
  vnodes.forEach(vnode => {
    const vntype = typeof vnode
    if (vntype === 'string' || vntype === 'number') {
      node = patchTextNode(parent, node, '' + vnode)
    } else if (isVnode(vnode)) {
      node = patchElementNode(parent, node, keyedNodes, vnode)
    }
  })

  removeKeyedNodes(parent, keyedNodes)
  removeOldNodes(parent, vnodes)
}

const patchTextNode = (parent, node, txt) => {
  if (node) {
    if (node.nodeType === TEXT_NODE) {
      if (node.nodeValue !== txt) {
        node.nodeValue = txt
      }
      node = node.nextSibling
    } else {
      insertBefore(parent, createTextNode(txt), node)
    }
  } else {
    appendChild(parent, createTextNode(txt))
  }
  return node
}

const patchElementNode = (parent, node, keyedNodes, vnode) => {
  const vnkey = vnode.attrs.domkey
  const keyed = vnkey ? keyedNodes[vnkey] : null
  if (keyed) {
    delete keyedNodes[vnkey]
    patchAttrs(keyed, vnode.attrs)
    patchChildren(keyed, vnode.children)
    if (keyed === node) {
      node = node.nextSibling
    } else {
      insertBefore(parent, keyed, node)
    }
  } else if (node) {
    if (vnkey) {
      insertBefore(parent, createElement(vnode), node)
    } else {
      for (;;) {
        if (node) {
          if (containsValue(keyedNodes, node)) {
            node = node.nextSibling
          } else {
            if (isSameTag(node, vnode)) {
              patchAttrs(node, vnode.attrs)
              patchChildren(node, vnode.children)
              node = node.nextSibling
            } else {
              insertBefore(parent, createElement(vnode), node)
            }
            break
          }
        } else {
          appendChild(parent, createElement(vnode))
          break
        }
      }
    }
  } else {
    appendChild(parent, createElement(vnode))
  }
  return node
}

const createElement = vnode => {
  const el = document.createElement(vnode.name)
  patchAttrs(el, vnode.attrs)
  patchChildren(el, vnode.children)
  return el
}

const patchAttrs = (el, attrs) => {
  removeAttrs(el, attrs)
  getOwnPropertyNames(attrs).forEach(k => updateAttr(el, k, attrs[k]))
  updateFormProps(el, attrs)
}

const getKeyedNodes = (parent, vnodes) => {
  const vnodeKeys = []
  vnodes
    .filter(vn => vn && vn.attrs && vn.attrs.domkey)
    .forEach(vn => {
      vnodeKeys.push(vn.attrs.domkey)
    })

  const keyedNodes = Object.create(null)
  for (let nd = parent.firstChild; nd; nd = nd.nextSibling) {
    const ndKey = getKey(nd)
    if (ndKey) {
      if (vnodeKeys.indexOf(ndKey) >= 0) {
        keyedNodes[ndKey] = nd
      } else {
        removeChild(parent, nd)
      }
    }
  }
  return keyedNodes
}

const removeKeyedNodes = (parent, keyedNodes) =>
  getOwnPropertyNames(keyedNodes).forEach(k =>
    removeChild(parent, keyedNodes[k])
  )

const removeOldNodes = (parent, vnodes) => {
  for (
    let overCount = parent.childNodes.length - vnodes.length;
    overCount > 0;
    overCount -= 1
  ) {
    removeChild(parent, parent.lastChild)
  }
}

const updateAttr = (el, name, value) => {
  const vtype = typeof value
  if (name === 'style') {
    updateAttribute(el, name, value)
  } else if (name in el) {
    updateProp(el, name, value)
    if (vtype === 'boolean') {
      updateBooleanAttribute(el, name, value)
    }
  } else if (vtype === 'function' || (name[0] === 'o' && name[1] === 'n')) {
    updateProp(el, name, value)
  } else if (vtype === 'boolean') {
    updateBooleanAttribute(el, name, value)
  } else {
    updateAttribute(el, name, value)
  }
}

const updateFormProps = (el, attrs) => {
  const name = el.nodeName
  const value = attrs.value == null ? '' : '' + attrs.value
  const checked = !!attrs.checked
  const selected = !!attrs.selected
  if (name === 'INPUT') {
    updateProp(el, 'checked', checked)
    updateBooleanAttribute(el, 'checked', checked)
    updateProp(el, 'value', value)
    updateAttribute(el, 'value', attrs.value)
  } else if (name === 'TEXTAREA') {
    updateProp(el, 'value', value)
  } else if (name === 'OPTION') {
    updateProp(el, 'selected', selected)
    updateBooleanAttribute(el, 'selected', selected)
  }
}

const removeAttrs = (el, attrs) => {
  const elAttrs = el.attributes
  for (let i = elAttrs.length - 1; i >= 0; i -= 1) {
    const a = elAttrs[i]
    const n = a.name
    if (!attrs.hasOwnProperty(n) || attrs[n] == null) {
      removeAttribute(el, n)
    }
  }
}

const updateAttribute = (el, name, value) => {
  if (value == null) {
    removeAttribute(el, name)
  } else if (value !== el.getAttribute(name)) {
    el.setAttribute(name, value)
  }
}

const updateBooleanAttribute = (el, name, value) => {
  if (value === true && !el.hasAttribute(name)) {
    el.setAttribute(name, '')
  } else if (value === false) {
    removeAttribute(el, name)
  }
}

const removeAttribute = (el, name) => {
  if (el.hasAttribute(name)) {
    el.removeAttribute(name)
  }
}

const isVnode = vnode => vnode && vnode.name && vnode.attrs && vnode.children

const isSameTag = (node, vnode) =>
  node.nodeType === ELEMENT_NODE &&
  node.nodeName.toLowerCase() === vnode.name.toLowerCase()

const getKey = node =>
  node.nodeType === ELEMENT_NODE ? node.getAttribute('domkey') : null

const removeChildren = parent => {
  for (
    let lastChild = parent.lastChild;
    lastChild;
    lastChild = parent.lastChild
  ) {
    removeChild(parent, lastChild)
  }
}

const appendChild = (parent, node) => parent.appendChild(node)

const insertBefore = (parent, node, position) =>
  parent.insertBefore(node, position)

const removeChild = (parent, node) => parent.removeChild(node)

const createTextNode = txt => document.createTextNode(txt)

const containsValue = (obj, v) =>
  obj != null &&
  getOwnPropertyNames(obj).reduce((a, k) => (obj[k] === v ? true : a), false)

const updateProp = (obj, key, value) => {
  if (value !== obj[key]) {
    obj[key] = value
  }
}

export default patch
