/**
 * NewgroundsIO Namespace
 * @namespace
 */
var NewgroundsIO = NewgroundsIO ? NewgroundsIO : {};

/**
 * NewgroundsIO Objecs Namespace
 * @namespace
 */
NewgroundsIO.objects = NewgroundsIO.objects ? NewgroundsIO.objects : {};

/**
 * NewgroundsIO Results Namespace
 * @namespace
 */
NewgroundsIO.results = NewgroundsIO.results ? NewgroundsIO.results : {};

/**
 * NewgroundsIO Components Namespace
 * @namespace
 */
NewgroundsIO.components = NewgroundsIO.components ? NewgroundsIO.components : {};

(()=>{
/** Start Class NewgroundsIO.Core **/

	/**
	 * @callback responseCallback
	 * @param {NewgroundsIO.objects.Response} serverResponse
	 */

	/** Class for communicating with the Newgrounds.io API **/
	class Core extends EventTarget {

		/**
		 * @private
		 */
		#GATEWAY_URI = "https://www.newgrounds.io/gateway_v3.php";

		/**
		 * @private
		 */
		#debug = false;

		/**
		 * @private
		 */
		#appID = null;

		/**
		 * @private
		 */
		#aesKey = null;

		/**
		 * @private
		 */
		#componentQueue = [];

		/**
		 * @private
		 */
		#host = null;

		/**
		 * @private
		 */
		#session = null;

		/**
		 * @private
		 */
		#uriParams = {};

		/** 
		 * The URI to v3 of the Newgrounds.io gateway. 
		 * @type {string}
		 */
		get GATEWAY_URI() {
			return this.#GATEWAY_URI;
		} 

		/**
		 * Set to true to enable debug mode.
		 * @type {boolean}
		 */
		get debug() {
			return this.#debug;
		}
		set debug(d) {
			this.#debug = d ? true:false;
		}

		/**
		 * The App ID from your App Settings page.
		 * @type {string}
		 */
		get appID() {
			return this.#appID;
		}

		/**
		 * An array of pending components to be called via executeQueue.
		 * @type {array} An array of NewgroundsIO.components.XXXX objects
		 */
		get componentQueue() {
			return this.#componentQueue;
		}

		/**
		 * Returns true if any components are in the execute queue.
		 * @type {boolean}
		 */
		get hasQueue() {
			return this.#componentQueue.length > 0;
		}

		/**
		 * Returns the host domain in web builds.
		 * @type {boolean}
		 */
		get host() {
			return this.#host;
		}

		/**
		 * The user session object.
		 * @type {NewgroundsIO.objects.Session}
		 */
		get session() {
			return this.#session;
		}

		/**
		 * The active user object.
		 * @type {NewgroundsIO.objects.User}
		 */
		get user() {
			return this.#session ? this.#session.user : null;
		}

		/**
		 * An index of any parameters set in the current URL's query string.
		 * @type {object}
		 */
		get uriParams() {
			return this.#uriParams;
		}

		/**
		 * Create a Core.
		 * @param {string} appID The app id from your newgrounds project 'API Tools' page
		 * @param {string} aesKey The AES-128 emcryption key from your newgrounds project 'API Tools' page
		 */
		constructor(appID, aesKey)
		{
			super();
			if (typeof(appID) === 'undefined') throw("Missing required appID!");
			if (typeof(aesKey) === 'undefined') throw("Missing required aesKey!");

			this.#appID = appID;
			this.#aesKey = CryptoJS.enc.Base64.parse(aesKey);
			
			this.#componentQueue = [];

			// look for query string in any URL hosting this app
			this.#uriParams = {};

			if (window && window.location && window.location.href)
			{
				if (window.location.hostname) {
					this.#host = window.location.hostname.toLowerCase();

				} else if (window.location.href.toLowerCase().substr(0,5) == "file:") {
					this.#host = "<LocalHost>";

				} else {
					this.#host = "<Unknown>";

				}

			} else {
				this.#host = "<AppView>";
			}

			if (typeof(window) !== 'undefined' && window.location) {	
				var uri = window.location.href;
				var query = uri.split("?").pop();

				if (query) {
					var pairs = query.split("&");
					var key_value;
					for(var i=0; i<pairs.length; i++) {
						key_value = pairs[i].split("=");
						this.#uriParams[key_value[0]] = key_value[1];
					}
				}
			}

			this.#session = this.getObject("Session");
			this.#session.uri_id = this.getUriParam("ngio_session_id",null);
		}

		/**
		 * Gets a query parameter value from the URI hosting this game.
		 * @param {string} param The parameter you want to get a value for.
		 * @param {string} defaultValue A value to use if the param isn't set.
		 * @returns {string}
		 */
		getUriParam(param,defaultValue)
		{
			return typeof(this.#uriParams[param]) === 'undefined' ? defaultValue : this.#uriParams[param];
		}

		/**
		 * Encrypts a JSON-encoded string and encodes it to a base64 string.
		 * @param {string} jsonString The encoded JSON string to encrypt.
		 * @returns {string}
		 */
		encrypt(jsonString)
		{
			let iv  = CryptoJS.lib.WordArray.random(16);
			let encrypted = CryptoJS.AES.encrypt(jsonString, this.#aesKey, { iv: iv });
			return CryptoJS.enc.Base64.stringify(iv.concat(encrypted.ciphertext));
		}

		getObject(name, params)
		{
			if (typeof(NewgroundsIO.objects[name]) === 'undefined') {
				console.error("NewgroundsIO - Invalid object name: "+name);
				return null;
			}

			var object = new NewgroundsIO.objects[name](params);
			object.setCore(this);
			return object;
		}

		getComponent(name, params)
		{
			var parts = name.split(".");
			var error = false;
			if (parts.length !== 2) {
				error = "Invalid component name: "+name;
			} else if (typeof(NewgroundsIO.components[parts[0]]) === 'undefined') {
				error = "Invalid component name: "+name;
			} else if (typeof(NewgroundsIO.components[parts[0]][parts[1]]) === 'undefined') {
				error = "Invalid component name: "+name;
			}

			if (error) {
				console.error("NewgroundsIO - "+error);
				return null;
			}

			var component = new NewgroundsIO.components[parts[0]][parts[1]](params);
			component.setCore(this);
			return component;
		}

		/**
		 * Adds a component to the Queue. Queued components are executed in a single call via executeQueue.
		 * @param {NewgroundsIO.BaseComponent} component Any NewgroundsIO.components.XXXXX object
		 */
		queueComponent(component)
		{
			if (!this._verifyComponent(component)) {
				return;
			}
			component.setCore(this);
			this.#componentQueue.push(component);
		}

		/**
		 * Executes any components in the queue.
		 * @param {responseCallback} callback A function to fire when the queue has finished executing on the server.
		 * @param {object} thisArg An optional object to use as 'this' in your callback function.
		 */
		executeQueue(callback, thisArg)
		{
			if (this.#componentQueue.length < 1) return;

			this.executeComponent(this.#componentQueue, callback, thisArg);
			this.#componentQueue = [];
		}

		/**
		 * Executes any components in the queue.
		 * @param {NewgroundsIO.BaseComponent} component Any NewgroundsIO.components.XXXXX object
		 * @param {responseCallback} callback A function to fire when the queue has finished executing on the server.
		 * @param {object} thisArg An optional object to use as 'this' in your callback function.
		 */
		executeComponent(component, callback, thisArg)
		{
			if (Array.isArray(component)) {
				let valid = true;
				let _this = this;
				component.forEach(_c=>{
					if (!(_c instanceof NewgroundsIO.BaseComponent)) {
						if (!_this._verifyComponent(component)) valid = false;
						_c.setCore(_this);
					}
				});
				if (!valid) return;
			} else {
				if (!this._verifyComponent(component)) return;
				component.setCore(this);
			}

			let core = this;
			let request = this._getRequest(component);
			let response = new NewgroundsIO.objects.Response();

			var xhr = new XMLHttpRequest();
			xhr.onreadystatechange = function() {
				if (xhr.readyState==4) {

					var o_return;
					try { 
						o_return = (JSON.parse(xhr.responseText));
					} catch(e) {
						o_return = {success: false, app_id: core.app_id};
						o_return.error = {message: String(e), code: 8002};
					}

					let response = core._populateResponse(o_return);

					core.dispatchEvent(new CustomEvent('serverResponse', {detail:response}));

					if (callback) {
						if (thisArg) callback.call(thisArg, response);
						else callback(response);
					}
				}
			}

			// jhax is a hack to get around JS frameworks that add a toJSON method to Array (wich breaks the native implementation).
			var jhax = typeof(Array.prototype.toJSON) != 'undefined' ? Array.prototype.toJSON : null;
			if (jhax) delete Array.prototype.toJSON;

			let formData = new FormData();
			formData.append('request', JSON.stringify(request));
			if (jhax) Array.prototype.toJSON = jhax;

			xhr.open('POST', this.GATEWAY_URI, true);

			xhr.send(formData);
		}

		/**
		 * Executes a component in a new browser tab. Intended for redirects, such as
		 * those used in Loader components.
		 * @param {NewgroundsIO.BaseComponent} component Any NewgroundsIO.components.XXXXX object
		 */
		loadComponent(component)
		{
			if (!this._verifyComponent(component)) return;

			component.setCore(this);

			let request = this._getRequest(component);

			let url = this.GATEWAY_URI+"?request="+encodeURIComponent(JSON.stringify(request));
			window.open(url, "_blank");
		}

		/**
		 * Override this if you need to catch responses before they are dispatched to a callback.
		 * @param {NewgroundsIO.objects.Response}
		 */
		onServerResponse(response) {}

		/**
		 * populates a response object with decoded server response data
		 * @private
		 */
		_populateResponse(response)
		{
			if (response.success) {
				if (Array.isArray(response.result)) {
					for(let i=0; i<response.result.length; i++) {
						response.result[i] = this._populateResult(response.result[i]);
					}

				} else {
					response.result = this._populateResult(response.result);

				}


			} else {
				if (response.result)
					delete response.result;

				if (response.error)
					response.error = new NewgroundsIO.objects.Error(response.error);
			}

			response = new NewgroundsIO.objects.Response(response);
			response.setCore(this);
			return response;
		}

		/**
		 * populates a result object with decoded server result data
		 * @private
		 */
		_populateResult(result) {
			let path = result.component.split(".");
			let _class = NewgroundsIO.results[path[0]][path[1]];
			if (!_class) return null;

			result.data.component = result.component;
			let res = new _class();
			res.fromJSON(result.data, this);

			return res;
		}

		/**
		 * wraps a component object in an execute object
		 * @private
		 */
		_getExecute(component)
		{
			var execute = new NewgroundsIO.objects.Execute()
			execute.setComponent(component);
			execute.setCore(this);
			return execute;
		}

		/**
		 * wraps a component object in request/execute objects
		 * @private
		 */
		_getRequest(component)
		{
			let execute;
			let _this = this;
			if (Array.isArray(component)) {
				execute = [];
				component.forEach(_c=>{
					let _ex = _this._getExecute(_c);
					execute.push(_ex);
				});
			} else {
				execute = this._getExecute(component);
			}

			let request = new NewgroundsIO.objects.Request({
				execute: execute
			});

			if (this.debug) request.debug = true;

			request.setCore(this);
			return request;
		}

		_verifyComponent(component)
		{
			if (!(component instanceof NewgroundsIO.BaseComponent)) {
				console.error("NewgroundsIO Type Mismatch: Expecting a NewgroundsIO.components.XXXX instance, got", component);
				return false;
			} else if (!(component.isValid())) {
				return false;
			}

			return true;
		}
	}

/** End Class NewgroundsIO.Core **/
NewgroundsIO.Core = Core;
})();


(()=>{
/** Start Class NewgroundsIO.BaseObject **/

	/** The base object all models will use **/
	class BaseObject {

		/**
		 * Used to tell serialization that this is an object model.
		 * @type {string}
		 */
		get type() {
			return this.__type;
		}

		/**
		 * @private
		 */
		__type = "object";

		/**
		 * @private
		 */
		__object = "BaseObject";

		/**
		 * @private
		 */
		__properties = [];

		/**
		 * @private
		 */
		__required = [];

		/**
		 * @private
		 */
		__ngioCore = null;


		/**
		 * Returns true if all required properties are set.
		 * @returns {boolean}
		 */
		isValid() {
			if (this.__required.length === 0) return true;

			let valid = true;

			this.__required.forEach(function (property) {
				if (this[property] === null) {
					console.error("NewgroundsIO Error: "+this.__object+" "+this.__type+" is invalid, missing value for '"+property+"'");
					valid = false;
				} else if (this[property] instanceof NewgroundsIO.BaseObject) {
					if (!this[property].isValid()) valid = false;
				}
			}, this);

			return valid;
		}

		/**
		 * Recursively links a core instance.
		 * @param {NewgroundsIO} core
		 */
		setCore(core)
		{
			this._doSetCore(core,[]);
		}

		objectMap = {};
		arrayMap = {};

		fromJSON(obj, core) 
		{
			var newobj = {};
			var i,j;

			this.setCore(core);

			for(i=0; i<this.__properties.length; i++) {
				let prop = this.__properties[i];

				if (typeof(obj[prop]) !== 'undefined' && obj[prop] !== null) {
					
					newobj[prop] = obj[prop];

					if (typeof(this.arrayMap[prop]) !== 'undefined' && Array.isArray(newobj[prop])) {
						newobj[prop] = [];
						for(j=0; j<obj[prop].length; j++) {
							let _class = NewgroundsIO.objects[this.arrayMap[prop]];
							newobj[prop][j] = new _class();
							newobj[prop][j].fromJSON(obj[prop][j],core);
						}
					} else if (typeof(this.objectMap[prop]) !== 'undefined') {

						let _class = NewgroundsIO.objects[this.objectMap[prop]];
						newobj[prop] = new _class();
						newobj[prop].fromJSON(obj[prop],core);
					}

					this[prop] = newobj[prop];
				}
			}
		}

		/**
		 * sets the core on all children, and prevents infinite recursion
		 * @private
		 */
		_doSetCore(core, updatedList)
		{
			if (!Array.isArray(updatedList)) updatedList = [];

			if (!(core instanceof NewgroundsIO.Core)) {
				console.error('NewgroundsIO Error: Expecting NewgroundsIO.Core instance, got', core);
			} else {
				this.__ngioCore = core;
				updatedList.push(this);

				this.__properties.forEach(function(prop) {
					if ((this[prop] instanceof NewgroundsIO.BaseObject) && updatedList.indexOf(this[prop]) === -1) {
							this[prop]._doSetCore(core, updatedList);
					}
					else if (Array.isArray(this[prop])) {
						this[prop].forEach(child => {
							if ((child instanceof NewgroundsIO.BaseObject) && updatedList.indexOf(child) === -1) {
									child._doSetCore(core, updatedList);
							}
						}, this);
					}

					if (prop === "host" && !this.host) this.host = core.host;
				}, this);
			}
		}

		/**
		 * Returns an object suitable for serializing to a JSON string.
		 * @returns {object}
		 */
		toJSON()
		{
			return this.__doToJSON();
		}

		/**
		 * Does the actual serialization
		 * @private
		 */
		__doToJSON() 
		{
			if (typeof(this.__properties) === 'undefined') return {};

			let json = {};

			this.__properties.forEach(function(prop) {
				if (this[prop] !== null) {
					json[prop] = typeof(this[prop].toJSON) === "function" ? this[prop].toJSON() : this[prop];
				}
			}, this);

			return json;
		}

		/**
		 * Serializes this object to an encrypted JSON string
		 * @returns {string}
		 */
		toSecureJSON() {
			if (!this.__ngioCore || !(this.__ngioCore instanceof NewgroundsIO.Core)) {
				console.error("NewgroundsIO Error: Unable to create secure JSON object without calling setCore() first.");
				return this.__doToJSON();
			}
			
			return {secure: this.__ngioCore.encrypt(JSON.stringify(this.__doToJSON()))};
		}

		toString() {
			return this.__type;
		}

		clone(cloneTo) {
			if (typeof(cloneTo) === "undefined") cloneTo = new this.constructor();
			this.__properties.forEach(prop => {
				cloneTo[prop] = this[prop];
			});
			cloneTo.__ngioCore = this.__ngioCore;
			return cloneTo;
		}

	}

/** End Class NewgroundsIO.BaseObject **/
NewgroundsIO.BaseObject = BaseObject;

/** Start Class NewgroundsIO.BaseComponent **/

	/** The base object all models will use **/
	class BaseComponent extends BaseObject {

		/** Creates a new BaseComponent **/
		constructor() {

			super();
			this.__type = "component";
			this.__object = "BaseComponent";

			this.__properties = [
				"host",
				"echo"
			];

			this._echo = null;
		}

		/**
		 * Many components need to pass the hosting website (or indicator this is a standalone app).
		 * @type {string}
		 */
		get host() {
			return this.__ngioCore ? this.__ngioCore.host : null;
		}

		/**
		 * All components have an optional echo property that will return the same value in a server response.
		 * @type {string}
		 */
		get echo() {
			return this._echo;
		}

		set echo(value) {
			this.echo = ""+value;
		}
	}

/** End Class NewgroundsIO.BaseComponent **/
NewgroundsIO.BaseComponent = BaseComponent;

/** Start Class NewgroundsIO.BaseResult **/

	/** The base object all models will use **/
	class BaseResult extends BaseObject {

		/** Creates a new BaseResult **/
		constructor() {
			super();
			this.__type = "result";
			this.__object = "BaseResult";

			this.__properties = [
				"echo",
				"error",
				"success"
			];

			this._echo = null;
			this._error = null;
			this._success = null;
		}

		/**
		 * The name of the component that was called to yield this result.
		 * @type {string}
		 */
		get component() {
			return this.__object;
		}

		/**
		 * All components can send an echo string. They will be returned in this property.
		 * @type {string}
		 */
		get echo() {
			return this._echo;
		}

		/**
		 * If there was an error with the component, this will be an Error object.
		 * @type {NewgroundsIO.objects.Error}
		 */
		get error() {
			return this._error;
		}

		set error(value) {
			this._error = value;
		}

		/**
		 * If the component was successful, this will be true. If not, you can check the error property for details.
		 * @type {boolean}
		 */
		get success() {
			return this._success ? true:false;
		}

		set success(value) {
			this._success = value ? true:false;
		}

	}

/** End Class NewgroundsIO.BaseResult **/
NewgroundsIO.BaseResult = BaseResult;
})();

/** Start Class NewgroundsIO.SessionState **/
/**
 * Contains a bunch of constants representing the different states a user session can be in.
 * This is used by the NewgroundsIO.objects.Session object
 */
NewgroundsIO.SessionState = {
	SESSION_UNINITIALIZED:		"session-uninitialized",	// We have never checked this session
	WAITING_FOR_SERVER:			"waiting-for-server",		// We are waiting for the server to send information
	LOGIN_REQUIRED:				"login-required",			// We have a session, but the user isn't logged in
	WAITING_FOR_USER:			"waiting-for-user",			// The user has opened the login page
	LOGIN_CANCELLED:			"login-cancelled",			// The user cancelled the login
	LOGIN_SUCCESSFUL:			"login-successful",			// The user is logged in, session is valid!
	LOGIN_FAILED:				"login-failed",				// The user failed their login attempt
	USER_LOGGED_OUT:			"user-logged-out",			// The user logged out
	SERVER_UNAVAILABLE:			"server-unavailable",		// The server is currently unavailable
	EXCEEDED_MAX_ATTEMPTS:		"exceeded-max-attempts"		// We've failed trying to connect too many times
};

/**
 * States in this list are considered "waiting". You don't need to make any API calls during these.
 */
NewgroundsIO.SessionState.SESSION_WAITING = [
	NewgroundsIO.SessionState.SESSION_UNINITIALIZED,
	NewgroundsIO.SessionState.WAITING_FOR_SERVER,
	NewgroundsIO.SessionState.WAITING_FOR_USER,
	NewgroundsIO.SessionState.LOGIN_CANCELLED,
	NewgroundsIO.SessionStateLOGIN_FAILED
];
/** End Class NewgroundsIO.SessionState **/
