'use strict';

// TODO: add a component registrar for knowing when
// components finish downloading

require("components/component");

var __id = 0;
var bootloader = window.bootloader,
    _packages = window._packages;

var _components = {};
var _pending = {};
var _classes = {};
function register_component(id, instance) {
  _components[id] = instance;
  if (_pending[id]) {
    _.each(_pending[id], function(cb) {
      cb(instance);
    });
    delete _pending[id];
  }
}

function get_component(id, cb) {
  if (!_components[id]) {
    _pending[id] = _pending[id] || [];
    _pending[id].push(cb);
  } else {
    cb(_components[id]);
  }
}

function load(component, cb) {
  bootloader.pkg(component, function(data) {
    if (cb) {
      cb(data);
    }
  });
}

// TODO: load styles for the component and properly insert them into the
// document
function build(component, options, cb) {

  options = options || {};

  load(component, function() {
    var exports = _packages[component].exports;
    var events = _packages[component].events;
    var template = _packages[component].template;

    var id = (options.id || "c" + __id++);
    exports = _.extend(exports, events);

    var css = _packages[component].style.code;

    if (css) {
      bootloader.inject_css("component/" + component, css);
    }

    function render_component(cmpInstance) {
      if (options.render) {
        var rendered;
        if (template) {
          var template_options = _.extend({
              id: id,
              classes: cmpInstance.className || "",
              set_default: function(key, value) {
                if (typeof this[key] === "undefined") {
                  this[key] = value;
                }
              }
            }, options);

          if (exports.defaults) {
            template_options = _.defaults(
              template_options, exports.defaults);
          }

          rendered = _.template(template, template_options);
        }

        if (rendered) {

          cmpInstance.html(rendered);
          cmpInstance.$el.attr("data-cmp", component);
          cmpInstance.id = id;
        }
      }


      register_component(id, cmpInstance);
      cmpInstance.render();
      cmpInstance.delegateEvents();
    }

    function install_handlers(cmpInstance) {
      // Serial fetches... what?
      if (options.behavior) {
        var b = bootloader.js([options.behavior], function(mods) {
          var behaviors = bootloader.raw_import(mods[options.behavior].code);
          _.extend(cmpInstance, behaviors);

          if (behaviors.events) {
            var events = _.extend(cmpInstance.events, behaviors.events);
            cmpInstance.delegateEvents(events);
          }

          cmpInstance.delegateEvents(); // mix the behaviors in
        });
      }

      if (options.delegate) {
        var controller = options.delegate.controller;
        _.each(options.delegate.events, function(v, k) {
          cmpInstance.events[k] = function() {
            var that = this;
            var args = _.toArray(arguments);
            var ctrl = SF.controller(controller);

            if (!ctrl.delegates) {
              console.log("Warning, trying to run delegate function on controller that doesn't supporter it");
              return;
            }
  
            if (!ctrl.delegates[v]) {
              console.log("Warning, delegate function", v, "for", k, "does not exist");
            }

            args.unshift(this);
            ctrl.delegates[v].apply(ctrl, args);
          };

        });

        cmpInstance.delegateEvents();
      }
      _components[id] = cmpInstance;


    }

    function load_component() {
      require("components/component", function(Component) {
        var CmpClass = _classes[component];
        if (_packages[component].schema.always_define || !CmpClass) {
          CmpClass = Component.extend(_.clone(exports));
          CmpClass.__created = true;
          CmpClass.helpers = {};
        }
        _classes[component] = CmpClass;

        var cmpInstance = new CmpClass(_.extend({ id: id }, options));

        render_component(cmpInstance);

        cmpInstance.helpers = {};
        if (!cmpInstance.events) { 
          cmpInstance.events = {};
        }
        _.each(_packages[component].helpers, function(helper, name) {

          if (CmpClass.helpers[name]) {
            cmpInstance.helpers[name] = CmpClass.helpers[name];
          } else {
            CmpClass.helpers[name] = true;
            var helper_instance = bootloader.raw_import(helper);
            CmpClass.helpers[name] = helper_instance || true;

            if (helper_instance) {
              name = helper_instance.name || name;
            }

            cmpInstance.helpers[name] = helper_instance;
          }
        });

        // instantiate client callbacks for component
        if (cmpInstance.client && !options.skip_client_init) {
          var cl = options.client_options || {};
          _.extend(cl, options);
          cmpInstance.client(cl);
        }

        install_handlers(cmpInstance);

        if (cb) {
          cb(cmpInstance);
        }
      });
    }

    // Bootload all the styles for the component
    var styles = _packages[component].styles;

    var loaded = 0;
    _.each(styles, function(style) {
      bootloader.css(style, function() {
        loaded += 1;
        debug("Loaded style", style);
        if (loaded === styles.length) {
          debug("All styles loaded for", component);
          load_component();
        }
      });
    });

    // No need to wait for the bootloaded CSS
    if (!styles || !styles.length) {
      load_component();
    }
  });
}

// Meant for calls from server, usually
function instantiate(options, signature) {
  var component = options.component;
  var id = options.id;
  var behavior = options.behavior;
  var delegate = options.delegate;
  var client_options = options.client_options;

  // Need client side component loading library?
  // How about ask the server to send it all in a json blob?
  var el = $("#" + id);

  var hash = options.hash;
  if (hash) {
    bootloader.versions.pkg[component] = hash;
  }

  build(
    component,
    { id: id, el: el, behavior: behavior, delegate: delegate, client_options: client_options },
    function(cmp) {
      debug("built", component, "on", id, cmp, el);
  });

  // Need a server side component packager
}

var __cmp_id = 0;
function create(component, options, cb) {
  options.render = true;

  _.defer(function() {
    build(component, options, cb);
  });

  return options.el;
}

window.$G = get_component;
window.$C = create;

SF.trigger("core/client/component");

module.exports = {
  instantiate: instantiate,
  build: build,
  load: load,
  get: get_component
};
