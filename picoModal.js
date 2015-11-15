/*!
 * Original idea: https://github.com/Nycto/PicoModal
 * Accessibility inspiration: https://github.com/nico3333fr/jquery-accessible-modal-window-aria
 * MIT License (https://github.com/Aymkdn/picoModal-Accessible/blob/master/LICENSE)
*/
!function(name, definition) {
  if (typeof module != 'undefined') module.exports = definition()
  else if (typeof define == 'function' && typeof define.amd == 'object') define(definition)
  else this[name] = definition()
}('picoModal', function() {

  var picoModal = (function(window, document) {
    "use strict";

    // Generates observable objects that can be watched and triggered
    var observable = function() {
      var callbacks = [];
      return {
        watch: function(callback) {
          callbacks.push(callback);
        },
        trigger: function() {
          for (var i = 0; i < callbacks.length; i++) {
            window.setTimeout(callbacks[i], 1);
          }
        }
      };
    };

    // bind events
    var bindEvent = function(element, eventName, fct) {
      if (element.addEventListener) element.addEventListener(eventName, fct, false);
      else element.attachEvent("on"+eventName, fct);
    };

    // A small interface for creating and managing a dom element
    var make = function(parent, tag) {
      if (arguments.length == 1 && typeof parent === "string") {
        tag = parent;
        parent = null;
      }
      tag = tag || 'div';

      var elem = document.createElement(tag);
      (parent || document.body).appendChild(elem);

      var iface = {

        elem: elem,

        // Creates a child of this node
        child: function(tag) {
          return make(elem, tag || 'a');
        },

        // Applies a set of styles to an element
        stylize: function(styles) {
          styles = styles || {};

          if (typeof styles.opacity !== "undefined") {
            styles.filter =
              "alpha(opacity=" + (styles.opacity * 100) + ")";
          }

          for (var prop in styles) {
            if (styles.hasOwnProperty(prop)) {
              elem.style[prop] = styles[prop];
            }
          }

          return iface;
        },

        // Adds a class name
        clazz: function(clazz) {
          elem.className += clazz;
          return iface;
        },
        // set attributes
        setAttr: function(attr) {
          for (var a in attr) {
            if (attr.hasOwnProperty(a)) {
              elem.setAttribute(a, attr[a]);
            }
          }
          return iface;
        },

        // set an element invisible for users but not readers
        invisible: function() {
          this.stylize({
            "border":"0 none",
            "clip":"rect(0px, 0px, 0px, 0px)",
            "height":"1px",
            "margin":"-1px",
            "overflow":"hidden",
            "padding":"0",
            "position":"absolute",
            "width":"1px"
          });
          return iface;
        },

        // Sets the HTML
        html: function(content) {
          elem.innerHTML = content;
          return iface;
        },

        // Returns the width of this element
        getWidth: function() {
          return elem.clientWidth;
        },

        // Adds a click handler to this element
        onClick: function(callback) {
          bindEvent(elem, 'click', callback);
          return iface;
        },

        // Removes this element from the DOM
        destroy: function() {
          document.body.removeChild(elem);
          return iface;
        }

      };

      return iface;
    };

    // An interface for generating the grey-out effect
    var overlay = function(getOption) {

      // The registered on click events
      var clickCallbacks = observable();

      // The overlay element
      var elem = make()
        .setAttr({"title":"Close this windows"})
        .clazz("pico-overlay")
        .stylize({
          display: "block",
          position: "fixed",
          top: "0px",
          left: "0px",
          height: "100%",
          width: "100%",
          zIndex: 10000
        })
        .stylize(getOption('overlayStyles', {
          opacity: 0.5,
          background: "#000"
        }))
        .onClick(clickCallbacks.trigger);

      // create a hidden element that permits to be read and that explains we can close the overlay by clicking
      if (getOption('overlayClose', true)) {
        elem.child('span')
          .invisible()
          .setAttr({"tabindex":"0","id":"overlayCloseForReaders"})
          .html(getOption('closeHtml', "Close"));
      }
      
      return {
        elem: elem.elem,
        destroy: elem.destroy,
        onClick: clickCallbacks.watch
      };
    };

    // Wrap an HTMLElement around another HTMLElement or an array of them.
    // source: http://stackoverflow.com/questions/3337587/wrapping-a-set-of-dom-elements-using-javascript/13169465#13169465
    var wrapAll = function(father, elms) {
        var el = elms.length ? elms[0] : elms;

        // Cache the current parent and sibling of the first element.
        var parent  = el.parentNode;
        var sibling = el.nextSibling;

        // Wrap the first element (is automatically removed from its
        // current parent).
        father.appendChild(el);

        // Wrap all other elements (if applicable). Each element is
        // automatically removed from its current parent and from the elms
        // array.
        while (elms.length) {
            father.appendChild(elms[0]);
        }

        // If the first element had a sibling, insert the wrapper before the
        // sibling to maintain the HTML structure; otherwise, just append it
        // to the parent.
        if (sibling) {
            try { parent.insertBefore(father, sibling) } catch(e) {}
        } else {
            try { parent.appendChild(father) } catch(e) {}
        }
    };

    Array.prototype.indexOf||(Array.prototype.indexOf=function(r,t){var n;if(null==this)throw new TypeError('"this" is null or undefined');var a=Object(this),e=a.length>>>0;if(0===e)return-1;var i=+t||0;if(Math.abs(i)===1/0&&(i=0),i>=e)return-1;for(n=Math.max(i>=0?i:e-Math.abs(i),0);e>n;){if(n in a&&a[n]===r)return n;n++}return-1});

    var findFocusableElements = function(element, ret) {
      //"a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, *[tabindex], *[contenteditable]"
      if (!element) return;
      var children = element.children;
      var i = children.length;
      var focusable=false, tabindex, contenteditable;
      if (i > 0) {
        do {
          findFocusableElements(children[i], ret)
        } while(i--);
      } else {
        tabindex = element.getAttribute("tabindex");
        contenteditable = element.getAttribute("contenteditable")
        switch (element.tagName) {
          case "A":
          case "AREA":
          case "INPUT":
          case "SELECT":
          case "TEXTAREA":
          case "BUTTON": {
            if (!element.getAttribute("disabled")) {
              ret.push(element);
              return;
            }
            break;
          }
          case "IFRAME":
          case "OBJECT":
          case "EMBED": {
            ret.push(element);
            return;
          }
        }
        if (contenteditable !== null) {
          ret.push(element);
          return
        }
        if (tabindex !== null && tabindex >= 0) {
          ret.push(element);
          return
        }
      }
    };

    // A function for easily displaying a modal with the given content
    return function(options) {

      if (typeof options === "string") {
        options = {
          content: options
        };
      }

      // we record the focused element
      var focusElement = document.activeElement;

      // the body content must be grouped into a 'div' in order to use aria-hidden on it
      !function() {
        var frag = document.createDocumentFragment();
        var father = document.createElement('div');
        father.setAttribute("aria-hidden", "true");
        father.setAttribute("id", "picoModalProtect");
        wrapAll(father, document.body.children);
        document.body.appendChild(father);
      }();

      // Returns a named option if it has been explicitly defined. Otherwise,
      // it returns the given default value
      function getOption(opt, defaultValue) {
        return options[opt] === void(0) ? defaultValue : options[opt];
      }
      var closeCallbacks = observable();

      var elem = make('dialog')
        .clazz("pico-content")
        .stylize({
          display: 'block',
          position: 'fixed',
          zIndex: 10001,
          left: "50%",
          top: "50px"
        })
        .setAttr({"role":"dialog"})
        .html(options.content);

      var close = function() {
        shadow.destroy();
        elem.destroy();
        // remove picoModalProtect
        var body = document.body;
        var father = document.getElementById('picoModalProtect');
        wrapAll(body, father.children);
        father.parentNode.removeChild(father);
        // remove bind
        (document.body.removeEventListener ? document.body.removeEventListener('keydown',trapKeyDown,false) : document.body.detachEvent('onkeydown',trapKeyDown));
        // get back the focus
        if (focusElement) focusElement.focus();
        closeCallbacks.trigger();
      };

      // the close button at first
      var closeButton;
      if (getOption('closeButton', true)) {
        closeButton = elem.html("").child('button')
          .html(getOption('closeHtml', "Close"))
          .clazz("pico-close")
          .stylize(getOption('closeStyles', {
            borderRadius: "2px",
            cursor: "pointer",
            height: "auto",
            width: "auto",
            position: "absolute",
            top: "5px",
            right: "5px",
            fontSize: "16px",
            textAlign: "center",
            lineHeight: "15px",
            background: "#CCC"
          }))
          .setAttr({"tabindex":"0"})
          .onClick(close);
          // move the button at the top of the modal
          closeButton.elem.insertAdjacentHTML('afterend', options.content);
      }

      var width = getOption('width', elem.getWidth());

      elem.stylize({
          width: width + "px",
          margin: "0 0 0 " + (-(width / 2) + "px")
        })
        .stylize(getOption('modalStyles', {
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "5px"
        }));


      var shadow = overlay(getOption);
      if (getOption('overlayClose', true)) {
        shadow.onClick(close);
      }

      // get focus on the close element or on a special message created inside the modal
      var focusInModal;
      if (!options.focusOn) {
        if (getOption('closeButton', true)) {
          focusInModal = closeButton;
          closeButton.elem.focus();
        } else {
          !function() {
            focusInModal = elem.html("").child('span').setAttr({"lang":"en","tabindex":"0"}).html('popup');
            elem.child('div').html(options.content);
            focusInModal.elem.focus();
            setTimeout(function() { focusInModal.invisible() }, 250);
          }();
        }
      } else {
        focusInModal = document.querySelector(getOption('focusOn'));
        if (focusInModal) {
          focusInModal.setAttribute("tabindex","0");
          setTimeout(function() { focusInModal.focus(); }, 0);
        }
      }

      // trap tab and shift+tab inside the modal
      // and ESC to close
      var allowClose = (getOption('closeButton', true) || getOption('overlayClose', true));
      var trapKeyDown = function(event) {
        var code = (event.which ? event.which : event.keyCode);
        if (code == 9) {
          // find focusableelement
          var focusableElements = [], len, index, overlay;
          findFocusableElements(elem.elem, focusableElements);
          focusableElements.reverse();
          len = focusableElements.length;
          index = focusableElements.indexOf(document.activeElement);
          if (index === 0 && event.shiftKey) {
            // if focused on first item and user preses back-tab, go to the last focusable item
            focusableElements[len-1].focus();
            (event.preventDefault ? event.preventDefault() : event.returnValue = false);
          } else {
            if (index === len-1 && !event.shiftKey) {
              // if focused on the last item and user preses tab, go to the first focusable item
              focusableElements[0].focus();
              (event.preventDefault ? event.preventDefault() : event.returnValue = false);
            }
          }
        } else if (code == 27 && allowClose) { // esc
          close();
        }
      };
      bindEvent(document.body, 'keydown', trapKeyDown);

      return {
        modalElem: elem.elem,
        closeElem: closeButton ? closeButton.elem : null,
        overlayElem: shadow.elem,
        close: close,
        onClose: closeCallbacks.watch
      };
    };

  }(window, document));

  return picoModal;

});
