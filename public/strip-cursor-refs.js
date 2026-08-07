(function () {
  var ATTR = "data-cursor-ref";
  function strip(root) {
    try {
      var nodes = (root || document).querySelectorAll("[" + ATTR + "]");
      for (var i = 0; i < nodes.length; i++) nodes[i].removeAttribute(ATTR);
    } catch (e) {}
  }
  strip(document);
  try {
    var obs = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === "attributes" && m.attributeName === ATTR && m.target) {
          m.target.removeAttribute(ATTR);
        } else if (m.type === "childList" && m.addedNodes) {
          for (var j = 0; j < m.addedNodes.length; j++) {
            var n = m.addedNodes[j];
            if (n && n.nodeType === 1) {
              if (n.hasAttribute && n.hasAttribute(ATTR)) n.removeAttribute(ATTR);
              strip(n);
            }
          }
        }
      }
    });
    obs.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [ATTR],
    });
  } catch (e) {}
})();
