'use strict';

var ELEMENT_NODE = 1;
var TEXT_NODE = 3;

var isArray = Array.isArray;

function patch(parent, vnode) {
  if (isArray(vnode)) {
    patchChildren(parent, vnode);
  } else if (vnode != null) {
    patchChildren(parent, [vnode]);
  } else {
    removeChildren(parent);
  }
}

function patchChildren(parent, vnodes) {
  if (parent.nodeName === 'TEXTAREA') {
    return
  }

  var keyedNodes = getKeyedNodes(parent, vnodes);

  var node = parent.firstChild;
  vnodes.forEach(function (vnode) {
    var vntype = typeof vnode;
    if (vntype === 'string' || vntype === 'number') {
      node = patchTextNode(parent, node, '' + vnode);
    } else if (isVnode(vnode)) {
      node = patchElementNode(parent, node, keyedNodes, vnode);
    }
  });

  removeKeyedNodes(parent, keyedNodes);
  removeOldNodes(parent, vnodes);
}

function patchTextNode(parent, node, txt) {
  if (node) {
    if (node.nodeType === TEXT_NODE) {
      if (node.nodeValue !== txt) {
        node.nodeValue = txt;
      }
      node = node.nextSibling;
    } else {
      insertBefore(parent, createTextNode(txt), node);
    }
  } else {
    appendChild(parent, createTextNode(txt));
  }
  return node
}

function patchElementNode(parent, node, keyedNodes, vnode) {
  var vnkey = vnode.attrs.domkey;
  var keyed = vnkey ? keyedNodes[vnkey] : null;
  if (keyed) {
    delete keyedNodes[vnkey];
    patchAttrs(keyed, vnode.attrs);
    patchChildren(keyed, vnode.children);
    if (keyed === node) {
      node = node.nextSibling;
    } else {
      insertBefore(parent, keyed, node);
    }
  } else if (node) {
    if (vnkey) {
      insertBefore(parent, createElement(vnode), node);
    } else {
      for (;;) {
        if (node) {
          if (containsValue(keyedNodes, node)) {
            node = node.nextSibling;
          } else {
            if (isSameTag(node, vnode)) {
              patchAttrs(node, vnode.attrs);
              patchChildren(node, vnode.children);
              node = node.nextSibling;
            } else {
              insertBefore(parent, createElement(vnode), node);
            }
            break
          }
        } else {
          appendChild(parent, createElement(vnode));
          break
        }
      }
    }
  } else {
    appendChild(parent, createElement(vnode));
  }
  return node
}

function createElement(vnode) {
  var el = document.createElement(vnode.name);
  patchAttrs(el, vnode.attrs);
  patchChildren(el, vnode.children);
  return el
}

function patchAttrs(el, attrs) {
  removeAttrs(el, attrs);
  Object.getOwnPropertyNames(attrs).forEach(function (k) { return updateAttr(el, k, attrs[k]); });
  updateFormProps(el, attrs);
}

function getKeyedNodes(parent, vnodes) {
  var vnodeKeys = [];
  vnodes.forEach(function (vn) {
    if (vn && vn.attrs && vn.attrs.domkey) {
      vnodeKeys.push(vn.attrs.domkey);
    }
  });

  var keyedNodes = Object.create(null);
  for (var nd = parent.firstChild; nd; nd = nd.nextSibling) {
    var ndKey = getKey(nd);
    if (ndKey) {
      if (vnodeKeys.indexOf(ndKey) >= 0) {
        keyedNodes[ndKey] = nd;
      } else {
        removeChild(parent, nd);
      }
    }
  }
  return keyedNodes
}

function removeKeyedNodes(parent, keyedNodes) {
  for (var k in keyedNodes) {
    removeChild(parent, keyedNodes[k]);
  }
}

function removeOldNodes(parent, vnodes) {
  for (
    var overCount = parent.childNodes.length - vnodes.length;
    overCount > 0;
    --overCount
  ) {
    removeChild(parent, parent.lastChild);
  }
}

function updateAttr(el, name, value) {
  var vtype = typeof value;
  if (name === 'style') {
    updateAttribute(el, name, value);
  } else if (name in el) {
    updateProp(el, name, value);
    updateBooleanAttribute(el, name.toLowerCase(), value);
  } else if (vtype === 'function' || (name[0] === 'o' && name[1] === 'n')) {
    updateProp(el, name, value);
  } else if (vtype === 'boolean') {
    updateBooleanAttribute(el, name, value);
  } else {
    updateAttribute(el, name, value);
  }
}

function updateFormProps(el, attrs) {
  var name = el.nodeName;
  var value = attrs.value == null ? '' : '' + attrs.value;
  var checked = !!attrs.checked;
  var selected = !!attrs.selected;
  if (name === 'INPUT') {
    updateProp(el, 'checked', checked);
    updateBooleanAttribute(el, 'checked', checked);
    updateProp(el, 'value', value);
    updateAttribute(el, 'value', attrs.value);
  } else if (name === 'TEXTAREA') {
    updateProp(el, 'value', value);
  } else if (name === 'OPTION') {
    updateProp(el, 'selected', selected);
    updateBooleanAttribute(el, 'selected', selected);
  }
}

function removeAttrs(el, attrs) {
  var elAttrs = el.attributes;
  for (var i = elAttrs.length - 1; i >= 0; --i) {
    var a = elAttrs[i];
    var n = a.name;
    if (!attrs.hasOwnProperty(n) || attrs[n] == null) {
      removeAttribute(el, n);
    }
  }
}

function updateAttribute(el, name, value) {
  if (value == null) {
    removeAttribute(el, name);
  } else if (value !== el.getAttribute(name)) {
    el.setAttribute(name, value);
  }
}

function updateBooleanAttribute(el, name, value) {
  if (value === true) {
    updateAttribute(el, name, '');
  } else if (value === false) {
    removeAttribute(el, name);
  }
}

function isVnode(vnode) {
  return vnode && vnode.name && vnode.attrs && vnode.children
}

function isSameTag(node, vnode) {
  return (
    node.nodeType === ELEMENT_NODE &&
    node.nodeName.toLowerCase() === vnode.name.toLowerCase()
  )
}

function getKey(node) {
  if (node.nodeType === ELEMENT_NODE) {
    return node.getAttribute('domkey')
  }
}

function removeChildren(parent) {
  for (
    var lastChild = parent.lastChild;
    lastChild;
    lastChild = parent.lastChild
  ) {
    removeChild(parent, lastChild);
  }
}

function appendChild(parent, node) {
  parent.appendChild(node);
}

function insertBefore(parent, node, position) {
  parent.insertBefore(node, position);
}

function removeChild(parent, node) {
  parent.removeChild(node);
}

function createTextNode(txt) {
  return document.createTextNode(txt)
}

function removeAttribute(el, name) {
  el.removeAttribute(name);
}

function containsValue(obj, v) {
  for (var k in obj) {
    if (obj[k] === v) {
      return true
    }
  }
  return false
}

function updateProp(obj, key, value) {
  if (value !== obj[key]) {
    obj[key] = value;
  }
}

module.exports = patch;
