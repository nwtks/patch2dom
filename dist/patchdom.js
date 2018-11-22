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
  var newKeys = [];
  vnodes.forEach(function (vn) {
    if (vn && vn.domkey) {
      newKeys.push(vn.domkey);
    }
  });

  var oldKeyedNodes = Object.create(null);
  for (var oNode = parent.firstChild; oNode; oNode = oNode.nextSibling) {
    var oKey = getKey(oNode);
    if (oKey) {
      if (newKeys.indexOf(oKey) >= 0) {
        oldKeyedNodes[oKey] = oNode;
      } else {
        parent.removeChild(oNode);
      }
    }
  }

  var oldNode = parent.firstChild;
  vnodes.forEach(function (vn) {
    var vntype = typeof vn;
    if (vntype === 'string' || vntype === 'number') {
      if (oldNode) {
        if (oldNode.nodeType === TEXT_NODE) {
          oldNode.nodeValue = vn;
          oldNode = oldNode.nextSibling;
        } else {
          parent.insertBefore(document.createTextNode(vn), oldNode);
        }
      } else {
        parent.appendChild(document.createTextNode(vn));
      }
    } else if (isObject(vn)) {
      var vnkey = vn.domkey;
      var oldKeyed = vnkey ? oldKeyedNodes[vnkey] : null;
      if (oldKeyed) {
        delete oldKeyedNodes[vnkey];
        if (oldKeyed === oldNode) {
          oldNode = oldNode.nextSibling;
        } else {
          parent.insertBefore(oldKeyed, oldNode);
        }
        patchAttrs(oldKeyed, vn.attrs);
        patchChildren(oldKeyed, vn.children);
      } else if (oldNode) {
        if (vnkey) {
          parent.insertBefore(createElement(vn), oldNode);
        } else {
          while (true) {
            if (!oldNode) {
              parent.appendChild(createElement(vn));
              break
            }
            if (containsValue(oldKeyedNodes, oldNode)) {
              oldNode = oldNode.nextSibling;
            } else {
              if (isSameTag(oldNode, vn)) {
                patchAttrs(oldNode, vn.attrs);
                patchChildren(oldNode, vn.children);
                oldNode = oldNode.nextSibling;
              } else {
                parent.insertBefore(createElement(vn), oldNode);
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

  for (var ok in oldKeyedNodes) {
    parent.removeChild(oldKeyedNodes[ok]);
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
  var oldAttrs = el.attributes;
  for (var i = oldAttrs.length - 1; i >= 0; i -= 1) {
    var a = oldAttrs[i];
    var n = a.name;
    if (!attrs.hasOwnProperty(n) || attrs[n] == null) {
      el.removeAttribute(n);
    }
  }

  Object.getOwnPropertyNames(attrs).forEach(function (k) {
    var v = attrs[k];
    var vt = typeof v;
    if (k in el) {
      el[k] = v;
      if (v === true) {
        el.setAttribute(k.toLowerCase(), '');
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
  for (var k in obj) {
    if (obj[k] === v) {
      return true
    }
  }
  return false
}

function isObject(v) {
  return v && Object.getPrototypeOf(v) === Object.prototype
}

module.exports = patch;
