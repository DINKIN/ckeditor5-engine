/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/**
 * @module engine/view/observer/selectionobserver
 */

/* global setInterval, clearInterval */

import Observer from './observer';
import MutationObserver from './mutationobserver';
import log from '@ckeditor/ckeditor5-utils/src/log';
import debounce from '@ckeditor/ckeditor5-utils/src/lib/lodash/debounce';

/**
 * Selection observer class observes selection changes in the document. If selection changes on the document this
 * observer checks if there are any mutations and if DOM selection is different than the
 * {@link module:engine/view/document~Document#selection view selection}. Selection observer fires
 * {@link module:engine/view/document~Document#event:selectionChange} event only if selection change was the only change in the document
 * and DOM selection is different then the view selection.
 *
 * Note that this observer is attached by the {@link module:engine/view/document~Document} and is available by default.
 *
 * @see module:engine/view/observer/mutationobserver~MutationObserver
 * @extends module:engine/view/observer/observer~Observer
 */
export default class SelectionObserver extends Observer {
	constructor( document ) {
		super( document );

		/**
		 * Instance of the mutation observer. Selection observer calls
		 * {@link module:engine/view/observer/mutationobserver~MutationObserver#flush} to ensure that the mutations will be handled before the
		 * {@link module:engine/view/document~Document#event:selectionChange} event is fired.
		 *
		 * @readonly
		 * @member {module:engine/view/observer/mutationobserver~MutationObserver}
		 * module:engine/view/observer/selectionobserver~SelectionObserver#mutationObserver
		 */
		this.mutationObserver = document.getObserver( MutationObserver );

		/**
		 * Reference to the {@link module:engine/view/document~Document} object.
		 *
		 * @readonly
		 * @member {module:engine/view/document~Document} module:engine/view/observer/selectionobserver~SelectionObserver#document
		 */
		this.document = document;

		/**
		 * Reference to the view {@link module:engine/view/selection~Selection} object used to compare new selection with it.
		 *
		 * @readonly
		 * @member {module:engine/view/selection~Selection} module:engine/view/observer/selectionobserver~SelectionObserver#selection
		 */
		this.selection = document.selection;

		/**
		 * Reference to the {@link module:engine/view/document~Document#domConverter}.
		 *
		 * @readonly
		 * @member {module:engine/view/domconverter~DomConverter} module:engine/view/observer/selectionobserver~SelectionObserver#domConverter
		 */
		this.domConverter = document.domConverter;

		/**
		 * Set of documents which have added "selectionchange" listener to avoid adding listener twice to the same
		 * document.
		 *
		 * @private
		 * @member {WeakSet.<Document>} module:engine/view/observer/selectionobserver~SelectionObserver#_documents
		 */
		this._documents = new WeakSet();

		/**
		 * Fires debounced event `selectionChangeDone`. It uses `lodash#debounce` method to delay function call.
		 *
		 * @private
		 * @param {Object} data Selection change data.
		 * @method #_fireSelectionChangeDoneDebounced
		 */
		this._fireSelectionChangeDoneDebounced = debounce( data => this.document.fire( 'selectionChangeDone', data ), 200 );

		this._clearInfiniteLoopInterval = setInterval( () => this._clearInfiniteLoop(), 1000 );

		/**
		 * Private property to check if the code does not enter infinite loop.
		 *
		 * @private
		 * @member {Number} module:engine/view/observer/selectionobserver~SelectionObserver#_loopbackCounter
		 */
		this._loopbackCounter = 0;
	}

	/**
	 * @inheritDoc
	 */
	observe( domElement ) {
		const domDocument = domElement.ownerDocument;

		// Add listener once per each document.
		if ( this._documents.has( domDocument ) ) {
			return;
		}

		this.listenTo( domDocument, 'selectionchange', () => {
			this._handleSelectionChange( domDocument );
		} );

		this._documents.add( domDocument );
	}

	/**
	 * @inheritDoc
	 */
	destroy() {
		super.destroy();

		clearInterval( this._clearInfiniteLoopInterval );
		this._fireSelectionChangeDoneDebounced.cancel();
	}

	/**
	 * Selection change listener. {@link module:engine/view/observer/mutationobserver~MutationObserver#flush Flush} mutations, check if
	 * selection changes and fires {@link module:engine/view/document~Document#event:selectionChange} event on every change
	 * and {@link module:engine/view/document~Document#event:selectionChangeDone} when selection stop changing.
	 *
	 * @private
	 * @param {Document} domDocument DOM document.
	 */
	_handleSelectionChange( domDocument ) {
		if ( !this.isEnabled || !this.document.isFocused ) {
			return;
		}

		// Ensure the mutation event will be before selection event on all browsers.
		this.mutationObserver.flush();

		// If there were mutations then the view will be re-rendered by the mutation observer and selection
		// will be updated, so selections will equal and event will not be fired, as expected.
		const domSelection = domDocument.defaultView.getSelection();
		const newViewSelection = this.domConverter.domSelectionToView( domSelection );

		if ( this.selection.isEqual( newViewSelection ) ) {
			return;
		}

		// Ensure we are not in the infinite loop (#400).
		if ( this._isInfiniteLoop() ) {
			/**
			 * Selection change observer detected an infinite rendering loop.
			 * Most probably you try to put the selection in the position which is not allowed
			 * by the browser and browser fixes it automatically what causes `selectionchange` event on
			 * which a loopback through a model tries to re-render the wrong selection and again.
			 *
			 * @error selectionchange-infinite-loop
			 */
			log.warn( 'selectionchange-infinite-loop: Selection change observer detected an infinite rendering loop.' );

			return;
		}

		const data = {
			oldSelection: this.selection,
			newSelection: newViewSelection,
			domSelection: domSelection
		};

		// Should be fired only when selection change was the only document change.
		this.document.fire( 'selectionChange', data );

		// Call` #_fireSelectionChangeDoneDebounced` every time when `selectionChange` event is fired.
		// This function is debounced what means that `selectionChangeDone` event will be fired only when
		// defined int the function time will elapse since the last time the function was called.
		// So `selectionChangeDone` will be fired when selection will stop changing.
		this._fireSelectionChangeDoneDebounced( data );
	}

	/**
	 * Checks if selection rendering entered an infinite loop.
	 *
	 * See https://github.com/ckeditor/ckeditor5-engine/issues/400.
	 *
	 * @private
	 * @param {module:engine/view/selection~Selection} newSelection DOM selection converted to view.
	 * @returns {Boolean} True is the same selection repeat more then 10 times.
	 */
	_isInfiniteLoop() {
		return ++this._loopbackCounter > 200;
	}

	/**
	 * Clears `SelectionObserver` internal properties connected with preventing infinite loop.
	 *
	 * @protected
	 */
	_clearInfiniteLoop() {
		this._loopbackCounter = 0;
	}
}

/**
 * Fired when selection has changed. This event is fired only when the selection change was the only change that happened
 * in the document, and old selection is different then the new selection.
 *
 * Introduced by {@link module:engine/view/observer/selectionobserver~SelectionObserver}.
 *
 * Note that because {@link module:engine/view/observer/selectionobserver~SelectionObserver} is attached by the
 * {@link module:engine/view/document~Document}
 * this event is available by default.
 *
 * @see module:engine/view/observer/selectionobserver~SelectionObserver
 * @event module:engine/view/document~Document#event:selectionChange
 * @param {Object} data
 * @param {module:engine/view/selection~Selection} data.oldSelection Old View selection which is
 * {@link module:engine/view/document~Document#selection}.
 * @param {module:engine/view/selection~Selection} data.newSelection New View selection which is converted DOM selection.
 * @param {Selection} data.domSelection Native DOM selection.
 */

/**
 * Fired when selection stops changing.
 *
 * Introduced by {@link module:engine/view/observer/selectionobserver~SelectionObserver}.
 *
 * Note that because {@link module:engine/view/observer/selectionobserver~SelectionObserver} is attached by the
 * {@link module:engine/view/document~Document}
 * this event is available by default.
 *
 * @see module:engine/view/observer/selectionobserver~SelectionObserver
 * @event module:engine/view/document~Document#event:selectionChangeDone
 * @param {Object} data
 * @param {module:engine/view/selection~Selection} data.oldSelection Old View selection which is
 * {@link module:engine/view/document~Document#selection}.
 * @param {module:engine/view/selection~Selection} data.newSelection New View selection which is converted DOM selection.
 * @param {Selection} data.domSelection Native DOM selection.
 */
