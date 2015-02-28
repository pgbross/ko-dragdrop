import ko from 'knockout'

(function(ELEMENT, PREFIX) {
  ELEMENT.matches = ELEMENT.matches || ELEMENT[PREFIX + 'MatchesSelector'];

  ELEMENT.closest = ELEMENT.closest || function(selector) {
    var node = this;

    while (node) {
      if (node.matches(selector)) {
        return node
      } else {
        node = node.parentElement
      }
    }

    return null;
  };
})(
  Element.prototype, (window.getComputedStyle && [].join.call(getComputedStyle(document.documentElement, '')).match(/-(moz|ms|webkit)-/) || [])[1]
)

function addClass(el, className) {
  if (el.classList) {
    el.classList.add(className)
  } else {
    el.className += ' ' + className
  }
}

function removeClass(el, className) {
  if (el.classList) {
    el.classList.remove(className)
  } else {
    el.className = el.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), ' ')
  }
}

function Offset(el) {
  var rect = el.getBoundingClientRect()

  return {
    top: rect.top + document.body.scrollTop,
    left: rect.left + document.body.scrollLeft
  }
}

var dropZones = {}
var eventZones = {}

var forEach = ko.utils.arrayForEach
var first = ko.utils.arrayFirst
var filter = ko.utils.arrayFilter

class Zone {
  constructor(args) {
    this.init(args)
  }

  init(args) {
    this.element = args.element
    this.$element = args.element
    this.data = args.data
    this.dragEnter = args.dragEnter
    this.dragOver = args.dragOver
    this.dragLeave = args.dragLeave
    this.active = false
    this.inside = false
    this.dirty = false
  }

  refreshDomInfo() {
    var $element = this.$element
    this.hidden = $element.style.display === 'none'
    if (!this.hidden) {
      var offset = Offset($element)
      this.top = offset.top
      this.left = offset.left
      this.width = $element.offsetWidth
      this.height = $element.offsetHeight
    }
  }

  isInside(x, y) {
    if (this.hidden) {
      return false
    }

    if (x < this.left || y < this.top) {
      return false
    }

    if (this.left + this.width < x) {
      return false
    }

    if (this.top + this.height < y) {
      return false
    }
    return true
  }

  update(event, data) {
    if (this.isInside(event.pageX, event.pageY)) {
      if (!this.inside) {
        this.enter(event, data)
      }

      if (this.dragOver) {
        this.dragOver(event, data, this.data)
      }
    } else {
      this.leave(event)
    }
  }

  enter(event, data) {
    this.inside = true
    if (this.dragEnter) {
      this.active = this.dragEnter(event, data, this.data) !== false
    } else {
      this.active = true
    }
    this.dirty = true
  }

  leave(event) {
    let newEvent = event
    if (event) {
      newEvent = Object.create(event, {
          target: {
            value: this.element
          }
        })
        //event.target = this.element
    }

    if (this.inside && this.dragLeave) {
      this.dragLeave(newEvent, this.data)
    }
    this.active = false
    this.inside = false
    this.dirty = true
  }

} //class Zone {


class DropZone extends Zone {

  constructor(args) {
    super(args)

    this.drop = function(data) {
      args.drop(data, args.data)
    }
  }

  updateStyling() {
    if (this.dirty) {
      if (this.active) {
        this.$element.classList.add('drag-over')
      } else {
        this.$element.classList.remove('drag-over')
      }

      if (this.inside && !this.active) {
        this.$element.classList.add('drop-rejected')
      } else {
        this.$element.classList.remove('drop-rejected')
      }
    }
    this.dirty = false
  }
} //class DropZone

class DragElement {
  constructor(element) {
    this.element = element
    this.element.classList.add('drag-element')
    this.element.style.position = 'fixed'
    this.element.style['z-index'] = 9998

    this.element.addEventListener('selectstart', (event) => {
      event.stopPropagation()
      event.preventDefault()
    }, false)
  }

  updatePosition(event) {
    // console.log({x: event.pageX, y: event.pageY})
    this.element.style.top = (event.pageY - document.body.scrollTop) + 'px'
    this.element.style.left = (event.pageX - document.body.scrollLeft) + 'px'
  }

  remove() {
    this.element.parentNode.removeChild(this.element)
  }
} // class DragElement


class Draggable {
  constructor(args) {
    this.name = args.name
    this.dragStart = args.dragStart
    this.dragEnd = args.dragEnd
    this.data = args.data
  }

  startDrag(event) {
    if (this.dragStart && this.dragStart(this.data, event) === false) {
      return false
    }
  }

  drag(event) {
    var that = this
    var name = this.name
    var zones = dropZones[name].concat(eventZones[name])

    forEach(zones, function(zone) {
      zone.refreshDomInfo()
    })

    forEach(zones, function(zone) {
      let newEvent = Object.create(event, {
          target: {
            value: zone.element
          }
        })
        // event.target = zone.element
      zone.update(newEvent, that.data)
    })

    forEach(dropZones[name], function(zone) {
      zone.updateStyling()
    })
  }

  dropRejected() {
    var name = this.name
    var insideAZone = first(dropZones[name], function(zone) {
      return zone.inside
    })
    if (!insideAZone) {
      return false
    }

    var noActiveZone = !first(dropZones[name], function(zone) {
      return zone.active
    })
    return noActiveZone
  }

  cancelDrag(event) {
    if (this.dragEnd) {
      this.dragEnd(this.data, event)
    }
  }

  drop(event) {
    var name = this.name
    var dropZoneElement = event.target.closest( '.drop-zone')
    var activeZones = filter(dropZones[name], function(zone) {
      return zone.active
    })
    var winningDropZone = filter(activeZones, function(zone) {
      return zone.$element === dropZoneElement
    })[0]

    forEach(dropZones[name].concat(eventZones[name]), function(zone) {
      zone.leave(event)
    })

    forEach(dropZones[name], function(zone) {
      zone.updateStyling()
    })

    if (this.dragEnd) {
      this.dragEnd(this.data, event)
    }

    if (winningDropZone && winningDropZone.drop) {
      winningDropZone.drop(this.data)
    }
  }
} // class Draggable


ko.utils.extend(ko.bindingHandlers, {
  dropZone: {
    init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      var options = ko.utils.unwrapObservable(valueAccessor())
      var accepts = []

      if (options.accepts) {
        accepts = [].concat(options.accepts)
      } else {
        // options.name is deprecated
        accepts.push(options.name)
      }

      element.addClass('drop-zone')

      var zone = new DropZone({
        element: element,
        data: bindingContext && bindingContext.$data,
        drop: options.drop,
        dragEnter: options.dragEnter,
        dragOver: options.dragOver,
        dragLeave: options.dragLeave,
      })
      accepts.forEach(function(zoneName) {
        dropZones[zoneName] = dropZones[zoneName] || []
        dropZones[zoneName].push(zone)
      })

      ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
        zone.leave()
        accepts.forEach(function(zoneName) {
          dropZones[zoneName].splice(dropZones[zoneName].indexOf(zone), 1)
        })

      })
    }
  },

  dragEvents: {
    init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      var options = ko.utils.unwrapObservable(valueAccessor())
      var name = options.name
      eventZones[name] = eventZones[name] || []

      var data = options.data || (bindingContext && bindingContext.$data)

      var zone = new Zone({
        element: element,
        data: data,
        dragEnter: options.dragEnter,
        dragOver: options.dragOver,
        dragLeave: options.dragLeave,
      })
      eventZones[name].push(zone)

      ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
        zone.leave()
        eventZones[name].splice(eventZones[name].indexOf(zone), 1)
      })
    }
  },

  dragZone: {
    init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      var options = ko.utils.unwrapObservable(valueAccessor())
      var name = options.name
      var dragDistance = options.dragDistance || 10
      dropZones[name] = dropZones[name] || []
      eventZones[name] = eventZones[name] || []

      var data = options.data || bindingContext && bindingContext.$data

      var draggable = new Draggable({
        name: name,
        data: data,
        dragStart: options.dragStart,
        dragEnd: options.dragEnd
      })

      function matchInput(el) {
        if (!el.matches('button') || !el.matches('textarea') || !el.matches('input')) {
          return false
        }
        return true
      }

      function createCloneProxyElement() {
        var dragProxy = element.cloneNode(true)
        element.parentNode.appendChild(dragProxy)

        dragProxy.style.height = element.height
        dragProxy.style.width = element.width
        dragProxy.style.opacity = 70 / 100
        dragProxy.style.filter = 'alpha(opacity=70'

        return dragProxy
      }

      function createTemplateProxyElement() {
        var dragProxy = document.createElement('div') //  $('<div>').appendTo('body')
        document.body.appendChild(dragProxy)
        var innerBindingContext = ('data' in options) ? bindingContext.createChildContext(options.data) : bindingContext

        ko.renderTemplate(options.element, innerBindingContext, {}, dragProxy)
        return dragProxy
      }

      element.addEventListener('selectstart', function(e) {
        if (!matchInput(e.target)) {
          event.stopPropagation()
          event.preventDefault()
        }
      }, false)

      element.classList.add('draggable')

      let onDocumentSelectStart = function(event) {
        event.stopPropagation()
        event.preventDefault()
      }

      element.addEventListener('mousedown', function(downEvent) {
          // check for left button
          if (downEvent.which !== 1) {
            return true
          }

          document.addEventListener('selectstart', onDocumentSelectStart, false)

          let onMouseMoveStartdrag = function(event) {
            if (matchInput(event.target)) {
              return
            }

            var distance = Math.sqrt(Math.pow(downEvent.pageX - event.pageX, 2) + Math.pow(downEvent.pageY - event.pageY, 2))

            if (distance > dragDistance) {

              // the presence of the overlay will also trigger a mouseleave, unless the css/style ends up putting in somewhere incorrect
              // so just do it now anyway for extra safety
              onMouseUpAndLeave()
              startDragging(event)
            }
          }

          var startDragging = function(startEvent) {
              if (draggable.startDrag(downEvent) === false) {
                event.stopPropagation()
                event.preventDefault()
                return
              }

              var dragElement = null
              if (!options.element) {
                dragElement = new DragElement(createCloneProxyElement())
              }

              var overlay = document.createElement('div')

              overlay.classList = 'drag-overlay'
              overlay.setAttribute('unselectable', 'on')
              overlay.style['z-index'] = 9999
              overlay.style.position = 'fixed'
              overlay.style.top = 0
              overlay.style.left = 0
              overlay.style.right = 0
              overlay.style.bottom = 0
              overlay.style['background-color'] = 'cyan'
              overlay.style.opacity = 0.1
              overlay.style.filter = 'alpha(apacity=0)'
              overlay.style['-webkit-user-select'] = 'none'
              overlay.style['-moz-user-select'] = '-moz-none'
              overlay.style['-ms-user-select'] = 'none'
              overlay.style['-o-user-select'] = 'none'
              overlay.style['user-select'] = 'none'

              overlay.addEventListener('selectstart', function() {
                event.stopPropagation()
                event.preventDefault()
              }, false)

              document.body.appendChild(overlay)

              if (options.element) {
                dragElement = new DragElement(createTemplateProxyElement())
              }

              dragElement.updatePosition(downEvent)

              var dragTimer = null
              var dropRejected = false


              function drag(event) {
                // console.log('overlay->drag')
                draggable.drag(event)
                if (draggable.dropRejected() !== dropRejected) {
                  let dr = draggable.dropRejected()
                  if (dr) {
                    addClass(overlay, 'drop-rejected')
                  } else {
                    removeClass(overlay, 'drop-rejected')
                  }
                  overlay.style.cursor = dr ? 'no-drop' : 'move'
                  dropRejected = dr
                }
                dragTimer = setTimeout(function() {
                  drag(event)
                }, 250)
              }

              function cancelDrag(e) {
                clearTimeout(dragTimer)
                dragElement.remove()
                overlay.parentNode.removeChild(overlay)
                draggable.cancelDrag(e)
              }

              overlay.addEventListener('mousemove', function(moveEvent) {
                // console.log('overlay->mousemove')
                if (moveEvent.which !== 1) {
                  cancelDrag(moveEvent)
                  return
                }
                clearTimeout(dragTimer)
                dragElement.updatePosition(moveEvent)
                drag(moveEvent)
                event.stopPropagation()
                event.preventDefault()
              })

              overlay.addEventListener('mouseup', function(upEvent) {
                // console.log('overlay->mouseup')
                clearTimeout(dragTimer)
                dragElement.remove()
                overlay.parentNode.removeChild(overlay)

                let newEvent = Object.create(event, {
                  target: {
                    value: document.elementFromPoint(upEvent.clientX, upEvent.clientY)
                  }
                });

                draggable.drop(newEvent)


                document.removeEventListener('selectstart', onDocumentSelectStart, false)
                event.stopPropagation()
                event.preventDefault()
              })

            } //function startDragging(startEvent)


          var onMouseUpAndLeave = function() {
            // console.log('element->mouseupOrLeave')
            // just remove all the trigger events as we dont want to start a drag after a leave or up event
            element.removeEventListener('mouseup', onMouseUpAndLeave, false)
            element.removeEventListener('mouseleave', onMouseUpAndLeave, false)
            element.removeEventListener('mousemove', onMouseMoveStartdrag, false)
          }

          // listent for mouseup or leave which will trigger us stopping listening for mouse move
          element.addEventListener('mouseup', onMouseUpAndLeave, false)
          element.addEventListener('mouseleave', onMouseUpAndLeave, false)


          element.addEventListener('mousemove', onMouseMoveStartdrag, false)

          return true

        }, false) // element.addEventListener('mousedown', function(downEvent){


      ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
        document.removeEventListener('selectstart', onDocumentSelectStart, false)
      })
    }
  }

})