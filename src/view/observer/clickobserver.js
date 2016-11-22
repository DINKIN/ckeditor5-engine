/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/**
 * @module engine/view/observer/clickobserver
 */

import DomEventObserver from './domeventobserver.js';

/**
 * {@link module:engine/view/document~Document#click Click} event observer.
 *
 * Note that this observer is not available by default. To make it available it needs to be added to {@link
 * module:engine/view/document~Document}
 * by a {@link module:engine/view/document~Document#addObserver} method.
 *
 * @extends module:engine/view/observer/observer~Observer.DomEventObserver
 */
export default class ClickObserver extends DomEventObserver {
	constructor( document ) {
		super( document );

		this.domEventType = 'click';
	}

	onDomEvent( domEvent ) {
		this.fire( domEvent.type, domEvent );
	}
}

/**
 * Fired when one of the editables has been clicked.
 *
 * Introduced by {@link module:engine/view/observer/observer~Observer.ClickObserver}.
 *
 * Note that this event is not available by default. To make it available {@link
 * module:engine/view/observer/observer~Observer.ClickObserver} needs to be added
 * to {@link module:engine/view/document~Document} by a {@link module:engine/view/document~Document#addObserver} method.
 *
 * @see module:engine/view/observer/observer~Observer.ClickObserver
 * @event module:engine/view/document~Document#click
 * @param {module:engine/view/observer/domeventdata~DomEventData} data Event data.
 */
