let $: any;
let DataTable: any;

/**
 * Sets the value of jQuery for use in the file
 * @param jq the instance of jQuery to be set
 */
export function setJQuery(jq: any): void {
	$ = jq;
	DataTable = jq.fn.DataTable;
}

import * as typeInterfaces from './builderType';
import Group from './group';

/**
 * SearchBuilder class for DataTables.
 * Allows for complex search queries to be constructed and implemented on a DataTable
 */
export default class SearchBuilder {
	private static version = '0.0.1';

	private static classes: typeInterfaces.IClasses = {
		button: 'dtsb-button',
		clearAll: 'dtsb-clearAll',
		container: 'dtsb-searchBuilder',
		inputButton: 'dtsb-iptbtn',
		title: 'dtsb-title',
		titleRow: 'dtsb-titleRow'
	};

	private static defaults: typeInterfaces.IDefaults = {
		preDefined: false,
	};

	public classes: typeInterfaces.IClasses;
	public dom: typeInterfaces.IDom;
	public c: typeInterfaces.IDefaults;
	public s: typeInterfaces.IS;

	constructor(builderSettings: any, opts: any) {
		// Check that the required version of DataTables is included
		if (! DataTable || ! DataTable.versionCheck || ! DataTable.versionCheck('1.10.0')) {
			throw new Error('SearchBuilder requires DataTables 1.10 or newer');
		}

		let table = new DataTable.Api(builderSettings);
		this.classes = $.extend(true, {}, SearchBuilder.classes);

		// Get options from user
		this.c = $.extend(true, {}, SearchBuilder.defaults, opts);

		this.dom = {
			clearAll: $('<button type="button">' + table.i18n('searchBuilder.clearAll', 'Clear All') + '</button>')
				.addClass(this.classes.clearAll)
				.addClass(this.classes.button),
			container: $('<div/>').addClass(this.classes.container),
			title: $('<div/>').addClass(this.classes.title),
			titleRow: $('<div/>').addClass(this.classes.titleRow),
			topGroup: undefined
		};

		this.s = {
			dt: table,
			opts,
			search: undefined,
			topGroup: undefined
		};

		if (table.settings()[0]._searchBuilder !== undefined) {
			return;
		}

		table.settings()[0]._searchBuilder = this;

		if (this.s.dt.settings()[0]._bInitComplete) {
			this._setUp();
		}
		else {
			table.one('init.dt', () => {
				this._setUp();
			});
		}

		return this;
	}

	/**
	 * Gets the details required to rebuild the SearchBuilder as it currently is
	 */
	public getDetails(): typeInterfaces.IDetails {
		return this.s.topGroup.getDetails();
	}

	/**
	 * Getter for the node of the container for the searchBuilder
	 * @returns JQuery<HTMLElement> the node of the container
	 */
	public getNode(): JQuery<HTMLElement> {
		return this.dom.container;
	}

	/**
	 * Rebuilds the SearchBuilder to a state that is provided
	 * @param details The details required to perform a rebuild
	 */
	public rebuild(details): SearchBuilder {
		$(this.dom.clearAll).click();

		// If there are no details to rebuild then return
		if (details === undefined || details === null) {
			return this;
		}

		this.s.topGroup.rebuild(details);
		this.s.dt.draw();

		return this;
	}

	/**
	 * Set's up the SearchBuilder
	 */
	private _setUp(): void {
		this.s.topGroup = new Group(this.s.dt, this.c, undefined);

		this._setClearListener();

		this.s.dt.on('stateSaveParams', (e, settings, data) => {
			data.searchBuilder = this.getDetails();
		});

		this._build();

		let loadedState = this.s.dt.state.loaded();

		// If the loaded State is not null rebuild based on it for statesave
		if (loadedState !== null && loadedState.searchBuilder !== undefined) {
			this.s.topGroup.rebuild(loadedState.searchBuilder);
			$(this.s.topGroup.dom.container).trigger('dtsb-redrawContents');
			this.s.dt.draw();
		}
		// Otherwise load any predefined options
		else if (this.c.preDefined !== false) {
			this.rebuild(this.c.preDefined);
		}
	}

	/**
	 * Builds all of the dom elements together
	 */
	private _build(): void {
		$(this.dom.container).empty();

		$(this.dom.title).text(this.s.dt.i18n('searchBuilder.title', 'Search builder'));

		$(this.dom.titleRow).append(this.dom.title);
		$(this.dom.titleRow).append(this.dom.clearAll);
		$(this.dom.container).append(this.dom.titleRow);
		this.dom.topGroup = this.s.topGroup.getNode();
		$(this.dom.container).append(this.dom.topGroup);

		this._setClearListener();
		this._setRedrawListener();

		this.s.search = (settings, searchData, dataIndex, origData) => {
			return this.s.topGroup.search(searchData);
		};

		// Add SearchBuilder search function to the dataTables search array
		$.fn.dataTable.ext.search.push(this.s.search);

		// Register an Api method for getting the column type
		$.fn.DataTable.Api.registerPlural('columns().type()', 'column().type()', function(selector, opts) {
			return this.iterator('column', function(settings, column) {
				return settings.aoColumns[column].sType;
			}, 1);
		});
	}

	/**
	 * Set the listener for the clear button
	 */
	private _setClearListener() {
		$(this.dom.clearAll).unbind('click');
		$(this.dom.clearAll).on('click', () => {
			this.s.topGroup = new Group(this.s.dt, this.s.opts, undefined);
			this._build();
			this.s.dt.draw();
		});
	}

	/**
	 * Set the listener for the Redraw event
	 */
	private _setRedrawListener() {
		$(this.s.topGroup.dom.container).unbind('dtsb-redrawContents');
		$(this.s.topGroup.dom.container).on('dtsb-redrawContents', () => {
			this.s.topGroup.redrawContents();
			this.s.topGroup.setupLogic();
		});
	}
}
