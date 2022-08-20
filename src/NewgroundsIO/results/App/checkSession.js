(()=>{
/** Start Class NewgroundsIO.results.App.checkSession **/

	/**
	 * Returned when App.checkSession component is called
	 */
	class checkSession extends NewgroundsIO.BaseResult {

		/**
		 * Constructor
		 * @param {object} props An object of initial properties for this instance
		 */
		constructor(props)
		{
			super();

			this.__object = "App.checkSession";
			this._session = null;
			this.__properties = this.__properties.concat(["session"]);
			if (typeof(props) === 'object') {
				for(var i=0; i<this.__properties.length; i++) {
					if (typeof(props[this.__properties[i]]) !== 'undefined') this[this.__properties[i]] = props[this.__properties[i]];
				}
			}
		}

		/**
		 * @type {NewgroundsIO.objects.Session}
		 */
		get session()
		{
			return this._session;
		}

		set session(_session)
		{
			if (!(_session instanceof NewgroundsIO.objects.Session) && typeof(_session) === 'object')
				_session = new NewgroundsIO.objects.Session(_session);

				if (_session !== null && !(_session instanceof NewgroundsIO.objects.Session))
				console.warn("Type Mismatch: expecting NewgroundsIO.objects.Session, got ",_session);

			this._session = _session;
		}

	}

/** End Class NewgroundsIO.results.App.checkSession **/
if (typeof(NewgroundsIO.results.App) === 'undefined') NewgroundsIO.results.App = {};
NewgroundsIO.results.App.checkSession = checkSession;

})();
