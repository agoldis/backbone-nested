/**
 * Backbone-Nested 0.1.0 - An extension of Backbone.js that keeps track of nested attributes
 *
 * https://github.com/afeld/backbone-nested
 *
 * Copyright (c) 2011-2012 Aidan Feldman
 * MIT Licensed (LICENSE)
 */
Backbone.NestedModel = Backbone.Model.extend({
  
  constructor: function(attrs, opts){
    Backbone.Model.prototype.constructor.apply( this, arguments );
  },

  get: function(attrStrOrPath){
    var attrPath = Backbone.NestedModel.attrPath(attrStrOrPath),
      childAttr = attrPath[0],
      result = Backbone.Model.prototype.get.call(this, childAttr);
    
    // walk through the child attributes
    for (var i = 1; i < attrPath.length; i++){
      childAttr = attrPath[i];
      result = result[childAttr];
    }

    // check if the result is an Object, Array, etc.
    if (_.isObject(result) && window.console){
      window.console.log("Backbone-Nested syntax is preferred for accesing values of attribute '" + attrStrOrPath + "'.");
    }
    // else it's a leaf

    return result;
  },

  has: function(attr){
    // for some reason this is not how Backbone.Model is implemented - it accesses the attributes object directly
    var result = this.get(attr);
    return !(result === null || _.isUndefined(result));
  },

  set: function(attrs, opts){
    opts || (opts = {});
    var newAttrs = _.deepClone(this.attributes);

    for (var attrStr in attrs){
      var attrPath = Backbone.NestedModel.attrPath(attrStr),
        attrObj = Backbone.NestedModel.createAttrObj(attrPath, attrs[attrStr]);

      this.mergeAttrs(newAttrs, attrObj, opts);
    }

    return Backbone.Model.prototype.set.call(this, newAttrs, opts);
  },

  unset: function(attrStr, opts){
    opts || (opts = {});

    var attrPath = Backbone.NestedModel.attrPath(attrStr);
    if (attrPath.length > 1){
      // walk through the child attributes
      var resultObj = this.get(_.initial(attrPath)),
        leafAttr = _.last(attrPath);

      if (resultObj && resultObj[leafAttr]){
        delete resultObj[leafAttr];

        if (!opts.silent){
          this.trigger('change:' + attrStr, this, void 0, opts);
        }
        this.change(opts);
      }
    } else {
      Backbone.Model.prototype.unset.apply(this, arguments);
    }

    return this;
  },

  toJSON: function(){
    var json = Backbone.Model.prototype.toJSON();
    return _.deepClone(json);
  },


  // private

  mergeAttrs: function(dest, source, opts, stack){
    stack || (stack = []);

    var self = this,
      attrStr;
    
    _.each(source, function(sourceVal, prop){
      var destVal = dest[prop];

      var newStack = stack.concat([prop]);
      if (prop in dest && _.isObject(sourceVal) && _.isObject(destVal)){
        self.mergeAttrs(destVal, sourceVal, opts, newStack);
      } else if (prop === '-1'){
        // append to existing array
        dest.push(sourceVal);
      } else {
        if (sourceVal && sourceVal['-1']){
          // append to non-existing array
          sourceVal = [sourceVal['-1']];
        }
        dest[prop] = sourceVal;
      }
      
      // let the superclass handle change events for top-level attributes
      if (!opts.silent && newStack.length > 1){
        attrStr = Backbone.NestedModel.createAttrStr(newStack);
        self.trigger('change:' + attrStr, self, dest[prop]);
      }
    });
  }

}, {
  // class methods

  attrPath: function(attrStrOrPath){
    var path;
    
    if (_.isString(attrStrOrPath)){
      // change all appends to '-1'
      attrStrOrPath = attrStrOrPath.replace(/\[\]/g, '[-1]');
      // TODO this parsing can probably be more efficient
      path = attrStrOrPath.match(/[^\.\[\]]+/g);
      path = _.map(path, function(val){
        // convert array accessors to numbers
        return val.match(/^\d+$/) ? parseInt(val) : val;
      });
    } else {
      path = attrStrOrPath;
    }

    return path;
  },

  createAttrObj: function(attrStrOrPath, val){
    var attrPath = this.attrPath(attrStrOrPath),
      newVal;

    switch (attrPath.length){
      case 0:
        throw "no valid attributes: '" + attrStrOrPath + "'";
        break;
      
      case 1: // leaf
        newVal = val;
        break;
      
      default: // nested attributes
        var otherAttrs = _.rest(attrPath);
        newVal = this.createAttrObj(otherAttrs, val);
        break;
    }

    var childAttr = attrPath[0],
      result = _.isNumber(childAttr) ? [] : {};
    
    result[childAttr] = newVal;
    return result;
  },

  createAttrStr: function(attrPath){
    var attrStr = attrPath[0];
    _.each(_.rest(attrPath), function(attr){
      attrStr += _.isNumber(attr) ? ('[' + attr + ']') : ('.' + attr);
    });

    return attrStr;
  }

});


_.mixin({

  deepMerge: function(dest){
    _.each(_.rest(arguments), function(source){
      var sourceVal, destVal;
      for (var prop in source){
        sourceVal = source[prop];
        destVal = dest[prop];
        if (prop in dest && _.isObject(sourceVal) && _.isObject(destVal)){
          _.deepMerge(destVal, sourceVal);
        } else {
          dest[prop] = sourceVal;
        }
      }
    });
    return dest;
  },

  deepClone: function(obj){
    var result = _.clone(obj); // shallow clone
    if (_.isObject(obj)){
      _.each(obj, function(val, key){
        result[key] = _.deepClone(val);
      });
    }
    return result;
  }

});
