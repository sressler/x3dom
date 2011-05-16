/*!
* x3dom javascript library 0.1
* http://www.x3dom.org/
*
* Copyright (c) 2009 Peter Eschler, Johannes Behr, Yvonne Jung
*     based on code originally provided by Philip Taylor:
*     http://philip.html5.org
* Dual licensed under the MIT and GPL licenses.
*
*/

// the x3dom.nodes namespace
// x3dom.nodes = {};

/** @namespace the x3dom.nodeTypes namespace. */
x3dom.nodeTypes = {};

/** @namespace the x3dom.nodeTypesLC namespace. Stores nodetypes in lowercase */
x3dom.nodeTypesLC = {};

/** @namespace the x3dom.components namespace. */
x3dom.components = {};

/** Cache for primitive nodes (Box, Sphere, etc.) */
x3dom.geoCache = [];

/** Registers the node defined by @p nodeDef.

    The node is registered with the given @p nodeTypeName and @p componentName.

    @param nodeTypeName the name of the nodetype (e.g. Material, Shape, ...)
    @param componentName the name of the component the nodetype belongs to
    @param nodeDef the definition of the nodetype
 */
x3dom.registerNodeType = function(nodeTypeName, componentName, nodeDef) {
    x3dom.debug.logInfo("Registering nodetype [" + nodeTypeName + "] in component [" + componentName + "]");
    if (x3dom.components[componentName] === undefined) {
        x3dom.debug.logInfo("Adding new component [" + componentName + "]");
        x3dom.components[componentName] = {};
    }
    else {
        x3dom.debug.logInfo("Using component [" + componentName + "]");
    }
    nodeDef._typeName = nodeTypeName;
    nodeDef._compName = componentName;
    x3dom.components[componentName][nodeTypeName] = nodeDef;
    x3dom.nodeTypes[nodeTypeName] = nodeDef;
    x3dom.nodeTypesLC[nodeTypeName.toLowerCase()] = nodeDef;
};

x3dom.isX3DElement = function(node) {
    // x3dom.debug.logInfo("node=" + node + "node.nodeType=" + node.nodeType + ", node.localName=" + node.localName + ", ");
    return (node.nodeType === Node.ELEMENT_NODE && node.localName &&
        (x3dom.nodeTypes[node.localName] || x3dom.nodeTypesLC[node.localName.toLowerCase()] ||
         node.localName.toLowerCase() === "x3d" || node.localName.toLowerCase() === "websg" ||
         node.localName.toLowerCase() === "scene" || node.localName.toLowerCase() === "route" ));
};

// BindableStack constructor
x3dom.BindableStack = function (doc, type, defaultType, getter) {
    this._doc = doc;
    this._type = type;
    this._defaultType = defaultType;
    this._defaultRoot = 0;
    this._getter = getter;
    this._bindBag = [];
    this._bindStack = [];

    // x3dom.debug.logInfo ('Create BindableStack ' + this._type._typeName + ', ' + this._getter);
};

x3dom.BindableStack.prototype.top = function () {
    return ( (this._bindStack.length >= 0) ? this._bindStack[this._bindStack.length - 1] : null );
};

x3dom.BindableStack.prototype.push = function (bindable) {
    var top = this.top();

    if (top === bindable) {
        return;
    }

    if (top) {
        top.deactivate();
    }

    this._bindStack.push (bindable);
    bindable.activate(top);
};

x3dom.BindableStack.prototype.replaceTop = function (bindable) {
    var top = this.top();

    if (top === bindable) {
        return;
    }

    if (top) {
        top.deactivate();

        this._bindStack[this._bindStack.length - 1] = bindable;
        bindable.activate(top);
    }
};

x3dom.BindableStack.prototype.pop = function (bindable) {
    var top;

    if (bindable) {
        top = this.top();
        if (bindable !== top) {
            return null;
        }
    }

    top = this._bindStack.pop();

    if (top) {
        top.deactivate();
    }

    return top;
};

x3dom.BindableStack.prototype.switchTo = function (target) {
    var last = this.getActive();
    var n = this._bindBag.length;
    var toBind = 0;
    var i = 0, lastIndex = -1;

    if (n <= 1) {
        return;
    }

    switch (target)
    {
        case 'first':
            //x3dom.debug.logInfo ('first');
            toBind = this._bindBag[0];
            break;
        case 'last':
            //x3dom.debug.logInfo ('last');
            toBind = this._bindBag[n-1];
            break;
        default:
            for (i = 0; i < n; i++) {
                if (this._bindBag[i] == last) {
                    lastIndex = i;
                    break;
                }
            }
            if (lastIndex >= 0) {
                i = lastIndex;
                while (!toBind) {
                    if (target == 'next') {// next
                        i = (i < (n-1)) ? (i+1) : 0;
                    } else {// prev
                        i = (i>0) ? (i-1) : (n-1);
                    }
                    if (i == lastIndex) {
                        break;
                    }
                    if (this._bindBag[i]._vf.description.length >= 0) {
                      toBind = this._bindBag[i];
                    }
                }
            }
            break;
    }

    if (toBind) {
        this.replaceTop(toBind);
    } else {
        x3dom.debug.logWarning ('Cannot switch bindable; no other bindable with description found.');
    }
};

x3dom.BindableStack.prototype.getActive = function () {
    if (this._bindStack.length === 0) {
        if (this._bindBag.length === 0) {
            x3dom.debug.logInfo ('create new ' + this._defaultType._typeName +
                                 ' for ' + this._type._typeName + '-stack');
            var obj = new this._defaultType( { doc: this._doc, autoGen: true } );
            if (obj) {
                if (this._defaultRoot) {
                    this._defaultRoot.addChild(obj);
                    obj._nameSpace = this._defaultRoot._nameSpace;
                }
                else {
                    x3dom.debug.logError ('stack without defaultRoot');
                }
                obj.initDefault();
                this._bindBag.push(obj);
            }
        }
        else {
            x3dom.debug.logInfo ('activate first ' + this._type._typeName +
                                 ' for ' + this._type._typeName + '-stack');
        }

        this._bindStack.push(this._bindBag[0]);
        this._bindBag[0].activate();
    }

    return this._bindStack[this._bindStack.length - 1];
};

x3dom.BindableBag = function (doc) {
    this._stacks = [];

    this.addType ("X3DViewpointNode", "Viewpoint", "getViewpoint", doc);
    this.addType ("X3DNavigationInfoNode", "NavigationInfo", "getNavigationInfo", doc);
    this.addType ("X3DBackgroundNode", "Background", "getBackground", doc);
    this.addType ("X3DFogNode", "Fog", "getFog", doc);
};

x3dom.BindableBag.prototype.addType = function(typeName,defaultTypeName,getter,doc) {
    var type = x3dom.nodeTypes[typeName];
    var defaultType = x3dom.nodeTypes[defaultTypeName];
    var stack;

    if (type && defaultType) {
        //x3dom.debug.logInfo ('Create new BindableStack for ' + typeName);
        stack = new x3dom.BindableStack (doc, type, defaultType, getter);
        this._stacks.push(stack);
    }
    else {
        x3dom.debug.logWarning('Invalid Bindable type/defaultType:' + typeName + '/' + defaultType);
    }
};

x3dom.BindableBag.prototype.setRefNode = function (node) {
    Array.forEach ( this._stacks, function (stack) {
        stack._defaultRoot = node;
        node[stack._getter] = function () { return stack.getActive(); };
    } );
};

x3dom.BindableBag.prototype.addBindable = function(node) {
    for (var i = 0, n = this._stacks.length; i < n; i++) {
        if ( x3dom.isa (node, this._stacks[i]._type) ) {
            x3dom.debug.logInfo ('register bindable ' + node.typeName());
            this._stacks[i]._bindBag.push(node);
            return this._stacks[i];
        }
    }
    x3dom.debug.logError (node.typeName() + ' is not a valid bindable');
    return null;
};

// NodeNameSpace constructor
x3dom.NodeNameSpace = function (name, document) {
    this.name = name;
    this.doc = document;
    this.baseURL = "";
    this.defMap = {};
    this.parent = null;
    this.childSpaces = [];
};

x3dom.NodeNameSpace.prototype.addNode = function (node, name) {
    this.defMap[name] = node;
    node._nameSpace = this;
};

x3dom.NodeNameSpace.prototype.removeNode = function (name) {
    var node = this.defMap.name;
    delete this.defMap.name;
    if (node) {
        node._nameSpace = null;
    }
};

x3dom.NodeNameSpace.prototype.getNamedNode = function (name) {
    return this.defMap[name];
};

x3dom.NodeNameSpace.prototype.getNamedElement = function (name) {
    var node = this.defMap[name];
    return (node ? node._xmlNode : null);
};

x3dom.NodeNameSpace.prototype.addSpace = function (space) {
    this.childSpaces.push(space);
    space.parent = this;
};

x3dom.NodeNameSpace.prototype.removeSpace = function (space) {
    this.childSpaces.push(space);
    space.parent = null;
};

x3dom.NodeNameSpace.prototype.setBaseURL = function (url) {
    var i = url.lastIndexOf ("/");
    this.baseURL = (i >= 0) ? url.substr(0,i+1) : "";

    x3dom.debug.logInfo("setBaseURL: " + this.baseURL);
};

x3dom.NodeNameSpace.prototype.getURL = function (url) {
    if (url === undefined || !url.length) {
        return "";
    }
    else {
        return ((url[0] === '/') || (url.indexOf(":") >= 0)) ? url : (this.baseURL + url);
    }
};


// helper to set an element's attribute
x3dom.setElementAttribute = function(attrName, newVal)
{
    var prevVal = this.getAttribute(attrName);
    this.__setAttribute(attrName, newVal);
    //newVal = this.getAttribute(attrName);

    this._x3domNode.updateField(attrName, newVal);
    this._x3domNode._nameSpace.doc.needRender = true;

    /* construct and fire an event
    if (newVal != prevVal) {
        var evt = document.createEvent("MutationEvent");
        evt.initMutationEvent(
              "DOMAttrModified",
              true,
              false,
              this,
              prevVal || "",
              newVal || "",
              attrName,
              (prevVal == null) ? evt.ADDITION : evt.MODIFICATION
        );
        this.dispatchEvent(evt);
     }
    */
};

x3dom.NodeNameSpace.prototype.setupTree = function (domNode) {
    var n, t;

    if (x3dom.isX3DElement(domNode)) {

        // return if it is already initialized
        if (domNode._x3domNode) {
            x3dom.debug.logWarning ('Tree is already initialized');
            return;
        }

        //active workaground for missing DOMAttrModified support
        if ( (x3dom.userAgentFeature.supportsDOMAttrModified === false) &&
             (domNode.tagName !== undefined) && (!domNode.__setAttribute) ) {
            domNode.__setAttribute = domNode.setAttribute;
            domNode.setAttribute = x3dom.setElementAttribute;
        }

        // workaround since one cannot find out which handlers are registered
        if ( (domNode.tagName !== undefined) &&
            (!domNode.__addEventListener) && (!domNode.__removeEventListener) )
        {
            // helper to track an element's listeners
            domNode.__addEventListener = domNode.addEventListener;
            domNode.addEventListener = function(type, func, phase) {
                if (!this._x3domNode._listeners[type]) {
                    this._x3domNode._listeners[type] = [];
                }
                this._x3domNode._listeners[type].push(func);

                x3dom.debug.logInfo('addEventListener for ' + this.tagName + ".on" + type);
                this.__addEventListener(type, func, phase);
            };

            domNode.__removeEventListener = domNode.removeEventListener;
            domNode.removeEventListener = function(type, func, phase) {
                var list = this._x3domNode._listeners[type];
                if (list) {
                    for (var it=0; it<list.length; it++) {
                        if (list[it] == func) {
                            list.splice(it, 1);
                            x3dom.debug.logInfo('removeEventListener for ' +
                                                this.tagName + ".on" + type);
                        }
                    }
                }
                this.__removeEventListener(type, func, phase);
            };
        }

        // x3dom.debug.logInfo("=== node=" + domNode.localName);
        if (domNode.hasAttribute('USE')) {
            n = this.defMap[domNode.getAttribute('USE')];
            if (n === null) {
                x3dom.debug.logWarning('Could not USE: ' + domNode.getAttribute('USE'));
            }
            return n;
        }
        else {
            // check and create ROUTEs
            if (domNode.localName.toLowerCase() === 'route') {
                var route = domNode;
                var fromNode = this.defMap[route.getAttribute('fromNode')];
                var toNode = this.defMap[route.getAttribute('toNode')];
                //x3dom.debug.logInfo("ROUTE: from=" + fromNode._DEF + ", to=" + toNode._DEF);
                if (! (fromNode && toNode)) {
                    x3dom.debug.logWarning("Broken route - can't find all DEFs for " +
                                route.getAttribute('fromNode')+" -> "+ route.getAttribute('toNode'));
                    return null;
                }
                fromNode.setupRoute(route.getAttribute('fromField'), toNode, route.getAttribute('toField'));
//                 TODO: Store the routes of the scene - where should we store them?
//                 scene._routes = Array.map(sceneRoutes, setupRoute);
                return null;
            }

            // find the NodeType for the given dom-node
            var nodeType = x3dom.nodeTypesLC[domNode.localName.toLowerCase()];
            if (nodeType === undefined) {
                x3dom.debug.logInfo("Unrecognised X3D element &lt;" + domNode.localName + "&gt;.");
            }
            else {
                var ctx = { doc: this.doc, xmlNode: domNode };
                n = new nodeType(ctx);
                n._nameSpace = this;

                // x3dom.debug.logInfo("new node type: " + domNode.localName);

                // find and store/link _DEF name
                if (domNode.hasAttribute('DEF')) {
                   n._DEF = domNode.getAttribute('DEF');
                   this.defMap[n._DEF] = n;
                }
                else {
                  if (domNode.hasAttribute('id')) {
                    n._DEF = domNode.getAttribute('id');
                    this.defMap[n._DEF] = n;
                  }
                }

                // link both DOM-Node and Scene-graph-Node
                n._xmlNode = domNode;
                domNode._x3domNode = n;

                // call children
                /*
                Array.forEach( Array.map(domNode.childNodes,
                                function (n) { return this.setupTree(n); }, this),
                                function (c) { if (c) n.addChild(c); });
                */
                var that = this;
                Array.forEach ( domNode.childNodes, function (childDomNode) {
                    var c = that.setupTree(childDomNode);
                    if (c) {
                        n.addChild(c, childDomNode.getAttribute("containerField"));
                    }
                } );

                // FIXME: remove
                n.nodeChanged();
                return n;
            }
        }
    }
    else if (domNode.localName) {
        // be nice to users who use nodes not (yet) known to the system
        x3dom.debug.logInfo("Unrecognised X3D element &lt;" + domNode.localName + "&gt;.");
        n = null;
    }

    return n;
};


// ### X3DNode ###
x3dom.registerNodeType(
    "X3DNode",
    "Core",
    defineClass(null, function (ctx) {

        // holds a link to the node name
        this._DEF = null;

        // links the nameSpace
        this._nameSpace = null;

        // holds all value fields (e.g. SFFloat, MFVec3f, ...)
        this._vf = {};
        // holds all child fields ( SFNode and MFNode )
        this._cf = {};

        this._fieldWatchers = {};
        this._parentNodes = [];

        this._listeners = {};

        // FIXME; should be removed and handled by _cf methods
        this._childNodes = [];

        this.addField_SFNode('metadata', x3dom.nodeTypes.X3DMetadataObject);
    },
    {
        type: function () {
            return this.constructor;
        },
        typeName: function () {
            return this.constructor._typeName;
        },

        addChild: function (node, containerFieldName) {
            if (node) {
                var field = null;
                if (containerFieldName) {
                    field = this._cf[containerFieldName];
                }
                else {
                    for (var fieldName in this._cf) {
                        if (this._cf.hasOwnProperty(fieldName)) {
                            var testField = this._cf[fieldName];
                            if (x3dom.isa(node,testField.type)) {
                                field = testField;
                                break;
                            }
                        }
                    }
                }
                if (field && field.addLink(node)) {
                    node._parentNodes.push(this);
                    this._childNodes.push(node);
                    node.parentAdded(this);
                    return true;
                }
            }
            return false;
        },

        removeChild: function (node) {
            if (node) {
                for (var fieldName in this._cf) {
                    if (this._cf.hasOwnProperty(fieldName)) {
                        var field = this._cf[fieldName];
                        if (field.rmLink(node)) {
                            for (var i = 0, n = node._parentNodes.length; i < n; i++) {
                                if (node._parentNodes[i] === this) {
                                    node._parentNodes.splice(i,1);
                                    node.parentRemoved(this);
                                }
                            }
                            for (var j = 0, m = this._childNodes.length; j < m; j++) {
                                if (this._childNodes[j] === node) {
                                    this._childNodes.splice(j,1);
                                    return true;
                                }
                            }
                        }
                    }
                }
            }
            return false;
        },

        parentAdded: function(parent) {
            // to be overwritten by concrete classes
        },

        parentRemoved: function(parent) {
            // attention: overwritten by concrete classes
            for (var i=0, n=this._childNodes.length; i<n; i++) {
                if (this._childNodes[i]) {
                    this._childNodes[i].parentRemoved(this);
                }
            }
        },

        getCurrentTransform: function () {
            if (this._parentNodes.length >= 1) {
                return this.transformMatrix(this._parentNodes[0].getCurrentTransform());
            }
            else {
                return x3dom.fields.SFMatrix4f.identity();
            }
        },

        transformMatrix: function (transform) {
            return transform;
        },

        getVolume: function (min, max, invalidate)
        {
            var valid = false;
            for (var i=0, n=this._childNodes.length; i<n; i++)
            {
                if (this._childNodes[i])
                {
                    var childMin = x3dom.fields.SFVec3f.MAX();
                    var childMax = x3dom.fields.SFVec3f.MIN();

                    valid = this._childNodes[i].getVolume(
                                    childMin, childMax, invalidate) || valid;

                    if (valid)  // values only set by Mesh.BBox()
                    {
                        if (min.x > childMin.x) { min.x = childMin.x; }
                        if (min.y > childMin.y) { min.y = childMin.y; }
                        if (min.z > childMin.z) { min.z = childMin.z; }

                        if (max.x < childMax.x) { max.x = childMax.x; }
                        if (max.y < childMax.y) { max.y = childMax.y; }
                        if (max.z < childMax.z) { max.z = childMax.z; }
                    }
                }
            }
            return valid;
        },

        find: function (type) {
            for (var i=0; i<this._childNodes.length; i++) {
                if (this._childNodes[i]) {
                    if (this._childNodes[i].constructor == type) {
                        return this._childNodes[i];
                    }
                    var c = this._childNodes[i].find(type);
                    if (c) {
                        return c;
                    }
                }
            }
            return null;
        },

        findAll: function (type) {
            var found = [];
            for (var i=0; i<this._childNodes.length; i++) {
                if (this._childNodes[i]) {
                    if (this._childNodes[i].constructor == type) {
                        found.push(this._childNodes[i]);
                    }
                    // TODO: this has non-linear performance
                    found = found.concat(this._childNodes[i].findAll(type));
                }
            }
            return found;
        },

        findParentProperty: function (propertyName, checkDOMNode) {
            var value = this[propertyName];

            if (!value && checkDOMNode && this._xmlNode) {
                value = this._xmlNode[propertyName];
            }

            if (!value) {
                for (var i = 0, n = this._parentNodes.length; i < n; i++) {
                    if ((value = this._parentNodes[i].findParentProperty(propertyName, checkDOMNode ))) {
                        break;
                    }
                }
            }

            return value;
        },

        findX3DDoc: function () {
            return this._nameSpace.doc;
        },

        // Collects array of [transform matrix, node] for all objects that should be drawn.
        collectDrawableObjects: function (transform, out) {
            // TODO: culling etc.
            for (var i=0; i<this._childNodes.length; i++) {
                if (this._childNodes[i]) {
                    var childTransform = this._childNodes[i].transformMatrix(transform);
                    this._childNodes[i].collectDrawableObjects(childTransform, out);
                }
            }
        },

        doIntersect: function(line) {
            var isect = false;
            for (var i=0; i<this._childNodes.length; i++) {
                if (this._childNodes[i]) {
                    isect = this._childNodes[i].doIntersect(line) || isect;
                }
            }
            return isect;
        },

        postMessage: function (field, msg) {
            // TODO: timestamps and stuff
            this._vf[field] = msg;  // FIXME; _cf!!!
            var listeners = this._fieldWatchers[field];
            var thisp = this;
            if (listeners) {
                Array.forEach(listeners, function (l) { l.call(thisp, msg); });
            }
        },

        // method for handling field updates
        updateField: function (field, msg) {
            var f = this._vf[field];

            if (f === undefined) {
                f = {};
                this._vf[field] = f;
            }

            if (f !== null) {
                try {
                    this._vf[field].setValueByStr(msg);
                }
                catch (exc1) {
                    try {
                        switch ((typeof(this._vf[field])).toString()) {
                            case "number":
                                this._vf[field] = +msg;
                                break;
                            case "boolean":
                                this._vf[field] = (msg.toLowerCase() === "true");
                                break;
                            case "string":
                                this._vf[field] = msg;
                                break;
                        }
                    }
                    catch (exc2) {
                        x3dom.debug.logError("updateField: setValueByStr() NYI for " + typeof(f));
                    }
                }

                // TODO: eval fieldChanged for all nodes!
                this.fieldChanged(field);
            }
        },

        setupRoute: function (fromField, toNode, toField) {
            var pos;
            var fieldName;
            var pre = "set_", post = "_changed";

            // build correct fromField
            if (!this._vf[fromField]) {
                pos = fromField.indexOf(pre);
                if (pos === 0) {
                    fieldName = fromField.substr(pre.length, fromField.length - 1);
                    if (this._vf[fieldName]) {
                        fromField = fieldName;
                    }
                } else {
                    pos = fromField.indexOf(post);
                    if (pos > 0) {
                        fieldName = fromField.substr(0, fromField.length - post.length);
                        if (this._vf[fieldName]) {
                            fromField = fieldName;
                        }
                    }
                }
            }

            // build correct toField
            if (!toNode._vf[toField]) {
                pos = toField.indexOf(pre);
                if (pos === 0) {
                    fieldName = toField.substr(pre.length, toField.length - 1);
                    if (toNode._vf[fieldName]) {
                        toField = fieldName;
                    }
                }
                else {
                    pos = toField.indexOf(post);
                    if (pos > 0) {
                        fieldName = toField.substr(0, toField.length - post.length);
                        if (toNode._vf[fieldName]) {
                            toField = fieldName;
                        }
                    }
                }
            }


            if (! this._fieldWatchers[fromField]) {
                this._fieldWatchers[fromField] = [];
            }
            this._fieldWatchers[fromField].push(
                function (msg) {
                    toNode.postMessage(toField, msg);
                }
            );

            if (! toNode._fieldWatchers[toField]) {
                toNode._fieldWatchers[toField] = [];
            }
            toNode._fieldWatchers[toField].push(
                function (msg) {
                    // FIXME: THIS DOESN'T WORK FOR NODE (_cf) FIELDS
                    toNode._vf[toField] = msg;

                    toNode.fieldChanged(toField);
                }
            );
        },

        fieldChanged: function (fieldName) {
            // to be overwritten by concrete classes
        },

        nodeChanged: function () {
            // to be overwritten by concrete classes
        },

        addField_SFInt32: function (ctx, name, n) {
            this._vf[name] = ctx && ctx.xmlNode.hasAttribute(name) ?
                parseInt(ctx.xmlNode.getAttribute(name),10) : n;
        },
        addField_SFFloat: function (ctx, name, n) {
            this._vf[name] = ctx && ctx.xmlNode && ctx.xmlNode.hasAttribute(name) ?
                +ctx.xmlNode.getAttribute(name) : n;
        },
        addField_SFDouble: function (ctx, name, n) {    // is double anyway
            this._vf[name] = ctx && ctx.xmlNode && ctx.xmlNode.hasAttribute(name) ?
                +ctx.xmlNode.getAttribute(name) : n;
        },
        addField_SFTime: function (ctx, name, n) {
            this._vf[name] = ctx && ctx.xmlNode && ctx.xmlNode.hasAttribute(name) ?
                +ctx.xmlNode.getAttribute(name) : n;
        },
        addField_SFBool: function (ctx, name, n) {
            this._vf[name] = ctx && ctx.xmlNode && ctx.xmlNode.hasAttribute(name) ?
                ctx.xmlNode.getAttribute(name).toLowerCase() === "true" : n;
        },
        addField_SFString: function (ctx, name, n) {
            this._vf[name] = ctx && ctx.xmlNode && ctx.xmlNode.hasAttribute(name) ?
                ctx.xmlNode.getAttribute(name) : n;
        },
        addField_SFColor: function (ctx, name, r, g, b) {
            this._vf[name] = ctx && ctx.xmlNode && ctx.xmlNode.hasAttribute(name) ?
                x3dom.fields.SFColor.parse(ctx.xmlNode.getAttribute(name)) :
                new x3dom.fields.SFColor(r, g, b);
        },
        addField_SFColorRGBA: function (ctx, name, r, g, b, a) {
            this._vf[name] = ctx && ctx.xmlNode && ctx.xmlNode.hasAttribute(name) ?
                x3dom.fields.SFColorRGBA.parse(ctx.xmlNode.getAttribute(name)) :
                new x3dom.fields.SFColorRGBA(r, g, b, a);
        },
        addField_SFVec2f: function (ctx, name, x, y) {
            this._vf[name] = ctx && ctx.xmlNode && ctx.xmlNode.hasAttribute(name) ?
                x3dom.fields.SFVec2f.parse(ctx.xmlNode.getAttribute(name)) :
                new x3dom.fields.SFVec2f(x, y);
        },
        addField_SFVec3f: function (ctx, name, x, y, z) {
            this._vf[name] = ctx && ctx.xmlNode && ctx.xmlNode.hasAttribute(name) ?
                x3dom.fields.SFVec3f.parse(ctx.xmlNode.getAttribute(name)) :
                new x3dom.fields.SFVec3f(x, y, z);
        },
        addField_SFRotation: function (ctx, name, x, y, z, a) {
            this._vf[name] = ctx && ctx.xmlNode && ctx.xmlNode.hasAttribute(name) ?
                x3dom.fields.Quaternion.parseAxisAngle(ctx.xmlNode.getAttribute(name)) :
                x3dom.fields.Quaternion.axisAngle(new x3dom.fields.SFVec3f(x, y, z), a);
        },
        addField_SFMatrix4f: function (ctx, name, _00, _01, _02, _03,
                                                  _10, _11, _12, _13,
                                                  _20, _21, _22, _23,
                                                  _30, _31, _32, _33) {
            this._vf[name] = ctx && ctx.xmlNode && ctx.xmlNode.hasAttribute(name) ?
                x3dom.fields.SFMatrix4f.parse(ctx.xmlNode.getAttribute(name)) :
                new x3dom.fields.SFMatrix4f(_00, _01, _02, _03,
                                            _10, _11, _12, _13,
                                            _20, _21, _22, _23,
                                            _30, _31, _32, _33);
        },
        addField_SFImage: function (ctx, name, def) {
            this._vf[name] = ctx && ctx.xmlNode && ctx.xmlNode.hasAttribute(name) ?
                x3dom.fields.SFImage.parse(ctx.xmlNode.getAttribute(name)) :
                new x3dom.fields.SFImage(def);
        },

        addField_MFString: function (ctx, name, def) {
            this._vf[name] = ctx && ctx.xmlNode && ctx.xmlNode.hasAttribute(name) ?
                x3dom.fields.MFString.parse(ctx.xmlNode.getAttribute(name)) :
                new x3dom.fields.MFString(def);
        },
        addField_MFInt32: function (ctx, name, def) {
            this._vf[name] = ctx && ctx.xmlNode && ctx.xmlNode.hasAttribute(name) ?
                x3dom.fields.MFInt32.parse(ctx.xmlNode.getAttribute(name)) :
                new x3dom.fields.MFInt32(def);
        },
        addField_MFFloat: function (ctx, name, def) {
            this._vf[name] = ctx && ctx.xmlNode && ctx.xmlNode.hasAttribute(name) ?
                x3dom.fields.MFFloat.parse(ctx.xmlNode.getAttribute(name)) :
                new x3dom.fields.MFFloat(def);
        },
        addField_MFDouble: function (ctx, name, def) {  // is double anyway
            this._vf[name] = ctx && ctx.xmlNode && ctx.xmlNode.hasAttribute(name) ?
                x3dom.fields.MFFloat.parse(ctx.xmlNode.getAttribute(name)) :
                new x3dom.fields.MFFloat(def);
        },
        addField_MFColor: function (ctx, name, def) {
            this._vf[name] = ctx && ctx.xmlNode && ctx.xmlNode.hasAttribute(name) ?
                x3dom.fields.MFColor.parse(ctx.xmlNode.getAttribute(name)) :
                new x3dom.fields.MFColor(def);
        },
        addField_MFColorRGBA: function (ctx, name, def) {
            this._vf[name] = ctx && ctx.xmlNode && ctx.xmlNode.hasAttribute(name) ?
                x3dom.fields.MFColorRGBA.parse(ctx.xmlNode.getAttribute(name)) :
                new x3dom.fields.MFColorRGBA(def);
        },
        addField_MFVec2f: function (ctx, name, def) {
            this._vf[name] = ctx && ctx.xmlNode && ctx.xmlNode.hasAttribute(name) ?
                x3dom.fields.MFVec2f.parse(ctx.xmlNode.getAttribute(name)) :
                new x3dom.fields.MFVec2f(def);
        },
        addField_MFVec3f: function (ctx, name, def) {
            this._vf[name] = ctx && ctx.xmlNode && ctx.xmlNode.hasAttribute(name) ?
                x3dom.fields.MFVec3f.parse(ctx.xmlNode.getAttribute(name)) :
                new x3dom.fields.MFVec3f(def);
        },
        addField_MFRotation: function (ctx, name, def) {
            this._vf[name] = ctx && ctx.xmlNode && ctx.xmlNode.hasAttribute(name) ?
                x3dom.fields.MFRotation.parse(ctx.xmlNode.getAttribute(name)) :
                new x3dom.fields.MFRotation(def);
        },

        addField_SFNode: function (name, type) {
            this._cf[name] = new x3dom.fields.SFNode(type);
        },
        addField_MFNode: function (name, type) {
            this._cf[name] = new x3dom.fields.MFNode(type);
        }
    }
));

/* ### X3DMetadataObject ### */
x3dom.registerNodeType(
    "X3DMetadataObject",
    "Core",
    defineClass(x3dom.nodeTypes.X3DNode,
        function (ctx) {
            x3dom.nodeTypes.X3DMetadataObject.superClass.call(this, ctx);

            this.addField_SFString(ctx, 'name', "");
            this.addField_SFString(ctx, 'reference', "");
        }
    )
);

/* ### MetadataDouble ### */
x3dom.registerNodeType(
    "MetadataDouble",
    "Core",
    defineClass(x3dom.nodeTypes.X3DMetadataObject,
        function (ctx) {
            x3dom.nodeTypes.MetadataDouble.superClass.call(this, ctx);

            this.addField_MFDouble(ctx, 'value', []);
        }
    )
);

/* ### MetadataFloat ### */
x3dom.registerNodeType(
    "MetadataFloat",
    "Core",
    defineClass(x3dom.nodeTypes.X3DMetadataObject,
        function (ctx) {
            x3dom.nodeTypes.MetadataFloat.superClass.call(this, ctx);

            this.addField_MFFloat(ctx, 'value', []);
        }
    )
);

/* ### MetadataInteger ### */
x3dom.registerNodeType(
    "MetadataInteger",
    "Core",
    defineClass(x3dom.nodeTypes.X3DMetadataObject,
        function (ctx) {
            x3dom.nodeTypes.MetadataInteger.superClass.call(this, ctx);

            this.addField_MFInt32(ctx, 'value', []);
        }
    )
);

/* ### MetadataSet ### */
x3dom.registerNodeType(
    "MetadataSet",
    "Core",
    defineClass(x3dom.nodeTypes.X3DMetadataObject,
        function (ctx) {
            x3dom.nodeTypes.MetadataSet.superClass.call(this, ctx);

            this.addField_MFNode('value', x3dom.nodeTypes.X3DMetadataObject);
        }
    )
);

/* ### MetadataString ### */
x3dom.registerNodeType(
    "MetadataString",
    "Core",
    defineClass(x3dom.nodeTypes.X3DMetadataObject,
        function (ctx) {
            x3dom.nodeTypes.MetadataString.superClass.call(this, ctx);

            this.addField_MFString(ctx, 'value', []);
        }
    )
);

/* ### Field ### */
x3dom.registerNodeType(
    "Field",
    "Core",
    defineClass(x3dom.nodeTypes.X3DNode,
        function (ctx) {
            x3dom.nodeTypes.Field.superClass.call(this, ctx);

            this.addField_SFString(ctx, 'name', "");
            this.addField_SFString(ctx, 'type', "");
            this.addField_SFString(ctx, 'value', "");
        },
        {
            fieldChanged: function(fieldName) {
                var that = this;
                if (fieldName === 'value') {
                    Array.forEach(this._parentNodes, function (node) {
                        node.fieldChanged(that._vf.name);
                    });
                }
            }
        }
    )
);



/* ### X3DAppearanceNode ### */
x3dom.registerNodeType(
    "X3DAppearanceNode",
    "Shape",
    defineClass(x3dom.nodeTypes.X3DNode,
        function (ctx) {
            x3dom.nodeTypes.X3DAppearanceNode.superClass.call(this, ctx);
        }
    )
);

/* ### Appearance ### */
x3dom.registerNodeType(
    "Appearance",
    "Shape",
    defineClass(x3dom.nodeTypes.X3DAppearanceNode,
        function (ctx) {
            x3dom.nodeTypes.Appearance.superClass.call(this, ctx);

            this.addField_SFNode('material', x3dom.nodeTypes.X3DMaterialNode);
            this.addField_SFNode('texture',  x3dom.nodeTypes.X3DTextureNode);
            this.addField_SFNode('textureTransform', x3dom.nodeTypes.X3DTextureTransformNode);
            this.addField_MFNode('shaders', x3dom.nodeTypes.X3DShaderNode);

            // shortcut to shader program
            this._shader = null;
        },
        {
            nodeChanged: function() {
                if (!this._cf.material.node) {
                    this.addChild(x3dom.nodeTypes.Material.defaultNode());
                }

                if (this._cf.shaders.nodes.length) {
                    this._shader = this._cf.shaders.nodes[0];
                }
            },

            texTransformMatrix: function() {
                if (this._cf.textureTransform.node === null) {
                    return x3dom.fields.SFMatrix4f.identity();
                }
                else {
                    return this._cf.textureTransform.node.texTransformMatrix();
                }
            }
        }
    )
);

x3dom.nodeTypes.Appearance.defaultNode = function() {
    if (!x3dom.nodeTypes.Appearance._defaultNode) {
        x3dom.nodeTypes.Appearance._defaultNode = new x3dom.nodeTypes.Appearance();
        x3dom.nodeTypes.Appearance._defaultNode.nodeChanged();
    }
    return x3dom.nodeTypes.Appearance._defaultNode;
};

/* ### X3DAppearanceChildNode ### */
x3dom.registerNodeType(
    "X3DAppearanceChildNode",
    "Shape",
    defineClass(x3dom.nodeTypes.X3DNode,
        function (ctx) {
            x3dom.nodeTypes.X3DAppearanceChildNode.superClass.call(this, ctx);
        }
    )
);

/* ### X3DMaterialNode ### */
x3dom.registerNodeType(
    "X3DMaterialNode",
    "Shape",
    defineClass(x3dom.nodeTypes.X3DAppearanceChildNode,
        function (ctx) {
            x3dom.nodeTypes.X3DMaterialNode.superClass.call(this, ctx);
        }
    )
);

/* ### Material ### */
x3dom.registerNodeType(
    "Material",
    "Shape",
    defineClass(x3dom.nodeTypes.X3DMaterialNode,
        function (ctx) {
            x3dom.nodeTypes.Material.superClass.call(this, ctx);

            this.addField_SFFloat(ctx, 'ambientIntensity', 0.2);
            this.addField_SFColor(ctx, 'diffuseColor', 0.8, 0.8, 0.8);
            this.addField_SFColor(ctx, 'emissiveColor', 0, 0, 0);
            this.addField_SFFloat(ctx, 'shininess', 0.2);
            this.addField_SFColor(ctx, 'specularColor', 0, 0, 0);
            this.addField_SFFloat(ctx, 'transparency', 0);
        },
		{

			fieldChanged: function(fieldName) {
				if (fieldName == "ambientIntensity" || fieldName == "diffuseColor" ||
					fieldName == "emissiveColor" || fieldName == "shininess" ||
					fieldName == "specularColor" || fieldName == "transparency")
                {
                    Array.forEach(this._parentNodes, function (app) {
                        Array.forEach(app._parentNodes, function (shape) {
                            shape._dirty.material = true;
                        });
                    });
                }
			}
		}
    )
);

x3dom.nodeTypes.Material.defaultNode = function() {
    if (!x3dom.nodeTypes.Material._defaultNode) {
        x3dom.nodeTypes.Material._defaultNode = new x3dom.nodeTypes.Material();
        x3dom.nodeTypes.Material._defaultNode.nodeChanged();
    }
    return x3dom.nodeTypes.Material._defaultNode;
};



// MESH => Mesh.js


/* ### X3DGeometryNode ### */
x3dom.registerNodeType(
    "X3DGeometryNode",
    "Rendering",
    defineClass(x3dom.nodeTypes.X3DNode,
        function (ctx) {
            x3dom.nodeTypes.X3DGeometryNode.superClass.call(this, ctx);

            this.addField_SFBool(ctx, 'solid', true);
            this.addField_SFBool(ctx, 'ccw', true);

            this._mesh = new x3dom.Mesh(this);
            this._pickable = true;
        },
        {
            getVolume: function(min, max, invalidate) {
                this._mesh.getBBox(min, max, invalidate);
                return true;
            },

            getCenter: function() {
                return this._mesh.getCenter();
            },

            doIntersect: function(line) {
                if (this._pickable) {
                    return this._mesh.doIntersect(line);
                }
                else {
                    return false;
                }
            }
        }
    )
);

/* ### Mesh ### */
x3dom.registerNodeType(
    "Mesh",
    "Rendering",
    defineClass(x3dom.nodeTypes.X3DGeometryNode,
        function (ctx) {
            x3dom.nodeTypes.Mesh.superClass.call(this, ctx);

            this.addField_SFString(ctx, 'primType', "triangle");
            this.addField_MFInt32(ctx, 'index', []);

            this.addField_MFNode('vertexAttributes', x3dom.nodeTypes.X3DVertexAttributeNode);

            this._mesh = new x3dom.Mesh(this);
        },
        {
            nodeChanged: function()
            {
                //var time0 = new Date().getTime();

                var i, n = this._cf.vertexAttributes.nodes.length;

                for (i=0; i<n; i++)
                {
                    var name = this._cf.vertexAttributes.nodes[i]._vf.name;

                    switch (name.toLowerCase())
                    {
                        case "position":
                            this._mesh._positions[0] = this._cf.vertexAttributes.nodes[i]._vf.value.toGL();
                            break;
                        case "normal":
                            this._mesh._normals[0] = this._cf.vertexAttributes.nodes[i]._vf.value.toGL();
                            break;
                        case "texcoord":
                            this._mesh._texCoords[0] = this._cf.vertexAttributes.nodes[i]._vf.value.toGL();
                            break;
                        case "color":
                            this._mesh._colors[0] = this._cf.vertexAttributes.nodes[i]._vf.value.toGL();
                            break;
                        default:
                            this._mesh._dynamicFields[name] = {};
                            this._mesh._dynamicFields[name].numComponents =
                                       this._cf.vertexAttributes.nodes[i]._vf.numComponents;
                            this._mesh._dynamicFields[name].value =
                                       this._cf.vertexAttributes.nodes[i]._vf.value.toGL();
                        break;
                    }
                }

                this._mesh._indices[0] = this._vf.index.toGL();
                this._mesh._invalidate = true;
                this._mesh._numFaces = this._mesh._indices[0].length / 3;
                this._mesh._numCoords = this._mesh._positions[0].length / 3;

                //var time1 = new Date().getTime() - time0;
                //x3dom.debug.logInfo("Mesh load time: " + time1 + " ms");
            }
        }
    )
);

/* ### Box ### */
x3dom.registerNodeType(
    "Box",
    "Geometry3D",
    defineClass(x3dom.nodeTypes.X3DGeometryNode,
        function (ctx) {
            x3dom.nodeTypes.Box.superClass.call(this, ctx);

            var sx, sy, sz;
            if (ctx.xmlNode.hasAttribute('size')) {
                var size = x3dom.fields.SFVec3f.parse(ctx.xmlNode.getAttribute('size'));
                sx = size.x;
                sy = size.y;
                sz = size.z;
            } else {
                sx = sy = sz = 2;
            }

			var geoCacheID = 'Box_'+sx+'-'+sy+'-'+sz;

			if( x3dom.geoCache[geoCacheID] != undefined )
			{
				x3dom.debug.logInfo("Using Box from Cache");
				this._mesh = x3dom.geoCache[geoCacheID];
			}
			else
			{
				sx /= 2; sy /= 2; sz /= 2;

				this._mesh._positions[0] = [
					-sx,-sy,-sz,  -sx, sy,-sz,   sx, sy,-sz,   sx,-sy,-sz, //hinten 0,0,-1
					-sx,-sy, sz,  -sx, sy, sz,   sx, sy, sz,   sx,-sy, sz, //vorne 0,0,1
					-sx,-sy,-sz,  -sx,-sy, sz,  -sx, sy, sz,  -sx, sy,-sz, //links -1,0,0
					 sx,-sy,-sz,   sx,-sy, sz,   sx, sy, sz,   sx, sy,-sz, //rechts 1,0,0
					-sx, sy,-sz,  -sx, sy, sz,   sx, sy, sz,   sx, sy,-sz, //oben 0,1,0
					-sx,-sy,-sz,  -sx,-sy, sz,   sx,-sy, sz,   sx,-sy,-sz  //unten 0,-1,0
				];
				this._mesh._normals[0] = [
					0,0,-1,  0,0,-1,   0,0,-1,   0,0,-1,
					0,0,1,  0,0,1,   0,0,1,   0,0,1,
					-1,0,0,  -1,0,0,  -1,0,0,  -1,0,0,
					1,0,0,   1,0,0,   1,0,0,   1,0,0,
					0,1,0,  0,1,0,   0,1,0,   0,1,0,
					0,-1,0,  0,-1,0,   0,-1,0,   0,-1,0
				];
				this._mesh._texCoords[0] = [
					1,0, 1,1, 0,1, 0,0,
					0,0, 0,1, 1,1, 1,0,
					0,0, 1,0, 1,1, 0,1,
					1,0, 0,0, 0,1, 1,1,
					0,1, 0,0, 1,0, 1,1,
					0,0, 0,1, 1,1, 1,0
				];
				this._mesh._indices[0] = [
					0,1,2, 2,3,0,
					4,7,5, 5,7,6,
					8,9,10, 10,11,8,
					12,14,13, 14,12,15,
					16,17,18, 18,19,16,
					20,22,21, 22,20,23
				];
				this._mesh._invalidate = true;
				this._mesh._numFaces = 12;
				this._mesh._numCoords = 24;

				x3dom.geoCache[geoCacheID] = this._mesh;
			}
        }
    )
);

/* ### Sphere ### */
x3dom.registerNodeType(
    "Sphere",
    "Geometry3D",
    defineClass(x3dom.nodeTypes.X3DGeometryNode,
        function (ctx) {
            x3dom.nodeTypes.Sphere.superClass.call(this, ctx);

            var r = ctx ? 1 : 10000;
            if (ctx && ctx.xmlNode.hasAttribute('radius')) {
                r = +ctx.xmlNode.getAttribute('radius');
            }

			var geoCacheID = 'Sphere_'+r;

			if( x3dom.geoCache[geoCacheID] != undefined )
			{
				x3dom.debug.logInfo("Using Sphere from Cache");
				this._mesh = x3dom.geoCache[geoCacheID];
			}
			else
			{
				var latNumber, longNumber;
				var latitudeBands = 24;
				var longitudeBands = 24;

				var theta, sinTheta, cosTheta;
				var phi, sinPhi, cosPhi;
				var x, y, z, u, v;

				for (latNumber = 0; latNumber <= latitudeBands; latNumber++)
				{
					theta = (latNumber * Math.PI) / latitudeBands;
					sinTheta = Math.sin(theta);
					cosTheta = Math.cos(theta);

					for (longNumber = 0; longNumber <= longitudeBands; longNumber++)
					{
						phi = (longNumber * 2.0 * Math.PI) / longitudeBands;
						sinPhi = Math.sin(phi);
						cosPhi = Math.cos(phi);

						x = -cosPhi * sinTheta;
						y = -cosTheta;
						z = -sinPhi * sinTheta;

						u = 0.25 - ((1.0 * longNumber) / longitudeBands);
						v = latNumber / latitudeBands;

						this._mesh._positions[0].push(r * x);
						this._mesh._positions[0].push(r * y);
						this._mesh._positions[0].push(r * z);
						this._mesh._normals[0].push(x);
						this._mesh._normals[0].push(y);
						this._mesh._normals[0].push(z);
						this._mesh._texCoords[0].push(u);
						this._mesh._texCoords[0].push(v);
					}
				}

				var first, second;

				for (latNumber = 0; latNumber < latitudeBands; latNumber++)
				{
					for (longNumber = 0; longNumber < longitudeBands; longNumber++)
					{
						first = (latNumber * (longitudeBands + 1)) + longNumber;
						second = first + longitudeBands + 1;

						this._mesh._indices[0].push(first);
						this._mesh._indices[0].push(second);
						this._mesh._indices[0].push(first + 1);

						this._mesh._indices[0].push(second);
						this._mesh._indices[0].push(second + 1);
						this._mesh._indices[0].push(first + 1);
					}
				}

				this._mesh._invalidate = true;
				this._mesh._numFaces = this._mesh._indices[0].length / 3;
				this._mesh._numCoords = this._mesh._positions[0].length / 3;

				x3dom.geoCache[geoCacheID] = this._mesh;
			}
        }
    )
);

/* ### Torus ### */
x3dom.registerNodeType(
    "Torus",
    "Geometry3D",
    defineClass(x3dom.nodeTypes.X3DGeometryNode,
        function (ctx) {
            x3dom.nodeTypes.Torus.superClass.call(this, ctx);

            var innerRadius = 0.5, outerRadius = 1.0;

            if (ctx.xmlNode.hasAttribute('innerRadius')) {
                innerRadius = +ctx.xmlNode.getAttribute('innerRadius');
            }
            if (ctx.xmlNode.hasAttribute('outerRadius')) {
                outerRadius = +ctx.xmlNode.getAttribute('outerRadius');
            }

			var geoCacheID = 'Torus_'+innerRadius+'_'+outerRadius;

			if( x3dom.geoCache[geoCacheID] != undefined )
			{
				x3dom.debug.logInfo("Using Torus from Cache");
				this._mesh = x3dom.geoCache[geoCacheID];
			}
			else
			{

				var rings = 24, sides = 24;
				var ringDelta = 2.0 * Math.PI / rings;
				var sideDelta = 2.0 * Math.PI / sides;
				var p = [], n = [], t = [], i = [];
				var a, b, theta, phi;

				for (a=0, theta=0; a <= rings; a++, theta+=ringDelta)
				{
					var cosTheta = Math.cos(theta);
					var sinTheta = Math.sin(theta);

					for (b=0, phi=0; b<=sides; b++, phi+=sideDelta)
					{
						var cosPhi = Math.cos(phi);
						var sinPhi = Math.sin(phi);
						var dist = outerRadius + innerRadius * cosPhi;

						n.push(cosTheta * cosPhi, -sinTheta * cosPhi, sinPhi);
						p.push(cosTheta * dist, -sinTheta * dist, innerRadius * sinPhi);
						t.push(-a / rings, b / sides);
					}
				}

				for (a=0; a<sides; a++)
				{
					for (b=0; b<rings; b++)
					{
						i.push(b * (sides+1) + a);
						i.push(b * (sides+1) + a + 1);
						i.push((b + 1) * (sides+1) + a);

						i.push(b * (sides+1) + a + 1);
						i.push((b + 1) * (sides+1) + a + 1);
						i.push((b + 1) * (sides+1) + a);
					}
				}

				this._mesh._positions[0] = p;
				this._mesh._normals[0] = n;
				this._mesh._texCoords[0] = t;
				this._mesh._indices[0] = i;
				this._mesh._invalidate = true;
				this._mesh._numFaces = this._mesh._indices[0].length / 3;
				this._mesh._numCoords = this._mesh._positions[0].length / 3;

				x3dom.geoCache[geoCacheID] = this._mesh;
			}
        }
    )
);

/* ### Cone ### */
x3dom.registerNodeType(
    "Cone",
    "Geometry3D",
    defineClass(x3dom.nodeTypes.X3DGeometryNode,
        function (ctx) {
            x3dom.nodeTypes.Cone.superClass.call(this, ctx);

            this.addField_SFFloat(ctx, 'bottomRadius', 1.0);
            this.addField_SFFloat(ctx, 'height', 2.0);
            this.addField_SFBool(ctx, 'bottom', true);
            this.addField_SFBool(ctx, 'side', true);

			var geoCacheID = 'Cone_'+this._vf.bottomRadius+'_'+this._vf.height+'_'+this._vf.bottom+'_'+this._vf.side;

			if( x3dom.geoCache[geoCacheID] != undefined )
			{
				x3dom.debug.logInfo("Using Cone from Cache");
				this._mesh = x3dom.geoCache[geoCacheID];
			}
			else
			{
				var bottomRadius = this._vf.bottomRadius, height = this._vf.height;

				var beta, x, z;
				var sides = 32;
				var delta = 2.0 * Math.PI / sides;
				var incl = bottomRadius / height;
				var nlen = 1.0 / Math.sqrt(1.0 + incl * incl);
				var p = [], n = [], t = [], i = [];

				var j = 0;

				if (this._vf.side)
				{
				  for (j=0, k=0; j<=sides; j++)
				  {
					beta = j * delta;
					x = Math.sin(beta);
					z = -Math.cos(beta);

					p.push(0, height/2, 0);
					n.push(x/nlen, incl/nlen, z/nlen);
					t.push(1.0 - j / sides, 1);

					p.push(x * bottomRadius, -height/2, z * bottomRadius);
					n.push(x/nlen, incl/nlen, z/nlen);
					t.push(1.0 - j / sides, 0);

					if (j > 0)
					{
						i.push(k + 0);
						i.push(k + 2);
						i.push(k + 1);

						i.push(k + 1);
						i.push(k + 2);
						i.push(k + 3);

						k += 2;
					}
				  }
				}

				if (this._vf.bottom && bottomRadius > 0)
				{
					var base = p.length / 3;

					for (j=sides-1; j>=0; j--)
					{
						beta = j * delta;
						x = bottomRadius * Math.sin(beta);
						z = -bottomRadius * Math.cos(beta);

						p.push(x, -height/2, z);
						n.push(0, -1, 0);
						t.push(x / bottomRadius / 2 + 0.5, z / bottomRadius / 2 + 0.5);
					}

					var h = base + 1;

					for (j=2; j<sides; j++)
					{
						i.push(h);
						i.push(base);

						h = base + j;
						i.push(h);
					}
				}

				this._mesh._positions[0] = p;
				this._mesh._normals[0] = n;
				this._mesh._texCoords[0] = t;
				this._mesh._indices[0] = i;
				this._mesh._invalidate = true;
				this._mesh._numFaces = this._mesh._indices[0].length / 3;
				this._mesh._numCoords = this._mesh._positions[0].length / 3;

				x3dom.geoCache[geoCacheID] = this._mesh;
			}
        }
    )
);

/* ### Cylinder ### */
x3dom.registerNodeType(
    "Cylinder",
    "Geometry3D",
    defineClass(x3dom.nodeTypes.X3DGeometryNode,
        function (ctx) {
            x3dom.nodeTypes.Cylinder.superClass.call(this, ctx);

            var radius = 1.0;
            var height = 2.0;

            this.addField_SFFloat(ctx, 'radius', 1.0);
            this.addField_SFFloat(ctx, 'height', 2.0);
            this.addField_SFBool(ctx, 'bottom', true);
            this.addField_SFBool(ctx, 'top', true);
            this.addField_SFBool(ctx, 'side', true);

			var geoCacheID = 'Cylinder_'+this._vf.radius+'_'+this._vf.height+'_'+this._vf.bottom+'_'+this._vf.top+'_'+this._vf.side;

			if( x3dom.geoCache[geoCacheID] != undefined )
			{
				x3dom.debug.logInfo("Using Cylinder from Cache");
				this._mesh = x3dom.geoCache[geoCacheID];
			}
			else
			{

				radius = this._vf.radius;
				height = this._vf.height;

				var beta, x, z;
				var sides = 24;
				var delta = 2.0 * Math.PI / sides;
				var p = [], n = [], t = [], i = [];

				var j = 0;
				if (this._vf.side)
				{
				  for (j=0, k=0; j<=sides; j++)
				  {
					beta = j * delta;
					x = Math.sin(beta);
					z = -Math.cos(beta);

					p.push(x * radius, -height/2, z * radius);
					n.push(x, 0, z);
					t.push(1.0 - j / sides, 0);

					p.push(x * radius, height/2, z * radius);
					n.push(x, 0, z);
					t.push(1.0 - j / sides, 1);

					if (j > 0)
					{
						i.push(k + 0);
						i.push(k + 1);
						i.push(k + 2);

						i.push(k + 2);
						i.push(k + 1);
						i.push(k + 3);

						k += 2;
					}
				  }
				}

				if (radius > 0)
				{
					var h, base = p.length / 3;

					if (this._vf.top)
					{
					  for (j=sides-1; j>=0; j--)
					  {
						beta = j * delta;
						x = radius * Math.sin(beta);
						z = -radius * Math.cos(beta);

						p.push(x, height/2, z);
						n.push(0, 1, 0);
						t.push(x / radius / 2 + 0.5, -z / radius / 2 + 0.5);
					  }

					  h = base + 1;

					  for (j=2; j<sides; j++)
					  {
						i.push(base);
						i.push(h);

						h = base + j;
						i.push(h);
					  }

					  base = p.length / 3;
					}

					if (this._vf.bottom)
					{
					  for (j=sides-1; j>=0; j--)
					  {
						beta = j * delta;
						x = radius * Math.sin(beta);
						z = -radius * Math.cos(beta);

						p.push(x, -height/2, z);
						n.push(0, -1, 0);
						t.push(x / radius / 2 + 0.5, z / radius / 2 + 0.5);
					  }

					  h = base + 1;

					  for (j=2; j<sides; j++)
					  {
						i.push(h);
						i.push(base);

						h = base + j;
						i.push(h);
					  }
					}
				}

				this._mesh._positions[0] = p;
				this._mesh._normals[0] = n;
				this._mesh._texCoords[0] = t;
				this._mesh._indices[0] = i;
				this._mesh._invalidate = true;
				this._mesh._numFaces = this._mesh._indices[0].length / 3;
				this._mesh._numCoords = this._mesh._positions[0].length / 3;

				x3dom.geoCache[geoCacheID] = this._mesh;
			}
        }
    )
);

/* ### PointSet ### */
x3dom.registerNodeType(
    "PointSet",
    "Rendering",
    defineClass(x3dom.nodeTypes.X3DGeometryNode,
        function (ctx) {
            x3dom.nodeTypes.PointSet.superClass.call(this, ctx);

            this.addField_SFNode('coord', x3dom.nodeTypes.Coordinate);
            this.addField_SFNode('color', x3dom.nodeTypes.X3DColorNode);

            this._pickable = false;
        },
        {
            nodeChanged: function()
            {
                var time0 = new Date().getTime();

                var coordNode = this._cf.coord.node;
                x3dom.debug.assert(coordNode);
                var positions = coordNode._vf.point;

                var numColComponents = 3;
                var colorNode = this._cf.color.node;
                var colors = new x3dom.fields.MFColor();
                if (colorNode) {
                    colors = colorNode._vf.color;
                    x3dom.debug.assert(positions.length == colors.length);

                    if (x3dom.isa(colorNode, x3dom.nodeTypes.ColorRGBA)) {
                        numColComponents = 4;
                    }
                }
                else {
                    for (var i=0, n=positions.length; i<n; i++) {
                        colors.push(1.0);
                    }
                }

                this._mesh._numColComponents = numColComponents;
                this._mesh._indices[0] = [];
                this._mesh._positions[0] = positions.toGL();
                this._mesh._colors[0] = colors.toGL();
                this._mesh._normals[0] = [];
                this._mesh._texCoords[0] = [];
                this._mesh._lit = false;
                this._mesh._invalidate = true;
                this._mesh._numCoords = this._mesh._positions[0].length / 3;

                var time1 = new Date().getTime() - time0;
                //x3dom.debug.logInfo("Mesh load time: " + time1 + " ms");
            },

            fieldChanged: function(fieldName)
            {
                var pnts;
                var i, n;

                if (fieldName == "coord")   // same as in IFS
                {
                    pnts = this._cf.coord.node._vf.point;
                    n = pnts.length;

                    this._mesh._positions[0] = [];

                    // TODO; optimize (is there a memcopy?)
                    for (i=0; i<n; i++)
                    {
                        this._mesh._positions[0].push(pnts[i].x);
                        this._mesh._positions[0].push(pnts[i].y);
                        this._mesh._positions[0].push(pnts[i].z);
                    }

                    this._mesh._invalidate = true;

                    Array.forEach(this._parentNodes, function (node) {
                        node._dirty.positions = true;
                    });
                }
                else if (fieldName == "color")
                {
                    pnts = this._cf.color.node._vf.color;
                    n = pnts.length;

                    this._mesh._colors[0] = [];

                    for (i=0; i<n; i++)
                    {
                        this._mesh._colors[0].push(pnts[i].r);
                        this._mesh._colors[0].push(pnts[i].g);
                        this._mesh._colors[0].push(pnts[i].b);
                    }

                    Array.forEach(this._parentNodes, function (node) {
                        node._dirty.colors = true;
                    });
                }
            }
        }
    )
);

/* ### X3DComposedGeometryNode ### */
x3dom.registerNodeType(
    "X3DComposedGeometryNode",
    "Rendering",
    defineClass(x3dom.nodeTypes.X3DGeometryNode,
        function (ctx) {
            x3dom.nodeTypes.X3DComposedGeometryNode.superClass.call(this, ctx);

            this.addField_SFBool(ctx, 'colorPerVertex', true);
            this.addField_SFBool(ctx, 'normalPerVertex', true);

            this.addField_MFNode('attrib', x3dom.nodeTypes.X3DVertexAttributeNode);

            this.addField_SFNode('coord', x3dom.nodeTypes.Coordinate);
            this.addField_SFNode('normal', x3dom.nodeTypes.Normal);
            this.addField_SFNode('color', x3dom.nodeTypes.X3DColorNode);
            this.addField_SFNode('texCoord', x3dom.nodeTypes.X3DTextureCoordinateNode);
        },
        {
            handleAttribs: function()
            {
                //var time0 = new Date().getTime();

                var i, n = this._cf.attrib.nodes.length;

                for (i=0; i<n; i++)
                {
                    var name = this._cf.attrib.nodes[i]._vf.name;

                    switch (name.toLowerCase())
                    {
                        case "position":
                            this._mesh._positions[0] = this._cf.attrib.nodes[i]._vf.value.toGL();
                            break;
                        case "normal":
                            this._mesh._normals[0] = this._cf.attrib.nodes[i]._vf.value.toGL();
                            break;
                        case "texcoord":
                            this._mesh._texCoords[0] = this._cf.attrib.nodes[i]._vf.value.toGL();
                            break;
                        case "color":
                            this._mesh._colors[0] = this._cf.attrib.nodes[i]._vf.value.toGL();
                            break;
                        default:
                            this._mesh._dynamicFields[name] = {};
                            this._mesh._dynamicFields[name].numComponents =
                                       this._cf.attrib.nodes[i]._vf.numComponents;
                            this._mesh._dynamicFields[name].value =
                                       this._cf.attrib.nodes[i]._vf.value.toGL();
                        break;
                    }
                }

                //var time1 = new Date().getTime() - time0;
                //x3dom.debug.logInfo("Mesh load time: " + time1 + " ms");
            }
        }
    )
);

/* ### IndexedLineSet ### */
x3dom.registerNodeType(
    "IndexedLineSet",
    "Rendering",
    defineClass(x3dom.nodeTypes.X3DGeometryNode,
        function (ctx) {
            x3dom.nodeTypes.IndexedLineSet.superClass.call(this, ctx);

            this.addField_SFBool(ctx, 'colorPerVertex', true);  // TODO

            this.addField_MFNode('attrib', x3dom.nodeTypes.X3DVertexAttributeNode);
            this.addField_SFNode('coord', x3dom.nodeTypes.Coordinate);
            this.addField_SFNode('color', x3dom.nodeTypes.X3DColorNode);

            this.addField_MFInt32(ctx, 'coordIndex', []);
            this.addField_MFInt32(ctx, 'colorIndex', []);

            this._pickable = false;
        },
        {
            nodeChanged: function()
            {
                var time0 = new Date().getTime();

                // this.handleAttribs();

                var indexes = this._vf.coordIndex;
                var colorInd = this._vf.colorIndex;

                var hasColor = false, hasColorInd = false;

                // TODO; implement colorPerVertex also for single index
                var colPerVert = this._vf.colorPerVertex;

                if (colorInd.length > 0)
                {
                    hasColorInd = true;
                }

                var positions, colors;

                var coordNode = this._cf.coord.node;
                x3dom.debug.assert(coordNode);
                positions = coordNode._vf.point;

                var numColComponents = 3;
                var colorNode = this._cf.color.node;
                if (colorNode)
                {
                    hasColor = true;
                    colors = colorNode._vf.color;

                    if (x3dom.isa(colorNode, x3dom.nodeTypes.ColorRGBA)) {
                        numColComponents = 4;
                    }
                }
                else {
                    hasColor = false;
                }

                this._mesh._indices[0] = [];
                this._mesh._positions[0] = [];
                this._mesh._colors[0] = [];

                var i, t, cnt, lineCnt;
                var p0, p1, c0, c1;

                if ( (hasColor && hasColorInd) )
                {
                    // Found MultiIndex Mesh
                    t = 0;
                    cnt = 0;
                    lineCnt = 0;

                    for (i=0; i < indexes.length; ++i)
                    {
                        if (indexes[i] === -1) {
                            t = 0;
                            continue;
                        }

                        if (hasColorInd) {
                            x3dom.debug.assert(colorInd[i] != -1);
                        }

                        switch (t)
                        {
                            case 0:
                                p0 = +indexes[i];
                                if (hasColorInd && colPerVert) { c0 = +colorInd[i]; }
                                else { c0 = p0; }
                                t = 1;
                            break;
                            case 1:
                                p1 = +indexes[i];
                                if (hasColorInd && colPerVert) { c1 = +colorInd[i]; }
                                else if (hasColorInd && !colPerVert) { c1 = +colorInd[lineCnt]; }
                                else { c1 = p1; }

                                this._mesh._indices[0].push(cnt++, cnt++);

                                this._mesh._positions[0].push(positions[p0].x);
                                this._mesh._positions[0].push(positions[p0].y);
                                this._mesh._positions[0].push(positions[p0].z);
                                this._mesh._positions[0].push(positions[p1].x);
                                this._mesh._positions[0].push(positions[p1].y);
                                this._mesh._positions[0].push(positions[p1].z);

                                if (hasColor) {
                                    if (!colPerVert) {
                                        c0 = c1;
                                    }
                                    this._mesh._colors[0].push(colors[c0].r);
                                    this._mesh._colors[0].push(colors[c0].g);
                                    this._mesh._colors[0].push(colors[c0].b);
                                    this._mesh._colors[0].push(colors[c1].r);
                                    this._mesh._colors[0].push(colors[c1].g);
                                    this._mesh._colors[0].push(colors[c1].b);
                                }

                                t = 2;
                                lineCnt++;
                            break;
                            case 3:
                                p0 = p1;
                                c0 = c1;
                                p1 = +indexes[i];
                                if (hasColorInd && colPerVert) { c1 = +colorInd[i]; }
                                else if (hasColorInd && !colPerVert) { c1 = +colorInd[lineCnt]; }
                                else { c1 = p1; }

                                this._mesh._indices[0].push(cnt++, cnt++);

                                this._mesh._positions[0].push(positions[p0].x);
                                this._mesh._positions[0].push(positions[p0].y);
                                this._mesh._positions[0].push(positions[p0].z);
                                this._mesh._positions[0].push(positions[p1].x);
                                this._mesh._positions[0].push(positions[p1].y);
                                this._mesh._positions[0].push(positions[p1].z);

                                if (hasColor) {
                                    if (!colPerVert) {
                                        c0 = c1;
                                    }
                                    this._mesh._colors[0].push(colors[c0].r);
                                    this._mesh._colors[0].push(colors[c0].g);
                                    this._mesh._colors[0].push(colors[c0].b);
                                    this._mesh._colors[0].push(colors[c1].r);
                                    this._mesh._colors[0].push(colors[c1].g);
                                    this._mesh._colors[0].push(colors[c1].b);
                                }

                                lineCnt++;
                            break;
                            default:
                        }
                    }
                } // if isMulti
                else
                {
                    t = 0;

                    for (i=0; i < indexes.length; ++i)
                    {
                        if (indexes[i] === -1) {
                            t = 0;
                            continue;
                        }

                        switch (t) {
                        case 0: p0 = +indexes[i]; t = 1; break;
                        case 1: p1 = +indexes[i]; t = 2; this._mesh._indices[0].push(p0, p1); break;
                        case 2: p0 = p1; p1 = +indexes[i]; this._mesh._indices[0].push(p0, p1); break;
                        }
                    }

                    this._mesh._positions[0] = positions.toGL();

                    if (hasColor) {
                        this._mesh._colors[0] = colors.toGL();
                        this._mesh._numColComponents = numColComponents;
                    }
                }

                this._mesh._invalidate = true;
                this._mesh._numCoords = this._mesh._positions[0].length / 3;

                var time1 = new Date().getTime() - time0;
                //x3dom.debug.logInfo("Mesh load time: " + time1 + " ms");
            },

            fieldChanged: function(fieldName)
            {
                var pnts;
                var i, n;

                if (fieldName == "coord")
                {
                    // TODO; multi-index with different this._mesh._indices
                    pnts = this._cf.coord.node._vf.point;
                    n = pnts.length;

                    this._mesh._positions[0] = [];

                    for (i=0; i<n; i++)
                    {
                        this._mesh._positions[0].push(pnts[i].x);
                        this._mesh._positions[0].push(pnts[i].y);
                        this._mesh._positions[0].push(pnts[i].z);
                    }

                    this._mesh._invalidate = true;

                    Array.forEach(this._parentNodes, function (node) {
                        node._dirty.positions = true;
                    });
                }
                else if (fieldName == "color")
                {
                    pnts = this._cf.color.node._vf.color;
                    n = pnts.length;

                    this._mesh._colors[0] = [];

                    for (i=0; i<n; i++)
                    {
                        this._mesh._colors[0].push(pnts[i].r);
                        this._mesh._colors[0].push(pnts[i].g);
                        this._mesh._colors[0].push(pnts[i].b);
                    }

                    Array.forEach(this._parentNodes, function (node) {
                        node._dirty.colors = true;
                    });
                }
            }
        }
    )
);

/* ### IndexedFaceSet ### */
x3dom.registerNodeType(
    "IndexedFaceSet",
    "Geometry3D",
    defineClass(x3dom.nodeTypes.X3DComposedGeometryNode,
        function (ctx) {
            x3dom.nodeTypes.IndexedFaceSet.superClass.call(this, ctx);

            this.addField_SFFloat(ctx, 'creaseAngle', 0);   // TODO

            this.addField_MFInt32(ctx, 'coordIndex', []);
            this.addField_MFInt32(ctx, 'normalIndex', []);
            this.addField_MFInt32(ctx, 'colorIndex', []);
            this.addField_MFInt32(ctx, 'texCoordIndex', []);
        },
        {
            nodeChanged: function()
            {
                var time0 = new Date().getTime();

                this.handleAttribs();

                var indexes = this._vf.coordIndex;
                var normalInd = this._vf.normalIndex;
                var texCoordInd = this._vf.texCoordIndex;
                var colorInd = this._vf.colorIndex;

                var hasNormal = false, hasNormalInd = false;
                var hasTexCoord = false, hasTexCoordInd = false;
                var hasColor = false, hasColorInd = false;

                var colPerVert = this._vf.colorPerVertex;
                var normPerVert = this._vf.normalPerVertex;

                if (normalInd.length > 0)
                {
                    hasNormalInd = true;
                }
                if (texCoordInd.length > 0)
                {
                    hasTexCoordInd = true;
                }
                if (colorInd.length > 0)
                {
                    hasColorInd = true;
                }

                var positions, normals, texCoords, colors;

                var coordNode = this._cf.coord.node;
                x3dom.debug.assert(coordNode);
                positions = coordNode._vf.point;

                var normalNode = this._cf.normal.node;
                if (normalNode)
                {
                    hasNormal = true;
                    normals = normalNode._vf.vector;
                }
                else {
                    hasNormal = false;
                }

                var texMode = "", numTexComponents = 2;
                var texCoordNode = this._cf.texCoord.node;
                if (texCoordNode)
                {
                    if (texCoordNode._vf.point) {
                        hasTexCoord = true;
                        texCoords = texCoordNode._vf.point;

                        if (x3dom.isa(texCoordNode, x3dom.nodeTypes.TextureCoordinate3D)) {
                            numTexComponents = 3;
                        }
                    }
                    else if (texCoordNode._vf.mode) {
                        texMode = texCoordNode._vf.mode;
                    }
                }
                else {
                    hasTexCoord = false;
                }
                this._mesh._numTexComponents = numTexComponents;

                var numColComponents = 3;
                var colorNode = this._cf.color.node;
                if (colorNode)
                {
                    hasColor = true;
                    colors = colorNode._vf.color;

                    if (x3dom.isa(colorNode, x3dom.nodeTypes.ColorRGBA)) {
                        numColComponents = 4;
                    }
                }
                else {
                    hasColor = false;
                }
                this._mesh._numColComponents = numColComponents;

                this._mesh._indices[0] = [];
                this._mesh._positions[0] = [];
                this._mesh._normals[0] = [];
                this._mesh._texCoords[0] = [];
                this._mesh._colors[0] = [];

                var i, t, cnt, faceCnt;
                var p0, p1, p2, n0, n1, n2, t0, t1, t2, c0, c1, c2;

                if ( (this._vf.creaseAngle <= x3dom.fields.Eps) ||  // FIXME; what to do for ipols?
                     (positions.length / 3 > 65535) ||
                     (hasNormal && hasNormalInd) ||
                     (hasTexCoord && hasTexCoordInd) ||
                     (hasColor && hasColorInd) )
                {
                    // Found MultiIndex Mesh
                    t = 0;
                    cnt = 0;
                    faceCnt = 0;
                    this._mesh._multiIndIndices = [];
                    this._mesh._posSize = positions.length;

                    for (i=0; i < indexes.length; ++i)
                    {
                        // Convert non-triangular polygons to a triangle fan
                        // (TODO: this assumes polygons are convex)
                        if (indexes[i] == -1) {
                            t = 0;
                            faceCnt++;
                            continue;
                        }

                        if (hasNormalInd) {
                            x3dom.debug.assert(normalInd[i] != -1);
                        }
                        if (hasTexCoordInd) {
                            x3dom.debug.assert(texCoordInd[i] != -1);
                        }
                        if (hasColorInd) {
                            x3dom.debug.assert(colorInd[i] != -1);
                        }

                        //TODO: OPTIMIZE but think about cache coherence regarding arrays!!!
                        switch (t)
                        {
                            case 0:
                                p0 = +indexes[i];
                                if (hasNormalInd && normPerVert) { n0 = +normalInd[i]; }
                                else if (hasNormalInd && !normPerVert) { n0 = +normalInd[faceCnt]; }
                                else { n0 = p0; }
                                if (hasTexCoordInd) { t0 = +texCoordInd[i]; }
                                else { t0 = p0; }
                                if (hasColorInd && colPerVert) { c0 = +colorInd[i]; }
                                else if (hasColorInd && !colPerVert) { c0 = +colorInd[faceCnt]; }
                                else { c0 = p0; }
                                t = 1;
                            break;
                            case 1:
                                p1 = +indexes[i];
                                if (hasNormalInd && normPerVert) { n1 = +normalInd[i]; }
                                else if (hasNormalInd && !normPerVert) { n1 = +normalInd[faceCnt]; }
                                else { n1 = p1; }
                                if (hasTexCoordInd) { t1 = +texCoordInd[i]; }
                                else { t1 = p1; }
                                if (hasColorInd && colPerVert) { c1 = +colorInd[i]; }
                                else if (hasColorInd && !colPerVert) { c1 = +colorInd[faceCnt]; }
                                else { c1 = p1; }
                                t = 2;
                            break;
                            case 2:
                                p2 = +indexes[i];
                                if (hasNormalInd && normPerVert) { n2 = +normalInd[i]; }
                                else if (hasNormalInd && !normPerVert) { n2 = +normalInd[faceCnt]; }
                                else { n2 = p2; }
                                if (hasTexCoordInd) { t2 = +texCoordInd[i]; }
                                else { t2 = p2; }
                                if (hasColorInd && colPerVert) { c2 = +colorInd[i]; }
                                else if (hasColorInd && !colPerVert) { c2 = +colorInd[faceCnt]; }
                                else { c2 = p2; }
                                t = 3;

                                this._mesh._indices[0].push(cnt++, cnt++, cnt++);

                                this._mesh._positions[0].push(positions[p0].x);
                                this._mesh._positions[0].push(positions[p0].y);
                                this._mesh._positions[0].push(positions[p0].z);
                                this._mesh._positions[0].push(positions[p1].x);
                                this._mesh._positions[0].push(positions[p1].y);
                                this._mesh._positions[0].push(positions[p1].z);
                                this._mesh._positions[0].push(positions[p2].x);
                                this._mesh._positions[0].push(positions[p2].y);
                                this._mesh._positions[0].push(positions[p2].z);

                                if (hasNormal) {
                                    this._mesh._normals[0].push(normals[n0].x);
                                    this._mesh._normals[0].push(normals[n0].y);
                                    this._mesh._normals[0].push(normals[n0].z);
                                    this._mesh._normals[0].push(normals[n1].x);
                                    this._mesh._normals[0].push(normals[n1].y);
                                    this._mesh._normals[0].push(normals[n1].z);
                                    this._mesh._normals[0].push(normals[n2].x);
                                    this._mesh._normals[0].push(normals[n2].y);
                                    this._mesh._normals[0].push(normals[n2].z);
                                }
                                else {
                                    this._mesh._multiIndIndices.push(p0, p1, p2);
                                    //this._mesh._multiIndIndices.push(cnt-3, cnt-2, cnt-1);
                                }

                                if (hasColor) {
                                    this._mesh._colors[0].push(colors[c0].r);
                                    this._mesh._colors[0].push(colors[c0].g);
                                    this._mesh._colors[0].push(colors[c0].b);
                                    if (numColComponents === 4) {
                                        this._mesh._colors[0].push(colors[c0].a);
                                    }
                                    this._mesh._colors[0].push(colors[c1].r);
                                    this._mesh._colors[0].push(colors[c1].g);
                                    this._mesh._colors[0].push(colors[c1].b);
                                    if (numColComponents === 4) {
                                        this._mesh._colors[0].push(colors[c1].a);
                                    }
                                    this._mesh._colors[0].push(colors[c2].r);
                                    this._mesh._colors[0].push(colors[c2].g);
                                    this._mesh._colors[0].push(colors[c2].b);
                                    if (numColComponents === 4) {
                                        this._mesh._colors[0].push(colors[c2].a);
                                    }
                                }

                                if (hasTexCoord) {
                                    this._mesh._texCoords[0].push(texCoords[t0].x);
                                    this._mesh._texCoords[0].push(texCoords[t0].y);
                                    if (numTexComponents === 3) {
                                        this._mesh._texCoords[0].push(texCoords[t0].z);
                                    }
                                    this._mesh._texCoords[0].push(texCoords[t1].x);
                                    this._mesh._texCoords[0].push(texCoords[t1].y);
                                    if (numTexComponents === 3) {
                                        this._mesh._texCoords[0].push(texCoords[t1].z);
                                    }
                                    this._mesh._texCoords[0].push(texCoords[t2].x);
                                    this._mesh._texCoords[0].push(texCoords[t2].y);
                                    if (numTexComponents === 3) {
                                        this._mesh._texCoords[0].push(texCoords[t2].z);
                                    }
                                }

                                //faceCnt++;
                            break;
                            case 3:
                                p1 = p2;
                                t1 = t2;
                                if (normPerVert) {
                                    n1 = n2;
                                }
                                if (colPerVert) {
                                    c1 = c2;
                                }
                                p2 = +indexes[i];

                                if (hasNormalInd && normPerVert) {
                                    n2 = +normalInd[i];
                                } else if (hasNormalInd && !normPerVert) {
                                    /*n2 = +normalInd[faceCnt];*/
                                } else {
                                    n2 = p2;
                                }

                                if (hasTexCoordInd) {
                                    t2 = +texCoordInd[i];
                                } else {
                                    t2 = p2;
                                }

                                if (hasColorInd && colPerVert) {
                                    c2 = +colorInd[i];
                                } else if (hasColorInd && !colPerVert) {
                                    /*c2 = +colorInd[faceCnt];*/
                                } else {
                                    c2 = p2;
                                }

                                this._mesh._indices[0].push(cnt++, cnt++, cnt++);

                                this._mesh._positions[0].push(positions[p0].x);
                                this._mesh._positions[0].push(positions[p0].y);
                                this._mesh._positions[0].push(positions[p0].z);
                                this._mesh._positions[0].push(positions[p1].x);
                                this._mesh._positions[0].push(positions[p1].y);
                                this._mesh._positions[0].push(positions[p1].z);
                                this._mesh._positions[0].push(positions[p2].x);
                                this._mesh._positions[0].push(positions[p2].y);
                                this._mesh._positions[0].push(positions[p2].z);

                                if (hasNormal) {
                                    this._mesh._normals[0].push(normals[n0].x);
                                    this._mesh._normals[0].push(normals[n0].y);
                                    this._mesh._normals[0].push(normals[n0].z);
                                    this._mesh._normals[0].push(normals[n1].x);
                                    this._mesh._normals[0].push(normals[n1].y);
                                    this._mesh._normals[0].push(normals[n1].z);
                                    this._mesh._normals[0].push(normals[n2].x);
                                    this._mesh._normals[0].push(normals[n2].y);
                                    this._mesh._normals[0].push(normals[n2].z);
                                }
                                else {
                                    this._mesh._multiIndIndices.push(p0, p1, p2);
                                    //this._mesh._multiIndIndices.push(cnt-3, cnt-2, cnt-1);
                                }

                                if (hasColor) {
                                    this._mesh._colors[0].push(colors[c0].r);
                                    this._mesh._colors[0].push(colors[c0].g);
                                    this._mesh._colors[0].push(colors[c0].b);
                                    if (numColComponents === 4) {
                                        this._mesh._colors[0].push(colors[c0].a);
                                    }
                                    this._mesh._colors[0].push(colors[c1].r);
                                    this._mesh._colors[0].push(colors[c1].g);
                                    this._mesh._colors[0].push(colors[c1].b);
                                    if (numColComponents === 4) {
                                        this._mesh._colors[0].push(colors[c1].a);
                                    }
                                    this._mesh._colors[0].push(colors[c2].r);
                                    this._mesh._colors[0].push(colors[c2].g);
                                    this._mesh._colors[0].push(colors[c2].b);
                                    if (numColComponents === 4) {
                                        this._mesh._colors[0].push(colors[c2].a);
                                    }
                                }

                                if (hasTexCoord) {
                                    this._mesh._texCoords[0].push(texCoords[t0].x);
                                    this._mesh._texCoords[0].push(texCoords[t0].y);
                                    if (numTexComponents === 3) {
                                        this._mesh._texCoords[0].push(texCoords[t0].z);
                                    }
                                    this._mesh._texCoords[0].push(texCoords[t1].x);
                                    this._mesh._texCoords[0].push(texCoords[t1].y);
                                    if (numTexComponents === 3) {
                                        this._mesh._texCoords[0].push(texCoords[t1].z);
                                    }
                                    this._mesh._texCoords[0].push(texCoords[t2].x);
                                    this._mesh._texCoords[0].push(texCoords[t2].y);
                                    if (numTexComponents === 3) {
                                        this._mesh._texCoords[0].push(texCoords[t2].z);
                                    }
                                }

                                //faceCnt++;
                            break;
                            default:
                        }
                    }

                    if (!hasNormal) {
                        this._mesh.calcNormals(this._vf.creaseAngle);
                    }
                    if (!hasTexCoord) {
                        this._mesh.calcTexCoords(texMode);
                    }

                    this._mesh.splitMesh();

                    //x3dom.debug.logInfo(this._mesh._indices.length);
                } // if isMulti
                else
                {
                    t = 0;

                    for (i = 0; i < indexes.length; ++i)
                    {
                        // Convert non-triangular polygons to a triangle fan
                        // (TODO: this assumes polygons are convex)
                        if (indexes[i] == -1) {
                            t = 0;
                            continue;
                        }

                        switch (t) {
                        case 0: n0 = +indexes[i]; t = 1; break;
                        case 1: n1 = +indexes[i]; t = 2; break;
                        case 2: n2 = +indexes[i]; t = 3; this._mesh._indices[0].push(n0, n1, n2); break;
                        case 3: n1 = n2; n2 = +indexes[i]; this._mesh._indices[0].push(n0, n1, n2); break;
                        }
                    }

                    this._mesh._positions[0] = positions.toGL();

                    if (hasNormal) {
                        this._mesh._normals[0] = normals.toGL();
                    }
                    else {
                        this._mesh.calcNormals(this._vf.creaseAngle);
                    }
                    if (hasTexCoord) {
                        this._mesh._texCoords[0] = texCoords.toGL();
                        this._mesh._numTexComponents = numTexComponents;
                    }
                    else {
                        this._mesh.calcTexCoords(texMode);
                    }
                    if (hasColor) {
                        this._mesh._colors[0] = colors.toGL();
                        this._mesh._numColComponents = numColComponents;
                    }
                }

                this._mesh._invalidate = true;
                this._mesh._numFaces = 0;
                this._mesh._numCoords = 0;
                for (i=0; i<this._mesh._indices.length; i++) {
                    this._mesh._numFaces += this._mesh._indices[i].length / 3;
                    this._mesh._numCoords += this._mesh._positions[i].length / 3;
                }

                var time1 = new Date().getTime() - time0;
                //x3dom.debug.logInfo("Mesh load time: " + time1 + " ms");
            },

            fieldChanged: function(fieldName)
            {
                var pnts = this._cf.coord.node._vf.point;
                var i, n = pnts.length;

                if ((this._vf.creaseAngle <= x3dom.fields.Eps) || (n / 3 > 65535) ||
                    (this._vf.normalIndex.length > 0 && this._cf.normal.node) ||
                    (this._vf.texCoordIndex.length > 0 && this._cf.texCoord.node) ||
                    (this._vf.colorIndex.length > 0 && this._cf.color.node))
                {
                    // TODO; FIXME
                    x3dom.debug.logWarning("Ipol with creaseAngle == 0, too many coords, or multi-index!");

                    /** HACK */
                    this.nodeChanged();

                    Array.forEach(this._parentNodes, function (node) {
                        node._dirty.positions = true;
                    });
                    Array.forEach(this._parentNodes, function (node) {
                        node._dirty.colors = true;
                    });

                    return;
                }

                if (fieldName == "coord")
                {
                    // TODO; multi-index with different this._mesh._indices
                    pnts = this._cf.coord.node._vf.point;
                    n = pnts.length;

                    this._mesh._positions[0] = [];

                    // TODO; optimize (is there a memcopy?)
                    for (i=0; i<n; i++)
                    {
                        this._mesh._positions[0].push(pnts[i].x);
                        this._mesh._positions[0].push(pnts[i].y);
                        this._mesh._positions[0].push(pnts[i].z);
                    }

                    this._mesh._invalidate = true;

                    Array.forEach(this._parentNodes, function (node) {
                        node._dirty.positions = true;
                    });
                }
                else if (fieldName == "color")
                {
                    pnts = this._cf.color.node._vf.color;
                    n = pnts.length;

                    this._mesh._colors[0] = [];

                    for (i=0; i<n; i++)
                    {
                        this._mesh._colors[0].push(pnts[i].r);
                        this._mesh._colors[0].push(pnts[i].g);
                        this._mesh._colors[0].push(pnts[i].b);
                    }

                    Array.forEach(this._parentNodes, function (node) {
                        node._dirty.colors = true;
                    });
                }
            }
        }
    )
);

/* ### IndexedTriangleSet ### */
x3dom.registerNodeType(
    "IndexedTriangleSet",
    "Rendering",
    defineClass(x3dom.nodeTypes.X3DComposedGeometryNode,
        function (ctx) {
            x3dom.nodeTypes.IndexedTriangleSet.superClass.call(this, ctx);

            this.addField_MFInt32(ctx, 'index', []);
        },
        {
            nodeChanged: function()
            {
                var time0 = new Date().getTime();

                this.handleAttribs();

                // TODO; implement normalPerVertex
                var normPerVert = this._vf.normalPerVertex;

                var indexes = this._vf.index;

                var hasNormal = false, hasTexCoord = false, hasColor = false;
                var positions, normals, texCoords, colors;

                var coordNode = this._cf.coord.node;
                x3dom.debug.assert(coordNode);
                positions = coordNode._vf.point;

                var normalNode = this._cf.normal.node;
                if (normalNode) {
                    hasNormal = true;
                    normals = normalNode._vf.vector;
                }
                else {
                    hasNormal = false;
                }

                var texMode = "", numTexComponents = 2;
                var texCoordNode = this._cf.texCoord.node;
                if (texCoordNode) {
                    if (texCoordNode._vf.point) {
                        hasTexCoord = true;
                        texCoords = texCoordNode._vf.point;

                        if (x3dom.isa(texCoordNode, x3dom.nodeTypes.TextureCoordinate3D)) {
                            numTexComponents = 3;
                        }
                    }
                    else if (texCoordNode._vf.mode) {
                        texMode = texCoordNode._vf.mode;
                    }
                }
                else {
                    hasTexCoord = false;
                }

                var numColComponents = 3;
                var colorNode = this._cf.color.node;
                if (colorNode) {
                    hasColor = true;
                    colors = colorNode._vf.color;

                    if (x3dom.isa(colorNode, x3dom.nodeTypes.ColorRGBA)) {
                        numColComponents = 4;
                    }
                }
                else {
                    hasColor = false;
                }

                this._mesh._indices[0] = [];
                this._mesh._positions[0] = [];
                this._mesh._normals[0] = [];
                this._mesh._texCoords[0] = [];
                this._mesh._colors[0] = [];

                var i, t, cnt, faceCnt, posMax;
                var p0, p1, p2, n0, n1, n2, t0, t1, t2, c0, c1, c2;

                while ( positions.length % 3 > 0) {
                    positions.push(positions.length-1);
                }
                posMax = positions.length;

                if ( //(this._vf.creaseAngle <= x3dom.fields.Eps) ||
                     (positions.length > 65535) )
                {
                    t = 0;
                    cnt = 0;
                    faceCnt = 0;
                    this._mesh._multiIndIndices = [];
                    this._mesh._posSize = positions.length;

                    for (i=0; i < indexes.length; ++i)
                    {
                        // Convert non-triangular polygons to a triangle fan
                        // (TODO: this assumes polygons are convex)

//                        if ((i > 0) && !(i % 3)) {
                        if ((i > 0) && (i % 3 === 0 )) {
                            t = 0;
                            faceCnt++;
                        }

                        //TODO: OPTIMIZE but think about cache coherence regarding arrays!!!
                        switch (t)
                        {
                            case 0:
                                p0 = +indexes[i];
                                n0 = p0;
                                t0 = p0;
                                c0 = p0;
                                t = 1;
                            break;
                            case 1:
                                p1 = +indexes[i];
                                n1 = p1;
                                t1 = p1;
                                c1 = p1;
                                t = 2;
                            break;
                            case 2:
                                p2 = +indexes[i];
                                n2 = p2;
                                t2 = p2;
                                c2 = p2;
                                t = 3;

                                this._mesh._indices[0].push(cnt++, cnt++, cnt++);

                                this._mesh._positions[0].push(positions[p0].x);
                                this._mesh._positions[0].push(positions[p0].y);
                                this._mesh._positions[0].push(positions[p0].z);
                                this._mesh._positions[0].push(positions[p1].x);
                                this._mesh._positions[0].push(positions[p1].y);
                                this._mesh._positions[0].push(positions[p1].z);
                                this._mesh._positions[0].push(positions[p2].x);
                                this._mesh._positions[0].push(positions[p2].y);
                                this._mesh._positions[0].push(positions[p2].z);

                                if (hasNormal) {
                                    this._mesh._normals[0].push(normals[n0].x);
                                    this._mesh._normals[0].push(normals[n0].y);
                                    this._mesh._normals[0].push(normals[n0].z);
                                    this._mesh._normals[0].push(normals[n1].x);
                                    this._mesh._normals[0].push(normals[n1].y);
                                    this._mesh._normals[0].push(normals[n1].z);
                                    this._mesh._normals[0].push(normals[n2].x);
                                    this._mesh._normals[0].push(normals[n2].y);
                                    this._mesh._normals[0].push(normals[n2].z);
                                }
                                else {
                                    this._mesh._multiIndIndices.push(p0, p1, p2);
                                    //this._mesh._multiIndIndices.push(cnt-3, cnt-2, cnt-1);
                                }

                                if (hasColor) {
                                    this._mesh._colors[0].push(colors[c0].r);
                                    this._mesh._colors[0].push(colors[c0].g);
                                    this._mesh._colors[0].push(colors[c0].b);
                                    if (numColComponents === 4) {
                                        this._mesh._colors[0].push(colors[c0].a);
                                    }
                                    this._mesh._colors[0].push(colors[c1].r);
                                    this._mesh._colors[0].push(colors[c1].g);
                                    this._mesh._colors[0].push(colors[c1].b);
                                    if (numColComponents === 4) {
                                        this._mesh._colors[0].push(colors[c1].a);
                                    }
                                    this._mesh._colors[0].push(colors[c2].r);
                                    this._mesh._colors[0].push(colors[c2].g);
                                    this._mesh._colors[0].push(colors[c2].b);
                                    if (numColComponents === 4) {
                                        this._mesh._colors[0].push(colors[c2].a);
                                    }
                                }

                                if (hasTexCoord) {
                                    this._mesh._texCoords[0].push(texCoords[t0].x);
                                    this._mesh._texCoords[0].push(texCoords[t0].y);
                                    if (numTexComponents === 3) {
                                        this._mesh._texCoords[0].push(texCoords[t0].z);
                                    }
                                    this._mesh._texCoords[0].push(texCoords[t1].x);
                                    this._mesh._texCoords[0].push(texCoords[t1].y);
                                    if (numTexComponents === 3) {
                                        this._mesh._texCoords[0].push(texCoords[t1].z);
                                    }
                                    this._mesh._texCoords[0].push(texCoords[t2].x);
                                    this._mesh._texCoords[0].push(texCoords[t2].y);
                                    if (numTexComponents === 3) {
                                        this._mesh._texCoords[0].push(texCoords[t2].z);
                                    }
                                }

                                //faceCnt++;
                            break;
                            default:
                        }
                    }

                    if (!hasNormal) {
                        this._mesh.calcNormals(this._vf.creaseAngle);
                    }
                    if (!hasTexCoord) {
                        this._mesh.calcTexCoords(texMode);
                    }

                    this._mesh.splitMesh();

                    //x3dom.debug.logInfo(this._mesh._indices.length);
                } // if isMulti
                else
                {
                    this._mesh._indices[0] = indexes.toGL();
                    this._mesh._positions[0] = positions.toGL();

                    if (hasNormal) {
                        this._mesh._normals[0] = normals.toGL();
                    }
                    else {
                        this._mesh.calcNormals(this._vf.creaseAngle);
                    }
                    if (hasTexCoord) {
                        this._mesh._texCoords[0] = texCoords.toGL();
                        this._mesh._numTexComponents = numTexComponents;
                    }
                    else {
                        this._mesh.calcTexCoords(texMode);
                    }
                    if (hasColor) {
                        this._mesh._colors[0] = colors.toGL();
                        this._mesh._numColComponents = numColComponents;
                    }
                }

                this._mesh._invalidate = true;
                this._mesh._numFaces = 0;
                this._mesh._numCoords = 0;
                for (i=0; i<this._mesh._indices.length; i++) {
                    this._mesh._numFaces += this._mesh._indices[i].length / 3;
                    this._mesh._numCoords += this._mesh._positions[i].length / 3;
                }

                var time1 = new Date().getTime() - time0;
                //x3dom.debug.logInfo("Mesh load time: " + time1 + " ms");
            },

            fieldChanged: function(fieldName)
            {
                var pnts;
                var i, n;

                if (fieldName == "coord")
                {
                    // TODO; multi-index with different this._mesh._indices
                    pnts = this._cf.coord.node._vf.point;
                    n = pnts.length;

                    this._mesh._positions[0] = [];

                    // TODO; optimize (is there a memcopy?)
                    for (i=0; i<n; i++)
                    {
                        this._mesh._positions[0].push(pnts[i].x);
                        this._mesh._positions[0].push(pnts[i].y);
                        this._mesh._positions[0].push(pnts[i].z);
                    }

                    this._mesh._invalidate = true;

                    Array.forEach(this._parentNodes, function (node) {
                        node._dirty.positions = true;
                    });
                }
                else if (fieldName == "color")
                {
                    pnts = this._cf.color.node._vf.color;
                    n = pnts.length;

                    this._mesh._colors[0] = [];

                    for (i=0; i<n; i++)
                    {
                        this._mesh._colors[0].push(pnts[i].r);
                        this._mesh._colors[0].push(pnts[i].g);
                        this._mesh._colors[0].push(pnts[i].b);
                    }

                    Array.forEach(this._parentNodes, function (node) {
                        node._dirty.colors = true;
                    });
                }
            }
        }
    )
);

/* ### X3DGeometricPropertyNode ### */
x3dom.registerNodeType(
    "X3DGeometricPropertyNode",
    "Rendering",
    defineClass(x3dom.nodeTypes.X3DNode,
        function (ctx) {
            x3dom.nodeTypes.X3DGeometricPropertyNode.superClass.call(this, ctx);
        }
    )
);

/* ### Coordinate ### */
x3dom.registerNodeType(
    "Coordinate",
    "Rendering",
    defineClass(x3dom.nodeTypes.X3DGeometricPropertyNode,
        function (ctx) {
            x3dom.nodeTypes.Coordinate.superClass.call(this, ctx);

            //this._vf.point = [];
            this.addField_MFVec3f(ctx, 'point', []);
        },
        {
            fieldChanged: function (fieldName) {
                Array.forEach(this._parentNodes, function (node) {
                    node.fieldChanged("coord");
                });
            }
        }
    )
);


/* ### Normal ### */
x3dom.registerNodeType(
    "Normal",
    "Rendering",
    defineClass(x3dom.nodeTypes.X3DGeometricPropertyNode,
        function (ctx) {
            x3dom.nodeTypes.Normal.superClass.call(this, ctx);

            this.addField_MFVec3f(ctx, 'vector', []);
        }
    )
);

/* ### X3DColorNode ### */
x3dom.registerNodeType(
    "X3DColorNode",
    "Rendering",
    defineClass(x3dom.nodeTypes.X3DGeometricPropertyNode,
        function (ctx) {
            x3dom.nodeTypes.X3DColorNode.superClass.call(this, ctx);
        },
        {
            fieldChanged: function (fieldName) {
                Array.forEach(this._parentNodes, function (node) {
                    node.fieldChanged("color");
                });
            }
        }
    )
);

/* ### Color ### */
x3dom.registerNodeType(
    "Color",
    "Rendering",
    defineClass(x3dom.nodeTypes.X3DColorNode,
        function (ctx) {
            x3dom.nodeTypes.Color.superClass.call(this, ctx);

            this.addField_MFColor(ctx, 'color', []);
        }
    )
);

/* ### ColorRGBA ### */
x3dom.registerNodeType(
    "ColorRGBA",
    "Rendering",
    defineClass(x3dom.nodeTypes.X3DColorNode,
        function (ctx) {
            x3dom.nodeTypes.ColorRGBA.superClass.call(this, ctx);

            this.addField_MFColorRGBA(ctx, 'color', []);
        }
    )
);



/* ### X3DChildNode ### */
x3dom.registerNodeType(
    "X3DChildNode",
    "Core",
    defineClass(x3dom.nodeTypes.X3DNode,
        function (ctx) {
            x3dom.nodeTypes.X3DChildNode.superClass.call(this, ctx);
        }
    )
);


/* ### X3DBindableNode ### */
x3dom.registerNodeType(
    "X3DBindableNode",
    "Core",
    defineClass(x3dom.nodeTypes.X3DChildNode,
        function (ctx) {
          x3dom.nodeTypes.X3DBindableNode.superClass.call(this, ctx);

          this.addField_SFBool(ctx, 'set_bind', false);
          this.addField_SFString(ctx, 'description', "");
          this.addField_SFBool(ctx, 'isActive', false);

          this._autoGen = (ctx.autoGen ? true : false);

          if (ctx && ctx.doc._bindableBag) {
            this._stack = ctx.doc._bindableBag.addBindable(this);
          }
          else {
            this._stack = null;
            x3dom.debug.logError('Could not find bindableBag for registration ' + this.typeName());
          }
        },
        {
            initDefault: function() {},

            bind: function (value) {
                if (this._stack) {
                    if (value) {
                        this._stack.push (this);
                    }
                    else {
                        this._stack.pop  (this);
                    }
                }
                else {
                    x3dom.debug.logError ('No BindStack in Bindable\n');
                }
            },

            activate: function (prev) {
                x3dom.debug.logInfo ('activate Bindable ' + this._DEF);
                this.postMessage('isActive', true);
            },

            deactivate: function (prev) {
                x3dom.debug.logInfo ('deactivate Bindable ' + this._DEF);
                this.postMessage('isActive', false);
            },

            fieldChanged: function(fieldName) {
                if (fieldName === "set_bind") {
                    this.bind(this._vf.set_bind);
                }
            },

            nodeChanged: function() {}
        }
    )
);


/* ### WorldInfo ### */
x3dom.registerNodeType(
    "WorldInfo",
    "Core",
    defineClass(x3dom.nodeTypes.X3DChildNode,
        function (ctx) {
            x3dom.nodeTypes.WorldInfo.superClass.call(this, ctx);

            this.addField_MFString(ctx, 'info', []);
            this.addField_SFString(ctx, 'title', "");

            x3dom.debug.logInfo(this._vf.info);
            x3dom.debug.logInfo(this._vf.title);
        },
        {
            // methods
        }
    )
);



/* ### X3DShapeNode ### */
x3dom.registerNodeType(
    "X3DShapeNode",
    "Shape",
    defineClass(x3dom.nodeTypes.X3DChildNode,
        function (ctx) {
            x3dom.nodeTypes.X3DShapeNode.superClass.call(this, ctx);
        }
    )
);

/* ### Shape ### */
x3dom.registerNodeType(
    "Shape",
    "Shape",
    defineClass(x3dom.nodeTypes.X3DShapeNode,
        function (ctx) {
            x3dom.nodeTypes.Shape.superClass.call(this, ctx);

            this.addField_SFNode('appearance', x3dom.nodeTypes.X3DAppearanceNode);
            this.addField_SFNode('geometry', x3dom.nodeTypes.X3DGeometryNode);

            this._objectID = 0;

            this._dirty = {
                positions: true,
                normals: true,
                texcoords: true,
                colors: true,
                indexes: true,
                texture: true,
				material: true,
				text: true
            };
        },
        {
            nodeChanged: function () {
                if (!this._cf.appearance.node) {
                    this.addChild(x3dom.nodeTypes.Appearance.defaultNode());
                }
                if (!this._cf.geometry.node) {
                    x3dom.debug.logError("No geometry given in Shape/" + this._DEF);
                }
                else if (!this._objectID && this._cf.geometry.node._pickable) {
                    this._objectID = ++x3dom.nodeTypes.Shape.objectID;
                    x3dom.nodeTypes.Shape.idMap.nodeID[this._objectID] = this;
                }
            },

            // TODO: what if complete subtree is removed at once?
            parentRemoved: function(parent)
            {
                if (this._parentNodes.length === 0 && this._webgl)
                {
                    var doc = this.findX3DDoc();
                    var gl = doc.ctx.ctx3d;
                    var sp = this._webgl.shader;

                    for (var cnt=0; this._webgl.texture !== undefined &&
                                    cnt < this._webgl.texture.length; cnt++)
                    {
                        if (this._webgl.texture[cnt])
                        {
                            gl.deleteTexture(this._webgl.texture[cnt]);
                        }
                    }

                    for (var q=0; q<this._webgl.positions.length; q++)
                    {
                        if (sp.position !== undefined)
                        {
                            gl.deleteBuffer(this._webgl.buffers[5*q+1]);
                            gl.deleteBuffer(this._webgl.buffers[5*q+0]);
                        }

                        if (sp.normal !== undefined)
                        {
                            gl.deleteBuffer(this._webgl.buffers[5*q+2]);
                        }

                        if (sp.texcoord !== undefined)
                        {
                            gl.deleteBuffer(this._webgl.buffers[5*q+3]);
                        }

                        if (sp.color !== undefined)
                        {
                            gl.deleteBuffer(this._webgl.buffers[5*q+4]);
                        }
                    }

                    for (var df=0; df<this._webgl.dynamicFields.length; df++)
                    {
                        var attrib = this._webgl.dynamicFields[df];

                        if (sp[attrib.name] !== undefined)
                        {
                            gl.deleteBuffer(attrib.buf);
                        }
                    }

                    this._webgl = null;
                }
            },

            collectDrawableObjects: function (transform, out) {
                // TODO: culling etc
                if (out !== null)
                {
                    out.push( [transform, this] );
                }
            },

            getVolume: function(min, max, invalidate) {
				if (this._cf.geometry.node) {
					return this._cf.geometry.node.getVolume(min, max, invalidate);
				}
				else {
					return false;
				}
            },

            getCenter: function() {
				if (this._cf.geometry.node) {
					return this._cf.geometry.node.getCenter();
				}
				else {
					return new x3dom.fields.SFVec3f(0,0,0);
				}
            },

            doIntersect: function(line) {
                return this._cf.geometry.node.doIntersect(line);
            },

            isSolid: function() {
                return this._cf.geometry.node._vf.solid;
            },

            isCCW: function() {
                return this._cf.geometry.node._vf.ccw;
            }
        }
    )
);

/** Static class ID counter (needed for picking) */
x3dom.nodeTypes.Shape.objectID = 0;

/** Map for Shape node IDs (needed for picking) */
x3dom.nodeTypes.Shape.idMap = {
    nodeID: {},
    remove: function(obj) {
        for (var prop in this.nodeID) {
            if (this.nodeID.hasOwnProperty(prop)) {
                var val = this.nodeID[prop];
                if (val._objectID  && obj._objectID &&
                    val._objectID === obj._objectID)
                {
                    delete this.nodeID[prop];
                    x3dom.debug.logInfo("Unreg " + val._objectID);
                    // FIXME; handle node removal to unreg from map,
                    // and put free'd ID back to ID pool for reuse
                }
            }
        }
    }
};

// ### X3DGroupingNode ###
x3dom.registerNodeType(
    "X3DGroupingNode",
    "Grouping",
    defineClass(x3dom.nodeTypes.X3DChildNode,
        function (ctx) {
            x3dom.nodeTypes.X3DGroupingNode.superClass.call(this, ctx);

            this.addField_SFBool(ctx, 'render', true);
            this.addField_MFNode('children', x3dom.nodeTypes.X3DChildNode);
            // FIXME; add addChild and removeChild slots ?
        },
        {
            // Collects array of [transform matrix, node] for all objects that should be drawn.
            collectDrawableObjects: function (transform, out)
            {
                if (!this._vf.render) {
                    return;
                }

                for (var i=0; i<this._childNodes.length; i++) {
                    if (this._childNodes[i]) {
                        var childTransform = this._childNodes[i].transformMatrix(transform);
                        this._childNodes[i].collectDrawableObjects(childTransform, out);
                    }
                }
            }
        }
    )
);

// ### Switch ###
x3dom.registerNodeType(
    "Switch",
    "Grouping",
    defineClass(x3dom.nodeTypes.X3DGroupingNode,
        function (ctx) {
            x3dom.nodeTypes.Switch.superClass.call(this, ctx);

            this.addField_SFInt32(ctx, 'whichChoice', -1);
        },
        {
            getVolume: function (min, max, invalidate)
            {
                if (this._vf.whichChoice < 0 ||
                    this._vf.whichChoice >= this._childNodes.length) {
                    return false;
                }

                if (this._childNodes[this._vf.whichChoice]) {
                    return this._childNodes[this._vf.whichChoice].getVolume(min, max, invalidate);
                }

                return false;
            },

            find: function (type)
            {
                if (this._vf.whichChoice < 0 ||
                    this._vf.whichChoice >= this._childNodes.length) {
                    return null;
                }

                if (this._childNodes[this._vf.whichChoice]) {
                    if (this._childNodes[this._vf.whichChoice].constructor == type) {
                        return this._childNodes[this._vf.whichChoice];
                    }

                    var c = this._childNodes[this._vf.whichChoice].find(type);
                    if (c) {
                        return c;
                    }
                }

                return null;
            },

            findAll: function (type)
            {
                if (this._vf.whichChoice < 0 ||
                    this._vf.whichChoice >= this._childNodes.length) {
                    return [];
                }

                var found = [];

                if (this._childNodes[this._vf.whichChoice]) {
                    if (this._childNodes[this._vf.whichChoice].constructor == type) {
                        found.push(this._childNodes[this._vf.whichChoice]);
                    }

                    found = found.concat(this._childNodes[this._vf.whichChoice].findAll(type));
                }

                return found;
            },

            // Collects array of [transform matrix, node] for all objects that should be drawn.
            collectDrawableObjects: function (transform, out)
            {
                if (this._vf.whichChoice < 0 ||
                    this._vf.whichChoice >= this._childNodes.length) {
                    return;
                }

                if (this._childNodes[this._vf.whichChoice]) {
                    var childTransform = this._childNodes[this._vf.whichChoice].transformMatrix(transform);
                    this._childNodes[this._vf.whichChoice].collectDrawableObjects(childTransform, out);
                }
            },

            doIntersect: function(line)
            {
                if (this._vf.whichChoice < 0 ||
                    this._vf.whichChoice >= this._childNodes.length) {
                    return false;
                }

                if (this._childNodes[this._vf.whichChoice]) {
                    return this._childNodes[this._vf.whichChoice].doIntersect(line);
                }

                return false;
            }
        }
    )
);

// ### X3DTransformNode ###
x3dom.registerNodeType(
    "X3DTransformNode",
    "Grouping",
    defineClass(x3dom.nodeTypes.X3DGroupingNode,
        function (ctx) {
            x3dom.nodeTypes.X3DTransformNode.superClass.call(this, ctx);

            ctx.doc._nodeBag.trans.push(this);

            // holds the current matrix
            this._trafo = null;
        },
        {
            // temporary per frame update method for CSS-Transform
            tick: function(t) {
                var trans = x3dom.getStyle(this._xmlNode, "-webkit-transform");
                //x3dom.debug.logInfo('set css-trans: ' + this._DEF + ' to ' + trans);
                if (trans && (trans != 'none')) {
                    this._trafo.setValueByStr(trans);
                    //x3dom.debug.logInfo(' valid set:' + this._trafo);
                    return true;
                }

                return false;
            },

            transformMatrix: function(transform) {
                return transform.mult(this._trafo);
            },

            getVolume: function(min, max, invalidate)
            {
                var nMin = x3dom.fields.SFVec3f.MAX();
                var nMax = x3dom.fields.SFVec3f.MIN();
                var valid = false;

                for (var i=0, n=this._childNodes.length; i<n; i++)
                {
                    if (this._childNodes[i])
                    {
                        var childMin = x3dom.fields.SFVec3f.MAX();
                        var childMax = x3dom.fields.SFVec3f.MIN();

                        valid = this._childNodes[i].getVolume(
                                        childMin, childMax, invalidate) || valid;

                        if (valid)  // values only set by Mesh.BBox()
                        {
                            if (nMin.x > childMin.x) {nMin.x = childMin.x;}
                            if (nMin.y > childMin.y) {nMin.y = childMin.y;}
                            if (nMin.z > childMin.z) {nMin.z = childMin.z;}

                            if (nMax.x < childMax.x) {nMax.x = childMax.x;}
                            if (nMax.y < childMax.y) {nMax.y = childMax.y;}
                            if (nMax.z < childMax.z) {nMax.z = childMax.z;}
                        }
                    }
                }

                if (valid)
                {
                    nMin = this._trafo.multMatrixPnt(nMin);
                    nMax = this._trafo.multMatrixPnt(nMax);

                    min.x = nMin.x < nMax.x ? nMin.x : nMax.x;
                    min.y = nMin.y < nMax.y ? nMin.y : nMax.y;
                    min.z = nMin.z < nMax.z ? nMin.z : nMax.z;

                    max.x = nMax.x > nMin.x ? nMax.x : nMin.x;
                    max.y = nMax.y > nMin.y ? nMax.y : nMin.y;
                    max.z = nMax.z > nMin.z ? nMax.z : nMin.z;
                }
                return valid;
            },

            doIntersect: function(line)
            {
                var isect = false;
                var mat = this._trafo.inverse();

                var tmpPos = new x3dom.fields.SFVec3f(line.pos.x, line.pos.y, line.pos.z);
                var tmpDir = new x3dom.fields.SFVec3f(line.dir.x, line.dir.y, line.dir.z);

                line.pos = mat.multMatrixPnt(line.pos);
                line.dir = mat.multMatrixVec(line.dir);

                if (line.hitObject) {
                    line.dist *= line.dir.length();
                }

                // check for _nearest_ hit object and don't stop on first!
                for (var i=0; i<this._childNodes.length; i++)
                {
                    if (this._childNodes[i]) {
                        isect = this._childNodes[i].doIntersect(line) || isect;
                    }
                }

                line.pos.setValues(tmpPos);
                line.dir.setValues(tmpDir);

                if (isect) {
                    line.hitPoint = this._trafo.multMatrixPnt(line.hitPoint);
                    line.dist *= line.dir.length();
                }

                return isect;
            },

            parentRemoved: function(parent)
            {
                var i;
                var n;
                if (this._parentNodes.length === 0) {
                    var doc = this.findX3DDoc();

                    for (i=0, n=doc._nodeBag.trans.length; i<n; i++) {
                        if (doc._nodeBag.trans[i] === this) {
                            doc._nodeBag.trans.splice(i, 1);
                        }
                    }
                }

                for (i=0, n=this._childNodes.length; i<n; i++) {
                    if (this._childNodes[i]) {
                        this._childNodes[i].parentRemoved(this);
                    }
                }
            }
        }
    )
);

// ### Transform ###
x3dom.registerNodeType(
    "Transform",
    "Grouping",
    defineClass(x3dom.nodeTypes.X3DTransformNode,
        function (ctx) {
            x3dom.nodeTypes.Transform.superClass.call(this, ctx);

            this.addField_SFVec3f(ctx, 'center', 0, 0, 0);
            this.addField_SFVec3f(ctx, 'translation', 0, 0, 0);
            this.addField_SFRotation(ctx, 'rotation', 0, 0, 1, 0);
            this.addField_SFVec3f(ctx, 'scale', 1, 1, 1);
            this.addField_SFRotation(ctx, 'scaleOrientation', 0, 0, 1, 0);

            // P' = T * C * R * SR * S * -SR * -C * P
            this._trafo = x3dom.fields.SFMatrix4f.translation(
                    this._vf.translation.add(this._vf.center)).
                mult(this._vf.rotation.toMatrix()).
                mult(this._vf.scaleOrientation.toMatrix()).
                mult(x3dom.fields.SFMatrix4f.scale(this._vf.scale)).
                mult(this._vf.scaleOrientation.toMatrix().inverse()).
                mult(x3dom.fields.SFMatrix4f.translation(this._vf.center.negate()));
        },
        {
            fieldChanged: function (fieldName) {
                // P' = T * C * R * SR * S * -SR * -C * P
                this._trafo = x3dom.fields.SFMatrix4f.translation(
                                this._vf.translation.add(this._vf.center)).
                            mult(this._vf.rotation.toMatrix()).
                            mult(this._vf.scaleOrientation.toMatrix()).
                            mult(x3dom.fields.SFMatrix4f.scale(this._vf.scale)).
                            mult(this._vf.scaleOrientation.toMatrix().inverse()).
                            mult(x3dom.fields.SFMatrix4f.translation(this._vf.center.negate()));
            }
        }
    )
);

// ### MatrixTransform ###
x3dom.registerNodeType(
    "MatrixTransform",
    "Grouping",
    defineClass(x3dom.nodeTypes.X3DTransformNode,
        function (ctx) {
            x3dom.nodeTypes.MatrixTransform.superClass.call(this, ctx);

            this.addField_SFMatrix4f(ctx, 'matrix', 1, 0, 0, 0,
                                                    0, 1, 0, 0,
                                                    0, 0, 1, 0,
                                                    0, 0, 0, 1);
            this._trafo = this._vf.matrix;
        },
        {
        }
    )
);

// ### Group ###
x3dom.registerNodeType(
    "Group",
    "Grouping",
    defineClass(x3dom.nodeTypes.X3DGroupingNode,
        function (ctx) {
            x3dom.nodeTypes.Group.superClass.call(this, ctx);
        },
        {
        }
    )
);

// ### StaticGroup ###
x3dom.registerNodeType(
    "StaticGroup",
    "Grouping",
    defineClass(x3dom.nodeTypes.X3DGroupingNode,
        function (ctx) {
            x3dom.nodeTypes.StaticGroup.superClass.call(this, ctx);

            // FIXME; implement optimizations; no need to maintain the children's
            // X3D representations, as they cannot be accessed after creation time
            x3dom.debug.logWarning("StaticGroup NYI");
        }
    )
);


// ### X3DSensorNode ###
x3dom.registerNodeType(
    "X3DSensorNode",
    "Core",
    defineClass(x3dom.nodeTypes.X3DChildNode,
        function (ctx) {
            x3dom.nodeTypes.X3DSensorNode.superClass.call(this, ctx);
        }
    )
);


// Not a real X3D node type
// TODO; refactor to Scene + Viewarea node --> via Layering component?

// ### Scene ###
x3dom.registerNodeType(
    "Scene",
    "Core",
    defineClass(x3dom.nodeTypes.X3DGroupingNode,
        function (ctx) {
            x3dom.nodeTypes.Scene.superClass.call(this, ctx);

            // define the experimental picking mode:
            // box, exact (NYI), idBuf, color, texCoord
            this.addField_SFString(ctx, 'pickMode', "idBuf");
        },
        {
            /* bindable getter (e.g. getViewpoint) are added automatically */
        }
    )
);


/* ### END OF NODES ###*/

