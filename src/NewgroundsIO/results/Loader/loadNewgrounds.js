(()=>{
/** Start NewgroundsIO.results.Loader.loadNewgrounds **/

	class loadNewgrounds extends NewgroundsIO.BaseResult {

		/**
		 * Constructor
		 * @param {object} props An object of initial properties for this instance
		 * @param {String} props.url 
		 */
		constructor(props)
		{
			super();

			this.__object = "Loader.loadNewgrounds";
			this._url = null;
			this.__properties = this.__properties.concat(["url"]);
			if (typeof(props) === 'object') {
				for(var i=0; i<this.__properties.length; i++) {
					if (typeof(props[this.__properties[i]]) !== 'undefined') this[this.__properties[i]] = props[this.__properties[i]];
				}
			}
		}

		/**
		 * @type {String}
		 */
		get url()
		{
			return this._url;
		}

		set url(_url)
		{
			if (typeof(_url) !== 'string' && _url !== null) console.warn('NewgroundsIO Type Mismatch: Value should be a string, got', _url);
			this._url = String(_url);

		}

	}

/** End Class NewgroundsIO.results.Loader.loadNewgrounds **/
if (typeof(NewgroundsIO.results.Loader) === 'undefined') NewgroundsIO.results.Loader = {};
NewgroundsIO.results.Loader.loadNewgrounds = loadNewgrounds;

})();

