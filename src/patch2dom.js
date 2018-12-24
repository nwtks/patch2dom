const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

const { isArray } = Array;
const { getOwnPropertyNames } = Object;
const { slice } = Array.prototype;

const patch = (parent, vnode) => {
  if (isArray(vnode)) {
    patchChildren(parent, vnode);
  } else if (vnode != null) {
    patchChildren(parent, [vnode]);
  } else {
    removeChildren(parent);
  }
};

const patchChildren = (parent, vnodes) => {
  if (parent.nodeName === 'TEXTAREA') {
    return;
  }

  const keyedNodes = getKeyedNodes(parent, vnodes);

  let node = parent.firstChild;
  vnodes.forEach((vnode) => {
    const vntype = typeof vnode;
    if (vntype === 'string' || vntype === 'number') {
      node = patchTextNode(parent, node, '' + vnode);
    } else if (isVnode(vnode)) {
      node = patchElementNode(parent, node, keyedNodes, vnode);
    }
  });

  removeKeyedNodes(parent, keyedNodes);
  removeOldNodes(parent, vnodes);
};

const patchTextNode = (parent, node, txt) => {
  if (node) {
    if (node.nodeType === TEXT_NODE) {
      node.nodeValue !== txt && (node.nodeValue = txt);
      node = node.nextSibling;
    } else {
      insertBefore(parent, createTextNode(txt), node);
    }
  } else {
    appendChild(parent, createTextNode(txt));
  }
  return node;
};

const patchElementNode = (parent, node, keyedNodes, vnode) => {
  const vnkey = vnode.attrs.domkey;
  const keyed = vnkey ? keyedNodes[vnkey] : null;
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
            break;
          }
        } else {
          appendChild(parent, createElement(vnode));
          break;
        }
      }
    }
  } else {
    appendChild(parent, createElement(vnode));
  }
  return node;
};

const getKeyedNodes = (parent, vnodes) => {
  const vnodeKeys = [];
  vnodes
    .filter((vnode) => vnode && vnode.attrs && vnode.attrs.domkey)
    .forEach((vnode) => {
      vnodeKeys.push(vnode.attrs.domkey);
    });

  const keyedNodes = Object.create(null);
  walkChildren(parent, (node) => {
    const nodeKey = getKey(node);
    if (nodeKey) {
      if (vnodeKeys.indexOf(nodeKey) >= 0) {
        keyedNodes[nodeKey] = node;
      } else {
        removeChild(parent, node);
      }
    }
  });
  return keyedNodes;
};

const removeKeyedNodes = (parent, keyedNodes) => {
  getOwnPropertyNames(keyedNodes).forEach((k) => {
    removeChild(parent, keyedNodes[k]);
  });
};

const removeOldNodes = (parent, vnodes) => {
  times(parent.childNodes.length - vnodes.length, () => {
    removeChild(parent, parent.lastChild);
  });
};

const createElement = (vnode) => {
  const el = document.createElement(vnode.name);
  patchAttrs(el, vnode.attrs);
  patchChildren(el, vnode.children);
  return el;
};

const patchAttrs = (el, attrs) => {
  removeAttrs(el, attrs);
  getOwnPropertyNames(attrs).forEach((k) => {
    updateAttr(el, k, attrs[k]);
  });
  updateFormProps(el, attrs);
};

const removeAttrs = (el, attrs) => {
  slice.call(el.attributes).forEach((a) => {
    const n = a.name;
    if (!attrs.hasOwnProperty(n) || attrs[n] == null) {
      removeAttribute(el, n);
    }
  });
};

const updateAttr = (el, name, value) => {
  const vtype = typeof value;
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

const updateFormProps = (el, attrs) => {
  const name = el.nodeName;
  const value = attrs.value == null ? '' : '' + attrs.value;
  const checked = !!attrs.checked;
  const selected = !!attrs.selected;
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

const updateAttribute = (el, name, value) => {
  if (value == null) {
    removeAttribute(el, name);
  } else if (value !== el.getAttribute(name)) {
    el.setAttribute(name, value);
  }
};

const updateBooleanAttribute = (el, name, value) => {
  if (value === true && !el.hasAttribute(name)) {
    el.setAttribute(name, '');
  } else if (value === false) {
    removeAttribute(el, name);
  }
};

const removeAttribute = (el, name) => {
  el.hasAttribute(name) && el.removeAttribute(name);
};

const isVnode = (vnode) => vnode && vnode.name && vnode.attrs && vnode.children;

const isSameTag = (node, vnode) =>
  node.nodeType === ELEMENT_NODE &&
  node.nodeName.toLowerCase() === vnode.name.toLowerCase();

const getKey = (node) =>
  node.nodeType === ELEMENT_NODE ? node.getAttribute('domkey') : null;

const removeChildren = (parent) => {
  for (
    let lastChild = parent.lastChild;
    lastChild;
    lastChild = parent.lastChild
  ) {
    removeChild(parent, lastChild);
  }
};

const appendChild = (parent, node) => {
  parent.appendChild(node);
};

const insertBefore = (parent, node, position) => {
  parent.insertBefore(node, position);
};

const removeChild = (parent, node) => {
  parent.removeChild(node);
};

const createTextNode = (txt) => document.createTextNode(txt);

const containsValue = (obj, value) =>
  obj != null && getOwnPropertyNames(obj).some((k) => obj[k] === value);

const updateProp = (obj, key, value) => {
  value !== obj[key] && (obj[key] = value);
};

const walkChildren = (node, callback) => {
  for (let c = node.firstChild; c; c = c.nextSibling) {
    callback(c);
  }
};

const times = (n, callback) => {
  for (let i = 0; i < n; i += 1) {
    callback(i);
  }
};

export default patch;
