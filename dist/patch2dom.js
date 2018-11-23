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
    var lastChild = parent.lastChild;
    while (lastChild) {
      parent.removeChild(lastChild);
    }
  }
}

function patchChildren(parent, vnodes) {
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
        parent.removeChild(nd);
      }
    }
  }

  var node = parent.firstChild;
  vnodes.forEach(function (vn) {
    var vntype = typeof vn;
    if (vntype === 'string' || vntype === 'number') {
      if (node) {
        if (node.nodeType === TEXT_NODE) {
          var txt = '' + vn;
          if (node.nodeValue !== txt) {
            node.nodeValue = txt;
          }
          node = node.nextSibling;
        } else {
          parent.insertBefore(document.createTextNode(vn), node);
        }
      } else {
        parent.appendChild(document.createTextNode(vn));
      }
    } else if (isVNode(vn)) {
      var vnkey = vn.attrs.domkey;
      var keyed = vnkey ? keyedNodes[vnkey] : null;
      if (keyed) {
        delete keyedNodes[vnkey];
        if (keyed === node) {
          node = node.nextSibling;
        } else {
          parent.insertBefore(keyed, node);
        }
        patchAttrs(keyed, vn.attrs);
        patchChildren(keyed, vn.children);
      } else if (node) {
        if (vnkey) {
          parent.insertBefore(createElement(vn), node);
        } else {
          while (true) {
            if (!node) {
              parent.appendChild(createElement(vn));
              break
            }
            if (containsValue(keyedNodes, node)) {
              node = node.nextSibling;
            } else {
              if (isSameTag(node, vn)) {
                patchAttrs(node, vn.attrs);
                patchChildren(node, vn.children);
                node = node.nextSibling;
              } else {
                parent.insertBefore(createElement(vn), node);
              }
              break
            }
          }
        }
      } else {
        parent.appendChild(createElement(vn));
      }
    }
  });

  for (var k in keyedNodes) {
    parent.removeChild(keyedNodes[k]);
  }

  var overCount = parent.childNodes.length - vnodes.length;
  while (--overCount >= 0) {
    parent.removeChild(parent.lastChild);
  }
}

function createElement(vnode) {
  var el = document.createElement(vnode.name);
  patchAttrs(el, vnode.attrs);
  patchChildren(el, vnode.children);
  return el
}

function patchAttrs(el, attrs) {
  var elAttrs = el.attributes;
  for (var i = elAttrs.length - 1; i >= 0; i -= 1) {
    var a = elAttrs[i];
    var n = a.name;
    if (!attrs.hasOwnProperty(n) || attrs[n] == null) {
      el.removeAttribute(n);
    }
  }

  Object.getOwnPropertyNames(attrs).forEach(function (k) {
    var v = attrs[k];
    var vt = typeof v;
    if (k === 'style') {
      if (v == null) {
        el.removeAttribute(k);
      } else {
        el.setAttribute(k, v);
      }
    } else if (k in el) {
      el[k] = v;
      if (v === true) {
        el.setAttribute(k.toLowerCase(), '');
      } else if (v === false) {
        el.removeAttribute(k.toLowerCase());
      }
      if (k === 'value') {
        if (v == null) {
          el.removeAttribute(k);
        } else {
          el.setAttribute(k, v);
        }
      }
    } else if (vt === 'function' || (k[0] === 'o' && k[1] === 'n')) {
      el[k] = v;
    } else if (vt === 'boolean') {
      if (v === true) {
        el.setAttribute(k, '');
      } else {
        el.removeAttribute(k);
      }
    } else if (v == null) {
      el.removeAttribute(k);
    } else {
      el.setAttribute(k, v);
    }
  });
}

function isVNode(vn) {
  return vn && vn.name && vn.attrs && vn.children
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
  for (var k in obj) {
    if (obj[k] === v) {
      return true
    }
  }
  return false
}

module.exports = patch;
