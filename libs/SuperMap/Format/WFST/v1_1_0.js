/* COPYRIGHT 2012 SUPERMAP
 * 本程序只能在有效的授权许可下使用。
 * 未经许可，不得以任何手段擅自使用或传播。*/
/**
 * @requires SuperMap/Format/WFST/v1.js
 * @requires SuperMap/Format/Filter/v1_1_0.js
 * @requires SuperMap/Format/OWSCommon/v1_0_0.js
 */

/**
 * Class: SuperMap.Format.WFST.v1_1_0
 * A format for creating WFS v1.1.0 transactions.  Create a new instance with the
 *     <SuperMap.Format.WFST.v1_1_0> constructor.
 *
 * Inherits from:
 *  - <SuperMap.Format.Filter.v1_1_0>
 *  - <SuperMap.Format.WFST.v1>
 */
SuperMap.Format.WFST.v1_1_0 = SuperMap.Class(
    SuperMap.Format.Filter.v1_1_0, SuperMap.Format.WFST.v1, {
    
    /**
     * Property: version
     * {String} WFS version number.
     */
    version: "1.1.0",
    
    /**
     * Property: schemaLocations
     * {Object} Properties are namespace aliases, values are schema locations.
     */
    schemaLocations: {
        "wfs": "http://schemas.opengis.net/wfs/1.1.0/wfs.xsd"
    },
    
    /**
     * Constructor: SuperMap.Format.WFST.v1_1_0
     * A class for parsing and generating WFS v1.1.0 transactions.
     *
     * To read additional information like hit count (numberOfFeatures) from
     * the  FeatureCollection, call the <SuperMap.Format.WFST.v1.read> method
     * with {output: "object"} as 2nd argument. Note that it is possible to
     * just request the hit count from a WFS 1.1.0 server with the
     * resultType="hits" request parameter.
     *
     * Parameters:
     * options - {Object} Optional object whose properties will be set on the
     *     instance.
     *
     * Valid options properties:
     * featureType - {String} Local (without prefix) feature typeName (required).
     * featureNS - {String} Feature namespace (optional).
     * featurePrefix - {String} Feature namespace alias (optional - only used
     *     if featureNS is provided).  Default is 'feature'.
     * geometryName - {String} Name of geometry attribute.  Default is 'the_geom'.
     */
    initialize: function(options) {
        SuperMap.Format.Filter.v1_1_0.prototype.initialize.apply(this, [options]);
        SuperMap.Format.WFST.v1.prototype.initialize.apply(this, [options]);
    },
    
    /**
     * Method: readNode
     * Shorthand for applying one of the named readers given the node
     *     namespace and local name.  Readers take two args (node, obj) and
     *     generally extend or modify the second.
     *
     * Parameters:
     * node - {DOMElement} The node to be read (required).
     * obj - {Object} The object to be modified (optional).
     * first - {Boolean} Should be set to true for the first node read. This
     *     is usually the readNode call in the read method. Without this being
     *     set, auto-configured properties will stick on subsequent reads.
     *
     * Returns:
     * {Object} The input object, modified (or a new one if none was provided).
     */
    readNode: function(node, obj, first) {
        // Not the superclass, only the mixin classes inherit from
        // Format.GML.v3. We need this because we don't want to get readNode
        // from the superclass's superclass, which is SuperMap.Format.XML.
        return SuperMap.Format.GML.v3.prototype.readNode.apply(this, [node, obj]);
    },
    
    /**
     * Property: readers
     * Contains public functions, grouped by namespace prefix, that will
     *     be applied when a namespaced node is found matching the function
     *     name.  The function will be applied in the scope of this parser
     *     with two arguments: the node being read and a context object passed
     *     from the parent.
     */
    readers: {
        "wfs": SuperMap.Util.applyDefaults({
            "FeatureCollection": function(node, obj) {
                obj.numberOfFeatures = parseInt(node.getAttribute(
                    "numberOfFeatures"));
                SuperMap.Format.WFST.v1.prototype.readers["wfs"]["FeatureCollection"].apply(
                    this, arguments);
            },
            "TransactionResponse": function(node, obj) {
                obj.insertIds = [];
                obj.success = false;
                this.readChildNodes(node, obj);
            },
            "TransactionSummary": function(node, obj) {
                // this is a limited test of success
                obj.success = true;
            },
            "InsertResults": function(node, obj) {
                this.readChildNodes(node, obj);
            },
            "Feature": function(node, container) {
                var obj = {fids: []};
                this.readChildNodes(node, obj);
                container.insertIds.push(obj.fids[0]);
            }
        }, SuperMap.Format.WFST.v1.prototype.readers["wfs"]),
        "gml": SuperMap.Format.GML.v3.prototype.readers["gml"],
        "feature": SuperMap.Format.GML.v3.prototype.readers["feature"],
        "ogc": SuperMap.Format.Filter.v1_1_0.prototype.readers["ogc"],
        //~先不支持这个
        "ows": SuperMap.Format.OWSCommon.v1_0_0.prototype.readers["ows"]
    },

    /**
     * Property: writers
     * As a compliment to the readers property, this structure contains public
     *     writing functions grouped by namespace alias and named like the
     *     node names they produce.
     */
    writers: {
        "wfs": SuperMap.Util.applyDefaults({
            "GetFeature": function(options) {
                var node = SuperMap.Format.WFST.v1.prototype.writers["wfs"]["GetFeature"].apply(this, arguments);
                options && this.setAttributes(node, {
                    resultType: options.resultType,
                    startIndex: options.startIndex,
                    count: options.count
                });
                return node;
            },
            "Query": function(options) {
                options = SuperMap.Util.extend({
                    featureNS: this.featureNS,
                    featurePrefix: this.featurePrefix,
                    featureType: this.featureType,
                    srsName: this.srsName
                }, options);
                var prefix = options.featurePrefix;
                var node = this.createElementNSPlus("wfs:Query", {
                    attributes: {
                        typeName: (prefix ? prefix + ":" : "") +
                            options.featureType,
                        srsName: options.srsName
                    }
                });
                if(options.featureNS) {
                    node.setAttribute("xmlns:" + prefix, options.featureNS);
                }
                if(options.propertyNames) {
                    for(var i=0,len = options.propertyNames.length; i<len; i++) {
                        this.writeNode(
                            "wfs:PropertyName", 
                            {property: options.propertyNames[i]},
                            node
                        );
                    }
                }
                if(options.filter) {
                    SuperMap.Format.WFST.v1_1_0.prototype.setFilterProperty.call(this, options.filter);
                    this.writeNode("ogc:Filter", options.filter, node);
                }
                return node;
            },
            "PropertyName": function(obj) {
                return this.createElementNSPlus("wfs:PropertyName", {
                    value: obj.property
                });
            }            
        }, SuperMap.Format.WFST.v1.prototype.writers["wfs"]),
        "gml": SuperMap.Format.GML.v3.prototype.writers["gml"],
        "feature": SuperMap.Format.GML.v3.prototype.writers["feature"],
        "ogc": SuperMap.Format.Filter.v1_1_0.prototype.writers["ogc"]
    },

    CLASS_NAME: "SuperMap.Format.WFST.v1_1_0" 
});
