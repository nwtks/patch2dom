'use strict';

var ELEMENT_NODE = 1;
var TEXT_NODE = 3;

var isArray = Array.isArray;
var getOwnPropertyNames = Object.getOwnPropertyNames;

var patch = function (parent, vnode) {
  if (isArray(vnode)) {
    patchChildren(parent, vnode);
  } else if (vnode != null) {
    patchChildren(parent, [vnode]);
  } else {
    removeChildren(parent);
  }
};

var patchChildren = function (parent, vnodes) {
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
};

var patchTextNode = function (parent, node, txt) {
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
};

var patchElementNode = function (parent, node, keyedNodes, vnode) {
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
};

var createElement = function (vnode) {
  var el = document.createElement(vnode.name);
  patchAttrs(el, vnode.attrs);
  patchChildren(el, vnode.children);
  return el
};

var patchAttrs = function (el, attrs) {
  removeAttrs(el, attrs);
  getOwnPropertyNames(attrs).forEach(function (k) { return updateAttr(el, k, attrs[k]); });
  updateFormProps(el, attrs);
};

var getKeyedNodes = function (parent, vnodes) {
  var vnodeKeys = [];
  vnodes
    .filter(function (vn) { return vn && vn.attrs && vn.attrs.domkey; })
    .forEach(function (vn) {
      vnodeKeys.push(vn.attrs.domkey);
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
};

var removeKeyedNodes = function (parent, keyedNodes) { return getOwnPropertyNames(keyedNodes).forEach(function (k) { return removeChild(parent, keyedNodes[k]); }
  ); };

var removeOldNodes = function (parent, vnodes) {
  for (
    var overCount = parent.childNodes.length - vnodes.length;
    overCount > 0;
    overCount -= 1
  ) {
    removeChild(parent, parent.lastChild);
  }
};

var updateAttr = function (el, name, value) {
  var vtype = typeof value;
  if (name === 'style') {
    updateAttribute(el, name, value);
  } else if (name in el) {
    updateProp(el, name, value);
    if (vtype === 'boolean') {
      updateBooleanAttribute(el, name, value);
    }
  } else if (vtype === 'function' || (name[0] === 'o' && name[1] === 'n')) {
    updateProp(el, name, value);
  } else if (vtype === 'boolean') {
    updateBooleanAttribute(el, name, value);
  } else {
    updateAttribute(el, name, value);
  }
};

var updateFormProps = function (el, attrs) {
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
};

var removeAttrs = function (el, attrs) {
  var elAttrs = el.attributes;
  for (var i = elAttrs.length - 1; i >= 0; i -= 1) {
    var a = elAttrs[i];
    var n = a.name;
    if (!attrs.hasOwnProperty(n) || attrs[n] == null) {
      removeAttribute(el, n);
    }
  }
};

var updateAttribute = function (el, name, value) {
  if (value == null) {
    removeAttribute(el, name);
  } else if (value !== el.getAttribute(name)) {
    el.setAttribute(name, value);
  }
};

var updateBooleanAttribute = function (el, name, value) {
  if (value === true && !el.hasAttribute(name)) {
    el.setAttribute(name, '');
  } else if (value === false) {
    removeAttribute(el, name);
  }
};

var removeAttribute = function (el, name) {
  if (el.hasAttribute(name)) {
    el.removeAttribute(name);
  }
};

var isVnode = function (vnode) { return vnode && vnode.name && vnode.attrs && vnode.children; };

var isSameTag = function (node, vnode) { return node.nodeType === ELEMENT_NODE &&
  node.nodeName.toLowerCase() === vnode.name.toLowerCase(); };

var getKey = function (node) { return node.nodeType === ELEMENT_NODE ? node.getAttribute('domkey') : null; };

var removeChildren = function (parent) {
  for (
    var lastChild = parent.lastChild;
    lastChild;
    lastChild = parent.lastChild
  ) {
    removeChild(parent, lastChild);
  }
};

var appendChild = function (parent, node) { return parent.appendChild(node); };

var insertBefore = function (parent, node, position) { return parent.insertBefore(node, position); };

var removeChild = function (parent, node) { return parent.removeChild(node); };

var createTextNode = function (txt) { return document.createTextNode(txt); };

var containsValue = function (obj, v) { return obj != null &&
  getOwnPropertyNames(obj).reduce(function (a, k) { return (obj[k] === v ? true : a); }, false); };

var updateProp = function (obj, key, value) {
  if (value !== obj[key]) {
    obj[key] = value;
  }
};

module.exports = patch;
